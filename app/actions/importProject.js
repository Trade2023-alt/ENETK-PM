'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function importMSProject(parsedData, defaultLeadId) {
    try {
        console.log("Starting MS Project import with", parsedData.jobs?.length, "jobs.");
        
        const jobsToInsert = parsedData.jobs || [];
        let importedCount = 0;
        let subtaskCount = 0;
        
        for (const jobData of jobsToInsert) {
            const { subTasks, ...jobFields } = jobData;
            
            // Insert Job
            const { data: newJob, error: jobError } = await supabase
                .from('jobs')
                .insert([{
                    title: jobFields.title,
                    scheduled_date: jobFields.scheduled_date || null,
                    due_date: jobFields.due_date || null,
                    estimated_hours: jobFields.estimated_hours || 0,
                    actual_hours: jobFields.actual_hours || 0,
                    status: jobFields.status || 'Scheduled',
                    lead_id: defaultLeadId || null,
                    job_number: jobFields.job_number || null,
                    priority: jobFields.priority || 'Medium'
                }])
                .select('id')
                .single();
                
            if (jobError) {
                console.error("Error inserting job from MS Project:", jobError);
                continue;
            }
            
            importedCount++;
            
            // Insert Subtasks
            if (subTasks && subTasks.length > 0) {
                const subtasksToInsert = subTasks.map((st, idx) => ({
                    job_id: newJob.id,
                    title: st.title,
                    start_date: st.start_date || null,
                    due_date: st.due_date || null,
                    estimated_hours: st.estimated_hours || 0,
                    used_hours: st.used_hours || 0,
                    status: st.status || 'Scheduled',
                    order_index: idx
                }));
                
                const { error: stError } = await supabase
                    .from('sub_tasks')
                    .insert(subtasksToInsert);
                    
                if (stError) {
                    console.error("Error inserting subtasks for job", newJob.id, stError);
                } else {
                    subtaskCount += subtasksToInsert.length;
                }
            }
        }
        
        revalidatePath('/gantt');
        revalidatePath('/roadmap');
        revalidatePath('/');
        
        return { success: true, importedJobs: importedCount, importedSubtasks: subtaskCount };
    } catch (error) {
        console.error("Critical error in importMSProject:", error);
        return { success: false, error: error.message };
    }
}
