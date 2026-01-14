'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function checkIn(notes = '') {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) return { error: 'Not authenticated' };

    try {
        // Check if already checked in today (and not checked out)
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', userId)
            .is('check_out', null)
            .gte('check_in', `${today}T00:00:00`)
            .single();

        if (existing) {
            return { error: 'You are already checked in.' };
        }

        const { error } = await supabase
            .from('attendance')
            .insert([{ user_id: userId, notes: notes }]);

        if (error) throw error;
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export async function checkOut() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) return { error: 'Not authenticated' };

    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: activeLog } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', userId)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (!activeLog) {
            return { error: 'No active session found.' };
        }

        const { error } = await supabase
            .from('attendance')
            .update({ check_out: new Date().toISOString() })
            .eq('id', activeLog.id);

        if (error) throw error;
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export async function getAttendanceStatus() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return null;

    const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();

    return data;
}

export async function getAllAttendanceLogs() {
    const { data, error } = await supabase
        .from('attendance')
        .select(`
            *,
            user:users(username, company)
        `)
        .order('check_in', { ascending: false });

    if (error) return [];
    return data;
}
