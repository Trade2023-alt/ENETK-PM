'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Default on-call rotation roster (in order)
const DEFAULT_ROSTER = [
    'Matt Huber',
    'Loren McCray',
    'Rami Douri',
    'Seth Peterson',
    'Cole Kadrmas'
];

// Start date for the default rotation (Monday of the first week)
const ROTATION_START_DATE = new Date('2026-01-20');

/**
 * Get the default rotation person for a date (used when no override exists)
 */
function getDefaultOnCallForDate(date) {
    const startDate = new Date(ROTATION_START_DATE);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((date - startDate) / msPerWeek);

    const adjustedWeeks = weeksSinceStart < 0
        ? DEFAULT_ROSTER.length - (Math.abs(weeksSinceStart) % DEFAULT_ROSTER.length)
        : weeksSinceStart;

    const rosterIndex = adjustedWeeks % DEFAULT_ROSTER.length;
    return DEFAULT_ROSTER[rosterIndex];
}

/**
 * Get Monday of the week for a given date
 */
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

/**
 * Get the on-call roster (default list)
 */
export async function getOnCallRoster() {
    return DEFAULT_ROSTER;
}

/**
 * Get on-call overrides from database
 */
export async function getOnCallOverrides() {
    try {
        const { data, error } = await supabase
            .from('on_call_schedule')
            .select('*')
            .order('week_start', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching on-call overrides:', error);
        return [];
    }
}

/**
 * Get who is on call for a specific date (checks overrides first)
 */
export async function getOnCallForDate(dateStr) {
    const date = new Date(dateStr);
    const weekStart = getMondayOfWeek(date);

    try {
        // Check for override
        const { data } = await supabase
            .from('on_call_schedule')
            .select('person_name')
            .eq('week_start', weekStart)
            .single();

        if (data?.person_name) {
            return data.person_name;
        }
    } catch (error) {
        // No override found, use default
    }

    return getDefaultOnCallForDate(date);
}

/**
 * Set on-call override for a specific week
 */
export async function setOnCallOverride(weekStart, personName) {
    try {
        // Upsert the override
        const { error } = await supabase
            .from('on_call_schedule')
            .upsert({
                week_start: weekStart,
                person_name: personName,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'week_start'
            });

        if (error) throw error;
        revalidatePath('/schedule');
        return { success: true };
    } catch (error) {
        console.error('Error setting on-call override:', error);
        return { error: error.message };
    }
}

/**
 * Remove on-call override (revert to default rotation)
 */
export async function removeOnCallOverride(weekStart) {
    try {
        const { error } = await supabase
            .from('on_call_schedule')
            .delete()
            .eq('week_start', weekStart);

        if (error) throw error;
        revalidatePath('/schedule');
        return { success: true };
    } catch (error) {
        console.error('Error removing on-call override:', error);
        return { error: error.message };
    }
}

/**
 * Get on-call schedule for display (with overrides applied)
 */
export async function getOnCallScheduleForMonth(year, month) {
    const schedule = [];

    // Get first Monday of the month view
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Monday of the week containing the 1st
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setDate(current.getDate() + daysToMonday);

    // Get all overrides in one query
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + 7);

    let overrides = {};
    try {
        const { data } = await supabase
            .from('on_call_schedule')
            .select('week_start, person_name')
            .gte('week_start', current.toISOString().split('T')[0])
            .lte('week_start', endDate.toISOString().split('T')[0]);

        if (data) {
            data.forEach(o => { overrides[o.week_start] = o.person_name; });
        }
    } catch (error) {
        // Continue with defaults if query fails
    }

    // Build schedule
    while (current <= lastDay) {
        const weekStart = current.toISOString().split('T')[0];
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const person = overrides[weekStart] || getDefaultOnCallForDate(current);
        const isOverride = !!overrides[weekStart];

        schedule.push({
            weekStart,
            weekEnd: weekEnd.toISOString().split('T')[0],
            person,
            isOverride
        });

        current.setDate(current.getDate() + 7);
    }

    return schedule;
}
