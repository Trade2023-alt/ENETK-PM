'use server'

import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Claude Sonnet pricing per token
const PRICE_INPUT = 3 / 1000000;
const PRICE_OUTPUT = 15 / 1000000;

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

        // 4. Compact data to reduce token usage — only send essential fields
        const compactJobs = (jobs || []).map(j => ({
            id: j.id, t: j.title, p: j.priority, eh: j.estimated_hours, ah: j.actual_hours,
            sd: j.scheduled_date, dd: j.due_date, s: j.status
        }));
        const compactST = (subTasks || []).map(s => ({
            id: s.id, jid: s.job_id, t: s.title, p: s.priority, eh: s.estimated_hours,
            s: s.status, dd: s.due_date
        }));
        const compactUsers = (users || []).map(u => ({
            id: u.id, n: u.username, r: u.role, resp: u.responsibility
        }));

        // 5. Send to Claude
        const systemPrompt = `You are a project scheduling AI for ENETK electrical company.
Analyze jobs, subtasks, milestones, and team to generate optimized schedule proposals.

DATA KEY: Jobs: id, t=title, p=priority, eh=estimated_hours, ah=actual_hours, sd=scheduled_date, dd=due_date, s=status
SubTasks: id, jid=job_id, t=title, p=priority, eh=estimated_hours, s=status, dd=due_date
Users: id, n=username, r=role, resp=responsibility

RULES:
1. Remaining effort = estimated_hours - actual_hours.
2. Respect due dates and milestones. Prioritize overdue and urgent items.
3. CHASYN is for ENETK ESTIMATION ONLY — never assign Chasyn to non-estimation tasks.
4. DO NOT change the lead/primary assignment on JOBS. Only re-assign SUBTASKS if it improves balance.
5. Keep existing job assignments intact in job_proposals (use current assigned_user_ids).
6. Don't over-schedule anyone.
7. Focus on the TOP 30 most important items needing schedule changes.
8. Keep "reasoning" to MAX 15 words per item.

Return ONLY valid JSON, no markdown fences, no extra text:
{"job_proposals":[{"job_id":1,"job_title":"str","proposed_scheduled_date":"YYYY-MM-DD","proposed_due_date":"YYYY-MM-DD","assigned_user_ids":[1],"reasoning":"str"}],"subtask_proposals":[{"subtask_id":1,"subtask_title":"str","job_id":1,"proposed_due_date":"YYYY-MM-DD","assigned_user_ids":[1],"reasoning":"str"}]}`;

        const prompt = `Today: ${new Date().toISOString().split('T')[0]}
Users: ${JSON.stringify(compactUsers)}
Jobs (${compactJobs.length}): ${JSON.stringify(compactJobs)}
SubTasks (${compactST.length}): ${JSON.stringify(compactST)}
Milestones: ${JSON.stringify(milestones || [])}`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 16384,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }]
        });

        let jsonStr = response.content[0].text.trim();
        
        // Calculate cost
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const cost = (inputTokens * PRICE_INPUT) + (outputTokens * PRICE_OUTPUT);

        // Log to ai_usage table
        try {
            const cookieStore = await cookies();
            const userId = cookieStore.get('user_id')?.value;
            await supabase.from('ai_usage').insert({
                user_id: userId ? Number(userId) : null,
                model: response.model || 'claude-sonnet-4-5-20250929',
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                cost_usd: cost
            });
        } catch (logErr) {
            console.warn('AI Usage logging failed:', logErr.message);
        }

        const usageInfo = { inputTokens, outputTokens, cost };
        
        // Strip markdown fences if present
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
        
        // Try to parse as-is first
        try {
            return { success: true, proposals: JSON.parse(jsonStr), usage: usageInfo };
        } catch (parseErr) {
            // If truncated, try to salvage by closing open arrays/objects
            console.warn('Initial JSON parse failed, attempting repair...');
            
            // Find the last complete object in each array
            let repaired = jsonStr;
            
            // Remove any trailing incomplete object (ends with { or ,)
            repaired = repaired.replace(/,\s*\{[^}]*$/s, '');
            
            // Count open braces/brackets and close them
            const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
            
            for (let i = 0; i < openBrackets; i++) repaired += ']';
            for (let i = 0; i < openBraces; i++) repaired += '}';
            
            try {
                const parsed = JSON.parse(repaired);
                return { success: true, proposals: parsed, usage: usageInfo };
            } catch (repairErr) {
                console.error('JSON repair also failed:', repairErr.message);
                return { error: `AI returned invalid JSON. Try again — the response may have been too large. (${parseErr.message})` };
            }
        }
        
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
