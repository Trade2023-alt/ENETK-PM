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

/**
 * Get attendance metrics: late arrivals, partial days, missed days
 * Late = clock in after 6:10 AM (MST)
 * Partial = less than 8 hours (Mon-Fri only)
 * Missed = no attendance on weekday (Mon-Fri only)
 */
export async function getAttendanceMetrics(days = 30) {
    try {
        // Fetch all users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .order('username');

        if (userError) throw userError;

        // Fetch attendance logs
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: logs, error: logError } = await supabase
            .from('attendance')
            .select('*')
            .gte('check_in', startDate.toISOString())
            .order('check_in', { ascending: true });

        if (logError) throw logError;

        // Initialize per-user metrics
        const userMetrics = {};
        users.forEach(u => {
            userMetrics[u.id] = {
                username: u.username,
                lateDays: 0,
                onTimeDays: 0,
                partialDays: 0,
                fullDays: 0,
                missedDays: 0,
                workedDays: 0
            };
        });

        // Generate weekday dates (Mon-Fri only)
        const weekdayDates = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayOfWeek = d.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday=1, Friday=5
                weekdayDates.push(d.toISOString().split('T')[0]);
            }
        }

        // Track attendance per user per date
        const userDateAttendance = {};
        users.forEach(u => {
            userDateAttendance[u.id] = {};
            weekdayDates.forEach(date => {
                userDateAttendance[u.id][date] = { attended: false, hours: 0, isLate: false };
            });
        });

        // Process logs
        (logs || []).forEach(log => {
            if (!log.check_in) return;

            const checkIn = new Date(log.check_in);
            const dateStr = checkIn.toISOString().split('T')[0];
            const dayOfWeek = checkIn.getDay();

            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) return;

            // Check if late (after 6:10 AM MST)
            // Convert to MST (UTC-7)
            const checkInMST = new Date(checkIn.getTime() - (7 * 60 * 60 * 1000));
            const hour = checkInMST.getUTCHours();
            const minute = checkInMST.getUTCMinutes();
            const isLate = (hour > 6) || (hour === 6 && minute > 10);

            // Calculate hours worked
            let hours = 0;
            if (log.check_out) {
                const checkOut = new Date(log.check_out);
                hours = (checkOut - checkIn) / (1000 * 60 * 60);
            }

            if (userDateAttendance[log.user_id] && userDateAttendance[log.user_id][dateStr]) {
                userDateAttendance[log.user_id][dateStr].attended = true;
                userDateAttendance[log.user_id][dateStr].hours += hours;
                if (isLate) userDateAttendance[log.user_id][dateStr].isLate = true;
            }
        });

        // Calculate final metrics
        users.forEach(u => {
            weekdayDates.forEach(date => {
                const dayData = userDateAttendance[u.id][date];
                if (dayData.attended) {
                    userMetrics[u.id].workedDays++;
                    if (dayData.isLate) {
                        userMetrics[u.id].lateDays++;
                    } else {
                        userMetrics[u.id].onTimeDays++;
                    }
                    if (dayData.hours < 8) {
                        userMetrics[u.id].partialDays++;
                    } else {
                        userMetrics[u.id].fullDays++;
                    }
                } else {
                    userMetrics[u.id].missedDays++;
                }
            });
        });

        // Calculate totals for pie charts
        let totalLate = 0, totalOnTime = 0;
        let totalPartial = 0, totalFull = 0;
        let totalMissed = 0, totalWorked = 0;

        Object.values(userMetrics).forEach(m => {
            totalLate += m.lateDays;
            totalOnTime += m.onTimeDays;
            totalPartial += m.partialDays;
            totalFull += m.fullDays;
            totalMissed += m.missedDays;
            totalWorked += m.workedDays;
        });

        return {
            users: users || [],
            userMetrics,
            weekdayCount: weekdayDates.length,
            totals: {
                late: totalLate,
                onTime: totalOnTime,
                partial: totalPartial,
                full: totalFull,
                missed: totalMissed,
                worked: totalWorked
            },
            // Per-user data for pie charts
            lateByUser: users.map(u => ({ name: u.username, value: userMetrics[u.id].lateDays })).filter(d => d.value > 0),
            partialByUser: users.map(u => ({ name: u.username, value: userMetrics[u.id].partialDays })).filter(d => d.value > 0),
            missedByUser: users.map(u => ({ name: u.username, value: userMetrics[u.id].missedDays })).filter(d => d.value > 0)
        };
    } catch (error) {
        console.error('getAttendanceMetrics error:', error);
        return { error: error.message };
    }
}
