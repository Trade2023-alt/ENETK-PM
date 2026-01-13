'use server'

import { redirect } from 'next/navigation';
import db from '@/lib/db';

export async function updateContact(formData) {
    const contactId = formData.get('contact_id');
    const customerId = formData.get('customer_id');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const role = formData.get('role');

    try {
        const stmt = db.prepare(`
        UPDATE customer_contacts 
        SET name = ?, email = ?, phone = ?, role = ?
        WHERE id = ?
    `);

        stmt.run(name, email, phone, role, contactId);
    } catch (error) {
        console.error('Error updating contact:', error);
        return { error: 'Failed to update contact' };
    }

    // Redirect back to the customer detail page
    redirect(`/customers/${customerId}`);
}
