import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import { createContact } from '@/app/actions/contacts';

export default async function CustomerDetailPage({ params }) {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const { id } = await params;

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

    if (customerError || !customer) {
        return <div className="container">Customer not found</div>;
    }

    // Fetch jobs and contacts in parallel
    const [
        { data: jobs },
        { data: contacts }
    ] = await Promise.all([
        supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', { ascending: false }),
        supabase.from('customer_contacts').select('*').eq('customer_id', id).order('name')
    ]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>{customer.name}</h2>
                <p className="label">{customer.address}</p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <div>Main Phone: {customer.phone}</div>
                    <div>Main Email: {customer.email}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '2rem' }}>

                {/* Contacts Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>Contacts</h3>
                    </div>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        {!contacts || contacts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>No specific contacts added.</p>
                        ) : (
                            <ul style={{ listStyle: 'none' }}>
                                {contacts.map(contact => (
                                    <li key={contact.id} style={{
                                        padding: '0.75rem',
                                        borderBottom: '1px solid var(--card-border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{contact.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.role}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <div>{contact.email}</div>
                                                <div>{contact.phone}</div>
                                            </div>
                                            <Link href={`/contacts/${contact.id}/edit`} style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Edit</Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Add New Contact</h4>
                            <form action={createContact}>
                                <input type="hidden" name="customer_id" value={id} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input name="name" placeholder="Name" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} required />
                                    <input name="role" placeholder="Role (e.g. Site Mgr)" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input name="email" placeholder="Email" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                                    <input name="phone" placeholder="Phone" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.875rem', padding: '0.4rem' }}>Add Contact</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Jobs Section */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Job History</h3>
                    <div className="card">
                        {!jobs || jobs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No jobs found for this customer.</p>
                        ) : (
                            <ul style={{ listStyle: 'none' }}>
                                {jobs.map(job => (
                                    <li key={job.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--card-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 500 }}>{job.title}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.status}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not set'}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

