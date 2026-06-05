import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CustomerForm from '@/components/CustomerForm';

export default async function EditCustomerPage({ params }) {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const { id } = await params;

    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

    if (customerError || !customer) {
        return <div className="container">Customer not found</div>;
    }

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Edit Customer</h2>
                <CustomerForm initialData={customer} />
            </div>
        </div>
    );
}
