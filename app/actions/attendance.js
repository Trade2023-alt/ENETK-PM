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
    try {
        // 1. Fetch Users - resilient to company missing
        let { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username, company')
            .order('username');

        if (userError) {
            // Fallback if 'company' is missing
            const { data: fallbackUsers, error: fbErr } = await supabase
                .from('users')
                .select('id, username')
                .order('username');
            if (fbErr) throw fbErr;
            users = fallbackUsers;
        }

        // 2. Fetch Logs - resilient to company missing
        let { data: logs, error: logError } = await supabase
            .from('attendance')
            .select(`
                *,
                user:users(username, company)
            `)
            .order('check_in', { ascending: false });

        if (logError) {
            // Fallback join
            const { data: fallbackLogs, error: fbLogErr } = await supabase
                .from('attendance')
                .select(`
                    *,
                    user:users(username)
                `)
                .order('check_in', { ascending: false });
            if (fbLogErr) throw fbLogErr;
            logs = fallbackLogs;
        }

        if (!logs) logs = [];

        // 3. Process Stats (FORCED MST OFFSET for punctuality check)
        const stats = {
            totalLate: 0,
            totalPartial: 0,
            todayAbsent: 0,
            logs: logs
                .filter(log => log.check_in)
                .map(log => {
                    const checkInUTC = new Date(log.check_in);
                    const checkOutUTC = log.check_out ? new Date(log.check_out) : null;

                    // Convert to MST (UTC-7) for logic checks
                    const checkInMST = new Date(checkInUTC.getTime() - (7 * 60 * 60 * 1000));

                    // Late check? 06:15 AM MST
                    const hour = checkInMST.getUTCHours();
                    const minute = checkInMST.getUTCMinutes();
                    const isLate = (hour > 6) || (hour === 6 && minute > 15);

                    let isPartial = false;
                    let duration = 0;
                    if (checkOutUTC) {
                        duration = (checkOutUTC - checkInUTC) / (1000 * 60 * 60);
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

        // Today's Absences
        const mstNow = new Date(Date.now() - (7 * 60 * 60 * 1000));
        const todayStr = mstNow.toISOString().split('T')[0];
        const todayLogs = logs.filter(l => l.check_in && l.check_in.startsWith(todayStr));
        const userIdsWithLogs = new Set(todayLogs.map(l => l.user_id));

        stats.todayAbsent = users.filter(u => !userIdsWithLogs.has(u.id)).length;

        // Chart Data (Last 7 days)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - (7 * 60 * 60 * 1000));
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dayLogs = logs.filter(l => l.check_in && l.check_in.startsWith(dStr));

            chartData.push({
                name: d.toLocaleDateString([], { weekday: 'short' }),
                date: dStr,
                present: new Set(dayLogs.map(l => l.user_id)).size,
                late: dayLogs.filter(l => {
                    const cin = new Date(new Date(l.check_in).getTime() - (7 * 60 * 60 * 1000));
                    const h = cin.getUTCHours();
                    const m = cin.getUTCMinutes();
                    return (h > 6) || (h === 6 && m > 15);
                }).length
            });
        }
        stats.chartData = chartData;

        return stats;
    } catch (error) {
        console.error('getAttendanceStats error:', error);
        return { error: error.message };
    }
}
