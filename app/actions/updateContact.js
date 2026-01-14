'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateContact(formData) {
    const contactId = formData.get('contact_id');
    const customerId = formData.get('customer_id');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const role = formData.get('role');

    try {
        const { error } = await supabase
            .from('customer_contacts')
            .update({ name, email, phone, role, updated_at: new Date().toISOString() })
            .eq('id', contactId);

        if (error) throw error;

        revalidatePath(`/customers/${customerId}`);
    } catch (error) {
        console.error('Error updating contact:', error);
        return { error: 'Failed to update contact: ' + error.message };
    }

    redirect(`/customers/${customerId}`);
}

