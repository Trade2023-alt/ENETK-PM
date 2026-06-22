'use server'

import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateSchedulePreview() {
    try {
        // 1. Fetch Users & Responsibilities
        let { data: users, error: usersError } = await supabase.from('users').select('id, username, role, responsibility, company');
        if (usersError && usersError.code === '42703') {
            const fallback = await supabase.from('users').select('id, username, role, company');
            users = fallback.data;
        }

        // 2. Fetch Jobs & Subtasks (not complete)
        const { data: jobs } = await supabase.from('jobs').select('id, title, priority, estimated_hours, actual_hours, scheduled_date, due_date, status').neq('status', 'Complete');
        const { data: subTasks } = await supabase.from('sub_tasks').select('id, job_id, title, priority, estimated_hours, status, due_date').neq('status', 'Complete');
        
        // 3. Fetch Milestones
        const { data: milestones } = await supabase.from('roadmap_milestones').select('id, job_id, title, start_date, end_date');

        // 4. Send to Claude
        const systemPrompt = `You are an expert project management AI for ENETK.
Your task is to analyze the active jobs, subtasks, milestones, and team member responsibilities to generate an optimized schedule.

RULES:
1. "estimated_hours" minus "actual_hours" equals remaining effort.
2. Ensure dates respect due dates and milestones.
3. Assign team members strictly based on their "responsibility" string if it exists (e.g., Chasyn for estimating, Bruce/Rami for SCADA, Seth is tech support).
4. Do not over-schedule individuals.
5. You are free to completely re-assign tasks to different team members if it results in a better fit or better load balancing.

Return ONLY a valid JSON object matching this schema, no markdown, no other text:
{
  "job_proposals": [
    { "job_id": 1, "job_title": "string", "proposed_scheduled_date": "YYYY-MM-DD", "proposed_due_date": "YYYY-MM-DD", "assigned_user_ids": [1,2], "reasoning": "string" }
  ],
  "subtask_proposals": [
    { "subtask_id": 1, "subtask_title": "string", "job_id": 1, "proposed_due_date": "YYYY-MM-DD", "assigned_user_ids": [1], "reasoning": "string" }
  ]
}`;

        const prompt = `Data Context:
Users: ${JSON.stringify(users)}
Jobs: ${JSON.stringify(jobs)}
SubTasks: ${JSON.stringify(subTasks)}
Milestones: ${JSON.stringify(milestones)}`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }]
        });

        const jsonStr = response.content[0].text.trim().replace(/^```json/, '').replace(/```$/, '');
        return { success: true, proposals: JSON.parse(jsonStr) };
        
    } catch (error) {
        console.error("Auto Schedule Error:", error);
        return { error: error.message };
    }
}

export async function applySchedule(proposals) {
    try {
        const { job_proposals, subtask_proposals } = proposals;

        // Apply job updates
        if (job_proposals && job_proposals.length > 0) {
            for (const job of job_proposals) {
                await supabase.from('jobs').update({
                    scheduled_date: job.proposed_scheduled_date,
                    due_date: job.proposed_due_date,
                    updated_at: new Date().toISOString()
                }).eq('id', job.job_id);

                if (job.assigned_user_ids) {
                    await supabase.from('job_assignments').delete().eq('job_id', job.job_id);
                    if (job.assigned_user_ids.length > 0) {
                        const assignments = job.assigned_user_ids.map(uid => ({ job_id: job.job_id, user_id: uid }));
                        await supabase.from('job_assignments').insert(assignments);
                    }
                }
            }
        }

        // Apply subtask updates
        if (subtask_proposals && subtask_proposals.length > 0) {
            for (const st of subtask_proposals) {
                await supabase.from('sub_tasks').update({
                    due_date: st.proposed_due_date,
                    updated_at: new Date().toISOString()
                }).eq('id', st.subtask_id);

                if (st.assigned_user_ids) {
                    await supabase.from('sub_task_assignments').delete().eq('sub_task_id', st.subtask_id);
                    if (st.assigned_user_ids.length > 0) {
                        const assignments = st.assigned_user_ids.map(uid => ({ sub_task_id: st.subtask_id, user_id: uid }));
                        await supabase.from('sub_task_assignments').insert(assignments);
                    }
                }
            }
        }

        revalidatePath('/gantt');
        revalidatePath('/roadmap');
        revalidatePath('/');
        
        return { success: true };
    } catch (error) {
        console.error("Apply Schedule Error:", error);
        return { error: error.message };
    }
}
