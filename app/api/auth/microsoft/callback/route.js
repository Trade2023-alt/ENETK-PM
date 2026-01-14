import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Initialize MSAL lazily
const getMsalConfig = () => ({
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common'
    }
});

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the userId

    if (!code) {
        return Response.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        const { ConfidentialClientApplication } = await import('@azure/msal-node');
        const msalConfig = getMsalConfig();
        if (!msalConfig.auth.clientId || !msalConfig.auth.clientSecret) {
            throw new Error('Microsoft Auth not configured');
        }
        const cca = new ConfidentialClientApplication(msalConfig);

        const tokenRequest = {
            code: code,
            scopes: ['Mail.Send', 'Calendars.ReadWrite', 'User.Read', 'offline_access'],
            redirectUri: process.env.MS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`,
        };

        const response = await cca.acquireTokenByCode(tokenRequest);
        const accessToken = response.accessToken;
        const refreshToken = response.refreshToken || 'ACCESS_ONLY';

        // Update User in Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({
                ms_access_token: accessToken,
                ms_refresh_token: refreshToken,
                updated_at: new Date().toISOString()
            })
            .eq('id', state);

        if (updateError) throw updateError;

        return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?outlookConnected=true`);

    } catch (error) {
        console.error('MS Auth Callback Error:', error);
        return Response.json({ error: 'Authentication failed', details: error.toString() }, { status: 500 });
    }
}
