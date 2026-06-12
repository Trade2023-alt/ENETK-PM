'use server'

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { sendNotificationToUsers, getAppUrl } from '@/lib/emailHelper';

export async function updateJobStatus(formData) {
    const jobId = formData.get('job_id');
    const status = formData.get('status');
    const priority = formData.get('priority');
    const usedHours = formData.get('used_hours');
    const estimatedHours = formData.get('estimated_hours');
    const dueDate = formData.get('due_date');
    const description = formData.get('description');
    const leadId = formData.get('lead_id');
    const isHiddenRaw = formData.get('is_hidden');
    const jobNumber = formData.get('job_number');
    const title = formData.get('title');
    const customerId = formData.get('customer_id');

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
        if (leadId !== null) updateData.lead_id = leadId === '' ? null : leadId;
        if (isHiddenRaw !== null) updateData.is_hidden = isHiddenRaw === 'true';
        if (jobNumber !== null) updateData.job_number = jobNumber;
        if (title !== null) updateData.title = title;
        if (customerId !== null) updateData.customer_id = customerId === '' ? null : customerId;

        updateData.updated_at = new Date().toISOString();

        if (Object.keys(updateData).length > 0) {
            const { error: jobError } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);

            if (jobError) throw jobError;
        }

        const assignedUserIds = formData.getAll('assigned_user_ids');

        // Fetch existing assignments to detect new ones
        const { data: existingAssignments } = await supabase
            .from('job_assignments')
            .select('user_id')
            .eq('job_id', jobId);
        
        const existingUserIds = existingAssignments?.map(a => a.user_id.toString()) || [];
        const newlyAssignedUserIds = assignedUserIds.filter(id => !existingUserIds.includes(id.toString()));

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

        // Send Email Notification to Newly Assigned Users
        if (newlyAssignedUserIds.length > 0) {
            const appUrl = getAppUrl();
            const subject = `🔔 You have been assigned to Project: "${currentJob.title || 'Unknown Project'}"`;
            const content = `
                <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                    <h2 style="color: #059669; margin-top: 0;">New Project Assignment</h2>
                    <p>You have been assigned to the project <strong>${currentJob.title || 'Unknown Project'}</strong>.</p>
                    <p>Please review the workspace for any pending tasks.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                    <p><a href="${appUrl}/jobs/${jobId}" style="background-color: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                </div>
            `;
            // Trigger async without waiting to not block UI
            sendNotificationToUsers(newlyAssignedUserIds, subject, content).catch(e => console.error('Email notify error:', e));
        }

        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/');

    } catch (error) {
        console.error('Error updating job:', error);
        return { error: 'Failed to update job: ' + error.message };
    }
}

