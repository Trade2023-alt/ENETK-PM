'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// On-call rotation roster (in order)
const ON_CALL_ROSTER = [
    'Matt Huber',
    'Loren McCray',
    'Rami Douri',
    'Seth Peterson',
    'Cole Kadrmas',
    'Jack Morris',
    'Kyle Merrill'
];

// Start date for the rotation (Monday of the first week)
const ROTATION_START_DATE = new Date('2026-01-20'); // Today - adjust as needed

/**
 * Get who is on call for a specific date
 */
export async function getOnCallForDate(dateStr) {
    const date = new Date(dateStr);
    const startDate = new Date(ROTATION_START_DATE);

    // Calculate weeks since start
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((date - startDate) / msPerWeek);

    // Handle dates before rotation start
    const adjustedWeeks = weeksSinceStart < 0
        ? ON_CALL_ROSTER.length - (Math.abs(weeksSinceStart) % ON_CALL_ROSTER.length)
        : weeksSinceStart;

    const rosterIndex = adjustedWeeks % ON_CALL_ROSTER.length;

    return ON_CALL_ROSTER[rosterIndex];
}

/**
 * Get on-call schedule for a date range (for calendar display)
 */
export async function getOnCallSchedule(startDate, endDate) {
    const schedule = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Find the Monday of each week in the range
    let current = new Date(start);
    // Adjust to Monday
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setDate(current.getDate() + daysToMonday);

    while (current <= end) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const onCallPerson = await getOnCallForDate(weekStart.toISOString().split('T')[0]);

        schedule.push({
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            person: onCallPerson
        });

        // Move to next week
        current.setDate(current.getDate() + 7);
    }

    return schedule;
}

/**
 * Get the full rotation roster
 */
export async function getOnCallRoster() {
    return ON_CALL_ROSTER;
}

/**
 * Get current on-call person
 */
export async function getCurrentOnCall() {
    const today = new Date().toISOString().split('T')[0];
    return await getOnCallForDate(today);
}

/**
 * Get on-call info for the calendar month view
 */
export async function getOnCallForMonth(year, month) {
    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Extend to include full weeks
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(lastDay);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

    return await getOnCallSchedule(
        startOfWeek.toISOString().split('T')[0],
        endOfWeek.toISOString().split('T')[0]
    );
}
