'use server'

import { redirect } from 'next/navigation';
import db from '@/lib/db';

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
        const stmt = db.prepare(`
      INSERT INTO customer_contacts (customer_id, name, email, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `);

        stmt.run(customerId, name, email, phone, role);
    } catch (error) {
        console.error('Error creating contact:', error);
        return { error: 'Failed to create contact' };
    }

    redirect(`/customers/${customerId}`);
}
