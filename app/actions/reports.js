'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Fetch all customers for the dropdown
export async function getReportCustomers() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;
    const userId = cookieStore.get('user_id')?.value;

    let query = supabase
        .from('customers')
        .select('id, name')
        .order('name');

    if (userRole === 'customer' && userId) {
        query = query.eq('id', userId);
    }

    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
    return data;
}

// Fetch report data for a specific customer
export async function getCustomerReportData(customerId) {
    if (!customerId) return { jobs: [] };

    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;
    const userId = cookieStore.get('user_id')?.value;

    if (userRole === 'customer' && userId && customerId !== userId) {
        return { error: 'Unauthorized access to report data.', jobs: [] };
    }

    const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
            id,
            title,
            sub_tasks (
                id,
                title,
                description,
                start_date,
                due_date,
                status,
                completion_percent,
                notes
            )
        `)
        .eq('customer_id', customerId)
        .order('title');

    if (jobsError) {
        console.error('Error fetching report data:', jobsError);
        return { error: jobsError.message, jobs: [] };
    }

    return { jobs };
}

// Update sub_task fields directly from the report
export async function updateReportSubTask(taskId, updateData) {
    const { error } = await supabase
        .from('sub_tasks')
        .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error updating sub task:', error);
        return { error: error.message };
    }

    revalidatePath('/reports');
    return { success: true };
}
