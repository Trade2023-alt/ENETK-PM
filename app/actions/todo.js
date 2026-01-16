'use server'

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function getTodoItems(specificUserId = null) {
    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('user_id')?.value;
    const targetUserId = specificUserId || loggedInUserId;

    if (!targetUserId) return { tasks: [] };

    try {
        // 1. Fetch Job Assignments
        const { data: jobAssignments, error: jobErr } = await supabase
            .from('job_assignments')
            .select(`
                job_id,
                job:jobs (
                    id,
                    title,
                    description,
                    status,
                    priority,
                    scheduled_date,
                    due_date,
                    customer:customers(name)
                )
            `)
            .eq('user_id', targetUserId);

        if (jobErr) console.error('Todo Job Fetch Error:', jobErr);

        // 2. Fetch Sub-task Assignments
        const { data: subTaskAssignments, error: subErr } = await supabase
            .from('sub_task_assignments')
            .select(`
                sub_task_id,
                sub_task:sub_tasks (
                    id,
                    job_id,
                    title,
                    status,
                    priority,
                    due_date,
                    job:jobs(title, customer:customers(name))
                )
            `)
            .eq('user_id', targetUserId);

        if (subErr) console.error('Todo Sub-task Fetch Error:', subErr);

        // Recursive safe helper to handle array/object ambiguity in Supabase returns
        const getSafe = (obj, path) => {
            let current = Array.isArray(obj) ? obj[0] : obj;
            if (!current) return null;

            const keys = path.split('.');
            for (const key of keys) {
                current = Array.isArray(current[key]) ? current[key][0] : current[key];
                if (!current) return null;
            }
            return current;
        };

        const tasks = [
            ...(jobAssignments || [])
                .filter(a => a && getSafe(a, 'job'))
                .map(a => {
                    const j = getSafe(a, 'job');
                    const cName = getSafe(j, 'customer.name') || 'N/A';
                    return {
                        id: `job-${j.id}`,
                        originalId: j.id,
                        type: 'Job',
                        title: j.title || 'Untitled Job',
                        description: j.description,
                        status: j.status || 'Pending',
                        priority: j.priority || 'Normal',
                        date: j.due_date || j.scheduled_date,
                        customer: cName,
                        parentTitle: null
                    };
                }),
            ...(subTaskAssignments || [])
                .filter(a => a && getSafe(a, 'sub_task'))
                .map(a => {
                    const st = getSafe(a, 'sub_task');
                    const j = getSafe(st, 'job');
                    const cName = getSafe(j, 'customer.name') || 'N/A';
                    return {
                        id: `sub-${st.id}`,
                        originalId: st.id,
                        type: 'Sub-task',
                        title: st.title || 'Untitled Task',
                        description: null,
                        status: st.status || 'Pending',
                        priority: st.priority || 'Normal',
                        date: st.due_date,
                        customer: cName,
                        parentTitle: j?.title || 'N/A'
                    };
                })
        ];

        return { tasks: tasks || [] };
    } catch (error) {
        console.error('getTodoItems critical:', error);
        return { error: 'Temporary data issue. Please refresh.', tasks: [] };
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
