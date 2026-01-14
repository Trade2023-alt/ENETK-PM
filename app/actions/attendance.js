'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function checkIn(notes = '') {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) return { error: 'Not authenticated' };

    try {
        // Check if already checked in (active session)
        const { data: existing, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', userId)
            .is('check_out', null)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            return { error: 'You are already checked in.' };
        }

        // Attempt insert - using a clean object without notes if it might be missing
        const insertData = { user_id: userId };
        if (notes) insertData.notes = notes;

        const { error } = await supabase
            .from('attendance')
            .insert([insertData]);

        if (error) {
            console.error('Attendance insertion error:', error);
            if (error.code === '42703') { // Column does not exist
                return { error: 'Database schema mismatch. Please run the SQL migration to add the "notes" column.' };
            }
            throw error;
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Check-in failed:', error);
        return { error: error.message || 'Check-in failed.' };
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

    try {
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', userId)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .maybeSingle();

        return data;
    } catch (e) {
        return null;
    }
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
