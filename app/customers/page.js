import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import Link from 'next/link';

export default async function CustomersPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Customers</h2>
                <Link href="/customers/new" className="btn btn-primary">
                    + Add Customer
                </Link>
            </div>

            <div className="card">
                {customers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No customers found. <Link href="/customers/new" style={{ color: 'var(--primary)' }}>Add one now</Link>.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Name</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Address</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Contact</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '0.75rem' }}>{customer.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{customer.address}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '0.875rem' }}>{customer.email}</div>
                                        <div style={{ fontSize: '0.875rem' }}>{customer.phone}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <Link href={`/customers/${customer.id}`} style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
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
