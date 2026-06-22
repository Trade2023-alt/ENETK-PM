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

        // 2. Fetch all subtasks for the jobs where the user is the job lead
        const leadJobIds = (leadJobs || []).map(j => j.id);
        let leadJobSubTasks = [];
        if (leadJobIds.length > 0) {
            const { data: subTasksForLeadJobs, error: subLeadErr } = await supabase
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
                    job:jobs(title, lead_id, customer:customers(name)),
                    assignments:sub_task_assignments(
                        user_id,
                        user:users(id, username)
                    )
                `)
                .in('job_id', leadJobIds);
                
            if (!subLeadErr && subTasksForLeadJobs) {
                leadJobSubTasks = subTasksForLeadJobs;
            }
        }

        // 3. Fetch any subtasks explicitly assigned to the user
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
                    job:jobs(title, lead_id, customer:customers(name)),
                    assignments:sub_task_assignments(
                        user_id,
                        user:users(id, username)
                    )
                )
            `)
            .eq('user_id', targetUserId);

        if (subErr) console.error('Todo Sub-task Fetch Error:', subErr);

        const allSubTasksMap = new Map();
        
        if (subTaskAssignments) {
            subTaskAssignments.forEach(a => {
                const st = getSafe(a, 'sub_task');
                if (st) {
                    allSubTasksMap.set(st.id, st);
                }
            });
        }
        
        leadJobSubTasks.forEach(st => {
            if (!allSubTasksMap.has(st.id)) {
                allSubTasksMap.set(st.id, st);
            }
        });
        
        const allSubTasks = Array.from(allSubTasksMap.values());

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

                    const subAssignments = st.assignments || [];
                    const isAssigned = subAssignments.some(a => String(a.user_id) === String(targetUserId));
                    const isLead = j && String(j.lead_id) === String(targetUserId);

                    const type = isAssigned ? (st.parent_id ? 'Micro Task' : 'Sub-task') : (isLead ? 'Follow-up' : 'Sub-task');
                    const assigneeList = subAssignments.map(a => getSafe(a, 'user.username')).filter(Boolean);
                    const assignedTo = assigneeList.join(', ') || 'Unassigned';

                    return {
                        id: `sub-${st.id}`,
                        originalId: st.id,
                        type: type,
                        title: st.title || 'Untitled Task',
                        description: null,
                        status: st.status || 'Pending',
                        priority: st.priority || 'Normal',
                        date: st.due_date,
                        customer: cName,
                        parentTitle: parentContext,
                        jobId: st.job_id,
                        assignedTo: assignedTo
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
