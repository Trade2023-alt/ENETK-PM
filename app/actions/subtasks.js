'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { sendNotificationToUsers, getAppUrl } from '@/lib/emailHelper';

export async function createSubTask(formData) {
    const jobId = formData.get('job_id');
    const title = formData.get('title');
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const dueDate = formData.get('due_date');
    const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
    const priority = formData.get('priority') || 'Normal';
    const parentIdRaw = formData.get('parent_id');
    const parentId = parentIdRaw ? parseInt(parentIdRaw, 10) : null;

    if (!jobId || !title) {
        return { error: 'Job ID and Title are required' };
    }

    try {
        const taskToInsert = {
            job_id: jobId,
            title,
            due_date: dueDate === '' ? null : dueDate,
            estimated_hours: estimatedHours,
            priority,
            parent_id: parentId
        };

        let { data: taskData, error: taskError } = await supabase
            .from('sub_tasks')
            .insert([taskToInsert])
            .select()
            .single();

        if (taskError && taskError.message.includes('sub_tasks_pkey')) {
            const { data: lastItem } = await supabase.from('sub_tasks').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            taskToInsert.id = nextId;

            const retry = await supabase.from('sub_tasks').insert([taskToInsert]).select().single();
            taskData = retry.data;
            taskError = retry.error;
        }

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

        if (assignedUserIds.length > 0) {
            const appUrl = getAppUrl();
            const subject = `🔔 You have been assigned to Subtask: "${title}"`;
            const content = `
                <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                    <h2 style="color: #059669; margin-top: 0;">New Subtask Assignment</h2>
                    <p>You have been assigned to the subtask <strong>${title}</strong>.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                    <p><a href="${appUrl}/jobs/${jobId}" style="background-color: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                </div>
            `;
            sendNotificationToUsers(assignedUserIds, subject, content).catch(e => console.error('Subtask notify error:', e));
        }

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
        // 1. Fetch current task to get current hours
        const { data: currentTask, error: fetchError } = await supabase
            .from('sub_tasks')
            .select('used_hours')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (title) {
            // Full Update
            const priority = formData.get('priority');
            const dueDate = formData.get('due_date');
            const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
            const rawUsedHours = formData.get('used_hours');
            const assignedUserIds = formData.getAll('assigned_user_ids');

            // Fetch existing assignments
            const { data: existingAssignments } = await supabase
                .from('sub_task_assignments')
                .select('user_id')
                .eq('sub_task_id', id);
            
            const existingUserIds = existingAssignments?.map(a => a.user_id.toString()) || [];
            const newlyAssignedUserIds = assignedUserIds.filter(uid => !existingUserIds.includes(uid.toString()));

            const updateFields = {
                title,
                priority,
                due_date: dueDate === '' ? null : dueDate,
                estimated_hours: estimatedHours,
                updated_at: new Date().toISOString()
            };

            // ADDITIVE HOURS
            if (rawUsedHours !== null && rawUsedHours !== '') {
                const addedHours = parseFloat(rawUsedHours);
                if (!isNaN(addedHours)) {
                    updateFields.used_hours = (currentTask.used_hours || 0) + addedHours;
                }
            }

            const { error: updateError } = await supabase
                .from('sub_tasks')
                .update(updateFields)
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

            if (newlyAssignedUserIds.length > 0) {
                const appUrl = getAppUrl();
                const subject = `🔔 You have been assigned to Subtask: "${title}"`;
                const content = `
                    <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                        <h2 style="color: #059669; margin-top: 0;">New Subtask Assignment</h2>
                        <p>You have been assigned to the subtask <strong>${title}</strong>.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                        <p><a href="${appUrl}/jobs/${jobId}" style="background-color: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                    </div>
                `;
                sendNotificationToUsers(newlyAssignedUserIds, subject, content).catch(e => console.error('Subtask notify error:', e));
            }

        } else {
            // Quick Status/Hours Update
            const statusRaw = formData.get('status');
            const usedHoursRaw = formData.get('used_hours');

            if (usedHoursRaw !== null && usedHoursRaw !== '') {
                const addedHours = parseFloat(usedHoursRaw);
                if (!isNaN(addedHours)) {
                    await supabase
                        .from('sub_tasks')
                        .update({
                            used_hours: (currentTask.used_hours || 0) + addedHours,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                }
            } else {
                const status = statusRaw === 'on' ? 'Complete' : 'Pending';
                const { error } = await supabase
                    .from('sub_tasks')
                    .update({ status: status, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
            }
        }
        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/todo');
        return { success: true };
    } catch (error) {
        console.error('Error updating subtask:', error);
        return { error: error.message };
    }
}

export async function bulkCreateSubTasks(tasks) {
    // tasks = [{ title, job_id, priority, due_date, assigned_user_ids: [] }]
    try {
        for (const task of tasks) {
            if (!task.title || !task.job_id) continue;

            const { data: taskData, error: taskError } = await supabase
                .from('sub_tasks')
                .insert([{
                    job_id: task.job_id,
                    title: task.title,
                    priority: task.priority || 'Normal',
                    due_date: task.due_date === '' ? null : task.due_date,
                    status: 'Pending'
                }])
                .select()
                .single();

            if (taskError) throw taskError;

            if (task.assigned_user_ids && task.assigned_user_ids.length > 0) {
                const assignments = task.assigned_user_ids.map(uid => ({
                    sub_task_id: taskData.id,
                    user_id: uid
                }));
                await supabase.from('sub_task_assignments').insert(assignments);

                const appUrl = getAppUrl();
                const subject = `🔔 You have been assigned to Subtask: "${task.title}"`;
                const content = `
                    <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                        <h2 style="color: #059669; margin-top: 0;">New Subtask Assignment</h2>
                        <p>You have been assigned to the subtask <strong>${task.title}</strong>.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                        <p><a href="${appUrl}/jobs/${task.job_id}" style="background-color: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                    </div>
                `;
                sendNotificationToUsers(task.assigned_user_ids, subject, content).catch(e => console.error('Bulk subtask notify error:', e));
            }
        }

        revalidatePath('/todo');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Bulk creation error:', error);
        return { error: error.message };
    }
}

