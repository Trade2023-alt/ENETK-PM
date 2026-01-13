'use server'

import { redirect } from 'next/navigation';
import db from '@/lib/db';

export async function createCustomer(formData) {
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');

    if (!name) {
        return { error: 'Name is required' };
    }

    try {
        const stmt = db.prepare(`
      INSERT INTO customers (name, email, phone, address)
      VALUES (?, ?, ?, ?)
    `);

        stmt.run(name, email, phone, address);
    } catch (error) {
        console.error('Error creating customer:', error);
        return { error: 'Failed to create customer' };
    }

    redirect('/customers');
}
