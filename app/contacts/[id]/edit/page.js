import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { updateContact } from '@/app/actions/updateContact';

export default async function EditContactPage({ params }) {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const { id } = await params;

    const { data: contact, error: contactError } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('id', id)
        .single();

    if (contactError || !contact) {
        return <div className="container">Contact not found</div>;
    }

    const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', contact.customer_id)
        .single();

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Edit Contact</h2>
                <p className="label" style={{ marginBottom: '1.5rem' }}>For Customer: {customer?.name}</p>

                <form action={updateContact}>
                    <input type="hidden" name="contact_id" value={contact.id} />
                    <input type="hidden" name="customer_id" value={contact.customer_id} />

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Name</label>
                        <input name="name" type="text" className="input" defaultValue={contact.name} required />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Role (e.g. Site Mgr)</label>
                        <input name="role" type="text" className="input" defaultValue={contact.role} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label className="label">Email</label>
                            <input name="email" type="email" className="input" defaultValue={contact.email} />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input name="phone" type="text" className="input" defaultValue={contact.phone} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
                </form>
            </div>
        </div>
    );
}

