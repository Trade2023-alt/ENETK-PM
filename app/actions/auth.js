'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function login(prevState, formData) {
    const username = formData.get('username');
    const password = formData.get('password');

    if (!username || !password) {
        return { error: 'Username and password are required' };
    }

    try {
        let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        let role = 'user';
        let id = null;

        if (user) {
            if (!bcrypt.compareSync(password, user.password_hash)) {
                return { error: 'Invalid credentials' };
            }
            role = user.role;
            id = user.id;
        } else {
            // Check customers table
            const customer = db.prepare('SELECT * FROM customers WHERE username = ?').get(username);
            if (customer) {
                if (!bcrypt.compareSync(password, customer.password_hash)) {
                    return { error: 'Invalid credentials' };
                }
                role = 'customer';
                id = customer.id;
            } else {
                return { error: 'Invalid credentials' };
            }
        }

        // Set a simple cookie for now (In a real app, use JWT or proper session store)
        // For this local app, storing user ID is acceptable for MVP
        const cookieStore = await cookies();
        cookieStore.set('user_id', id.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });
        cookieStore.set('user_role', role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
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
        return { error: 'An unexpected error occurred' };
    }

    redirect('/');
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('user_id');
    cookieStore.delete('user_role');
    redirect('/login');
}
