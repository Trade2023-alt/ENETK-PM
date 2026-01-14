'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createJob(formData) {
    const title = formData.get('title');
    const description = formData.get('description');
    const customerId = formData.get('customer_id');
    const customerContactId = formData.get('customer_contact_id') || null;
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const scheduledDate = formData.get('scheduled_date');
    const estimatedHours = parseFloat(formData.get('estimated_hours') || '0');
    const dueDate = formData.get('due_date');
    const priority = formData.get('priority') || 'Normal';

    if (!title || !customerId || assignedUserIds.length === 0 || !scheduledDate) {
        return { error: 'Missing required fields' };
    }

    try {
        // Insert job
        const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .insert([{
                title,
                description,
                customer_id: customerId,
                customer_contact_id: customerContactId === '' ? null : customerContactId,
                scheduled_date: scheduledDate,
                estimated_hours: estimatedHours,
                due_date: dueDate === '' ? null : dueDate,
                status: 'Scheduled',
                priority
            }])
            .select()
            .single();

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

    } catch (error) {
        console.error('Error creating job:', error);
        return { error: 'Failed to create job: ' + error.message };
    }

    revalidatePath('/');
    redirect('/');
}

