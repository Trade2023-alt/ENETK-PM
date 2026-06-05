import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendNotificationToUsers } from '@/lib/emailHelper';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Simple protection. In production, set CRON_SECRET in your .env
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized. Invalid or missing secret.' }, { status: 401 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let sentCount = 0;

        // 1. Process Jobs
        const { data: jobs } = await supabase
            .from('jobs')
            .select(`
                id, title, due_date, status,
                assignments:job_assignments(user_id)
            `)
            .neq('status', 'Complete')
            .not('due_date', 'is', null);

        for (const job of (jobs || [])) {
            const dueDate = new Date(job.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const isTomorrow = dueDate.getTime() === tomorrow.getTime();
            const isOverdue = dueDate.getTime() < today.getTime();

            if (isTomorrow || isOverdue) {
                const userIds = job.assignments?.map(a => a.user_id) || [];
                if (userIds.length > 0) {
                    const statusText = isOverdue ? 'OVERDUE' : 'DUE TOMORROW';
                    const color = isOverdue ? '#ef4444' : '#f59e0b';
                    
                    const subject = `⚠️ Reminder: Project "${job.title || 'Unknown'}" is ${statusText}`;
                    const content = `
                        <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid ${color}; border-radius: 8px;">
                            <h2 style="color: ${color}; margin-top: 0;">Project Deadline Reminder</h2>
                            <p>The project <strong>${job.title || 'Unknown'}</strong> is <strong>${statusText.toLowerCase()}</strong>.</p>
                            <p><strong>Due Date:</strong> ${new Date(job.due_date).toLocaleDateString()}</p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                            <p><a href="http://localhost:3000/jobs/${job.id}" style="background-color: ${color}; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                        </div>
                    `;
                    
                    await sendNotificationToUsers(userIds, subject, content);
                    sentCount++;
                }
            }
        }

        // 2. Process Subtasks
        const { data: subTasks } = await supabase
            .from('sub_tasks')
            .select(`
                id, job_id, title, due_date, status,
                assignments:sub_task_assignments(user_id)
            `)
            .neq('status', 'Complete')
            .not('due_date', 'is', null);

        for (const subTask of (subTasks || [])) {
            const dueDate = new Date(subTask.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const isTomorrow = dueDate.getTime() === tomorrow.getTime();
            const isOverdue = dueDate.getTime() < today.getTime();

            if (isTomorrow || isOverdue) {
                const userIds = subTask.assignments?.map(a => a.user_id) || [];
                if (userIds.length > 0) {
                    const statusText = isOverdue ? 'OVERDUE' : 'DUE TOMORROW';
                    const color = isOverdue ? '#ef4444' : '#f59e0b';
                    
                    const subject = `⚠️ Reminder: Subtask "${subTask.title || 'Unknown'}" is ${statusText}`;
                    const content = `
                        <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid ${color}; border-radius: 8px;">
                            <h2 style="color: ${color}; margin-top: 0;">Subtask Deadline Reminder</h2>
                            <p>The subtask <strong>${subTask.title || 'Unknown'}</strong> is <strong>${statusText.toLowerCase()}</strong>.</p>
                            <p><strong>Due Date:</strong> ${new Date(subTask.due_date).toLocaleDateString()}</p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                            <p><a href="http://localhost:3000/jobs/${subTask.job_id}" style="background-color: ${color}; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                        </div>
                    `;
                    
                    await sendNotificationToUsers(userIds, subject, content);
                    sentCount++;
                }
            }
        }

        return NextResponse.json({ success: true, message: `Cron executed successfully. Checked deadlines and sent ${sentCount} reminder emails.` });

    } catch (e) {
        console.error('Cron error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
