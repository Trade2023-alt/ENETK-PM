'use server'

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function getTodoItems(specificUserId = null) {
    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('user_id')?.value;

    // Default to currently logged in user if no ID provided
    const targetUserId = specificUserId || loggedInUserId;

    if (!targetUserId) return { error: 'No user identified' };

    try {
        // 1. Fetch Job Assignments for this user
        const { data: jobAssignments, error: jobErr } = await supabase
            .from('job_assignments')
            .select(`
                job:jobs (
                    id,
                    title,
                    description,
                    status,
                    priority,
                    scheduled_date,
                    due_date,
                    customer:customers (name)
                )
            `)
            .eq('user_id', targetUserId);

        if (jobErr) {
            console.error('Job fetching error:', jobErr);
            // Don't throw, just allow empty
        }

        // 2. Fetch Sub-task Assignments for this user
        const { data: subTaskAssignments, error: subErr } = await supabase
            .from('sub_task_assignments')
            .select(`
                sub_task:sub_tasks (
                    id,
                    job_id,
                    title,
                    status,
                    priority,
                    due_date,
                    job:jobs (title, customer:customers(name))
                )
            `)
            .eq('user_id', targetUserId);

        if (subErr) {
            console.error('Sub-task fetching error:', subErr);
        }

        // 3. Format and Consolidate with extreme safety
        const tasks = [
            ...(jobAssignments || [])
                .filter(a => a && a.job)
                .map(a => ({
                    id: `job-${a.job.id}`,
                    originalId: a.job.id,
                    type: 'Job',
                    title: a.job.title || 'Untitled Job',
                    description: a.job.description,
                    status: a.job.status || 'Pending',
                    priority: a.job.priority || 'Normal',
                    date: a.job.due_date || a.job.scheduled_date,
                    customer: a.job.customer?.name || 'N/A',
                    parentTitle: null
                })),
            ...(subTaskAssignments || [])
                .filter(a => a && a.sub_task)
                .map(a => ({
                    id: `sub-${a.sub_task.id}`,
                    originalId: a.sub_task.id,
                    type: 'Sub-task',
                    title: a.sub_task.title || 'Untitled Task',
                    description: null,
                    status: a.sub_task.status || 'Pending',
                    priority: a.sub_task.priority || 'Normal',
                    date: a.sub_task.due_date,
                    customer: a.sub_task.job?.customer?.name || 'N/A',
                    parentTitle: a.sub_task.job?.title || 'N/A'
                }))
        ];

        return { tasks };
    } catch (error) {
        console.error('getTodoItems critical error:', error);
        return { error: 'Failed to load To-Do items. This is likely a data configuration issue.' };
    }
}

export async function getAllUsersForSelect() {
    const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

    if (error) return [];
    return data;
}
