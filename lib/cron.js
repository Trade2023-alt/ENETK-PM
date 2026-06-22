import cron from 'node-cron';
import { supabase } from './supabase.js';
import { sendEmail } from './mailer.js';
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
                job:jobs(title, lead:users!lead_id(id, email, username)),
                due_warning_sent,
                late_warning_sent,
                assignments:sub_task_assignments(
                    user:users(id, username, email)
                )
            `)
            .neq('status', 'Complete')
            .not('due_date', 'is', null);

        if (subError) throw subError;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const warningWindow = new Date(today);
        warningWindow.setDate(today.getDate() + 2); // 2 days window

        for (const task of (subTasks || [])) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);

            // If due within the next 2 days or already late
            if (dueDate <= warningWindow) {
                const isLate = dueDate < today;
                
                // Skip if we already sent the corresponding warning
                if (isLate && task.late_warning_sent) continue;
                if (!isLate && task.due_warning_sent) continue;

                const jobTitle = task.job?.title || 'Unknown Job';
                const subject = isLate 
                    ? `🚨 OVERDUE Task Alert: Subtask "${task.title}" is past due` 
                    : `📅 Deadline Reminder: Subtask "${task.title}" is due soon`;
                
                const assignees = task.assignments?.map(a => a.user).filter(Boolean) || [];
                const assigneeNames = assignees.map(u => u.username).join(', ') || 'Unassigned';

                const content = `
                    <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid ${isLate ? '#ef4444' : '#f59e0b'}; border-radius: 8px;">
                        <h2 style="color: ${isLate ? '#b91c1c' : '#d97706'}; margin-top: 0;">Task ${isLate ? 'Overdue' : 'Deadline'} Alert</h2>
                        <p>The task <strong>${task.title}</strong> is ${isLate ? 'past its deadline' : 'approaching its deadline'}.</p>
                        <p><strong>Due Date:</strong> <span style="font-weight: bold; color: ${isLate ? '#b91c1c' : '#d97706'};">${task.due_date}</span></p>
                        <p><strong>Job/Project:</strong> ${jobTitle}</p>
                        <p><strong>Priority:</strong> ${task.priority}</p>
                        <p><strong>Assigned To:</strong> ${assigneeNames}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                        <p><a href="http://localhost:3000/jobs/${task.job_id}" style="background-color: ${isLate ? '#ef4444' : '#f59e0b'}; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
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

                // Send follow-up reminder to Job Lead
                const leadEmail = task.job?.lead?.email;
                const leadName = task.job?.lead?.username;
                if (leadEmail) {
                    const leadSubject = isLate 
                        ? `📢 Follow-up Reminder: Subtask "${task.title}" is OVERDUE` 
                        : `📢 Follow-up Reminder: Subtask "${task.title}" is due soon`;
                    
                    const leadContent = `
                        <div style="font-family: sans-serif; padding: 1.5rem; max-width: 600px; border: 1px solid #10b981; border-radius: 8px;">
                            <h2 style="color: #0f766e; margin-top: 0;">Follow-up Reminder</h2>
                            <p>Hi ${leadName},</p>
                            <p>As the Job Lead, this is a reminder to follow up on the subtask <strong>${task.title}</strong> under job <strong>${jobTitle}</strong>.</p>
                            <p><strong>Assigned To:</strong> ${assigneeNames}</p>
                            <p><strong>Due Date:</strong> <span style="font-weight: bold; color: ${isLate ? '#b91c1c' : '#d97706'};">${task.due_date}</span></p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
                            <p><a href="https://enetk-pm.vercel.app/jobs/${task.job_id}" style="background-color: #0f766e; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; display: inline-block;">Open Project Workspace</a></p>
                        </div>
                    `;
                    const sentLead = await sendEmail(senderUserId, leadEmail, leadSubject, leadContent);
                    if (!sentLead) {
                        console.log(`[Alert Logged (No MS connection)] To Lead: ${leadEmail} | Subj: ${leadSubject}`);
                    }
                }

                // Update sub_task so warning is only sent once
                if (isLate) {
                    await supabase
                        .from('sub_tasks')
                        .update({ late_warning_sent: true })
                        .eq('id', task.id);
                } else {
                    await supabase
                        .from('sub_tasks')
                        .update({ due_warning_sent: true })
                        .eq('id', task.id);
                }
            }
        }
    } catch (err) {
        console.error('[Cron] Error checking task deadlines:', err);
    }

    // ----------------------------------------------------
    // 3. DAILY AI SUMMARY EMAIL
    // ----------------------------------------------------
    await runSummaryEmail('daily');
}

// ----------------------------------------------------
// AI SUMMARY EMAIL GENERATOR (Daily or Weekly)
// ----------------------------------------------------
export async function runSummaryEmail(timeframe = 'daily') {
    const senderUserId = await getSystemEmailUser();
    
    // Determine the start date for tracking changes
    const today = new Date();
    const startDate = new Date();
    if (timeframe === 'weekly') {
        startDate.setDate(today.getDate() - 7);
    } else {
        startDate.setDate(today.getDate() - 1);
    }
    const isoStartDate = startDate.toISOString();

    try {
        // Fetch all jobs to show hours tracking
        const { data: allJobs, error: allJobsErr } = await supabase
            .from('jobs')
            .select(`
                id,
                title,
                status,
                estimated_hours,
                actual_hours,
                updated_at,
                created_at,
                lead:users!lead_id(username)
            `);

        // Fetch subtasks updated or created recently to show completions & changes
        // Also get all active subtasks just for an overall picture
        const { data: allSubtasks, error: allSubtasksErr } = await supabase
            .from('sub_tasks')
            .select(`
                id,
                title,
                status,
                priority,
                due_date,
                job_id,
                updated_at,
                created_at,
                estimated_hours,
                used_hours,
                assignments:sub_task_assignments(
                    user:users(id, username)
                )
            `);

        if (allJobsErr) throw allJobsErr;
        if (allSubtasksErr) throw allSubtasksErr;

        // Categorize data for the AI
        const recentlyCompletedTasks = allSubtasks.filter(t => t.status === 'Complete' && t.updated_at >= isoStartDate);
        const newlyCreatedTasks = allSubtasks.filter(t => t.created_at >= isoStartDate);
        const activeTasks = allSubtasks.filter(t => t.status !== 'Complete');
        
        const activeJobs = allJobs.filter(j => j.status !== 'Complete');

        let summaryHtml = '';

        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                
                // Format the tasks specifically to show who completed them based on assignments
                const formatTasksWithAssignees = (tasks) => {
                    return tasks.map(t => {
                        const assignees = t.assignments?.map(a => a.user?.username).join(', ') || 'Unassigned';
                        const job = allJobs.find(j => j.id === t.job_id);
                        return {
                            Task: t.title,
                            Job: job ? job.title : 'Unknown Job',
                            Status: t.status,
                            Assignees: assignees,
                            Hours: `Used: ${t.used_hours || 0} / Est: ${t.estimated_hours || 0}`
                        };
                    });
                };

                const contextText = `
                Timeframe: ${timeframe === 'weekly' ? 'Past 7 Days' : 'Past 24 Hours'}

                Tasks Completed in this timeframe:
                ${JSON.stringify(formatTasksWithAssignees(recentlyCompletedTasks), null, 2)}

                New Tasks Created in this timeframe:
                ${JSON.stringify(formatTasksWithAssignees(newlyCreatedTasks), null, 2)}

                Active Jobs (Hours Tracking):
                ${JSON.stringify(activeJobs.map(j => ({
                    Title: j.title,
                    Status: j.status,
                    HoursUsed: j.actual_hours || 0,
                    HoursAvailable: j.estimated_hours || 0,
                    Lead: j.lead?.username
                })), null, 2)}
                `;

                const promptText = `
                You are an intelligent project management assistant.
                Based on the project data provided, write a beautiful, professional, and well-structured project summary for the ${timeframe === 'weekly' ? 'Weekly' : 'Daily'} report.

                Your summary MUST include these specific sections:
                1. Highlights / Tasks Completed: Focus on "who completed what on what jobs". Group by job if possible.
                2. Recent Changes / New Tasks: Highlight any new tasks or major changes in the timeframe.
                3. Job Hours Tracking: Provide a brief breakdown of active jobs highlighting hours used vs hours available (estimated).

                Provide the output directly as clean HTML (wrapped in a <div>, using tags like h2, h3, p, ul, li, strong, span, table, but do not include blockquotes, outer <html> or <body> tags). Use a sleek color scheme matching deep maroon (#9f1239), dark blue (#1e3a8a), and slate grays. Use tables if helpful for hours tracking.
                Keep the summary engaging, concise, and scannable for team members.
                
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
                summaryHtml = generateMockSummary(activeJobs || [], activeTasks || []);
            }
        } else {
            console.log('[Cron] GEMINI_API_KEY not configured. Generating standard summary fallback.');
            summaryHtml = generateMockSummary(activeJobs || [], activeTasks || []);
        }

        const titleText = timeframe === 'weekly' ? 'Weekly Project & Task Summary' : 'Daily Project Management Summary';
        const dateStr = new Date().toLocaleDateString();

        const emailContent = `
            <div style="font-family: sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; background-color: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; border-bottom: 2px solid #9f1239; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <h1 style="color: #9f1239; margin: 0; font-size: 1.75rem;">${titleText}</h1>
                    <p style="color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.875rem;">Generated on ${dateStr}</p>
                </div>
                ${summaryHtml}
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.75rem; color: #64748b;">
                    This email was automatically generated by the ENETK Project Management Portal.
                </div>
            </div>
        `;

        // Fetch all internal users to distribute the summary (Customers are NOT in the users table, so they are naturally excluded)
        const { data: subscribers, error: subscrError } = await supabase
            .from('users')
            .select('id, email, username')
            .not('email', 'is', null);

        if (subscrError) throw subscrError;

        const subjectStr = timeframe === 'weekly' ? `📊 Weekly Project & Task Summary - ${dateStr}` : `📋 Daily Project Management Summary - ${dateStr}`;

        for (const user of (subscribers || [])) {
            if (user.email) {
                const sent = await sendEmail(senderUserId, user.email, subjectStr, emailContent);
                if (!sent) {
                    console.log(`[Summary Logged (No MS connection)] Sent ${timeframe} summary to: ${user.email}`);
                }
            }
        }
    } catch (err) {
        console.error(`[Cron] Error generating ${timeframe} AI summary:`, err);
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

    // Schedule weekly check (Every Friday at 4:00 PM)
    // 0 16 * * 5
    cron.schedule('0 16 * * 5', () => {
        console.log('[Cron] Running Weekly Summary Check...');
        runSummaryEmail('weekly');
    });

    isCronInitialized = true;
    console.log('[Cron] Project Management notifications initialized. Daily checks scheduled for 07:00, Weekly for Friday 16:00.');
}
