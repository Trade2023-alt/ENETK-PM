'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function getJobNotes(jobId) {
    try {
        const { data, error } = await supabase
            .from('job_notes')
            .select(`
                *,
                user:users(id, username)
            `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching job notes:', error);
        return [];
    }
}

export async function addJobNote(formData) {
    try {
        const jobId = formData.get('job_id');
        const content = formData.get('content');

        if (!jobId || !content) {
            return { error: 'Job ID and content are required' };
        }

        const cookieStore = await cookies();
        const userId = cookieStore.get('user_id')?.value;
        const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;

        const { data, error } = await supabase
            .from('job_notes')
            .insert([{
                job_id: Number(jobId),
                content,
                created_by: safeUserId,
                created_at: new Date().toISOString()
            }])
            .select(`*, user:users(id, username)`)
            .single();

        if (error) throw error;

        revalidatePath(`/jobs/${jobId}`);
        return { success: true, note: data };
    } catch (error) {
        console.error('Error adding job note:', error);
        return { error: error.message };
    }
}
