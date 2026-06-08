'use server'

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

export async function deleteJob(jobId) {
    try {
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);

        if (error) throw error;

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error deleting job:', error);
        return { error: 'Failed to delete job: ' + error.message };
    }
}
