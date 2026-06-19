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

export async function addSubTaskNote(formData) {
    try {
        const subTaskId = formData.get('sub_task_id');
        const jobId = formData.get('job_id');
        const content = formData.get('content');

        if (!subTaskId || !jobId || !content) {
            return { error: 'Sub-task ID, Job ID and content are required' };
        }

        const cookieStore = await cookies();
        const userId = cookieStore.get('user_id')?.value;
        const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;

        const { data, error } = await supabase
            .from('sub_task_notes')
            .insert([{
                sub_task_id: Number(subTaskId),
                job_id: Number(jobId),
                content,
                created_by: safeUserId,
                created_at: new Date().toISOString()
            }])
            .select(`*, user:users(id, username), sub_task:sub_tasks(id, title)`)
            .single();

        if (error) throw error;

        revalidatePath(`/jobs/${jobId}`);
        return { success: true, note: data };
    } catch (error) {
        console.error('Error adding sub-task note:', error);
        return { error: error.message };
    }
}

export async function getSubTaskNotes(subTaskId) {
    try {
        const { data, error } = await supabase
            .from('sub_task_notes')
            .select(`
                *,
                user:users(id, username),
                sub_task:sub_tasks(id, title)
            `)
            .eq('sub_task_id', subTaskId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching sub-task notes:', error);
        return [];
    }
}

export async function getSubTaskNotesForJob(jobId) {
    try {
        const { data, error } = await supabase
            .from('sub_task_notes')
            .select(`
                *,
                user:users(id, username),
                sub_task:sub_tasks(id, title)
            `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching sub-task notes for job:', error);
        return [];
    }
}

export async function getAllNotesForJob(jobId) {
    try {
        const [jobNotesRes, subTaskNotesRes] = await Promise.all([
            supabase
                .from('job_notes')
                .select(`*, user:users(id, username)`)
                .eq('job_id', jobId)
                .order('created_at', { ascending: false }),
            supabase
                .from('sub_task_notes')
                .select(`*, user:users(id, username), sub_task:sub_tasks(id, title)`)
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })
        ]);

        if (jobNotesRes.error) throw jobNotesRes.error;
        if (subTaskNotesRes.error) throw subTaskNotesRes.error;

        const jobNotes = (jobNotesRes.data || []).map(note => ({
            ...note,
            note_type: 'job',
            sub_task_title: null
        }));

        const subTaskNotes = (subTaskNotesRes.data || []).map(note => ({
            ...note,
            note_type: 'subtask',
            sub_task_title: note.sub_task?.title
        }));

        return [...jobNotes, ...subTaskNotes].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (error) {
        console.error('Error fetching all notes for job:', error);
        return [];
    }
}
