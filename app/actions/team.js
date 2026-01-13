'use server'

import { redirect } from 'next/navigation';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function createTeamMember(formData) {
    const username = formData.get('username');
    const password = formData.get('password');
    const role = formData.get('role');
    const email = formData.get('email');
    const phone = formData.get('phone');

    if (!username || !password || !role) {
        return { error: 'All fields are required' };
    }

    try {
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return { error: 'Username already taken' };
        }

        const hash = bcrypt.hashSync(password, 10);
        const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, role, email, phone)
      VALUES (?, ?, ?, ?, ?)
    `);

        stmt.run(username, hash, role, email || null, phone || null);
    } catch (error) {
        console.error('Error creating user:', error);
        return { error: 'Failed to create team member' };
    }

    redirect('/team');
}

export async function updateTeamMember(formData) {
    const id = formData.get('id');
    const username = formData.get('username');
    const role = formData.get('role');
    const password = formData.get('password');
    const email = formData.get('email');
    const phone = formData.get('phone');

    if (!id || !username || !role) {
        return { error: 'Missing required fields' };
    }

    try {
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
        if (existingUser) {
            return { error: 'Username already taken' };
        }

        if (password && password.trim() !== '') {
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET username = ?, role = ?, password_hash = ?, email = ?, phone = ? WHERE id = ?')
                .run(username, role, hash, email || null, phone || null, id);
        } else {
            db.prepare('UPDATE users SET username = ?, role = ?, email = ?, phone = ? WHERE id = ?')
                .run(username, role, email || null, phone || null, id);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        return { error: 'Failed to update team member' };
    }

    redirect('/team');
}

export async function deleteTeamMember(id) {
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
    } catch (error) {
        console.error('Error deleting user:', error);
        return { error: 'Failed to delete team member' };
    }

    redirect('/team');
}
