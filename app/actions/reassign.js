'use server'

import { supabase } from '@/lib/supabase';
import { sendNotificationToUsers, getAppUrl } from '@/lib/emailHelper';

export async function reassignTaskAction({ itemId, itemType, userId }) {
    try {
        if (!itemId || !itemType || !userId) {
            return { error: 'Missing parameters' };
        }

        let title = 'Unknown Task';
        if (itemType === 'job') {
            const { data: job, error: jobErr } = await supabase
                .from('jobs')
                .select('title')
                .eq('id', itemId)
                .single();
            if (jobErr) throw jobErr;
            title = job.title;

            // Delete existing assignments for this job
            const { error: delError } = await supabase
                .from('job_assignments')
                .eq('job_id', itemId)
                .delete();
            if (delError) throw delError;

            // Insert new assignment
            const { error: insError } = await supabase
                .from('job_assignments')
                .insert([{ job_id: itemId, user_id: userId }]);
            if (insError) throw insError;

        } else if (itemType === 'subtask') {
            const { data: subtask, error: subErr } = await supabase
                .from('sub_tasks')
                .select('title, job_id')
                .eq('id', itemId)
                .single();
            if (subErr) throw subErr;
            title = subtask.title;

            // Delete existing assignments for this subtask
            const { error: delError } = await supabase
                .from('sub_task_assignments')
                .eq('sub_task_id', itemId)
                .delete();
            if (delError) throw delError;

            // Insert new assignment
            const { error: insError } = await supabase
                .from('sub_task_assignments')
                .insert([{ sub_task_id: itemId, user_id: userId }]);
            if (insError) throw insError;
        }

        // Send Email Notification
        const appUrl = getAppUrl();
        const subject = `🔔 Task Reassigned to You: "${title}"`;
        const content = `
            <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                <h2 style="color: #059669; margin-top: 0;">Task Reassignment</h2>
                <p>The following ${itemType === 'job' ? 'job' : 'subtask'} has been reassigned to you: <strong>${title}</strong>.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                <p><a href="${appUrl}/schedule" style="background-color: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Schedule Board</a></p>
            </div>
        `;

        sendNotificationToUsers([userId], subject, content).catch(err => {
            console.error('Failed to send reassignment email:', err);
        });

        return { success: true };
    } catch (error) {
        console.error('Error in reassignTaskAction:', error);
        return { error: error.message };
    }
}
