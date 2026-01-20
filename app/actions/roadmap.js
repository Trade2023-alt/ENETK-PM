'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Get all milestones (for master roadmap) with job info
export async function getMilestones() {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .select('*, job:jobs(id, title)')
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching milestones:', error);
        return [];
    }
}

// Get all sub-tasks with due dates for roadmap view
export async function getSubTasksForRoadmap() {
    try {
        const { data, error } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                priority,
                due_date,
                job_id,
                job:jobs(id, title),
                assignments:sub_task_assignments(user_id, user:users(id, username))
            `)
            .not('due_date', 'is', null)
            .order('due_date', { ascending: true });

        if (error) throw error;

        // Transform to roadmap-compatible format
        return (data || []).map(st => ({
            id: `subtask-${st.id}`,
            originalId: st.id,
            title: st.title,
            type: 'subtask',
            start_date: st.due_date,
            end_date: st.due_date,
            status: st.status === 'Complete' ? 'Achieved' : st.status === 'In Progress' ? 'In Progress' : 'Planned',
            priority: st.priority || 'Normal',
            job_id: st.job_id,
            job: st.job,
            assigned_users: st.assignments?.map(a => ({
                id: a.user?.id,
                username: a.user?.username
            })).filter(u => u.id) || []
        }));
    } catch (error) {
        console.error('Error fetching subtasks for roadmap:', error);
        return [];
    }
}

// Get milestones for a specific job
export async function getJobMilestones(jobId) {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .select('*')
            .eq('job_id', jobId)
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching job milestones:', error);
        return [];
    }
}

// Get sub-tasks for a specific job (for job-level roadmap)
export async function getJobSubTasksForRoadmap(jobId) {
    try {
        const { data, error } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                priority,
                due_date,
                job_id,
                assignments:sub_task_assignments(user_id, user:users(id, username))
            `)
            .eq('job_id', jobId)
            .not('due_date', 'is', null)
            .order('due_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(st => ({
            id: `subtask-${st.id}`,
            originalId: st.id,
            title: st.title,
            type: 'subtask',
            start_date: st.due_date,
            end_date: st.due_date,
            status: st.status === 'Complete' ? 'Achieved' : st.status === 'In Progress' ? 'In Progress' : 'Planned',
            priority: st.priority || 'Normal',
            job_id: st.job_id,
            assigned_users: st.assignments?.map(a => ({
                id: a.user?.id,
                username: a.user?.username
            })).filter(u => u.id) || []
        }));
    } catch (error) {
        console.error('Error fetching job subtasks for roadmap:', error);
        return [];
    }
}

// Get manloading data (team capacity vs task load)
export async function getManloadingData() {
    try {
        // Get all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, role');

        if (usersError) throw usersError;

        // Get all active jobs with their assignments
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                status,
                scheduled_date,
                due_date,
                estimated_hours,
                assignments:job_assignments(user_id)
            `)
            .neq('status', 'Complete');

        if (jobsError) throw jobsError;

        // Get all sub-tasks with assignments
        const { data: subTasks, error: subTasksError } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                due_date,
                estimated_hours,
                job_id,
                assignments:sub_task_assignments(user_id)
            `)
            .neq('status', 'Complete');

        if (subTasksError) throw subTasksError;

        // Calculate manloading per job
        const jobManloading = (jobs || []).map(job => {
            const jobSubTasks = (subTasks || []).filter(st => st.job_id === job.id);
            const assignedUserIds = new Set([
                ...(job.assignments?.map(a => a.user_id) || []),
                ...jobSubTasks.flatMap(st => st.assignments?.map(a => a.user_id) || [])
            ]);

            return {
                job_id: job.id,
                job_title: job.title,
                status: job.status,
                scheduled_date: job.scheduled_date,
                due_date: job.due_date,
                estimated_hours: job.estimated_hours || 0,
                subtask_count: jobSubTasks.length,
                subtask_hours: jobSubTasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0),
                assigned_count: assignedUserIds.size,
                assigned_user_ids: Array.from(assignedUserIds)
            };
        });

        return {
            team_size: users?.length || 0,
            users: users || [],
            total_active_jobs: jobs?.length || 0,
            total_active_subtasks: subTasks?.length || 0,
            job_manloading: jobManloading
        };
    } catch (error) {
        console.error('Error fetching manloading data:', error);
        return { error: error.message };
    }
}

export async function createMilestone(formData) {
    const title = formData.get('title');
    const description = formData.get('description');
    const start_date = formData.get('start_date');
    const end_date = formData.get('end_date');
    const status = formData.get('status') || 'Planned';
    const priority = formData.get('priority') || 'Normal';
    const job_id = formData.get('job_id') || null;

    if (!title || !start_date || !end_date) {
        return { error: 'Title, Start Date, and End Date are required.' };
    }

    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .insert([{
                title,
                description,
                start_date,
                end_date,
                status,
                priority,
                job_id
            }])
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/roadmap');
        if (job_id) revalidatePath(`/jobs/${job_id}`);
        return { success: true, milestone: data };
    } catch (error) {
        console.error('Error creating milestone:', error);
        return { error: error.message };
    }
}

export async function updateMilestone(id, updates) {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/roadmap');
        if (data.job_id) revalidatePath(`/jobs/${data.job_id}`);
        return { success: true, milestone: data };
    } catch (error) {
        console.error('Error updating milestone:', error);
        return { error: error.message };
    }
}

export async function deleteMilestone(id) {
    try {
        // Get job_id before delete for revalidation
        const { data: existing } = await supabase
            .from('roadmap_milestones')
            .select('job_id')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('roadmap_milestones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/roadmap');
        if (existing?.job_id) revalidatePath(`/jobs/${existing.job_id}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting milestone:', error);
        return { error: error.message };
    }
}
