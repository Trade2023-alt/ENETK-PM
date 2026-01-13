'use server'

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from '@/lib/db';

export async function createSubTask(formData) {
    const jobId = formData.get('job_id');
    const title = formData.get('title');
    const assignedUserIds = formData.getAll('assigned_user_ids');
    const dueDate = formData.get('due_date');
    const estimatedHours = formData.get('estimated_hours');
    const priority = formData.get('priority') || 'Normal';

    if (!jobId || !title) {
        return { error: 'Job ID and Title are required' };
    }

    try {
        const insertTask = db.prepare(`
            INSERT INTO sub_tasks (job_id, title, due_date, estimated_hours, priority)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Transaction
        const runTransaction = db.transaction(() => {
            const result = insertTask.run(jobId, title, dueDate || null, estimatedHours || 0, priority);
            const subTaskId = result.lastInsertRowid;

            const insertAssignment = db.prepare('INSERT INTO sub_task_assignments (sub_task_id, user_id) VALUES (?, ?)');
            for (const userId of assignedUserIds) {
                insertAssignment.run(subTaskId, userId);
            }
        });

        runTransaction();
        revalidatePath(`/jobs/${jobId}`);
    } catch (error) {
        console.error('Error creating subtask:', error);
        return { error: 'Failed to create subtask' };
    }
}

export async function updateSubTask(formData) {
    const id = formData.get('id');
    const jobId = formData.get('job_id');

    // Check if this is a full update (has title)
    const title = formData.get('title');

    try {
        if (title) {
            // Full Update
            const priority = formData.get('priority');
            const dueDate = formData.get('due_date');
            const estimatedHours = formData.get('estimated_hours');
            const usedHours = formData.get('used_hours'); // Allow updating used hours in full edit too
            const assignedUserIds = formData.getAll('assigned_user_ids');

            // Transaction for full update
            db.transaction(() => {
                const stmt = db.prepare(`
                    UPDATE sub_tasks 
                    SET title = ?, priority = ?, due_date = ?, estimated_hours = ?, used_hours = ?
                    WHERE id = ?
                `);
                stmt.run(title, priority, dueDate || null, estimatedHours || 0, usedHours || 0, id);

                // Update Assignments
                db.prepare('DELETE FROM sub_task_assignments WHERE sub_task_id = ?').run(id);
                const insertAssignment = db.prepare('INSERT INTO sub_task_assignments (sub_task_id, user_id) VALUES (?, ?)');
                for (const userId of assignedUserIds) {
                    insertAssignment.run(id, userId);
                }
            })();

        } else {
            // Quick Status/Hours Update
            const status = formData.get('status') === 'on' ? 'Complete' : 'Pending';
            const usedHours = formData.get('used_hours');

            if (usedHours !== null) {
                const stmt = db.prepare('UPDATE sub_tasks SET used_hours = ? WHERE id = ?');
                stmt.run(usedHours, id);
            } else {
                // Status Toggle (Status checkbox sends 'on' if checked, nothing if not. 
                // Wait, if unchecked, it sends nothing? 
                // The toggle works by submitting the form. If I uncheck, the change event fires. 
                // But if the checkbox is unchecked, formData.get('status') is null.
                // My previous logic: `const status = formData.get('status') === 'on' ? 'Complete' : 'Pending';`
                // This implies if it's null (unchecked), it becomes Pending. This is correct for a toggle.
                const stmt = db.prepare('UPDATE sub_tasks SET status = ? WHERE id = ?');
                stmt.run(status, id);
            }
        }
        revalidatePath(`/jobs/${jobId}`);
    } catch (error) {
        console.error('Error updating subtask:', error);
    }
}
