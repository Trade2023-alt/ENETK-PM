import cron from 'node-cron';
import { supabase } from './supabase.js';
import { sendEmail } from './outlook.js';
import { GoogleGenAI } from '@google/genai';

let isCronInitialized = false;

// Helper to find a user who has connected their Microsoft Graph account
async function getSystemEmailUser() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .not('ms_refresh_token', 'is', null)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data?.id || 1; // Fallback to admin ID 1
    } catch (e) {
        console.error('Error fetching system email user:', e);
        return 1; // Default fallback
    }
}

// Main checking task
export async function runAlertAndSummaryChecks() {
    console.log('[Cron] Starting PM alert and summary checks...');
    const senderUserId = await getSystemEmailUser();

    // ----------------------------------------------------
    // 1. PROJECT HOURS CHECK (50% BUDGET ALERT)
    // ----------------------------------------------------
    try {
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                estimated_hours,
                actual_hours,
                lead_id,
                lead:users!lead_id(email, username)
            `)
            .neq('status', 'Complete')
            .gt('estimated_hours', 0)
            .eq('fifty_percent_warning_sent', false);

        if (jobsError) throw jobsError;

        for (const job of (jobs || [])) {
            const threshold = 0.5 * job.estimated_hours;
            if (job.actual_hours >= threshold) {
                const leadEmail = job.lead?.email;
                const leadName = job.lead?.username || 'Unassigned Lead';
                
                const percentage = Math.round((job.actual_hours / job.estimated_hours) * 100);
                const subject = `⚠️ Hours Alert: Job "${job.title}" has reached ${percentage}% of budget`;
                const content = `
                    <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #ef4444; border-radius: 8px;">
                        <h2 style="color: #9f1239; margin-top: 0;">Project Hours Warning</h2>
                        <p>The job <strong>${job.title}</strong> has logged <strong>${job.actual_hours}h</strong> of its estimated <strong>${job.estimated_hours}h</strong>.</p>
                        <p style="font-size: 1.1rem; font-weight: bold; color: #ef4444;">This is at ${percentage}% of the total hour budget.</p>
                        <p><strong>Job Lead:</strong> ${leadName}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                        <p><a href="http://localhost:3000/jobs/${job.id}" style="background-color: #9f1239; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">View Job Dashboard</a></p>
                    </div>
                `;

                if (leadEmail) {
                    const sent = await sendEmail(senderUserId, leadEmail, subject, content);
                    if (!sent) {
                        console.log(`[Alert Logged (No MS connection)] To Lead: ${leadEmail} | Subj: ${subject}`);
                    }
                } else {
                    console.log(`[Alert Logged (No Lead Email)] Job: ${job.title} at ${percentage}%`);
                }

                // Update database so warning is only sent once
                await supabase
                    .from('jobs')
                    .update({ fifty_percent_warning_sent: true })
                    .eq('id', job.id);
            }
        }
    } catch (err) {
        console.error('[Cron] Error checking job hours budget:', err);
    }

    // ----------------------------------------------------
    // 2. SUBTASK DEADLINE CHECK (CLOSE DEADLINE ALERT)
    // ----------------------------------------------------
    try {
        const { data: subTasks, error: subError } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                priority,
                due_date,
                job_id,
                job:jobs(title),
                assignments:sub_task_assignments(
                    user:users(id, username, email)
                )
            `)
            .neq('status', 'Complete')
            .not('due_date', 'is', null)
            .eq('due_warning_sent', false);

        if (subError) throw subError;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const warningWindow = new Date(today);
        warningWindow.setDate(today.getDate() + 2); // 2 days window

        for (const task of (subTasks || [])) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);

            // If due within the next 2 days (and not already past)
            if (dueDate >= today && dueDate <= warningWindow) {
                const jobTitle = task.job?.title || 'Unknown Job';
                const subject = `📅 Deadline Reminder: Subtask "${task.title}" is due soon`;
                
                const assignees = task.assignments?.map(a => a.user).filter(Boolean) || [];
                const assigneeNames = assignees.map(u => u.username).join(', ') || 'Unassigned';

                const content = `
                    <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #f59e0b; border-radius: 8px;">
                        <h2 style="color: #d97706; margin-top: 0;">Task Deadline Alert</h2>
                        <p>The task <strong>${task.title}</strong> is approaching its deadline.</p>
                        <p><strong>Due Date:</strong> <span style="font-weight: bold; color: #d97706;">${task.due_date}</span></p>
                        <p><strong>Job/Project:</strong> ${jobTitle}</p>
                        <p><strong>Priority:</strong> ${task.priority}</p>
                        <p><strong>Assigned To:</strong> ${assigneeNames}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                        <p><a href="http://localhost:3000/jobs/${task.job_id}" style="background-color: #f59e0b; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                    </div>
                `;

                if (assignees.length > 0) {
                    for (const assignee of assignees) {
                        if (assignee.email) {
                            const sent = await sendEmail(senderUserId, assignee.email, subject, content);
                            if (!sent) {
                                console.log(`[Alert Logged (No MS connection)] To Assignee: ${assignee.email} | Subj: ${subject}`);
                            }
                        }
                    }
                } else {
                    console.log(`[Alert Logged (No Assignees)] Subtask "${task.title}" due ${task.due_date}`);
                }

                // Update sub_task so warning is only sent once
                await supabase
                    .from('sub_tasks')
                    .update({ due_warning_sent: true })
                    .eq('id', task.id);
            }
        }
    } catch (err) {
        console.error('[Cron] Error checking task deadlines:', err);
    }

    // ----------------------------------------------------
    // 3. DAILY AI SUMMARY EMAIL
    // ----------------------------------------------------
    try {
        const { data: activeJobs, error: activeJobsErr } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                status,
                estimated_hours,
                actual_hours,
                lead:users!lead_id(username)
            `)
            .neq('status', 'Complete');

        const { data: activeSubtasks, error: activeSubtasksErr } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                priority,
                due_date,
                job_id
            `)
            .neq('status', 'Complete');

        if (activeJobsErr) throw activeJobsErr;
        if (activeSubtasksErr) throw activeSubtasksErr;

        if ((activeJobs || []).length > 0) {
            let summaryHtml = '';

            if (process.env.GEMINI_API_KEY) {
                // Call Gemini to generate professional summary
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const contextText = `
                    Active Jobs:
                    ${JSON.stringify(activeJobs || [], null, 2)}

                    Active Sub-tasks:
                    ${JSON.stringify(activeSubtasks || [], null, 2)}
                    `;

                    const promptText = `
                    You are an intelligent project management assistant.
                    Based on the active jobs and tasks lists provided, write a beautiful, professional, and well-structured project summary.
                    Group tasks under their respective jobs, highlighting what requires attention, what is on track, and general project statistics (hours logged vs estimated, priorities, deadlines).
                    Provide the output directly as clean HTML (wrapped in a <div>, using tags like h3, p, ul, li, strong, but do not include blockquotes, outer <html> or <body> tags). Use a sleek color scheme matching deep maroon (#9f1239), dark blue, and warm yellow highlights.
                    Keep the summary concise and scannable for team members.
                    
                    Data Context:
                    ${contextText}
                    `;

                    const aiResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [{ text: promptText }]
                    });

                    summaryHtml = aiResponse.text;
                } catch (aiErr) {
                    console.error('[Cron] Gemini AI summary failed, using fallback:', aiErr);
                    summaryHtml = generateMockSummary(activeJobs || [], activeSubtasks || []);
                }
            } else {
                console.log('[Cron] GEMINI_API_KEY not configured. Generating standard summary fallback.');
                summaryHtml = generateMockSummary(activeJobs || [], activeSubtasks || []);
            }

            const dailyEmailContent = `
                <div style="font-family: sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; background-color: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="text-align: center; border-bottom: 2px solid #9f1239; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                        <h1 style="color: #9f1239; margin: 0; font-size: 1.75rem;">Daily Project Management Summary</h1>
                        <p style="color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.875rem;">Generated on ${new Date().toLocaleDateString()}</p>
                    </div>
                    ${summaryHtml}
                    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.75rem; color: #64748b;">
                        This email was automatically generated by the ENETK Project Management Portal.
                    </div>
                </div>
            `;

            // Fetch all users to distribute daily summary
            const { data: subscribers, error: subscrError } = await supabase
                .from('users')
                .select('id, email, username')
                .not('email', 'is', null);

            if (subscrError) throw subscrError;

            for (const user of (subscribers || [])) {
                if (user.email) {
                    const sent = await sendEmail(senderUserId, user.email, `📋 Daily Project & Task Summary - ${new Date().toLocaleDateString()}`, dailyEmailContent);
                    if (!sent) {
                        console.log(`[Summary Logged (No MS connection)] Sent daily summary to: ${user.email}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Cron] Error generating daily AI summary:', err);
    }
}

// Fallback HTML Summary Generator
function generateMockSummary(jobs, subtasks) {
    let html = `<p>Here is a summary of all active jobs and incomplete tasks currently in the project management system:</p>`;
    
    jobs.forEach(job => {
        const jobTasks = subtasks.filter(t => t.job_id === job.id);
        const percentHours = job.estimated_hours ? Math.round((job.actual_hours / job.estimated_hours) * 100) : 0;
        
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-radius: 8px; border-left: 4px solid #9f1239; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h3 style="margin: 0 0 0.5rem 0; color: #9f1239;">📌 ${job.title}</h3>
                <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #475569;">
                    <strong>Lead:</strong> ${job.lead?.username || 'Unassigned'} | 
                    <strong>Hours:</strong> ${job.actual_hours || 0}h / ${job.estimated_hours || 0}h (${percentHours}%)
                </p>
        `;

        if (jobTasks.length > 0) {
            html += `<ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #334155;">`;
            jobTasks.forEach(task => {
                const priorityBadge = task.priority === 'High' || task.priority === 'Urgent' 
                    ? `<span style="color:#ef4444; font-weight:bold;">[${task.priority}]</span>` 
                    : `<span>[${task.priority}]</span>`;
                html += `<li style="margin-bottom: 0.25rem;"><strong>${task.title}</strong> - ${priorityBadge} | Due: ${task.due_date || 'No Date'}</li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p style="margin: 0; font-size: 0.875rem; color: #64748b; font-style: italic;">No active sub-tasks.</p>`;
        }
        
        html += `</div>`;
    });

    return html;
}

// Initialize cron scheduler
export function initCronJobs() {
    if (isCronInitialized) return;

    // Schedule daily check (Every day at 7:00 AM)
    // 0 7 * * *
    cron.schedule('0 7 * * *', () => {
        runAlertAndSummaryChecks();
    });

    isCronInitialized = true;
    console.log('[Cron] Project Management notifications initialized. Daily checks scheduled for 07:00.');
}
