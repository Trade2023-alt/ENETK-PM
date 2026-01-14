import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import JobForm from '@/components/JobForm';

export default async function NewJobPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    // Fetch data for form
    const [
        { data: customers },
        { data: users },
        { data: contacts }
    ] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('users').select('id, username').order('username'),
        supabase.from('customer_contacts').select('id, customer_id, name, role').order('name')
    ]);

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Schedule New Job</h2>
                <JobForm customers={customers || []} users={users || []} contacts={contacts || []} />
            </div>
        </div>
    );
}

