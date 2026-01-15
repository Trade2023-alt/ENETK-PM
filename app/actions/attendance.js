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

export async function getAttendanceStats() {
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, company')
        .order('username');

    if (userError) return { error: userError.message };

    const { data: logs, error: logError } = await supabase
        .from('attendance')
        .select(`
            *,
            user:users(username, company)
        `)
        .order('check_in', { ascending: false });

    if (logError) return { error: logError.message };

    // Calculate Stats
    // Partial Day: < 6 hrs
    // Late: In after 06:15
    // Absent: No entry for a given workday (M-F)

    const now = new Date();
    const stats = {
        totalLate: 0,
        totalPartial: 0,
        todayAbsent: 0,
        logs: logs.map(log => {
            const checkIn = new Date(log.check_in);
            const checkOut = log.check_out ? new Date(log.check_out) : null;

            // Late check? 06:15 AM
            const hour = checkIn.getHours();
            const minute = checkIn.getMinutes();
            const isLate = (hour > 6) || (hour === 6 && minute > 15);

            let isPartial = false;
            let duration = 0;
            if (checkOut) {
                duration = (checkOut - checkIn) / (1000 * 60 * 60);
                isPartial = duration < 6;
            }

            if (isLate) stats.totalLate++;
            if (isPartial) stats.totalPartial++;

            return {
                ...log,
                isLate,
                isPartial,
                duration: duration.toFixed(2)
            };
        })
    };

    // Today's Absences (Simple check: active users who haven't logged anything today)
    const todayStr = now.toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.check_in.startsWith(todayStr));
    const userIdsWithLogs = new Set(todayLogs.map(l => l.user_id));

    stats.todayAbsent = users.filter(u => !userIdsWithLogs.has(u.id)).length;

    // Chart Data (Last 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLogs = logs.filter(l => l.check_in.startsWith(dStr));

        chartData.push({
            name: d.toLocaleDateString([], { weekday: 'short' }),
            date: dStr,
            present: new Set(dayLogs.map(l => l.user_id)).size,
            late: dayLogs.filter(l => {
                const cin = new Date(l.check_in);
                return (cin.getHours() > 6) || (cin.getHours() === 6 && cin.getMinutes() > 15);
            }).length
        });
    }
    stats.chartData = chartData;

    return stats;
}
