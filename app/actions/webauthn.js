'use server';

import { cookies, headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import {
    generateRegistrationOptions as generateRegOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions as generateAuthOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';

const rpName = 'ENETK PM';

// Helper to get RP ID and Origin dynamically
async function getRpInfo() {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const rpID = host.split(':')[0];
    const expectedOrigin = host.includes('localhost') ? `http://${host}` : `https://${host}`;
    return { rpID, expectedOrigin };
}

export async function generateRegistrationOptions() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId || userId === 'guest') {
        return { error: 'Not authenticated' };
    }

    // Fetch user details for the passkey
    let username = '';
    if (userRole === 'customer') {
        const { data } = await supabase.from('customers').select('username').eq('id', userId).single();
        username = data?.username || 'Customer';
    } else {
        const { data } = await supabase.from('users').select('username').eq('id', userId).single();
        username = data?.username || 'User';
    }

    const { rpID } = await getRpInfo();

    // Generate options
    const options = await generateRegOptions({
        rpName,
        rpID,
        userID: Buffer.from(userId.toString()),
        userName: username,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    });

    // Store the challenge temporarily in a cookie (or DB)
    cookieStore.set('webauthn_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 5, // 5 minutes
    });

    return options;
}

export async function verifyRegistration(body) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;
    const expectedChallenge = cookieStore.get('webauthn_challenge')?.value;

    if (!userId || !expectedChallenge) {
        return { error: 'Missing challenge or not authenticated' };
    }

    const { rpID, expectedOrigin } = await getRpInfo();

    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

            // Save to database
            const insertData = {
                credential_id: credentialID,
                public_key: Buffer.from(credentialPublicKey).toString('base64'),
                counter: counter,
            };

            if (userRole === 'customer') {
                insertData.customer_id = parseInt(userId);
            } else {
                insertData.user_id = parseInt(userId);
            }

            const { error } = await supabase.from('passkeys').insert([insertData]);

            if (error) {
                console.error('Error saving passkey:', error);
                return { error: 'Failed to save passkey to database' };
            }

            // Clear challenge
            cookieStore.delete('webauthn_challenge');
            return { success: true };
        }

        return { error: 'Verification failed' };
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

export async function generateAuthenticationOptions() {
    const { rpID } = await getRpInfo();

    const options = await generateAuthOptions({
        rpID,
        userVerification: 'preferred',
    });

    const cookieStore = await cookies();
    cookieStore.set('webauthn_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 5,
    });

    return options;
}

export async function verifyAuthentication(body) {
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('webauthn_challenge')?.value;

    if (!expectedChallenge) {
        return { error: 'Missing challenge' };
    }

    const { rpID, expectedOrigin } = await getRpInfo();

    try {
        // We don't know the user yet, so we look up the credential by ID
        const { data: passkey, error } = await supabase
            .from('passkeys')
            .select('*')
            .eq('credential_id', body.id)
            .single();

        if (error || !passkey) {
            return { error: 'Passkey not found in our records' };
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: passkey.credential_id,
                credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
                counter: passkey.counter,
                transports: passkey.transports || [],
            },
        });

        if (verification.verified && verification.authenticationInfo) {
            // Update counter
            await supabase
                .from('passkeys')
                .update({ counter: verification.authenticationInfo.newCounter })
                .eq('id', passkey.id);

            // Log the user in
            const role = passkey.customer_id ? 'customer' : 'user';
            const id = passkey.customer_id || passkey.user_id;

            cookieStore.set('user_id', id.toString(), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            cookieStore.set('user_role', role, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7
            });

            cookieStore.delete('webauthn_challenge');
            return { success: true };
        }

        return { error: 'Verification failed' };
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}
