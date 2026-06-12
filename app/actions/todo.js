'use server'

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function getTodoItems(specificUserId = null) {
    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('user_id')?.value;
    const targetUserId = specificUserId || loggedInUserId;

    if (!targetUserId) return { tasks: [] };

    try {
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

        // Fetch jobs where user is the lead
        const { data: leadJobs, error: leadErr } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                description,
                status,
                priority,
                scheduled_date,
                due_date,
                customer:customers(name)
            `)
            .eq('lead_id', targetUserId);

        if (leadErr) console.error('Todo Lead Job Fetch Error:', leadErr);

        const assignedJobs = (jobAssignments || [])
            .map(a => getSafe(a, 'job'))
            .filter(Boolean);

        const allUserJobs = [...assignedJobs];
        if (leadJobs) {
            leadJobs.forEach(lj => {
                if (!allUserJobs.find(j => j.id === lj.id)) {
                    allUserJobs.push(lj);
                }
            });
        }

        const jobIds = allUserJobs.map(j => j.id);

        // 2. Fetch all subtasks for the jobs the user is assigned to (or is lead of)
        let allSubTasks = [];
        if (jobIds.length > 0) {
            const { data: jobSubTasks, error: jobSubErr } = await supabase
                .from('sub_tasks')
                .select(`
                    id,
                    job_id,
                    title,
                    status,
                    priority,
                    due_date,
                    parent_id,
                    parent:sub_tasks!parent_id(title),
                    job:jobs(title, customer:customers(name))
                `)
                .in('job_id', jobIds);
                
            if (!jobSubErr && jobSubTasks) {
                allSubTasks = [...jobSubTasks];
            }
        }

        // 3. Fetch any subtasks explicitly assigned to the user (if they aren't assigned to the parent job)
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
                    parent_id,
                    parent:sub_tasks!parent_id(title),
                    job:jobs(title, customer:customers(name))
                )
            `)
            .eq('user_id', targetUserId);

        if (subErr) console.error('Todo Sub-task Fetch Error:', subErr);

        if (subTaskAssignments) {
            subTaskAssignments.forEach(a => {
                const st = getSafe(a, 'sub_task');
                if (st && !allSubTasks.find(existing => existing.id === st.id)) {
                    allSubTasks.push(st);
                }
            });
        }

        const tasks = [
            ...(allUserJobs || [])
                .map(j => {
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
                        parentTitle: null,
                        jobId: j.id
                    };
                }),
            ...(allSubTasks || [])
                .filter(st => st)
                .map(st => {
                    const j = getSafe(st, 'job');
                    const parent = getSafe(st, 'parent');
                    const cName = getSafe(j, 'customer.name') || 'N/A';
                    
                    let parentContext = j?.title || 'N/A';
                    if (parent && parent.title) {
                        parentContext = `${parentContext} > ${parent.title}`;
                    }

                    return {
                        id: `sub-${st.id}`,
                        originalId: st.id,
                        type: st.parent_id ? 'Micro Task' : 'Sub-task',
                        title: st.title || 'Untitled Task',
                        description: null,
                        status: st.status || 'Pending',
                        priority: st.priority || 'Normal',
                        date: st.due_date,
                        customer: cName,
                        parentTitle: parentContext,
                        jobId: st.job_id
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
