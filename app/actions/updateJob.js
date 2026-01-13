'use server'

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from '@/lib/db';

export async function updateJobStatus(formData) {
    const jobId = formData.get('job_id');
    const status = formData.get('status');
    const priority = formData.get('priority');
    const usedHours = formData.get('used_hours');
    const estimatedHours = formData.get('estimated_hours');
    const dueDate = formData.get('due_date');
    const description = formData.get('description'); // Optional description update

    try {
        // Prepare dynamic update
        const updates = [];
        const values = [];

        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        if (priority) {
            updates.push('priority = ?');
            values.push(priority);
        }
        if (usedHours) {
            updates.push('used_hours = ?');
            values.push(usedHours);
        }
        if (estimatedHours) {
            updates.push('estimated_hours = ?');
            values.push(estimatedHours);
        }
        if (dueDate) {
            updates.push('due_date = ?');
            values.push(dueDate);
        }
        if (description) {
            updates.push('description = ?');
            values.push(description);
        }

        if (updates.length > 0) {
            values.push(jobId);
            const stmt = db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`);
            stmt.run(...values);
        }

        // Handle Assignment Updates
        // We get the list of checked IDs. If none checked, it's an empty array.
        // We always wipe and re-insert to match the form state.
        const assignedUserIds = formData.getAll('assigned_user_ids');

        // Transaction for assignments
        db.transaction(() => {
            // Remove existing
            db.prepare('DELETE FROM job_assignments WHERE job_id = ?').run(jobId);

            // Insert new
            const insert = db.prepare('INSERT INTO job_assignments (job_id, user_id) VALUES (?, ?)');
            for (const userId of assignedUserIds) {
                insert.run(jobId, userId);
            }
        })();

        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/');

    } catch (error) {
        console.error('Error updating job:', error);
        return { error: 'Failed to update job' };
    }
}
