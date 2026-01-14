'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createSubTask(formData) {
    const jobId = formData.get('job_id');
    const title = formData.get('title');
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const dueDate = formData.get('due_date');
    const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
    const priority = formData.get('priority') || 'Normal';

    if (!jobId || !title) {
        return { error: 'Job ID and Title are required' };
    }

    try {
        const { data: taskData, error: taskError } = await supabase
            .from('sub_tasks')
            .insert([{
                job_id: jobId,
                title,
                due_date: dueDate === '' ? null : dueDate,
                estimated_hours: estimatedHours,
                priority
            }])
            .select()
            .single();

        if (taskError) throw taskError;

        const subTaskId = taskData.id;

        const assignments = assignedUserIds.map(userId => ({
            sub_task_id: subTaskId,
            user_id: userId
        }));

        const { error: assignmentError } = await supabase
            .from('sub_task_assignments')
            .insert(assignments);

        if (assignmentError) throw assignmentError;

        revalidatePath(`/jobs/${jobId}`);
    } catch (error) {
        console.error('Error creating subtask:', error);
        return { error: 'Failed to create subtask: ' + error.message };
    }
}

export async function updateSubTask(formData) {
    const id = formData.get('id');
    const jobId = formData.get('job_id');
    const title = formData.get('title');

    try {
        if (title) {
            // Full Update
            const priority = formData.get('priority');
            const dueDate = formData.get('due_date');
            const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
            const usedHours = parseFloat(formData.get('used_hours') || '0');
            const assignedUserIds = formData.getAll('assigned_user_ids');

            const { error: updateError } = await supabase
                .from('sub_tasks')
                .update({
                    title,
                    priority,
                    due_date: dueDate === '' ? null : dueDate,
                    estimated_hours: estimatedHours,
                    used_hours: usedHours,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Update Assignments (Delete then Insert)
            await supabase.from('sub_task_assignments').delete().eq('sub_task_id', id);

            const assignments = assignedUserIds.map(userId => ({
                sub_task_id: id,
                user_id: userId
            }));

            if (assignments.length > 0) {
                await supabase.from('sub_task_assignments').insert(assignments);
            }

        } else {
            // Quick Status/Hours Update
            const status = formData.get('status') === 'on' ? 'Complete' : 'Pending';
            const usedHoursRaw = formData.get('used_hours');

            if (usedHoursRaw !== null) {
                const usedHours = parseFloat(usedHoursRaw || '0');
                const { error } = await supabase
                    .from('sub_tasks')
                    .update({ used_hours: usedHours, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('sub_tasks')
                    .update({ status: status, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
            }
        }
        revalidatePath(`/jobs/${jobId}`);
    } catch (error) {
        console.error('Error updating subtask:', error);
    }
}

