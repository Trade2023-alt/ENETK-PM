'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getMilestones() {
    try {
        const { data, error } = await supabase
            .from('roadmap_milestones')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching milestones:', error);
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
                priority
            }])
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/roadmap');
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
        return { success: true, milestone: data };
    } catch (error) {
        console.error('Error updating milestone:', error);
        return { error: error.message };
    }
}

export async function deleteMilestone(id) {
    try {
        const { error } = await supabase
            .from('roadmap_milestones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/roadmap');
        return { success: true };
    } catch (error) {
        console.error('Error deleting milestone:', error);
        return { error: error.message };
    }
}
