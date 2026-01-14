'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function login(prevState, formData) {
    const username = formData.get('username');
    const password = formData.get('password');

    if (!username || !password) {
        return { error: 'Username and password are required' };
    }

    try {
        // Check users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        let role = 'user';
        let id = null;
        let found = false;
        let passwordHash = null;

        if (user) {
            found = true;
            role = user.role;
            id = user.id;
            passwordHash = user.password_hash;
        } else {
            // Check customers table
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('username', username)
                .single();

            if (customer) {
                found = true;
                role = 'customer';
                id = customer.id;
                passwordHash = customer.password_hash;
            }
        }

        if (!found || !bcrypt.compareSync(password, passwordHash)) {
            return { error: 'Invalid credentials' };
        }

        // Set cookies
        const cookieStore = await cookies();
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

        if (role === 'customer') {
            redirect('/portal');
        }

    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('Login error:', error);
        return { error: 'An unexpected error occurred: ' + error.message };
    }

    redirect('/');
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('user_id');
    cookieStore.delete('user_role');
    redirect('/login');
}

