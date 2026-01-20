'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Get all milestones (for master roadmap) with job info
export async function getMilestones() {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .select('*, job:jobs(id, title)')
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching milestones:', error);
        return [];
    }
}

// Get milestones for a specific job
export async function getJobMilestones(jobId) {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .select('*')
            .eq('job_id', jobId)
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching job milestones:', error);
        return [];
    }
}

export async function createMilestone(formData) {
    const title = formData.get('title');
    const description = formData.get('description');
    const start_date = formData.get('start_date');
    const end_date = formData.get('end_date');
    const status = formData.get('status') || 'Planned';
    const priority = formData.get('priority') || 'Normal';
    const job_id = formData.get('job_id') || null;

    if (!title || !start_date || !end_date) {
        return { error: 'Title, Start Date, and End Date are required.' };
    }

    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .insert([{
                title,
                description,
                start_date,
                end_date,
                status,
                priority,
                job_id
            }])
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/roadmap');
        if (job_id) revalidatePath(`/jobs/${job_id}`);
        return { success: true, milestone: data };
    } catch (error) {
        console.error('Error creating milestone:', error);
        return { error: error.message };
    }
}

export async function updateMilestone(id, updates) {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/roadmap');
        if (data.job_id) revalidatePath(`/jobs/${data.job_id}`);
        return { success: true, milestone: data };
    } catch (error) {
        console.error('Error updating milestone:', error);
        return { error: error.message };
    }
}

export async function deleteMilestone(id) {
    try {
        // Get job_id before delete for revalidation
        const { data: existing } = await supabase
            .from('roadmap_milestones')
            .select('job_id')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('roadmap_milestones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/roadmap');
        if (existing?.job_id) revalidatePath(`/jobs/${existing.job_id}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting milestone:', error);
        return { error: error.message };
    }
}
