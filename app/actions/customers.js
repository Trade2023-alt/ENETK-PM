'use server'

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function createCustomer(formData) {
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    
    const username = formData.get('username') || null;
    const password = formData.get('password');
    const accessDisabled = formData.get('access_disabled') === 'on';

    if (!name) {
        return { error: 'Name is required' };
    }

    try {
        const dataToInsert = { 
            name, 
            email, 
            phone, 
            address,
            username,
            access_disabled: accessDisabled
        };

        if (password) {
            dataToInsert.password_hash = await bcrypt.hash(password, 10);
        }

        // Initial attempt
        let { error } = await supabase
            .from('customers')
            .insert([dataToInsert]);

        // Sequence mismatch repair
        if (error && error.message.includes('customers_pkey')) {
            const { data: lastItem } = await supabase
                .from('customers')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);

            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            dataToInsert.id = nextId;

            const { error: retryError } = await supabase
                .from('customers')
                .insert([dataToInsert]);
            error = retryError;
        }

        if (error) throw error;
        revalidatePath('/customers');
        redirect('/customers');
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('Error creating customer:', error);
        return { error: 'Failed to create customer: ' + error.message };
    }
}

export async function updateCustomer(formData) {
    const id = formData.get('customer_id');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    
    const username = formData.get('username') || null;
    const password = formData.get('password');
    const accessDisabled = formData.get('access_disabled') === 'on';

    if (!id || !name) {
        return { error: 'ID and Name are required' };
    }

    try {
        const dataToUpdate = { 
            name, 
            email, 
            phone, 
            address,
            username,
            access_disabled: accessDisabled
        };

        if (password) {
            dataToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        const { error } = await supabase
            .from('customers')
            .update(dataToUpdate)
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/customers');
        revalidatePath(`/customers/${id}`);
        redirect(`/customers/${id}`);
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('Error updating customer:', error);
        return { error: 'Failed to update customer: ' + error.message };
    }
}

