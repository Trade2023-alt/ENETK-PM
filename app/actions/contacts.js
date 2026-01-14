'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createContact(formData) {
    const customerId = formData.get('customer_id');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const role = formData.get('role');

    if (!customerId || !name) {
        return { error: 'Name and Customer ID are required' };
    }

    try {
        const { error } = await supabase
            .from('customer_contacts')
            .insert([{ customer_id: customerId, name, email, phone, role }]);

        if (error) throw error;

        revalidatePath(`/customers/${customerId}`);
        revalidatePath('/customers');
    } catch (error) {
        console.error('Error creating contact:', error);
        return { error: 'Failed to create contact: ' + error.message };
    }

    redirect(`/customers/${customerId}`);
}
