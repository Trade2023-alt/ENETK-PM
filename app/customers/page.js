import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';

export default async function CustomersPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });


    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div className="page-header">
                <h2 className="page-title">Customers</h2>
                <Link href="/customers/new" className="btn btn-primary">
                    + Add Customer
                </Link>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {customers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        No customers found. <Link href="/customers/new" className="text-primary">Add one now</Link>.
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Address</th>
                                <th>Contact</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id}>
                                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                                    <td className="text-muted">{customer.address}</td>
                                    <td className="text-muted">
                                        <div style={{ fontSize: '0.85rem' }}>{customer.email}</div>
                                        <div style={{ fontSize: '0.85rem' }}>{customer.phone}</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Link href={`/customers/${customer.id}`} className="btn btn-secondary btn-sm">
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
