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

        const safeObj = (val) => Array.isArray(val) ? val[0] : val;

        const tasks = [
            ...(jobAssignments || [])
                .filter(a => a && a.job)
                .map(a => {
                    const j = safeObj(a.job);
                    const c = safeObj(j?.customer);
                    return {
                        id: `job-${j?.id}`,
                        originalId: j?.id,
                        type: 'Job',
                        title: j?.title || 'Untitled Job',
                        description: j?.description,
                        status: j?.status || 'Pending',
                        priority: j?.priority || 'Normal',
                        date: j?.due_date || j?.scheduled_date,
                        customer: c?.name || 'N/A',
                        parentTitle: null
                    };
                }),
            ...(subTaskAssignments || [])
                .filter(a => a && a.sub_task)
                .map(a => {
                    const st = safeObj(a.sub_task);
                    const j = safeObj(st?.job);
                    const c = safeObj(j?.customer);
                    return {
                        id: `sub-${st?.id}`,
                        originalId: st?.id,
                        type: 'Sub-task',
                        title: st?.title || 'Untitled Task',
                        description: null,
                        status: st?.status || 'Pending',
                        priority: st?.priority || 'Normal',
                        date: st?.due_date,
                        customer: c?.name || 'N/A',
                        parentTitle: j?.title || 'N/A'
                    };
                })
        ];

        return { tasks };
    } catch (error) {
        console.error('getTodoItems critical:', error);
        return { error: 'Service temporarily unavailable. Please contact support.', tasks: [] };
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
