'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Get lessons learned for a job
 */
export async function getLessonsLearned(jobId) {
    try {
        const { data, error } = await supabase
            .from('lessons_learned')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching lessons learned:', error);
        return [];
    }
}

/**
 * Add a lesson learned
 */
export async function addLessonLearned(formData) {
    try {
        const jobId = formData.get('job_id');
        const category = formData.get('category');
        const title = formData.get('title');
        const description = formData.get('description');
        const impact = formData.get('impact');

        const { data, error } = await supabase
            .from('lessons_learned')
            .insert([{
                job_id: Number(jobId),
                category,
                title,
                description,
                impact,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/jobs/${jobId}`);
        return { success: true, lesson: data };
    } catch (error) {
        console.error('Error adding lesson learned:', error);
        return { error: error.message };
    }
}

/**
 * Update a lesson learned
 */
export async function updateLessonLearned(id, updates) {
    try {
        const { data, error } = await supabase
            .from('lessons_learned')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, lesson: data };
    } catch (error) {
        console.error('Error updating lesson learned:', error);
        return { error: error.message };
    }
}

/**
 * Delete a lesson learned
 */
export async function deleteLessonLearned(id, jobId) {
    try {
        const { error } = await supabase
            .from('lessons_learned')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath(`/jobs/${jobId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting lesson learned:', error);
        return { error: error.message };
    }
}

/**
 * Search lessons learned across all jobs
 */
export async function searchLessonsLearned(query) {
    try {
        const { data, error } = await supabase
            .from('lessons_learned')
            .select(`
                *,
                job:jobs(id, title)
            `)
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching lessons learned:', error);
        return [];
    }
}
