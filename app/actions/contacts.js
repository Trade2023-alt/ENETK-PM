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
        const cleanedData = {
            customer_id: parseInt(customerId, 10),
            name: name,
            email: email || null,
            phone: phone || null,
            role: role || null
        };

        const { error } = await supabase
            .from('customer_contacts')
            .insert([cleanedData]);

        if (error) throw error;

        revalidatePath(`/customers/${customerId}`);
        revalidatePath('/customers');
        redirect(`/customers/${customerId}`);
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('Error creating contact:', error);
        return { error: 'Failed to create contact: ' + error.message };
    }
}
