'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';

export async function createJob(formData) {
    const title = formData.get('title');
    const description = formData.get('description');
    const customerId = formData.get('customer_id');
    const customerContactId = formData.get('customer_contact_id') || null;
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const scheduledDate = formData.get('scheduled_date');
    const estimatedHours = formData.get('estimated_hours');
    const dueDate = formData.get('due_date');
    const priority = formData.get('priority') || 'Normal';

    if (!title || !customerId || assignedUserIds.length === 0 || !scheduledDate) {
        return { error: 'Missing required fields' };
    }

    try {
        const insertJob = db.prepare(`
            INSERT INTO jobs (title, description, customer_id, customer_contact_id, scheduled_date, estimated_hours, due_date, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)
        `);

        // Insert job first to get ID
        const result = insertJob.run(title, description, customerId, customerContactId, scheduledDate, estimatedHours, dueDate || null, priority);
        const jobId = result.lastInsertRowid;

        // Insert assignments
        const insertAssignment = db.prepare('INSERT INTO job_assignments (job_id, user_id) VALUES (?, ?)');

        // Transaction for better performance and safety
        db.transaction(() => {
            for (const userId of assignedUserIds) {
                insertAssignment.run(jobId, userId);
            }
        })();

    } catch (error) {
        console.error('Error creating job:', error);
        return { error: 'Failed to create job' };
    }

    redirect('/');
}
