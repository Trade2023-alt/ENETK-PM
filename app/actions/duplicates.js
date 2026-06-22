'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function findDuplicates() {
    try {
        // Fetch all jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, title, status, scheduled_date, due_date, estimated_hours, actual_hours, customer_id, customer:customers(name)')
            .order('title');

        if (jobsError) throw new Error(jobsError.message);

        // Fetch all subtasks
        const { data: subTasks, error: stError } = await supabase
            .from('sub_tasks')
            .select('id, job_id, title, status, start_date, due_date, estimated_hours, used_hours')
            .order('title');

        if (stError) throw new Error(stError.message);

        // Find duplicate jobs (same title, case-insensitive)
        const jobGroups = {};
        (jobs || []).forEach(j => {
            const key = (j.title || '').trim().toLowerCase();
            if (!key) return;
            if (!jobGroups[key]) jobGroups[key] = [];
            jobGroups[key].push({
                id: j.id,
                title: j.title,
                status: j.status,
                scheduled_date: j.scheduled_date,
                due_date: j.due_date,
                estimated_hours: j.estimated_hours || 0,
                actual_hours: j.actual_hours || 0,
                customer_name: j.customer?.name || '—',
                type: 'job'
            });
        });

        const duplicateJobs = Object.values(jobGroups).filter(group => group.length > 1);

        // Find duplicate subtasks (same title + same job_id)
        const stGroups = {};
        (subTasks || []).forEach(st => {
            const key = `${st.job_id}::${(st.title || '').trim().toLowerCase()}`;
            if (!(st.title || '').trim()) return;
            if (!stGroups[key]) stGroups[key] = [];
            stGroups[key].push({
                id: st.id,
                job_id: st.job_id,
                title: st.title,
                status: st.status,
                start_date: st.start_date,
                due_date: st.due_date,
                estimated_hours: st.estimated_hours || 0,
                used_hours: st.used_hours || 0,
                type: 'subtask'
            });
        });

        const duplicateSubTasks = Object.values(stGroups).filter(group => group.length > 1);

        return {
            success: true,
            duplicateJobs,
            duplicateSubTasks,
            totalDuplicateJobs: duplicateJobs.reduce((sum, g) => sum + g.length - 1, 0),
            totalDuplicateSubTasks: duplicateSubTasks.reduce((sum, g) => sum + g.length - 1, 0)
        };
    } catch (error) {
        console.error('Find duplicates error:', error);
        return { success: false, error: error.message };
    }
}

export async function removeDuplicates(jobIdsToDelete, subtaskIdsToDelete) {
    try {
        let deletedJobs = 0;
        let deletedSubtasks = 0;

        // Delete selected duplicate jobs
        if (jobIdsToDelete && jobIdsToDelete.length > 0) {
            // First delete assignments and subtasks for these jobs
            for (const jobId of jobIdsToDelete) {
                await supabase.from('job_assignments').delete().eq('job_id', jobId);
                await supabase.from('sub_tasks').delete().eq('job_id', jobId);
            }
            const { error } = await supabase.from('jobs').delete().in('id', jobIdsToDelete);
            if (error) throw new Error(error.message);
            deletedJobs = jobIdsToDelete.length;
        }

        // Delete selected duplicate subtasks
        if (subtaskIdsToDelete && subtaskIdsToDelete.length > 0) {
            await supabase.from('sub_task_assignments').delete().in('sub_task_id', subtaskIdsToDelete);
            const { error } = await supabase.from('sub_tasks').delete().in('id', subtaskIdsToDelete);
            if (error) throw new Error(error.message);
            deletedSubtasks = subtaskIdsToDelete.length;
        }

        revalidatePath('/');
        revalidatePath('/gantt');
        revalidatePath('/calendar');

        return { success: true, deletedJobs, deletedSubtasks };
    } catch (error) {
        console.error('Remove duplicates error:', error);
        return { success: false, error: error.message };
    }
}
