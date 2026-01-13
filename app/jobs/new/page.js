import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import JobForm from '@/components/JobForm';

export default async function NewJobPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    // Fetch data for form
    const customers = db.prepare('SELECT id, name FROM customers ORDER BY name').all();
    const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();
    const contacts = db.prepare('SELECT id, customer_id, name, role FROM customer_contacts ORDER BY name').all();

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Schedule New Job</h2>
                <JobForm customers={customers} users={users} contacts={contacts} />
            </div>
        </div>
    );
}
