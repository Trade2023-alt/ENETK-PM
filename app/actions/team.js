'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function createTeamMember(formData) {
    const username = formData.get('username');
    const password = formData.get('password');
    const role = formData.get('role');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const company = formData.get('company') || 'ENETK';

    if (!username || !password || !role) {
        return { error: 'All fields are required' };
    }

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (existingUser) {
            return { error: 'Username already taken' };
        }

        const hash = bcrypt.hashSync(password, 10);

        // Construct insert object
        const insertData = {
            username,
            password_hash: hash,
            role,
            email: email || null
        };

        // Add optional fields only if they are likely to exist
        if (phone) insertData.phone = phone;
        if (company) insertData.company = company;

        const { error } = await supabase
            .from('users')
            .insert([insertData]);

        if (error) {
            console.error('Insert error:', error);
            if (error.code === '42703') { // Column does not exist
                return { error: `Database error: Column '${error.message.split('"')[1]}' is missing. Please run the SQL migration script provided earlier to update your 'users' table.` };
            }
            throw error;
        }

        revalidatePath('/team');
        return { success: true };
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('Error creating user:', error);
        return { error: 'Failed to create team member: ' + (error.message || 'Unknown error') };
    }
}

export async function updateTeamMember(formData) {
    const id = formData.get('id');
    const username = formData.get('username');
    const role = formData.get('role');
    const password = formData.get('password');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const company = formData.get('company') || 'ENETK';

    if (!id || !username || !role) {
        return { error: 'Missing required fields' };
    }

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .neq('id', id)
            .maybeSingle();

        if (existingUser) {
            return { error: 'Username already taken' };
        }

        const data = {
            username,
            role,
            email: email || null,
            phone: phone || null,
            company: company || 'ENETK',
            updated_at: new Date().toISOString()
        };

        if (password && password.trim() !== '') {
            data.password_hash = bcrypt.hashSync(password, 10);
        }

        const { error } = await supabase
            .from('users')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/team');
        redirect('/team');
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('Error updating user:', error);
        return { error: 'Failed to update team member: ' + error.message };
    }
}

export async function deleteTeamMember(id) {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/team');
    } catch (error) {
        console.error('Error deleting user:', error);
        return { error: 'Failed to delete team member' };
    }

    redirect('/team');
}

