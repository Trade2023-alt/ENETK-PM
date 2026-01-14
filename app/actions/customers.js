'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createCustomer(formData) {
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');

    if (!name) {
        return { error: 'Name is required' };
    }

    try {
        const { error } = await supabase
            .from('customers')
            .insert([{ name, email, phone, address }]);

        if (error) throw error;

        revalidatePath('/customers');
    } catch (error) {
        console.error('Error creating customer:', error);
        return { error: 'Failed to create customer: ' + error.message };
    }

    redirect('/customers');
}

