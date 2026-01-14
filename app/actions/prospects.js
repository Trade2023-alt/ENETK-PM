'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getProspects() {
    const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('priority', { ascending: false });
    if (error) {
        console.error('Error fetching prospects:', error);
        return [];
    }
    return data || [];
}

export async function updateProspect(id, updates) {
    try {
        const { error } = await supabase
            .from('prospects')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
        revalidatePath('/pipeline');
        return { success: true };
    } catch (error) {
        console.error('Error updating prospect:', error);
        return { error: error.message };
    }
}

export async function deleteProspect(id) {
    try {
        const { error } = await supabase
            .from('prospects')
            .delete()
            .eq('id', id);
        if (error) throw error;
        revalidatePath('/pipeline');
        return { success: true };
    } catch (error) {
        console.error('Error deleting prospect:', error);
        return { error: error.message };
    }
}

export async function createProspect(prospect) {
    try {
        const { data, error } = await supabase
            .from('prospects')
            .insert([prospect])
            .select();
        if (error) throw error;
        revalidatePath('/pipeline');
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error creating prospect:', error);
        return { error: error.message };
    }
}
