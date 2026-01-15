'use server'

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

export async function updateJobStatus(formData) {
    const jobId = formData.get('job_id');
    const status = formData.get('status');
    const priority = formData.get('priority');
    const usedHours = formData.get('used_hours');
    const estimatedHours = formData.get('estimated_hours');
    const dueDate = formData.get('due_date');
    const description = formData.get('description');

    try {
        // 1. Fetch current job to get current hours
        const { data: currentJob, error: fetchError } = await supabase
            .from('jobs')
            .select('actual_hours')
            .eq('id', jobId)
            .single();

        if (fetchError) throw fetchError;

        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        // ADDITIVE HOURS: add incoming hours to current hours
        const rawUsedHours = formData.get('used_hours');
        if (rawUsedHours !== null && rawUsedHours !== '') {
            const addedHours = parseFloat(rawUsedHours);
            if (!isNaN(addedHours)) {
                updateData.actual_hours = (currentJob.actual_hours || 0) + addedHours;
            }
        }

        const rawEstHours = formData.get('estimated_hours');
        if (rawEstHours !== null && rawEstHours !== '') {
            const estHours = parseFloat(rawEstHours);
            if (!isNaN(estHours)) {
                updateData.estimated_hours = estHours;
            }
        }
        if (dueDate !== null) updateData.due_date = dueDate === '' ? null : dueDate;
        if (description !== null) updateData.description = description;

        updateData.updated_at = new Date().toISOString();

        if (Object.keys(updateData).length > 0) {
            const { error: jobError } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);

            if (jobError) throw jobError;
        }

        const assignedUserIds = formData.getAll('assigned_user_ids');

        // Update Assignments
        await supabase.from('job_assignments').delete().eq('job_id', jobId);

        if (assignedUserIds.length > 0) {
            const assignments = assignedUserIds.map(userId => ({
                job_id: jobId,
                user_id: userId
            }));
            const { error: assignmentError } = await supabase.from('job_assignments').insert(assignments);
            if (assignmentError) throw assignmentError;
        }

        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/');

    } catch (error) {
        console.error('Error updating job:', error);
        return { error: 'Failed to update job: ' + error.message };
    }
}

