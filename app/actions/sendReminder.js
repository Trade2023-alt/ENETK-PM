'use server'

import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/outlook';

export async function sendManualReminder(jobId) {
    try {
        // Fetch sender (admin/system user)
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id')
            .not('ms_refresh_token', 'is', null)
            .limit(1)
            .maybeSingle();

        const senderId = sender?.id || 1;

        // Fetch job and its assignees
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                due_date,
                assignments:job_assignments(
                    user:users(email, username)
                )
            `)
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return { error: 'Job not found' };
        }

        const assignees = job.assignments?.map(a => a.user).filter(Boolean) || [];
        if (assignees.length === 0) {
            return { error: 'No users assigned to this job to remind.' };
        }

        const subject = `🔔 Manual Reminder: Project "${job.title}"`;
        const content = `
            <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #3b82f6; border-radius: 8px;">
                <h2 style="color: #1d4ed8; margin-top: 0;">Project Update Reminder</h2>
                <p>This is a manual reminder for the project <strong>${job.title}</strong>.</p>
                <p><strong>Due Date:</strong> ${job.due_date ? new Date(job.due_date).toLocaleDateString() : 'Not Set'}</p>
                <p>Please ensure all your tasks are up to date.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                <p><a href="http://localhost:3000/jobs/${job.id}" style="background-color: #3b82f6; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
            </div>
        `;

        let sentCount = 0;
        for (const user of assignees) {
            if (user.email) {
                const sent = await sendEmail(senderId, user.email, subject, content);
                if (sent) sentCount++;
            }
        }

        return { success: true, message: `Sent ${sentCount} reminder(s).` };
    } catch (e) {
        console.error('Error sending manual reminder:', e);
        return { error: e.message };
    }
}
