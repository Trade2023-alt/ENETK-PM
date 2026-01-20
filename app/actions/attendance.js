'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function checkIn(notes = '') {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) return { error: 'Not authenticated' };

    try {
        const { data: existingSessions, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', Number(userId))
            .is('check_out', null)
            .order('check_in', { ascending: false });

        if (checkError) throw checkError;
        if (existingSessions && existingSessions.length > 0) {
            return { error: 'You are already checked in.' };
        }

        const insertData = { user_id: userId };
        if (notes) insertData.notes = notes;

        const { error } = await supabase
            .from('attendance')
            .insert([insertData]);

        if (error) {
            console.error('Attendance insertion error:', error);
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
        const { data: activeLog, error: fetchError } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', Number(userId))
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!activeLog) {
            return { error: 'No active session found.' };
        }

        const { error: updateError } = await supabase
            .from('attendance')
            .update({ check_out: new Date().toISOString() })
            .eq('id', activeLog.id);

        if (updateError) throw updateError;

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Check-out failed:', error);
        return { error: error.message || 'Check-out failed.' };
    }
}

export async function getAttendanceStatus() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', Number(userId))
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return null;
        return data[0];
    } catch (e) {
        return null;
    }
}

/**
 * Get hours worked per day per user for the last N days
 */
export async function getHoursWorkedTrend(days = 30) {
    try {
        // Fetch all users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .order('username');

        if (userError) throw userError;

        // Fetch attendance logs for the date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: logs, error: logError } = await supabase
            .from('attendance')
            .select('*')
            .gte('check_in', startDate.toISOString())
            .order('check_in', { ascending: true });

        if (logError) throw logError;

        // Build hours by date and user
        const hoursByDateUser = {};
        const dates = [];

        // Generate date array
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dates.push(dateStr);
            hoursByDateUser[dateStr] = {};
            users.forEach(u => {
                hoursByDateUser[dateStr][u.id] = 0;
            });
        }

        // Calculate hours for each log
        (logs || []).forEach(log => {
            if (!log.check_in || !log.check_out) return;

            const checkIn = new Date(log.check_in);
            const checkOut = new Date(log.check_out);
            const dateStr = checkIn.toISOString().split('T')[0];
            const hours = (checkOut - checkIn) / (1000 * 60 * 60);

            if (hoursByDateUser[dateStr] && hoursByDateUser[dateStr][log.user_id] !== undefined) {
                hoursByDateUser[dateStr][log.user_id] += hours;
            }
        });

        // Format for chart display
        const chartData = dates.map(date => {
            const entry = {
                date,
                label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            };
            users.forEach(u => {
                entry[u.username] = parseFloat(hoursByDateUser[date][u.id].toFixed(2));
            });
            return entry;
        });

        return {
            users: users || [],
            chartData,
            dates
        };
    } catch (error) {
        console.error('getHoursWorkedTrend error:', error);
        return { error: error.message, users: [], chartData: [], dates: [] };
    }
}
