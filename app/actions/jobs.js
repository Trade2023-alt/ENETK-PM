'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { sendNotificationToUsers, getAppUrl } from '@/lib/emailHelper';

export async function createJob(prevState, formData) {
    const title = formData.get('title');
    const jobNumber = formData.get('job_number') || null;
    const description = formData.get('description');
    const customerId = formData.get('customer_id');
    const customerContactId = formData.get('customer_contact_id') || null;
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const leadId = formData.get('lead_id');
    const scheduledDate = formData.get('scheduled_date');
    const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
    const dueDate = formData.get('due_date');
    const priority = formData.get('priority') || 'Normal';

    if (!title || !customerId || assignedUserIds.length === 0 || !scheduledDate || !dueDate) {
        return { error: 'Missing required fields. Please ensure Title, Customer, Team, Schedule, and Due Date are set.' };
    }

    try {
        // Insert job
        // Insert job with sequence mismatch recovery
        const jobToInsert = {
            title,
            job_number: jobNumber,
            description,
            customer_id: customerId,
            customer_contact_id: customerContactId === '' ? null : customerContactId,
            lead_id: leadId === '' ? null : leadId,
            scheduled_date: scheduledDate,
            estimated_hours: estimatedHours,
            due_date: dueDate === '' ? null : dueDate,
            status: 'Scheduled',
            priority
        };

        let { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .insert([jobToInsert])
            .select()
            .single();

        if (jobError && jobError.message.includes('jobs_pkey')) {
            const { data: lastItem } = await supabase.from('jobs').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            jobToInsert.id = nextId;

            const retry = await supabase.from('jobs').insert([jobToInsert]).select().single();
            jobData = retry.data;
            jobError = retry.error;
        }

        if (jobError) throw jobError;

        const jobId = jobData.id;

        // Insert job assignments
        const assignments = assignedUserIds.map(userId => ({
            job_id: jobId,
            user_id: userId
        }));

        const { error: assignmentError } = await supabase
            .from('job_assignments')
            .insert(assignments);

        if (assignmentError) throw assignmentError;

        // Send Email Notification
        const appUrl = getAppUrl();
        const usersToNotify = new Set([...assignedUserIds]);
        if (leadId) usersToNotify.add(leadId.toString());

        const emailRecipients = Array.from(usersToNotify);

        if (emailRecipients.length > 0) {
            const subject = `🚀 New Project Assignment: "${title}"`;
            const content = `
                <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #3b82f6; border-radius: 8px;">
                    <h2 style="color: #2563eb; margin-top: 0;">New Project Created & Assigned</h2>
                    <p>You have been assigned to the new project: <strong>${title}</strong></p>
                    ${jobNumber ? `<p><strong>Job Number:</strong> ${jobNumber}</p>` : ''}
                    <p><strong>Scheduled Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
                    ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                    <p><a href="${appUrl}/jobs/${jobId}" style="background-color: #3b82f6; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                </div>
            `;
            sendNotificationToUsers(emailRecipients, subject, content).catch(e => console.error('Job creation notify error:', e));
        }

    } catch (error) {
        console.error('Error creating job:', error);
        return { error: 'Failed to create job: ' + error.message };
    }

    revalidatePath('/');
    redirect('/');
}

export async function getAllJobs() {
    const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');
    if (error) return [];
    return data;
}

