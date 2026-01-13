import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { createCustomer } from '@/app/actions/customers';

export default async function NewCustomerPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>New Customer</h2>

                <form action={createCustomer}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Full Name / Company Name</label>
                        <input name="name" type="text" className="input" required />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Address</label>
                        <input name="address" type="text" className="input" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label className="label">Email</label>
                            <input name="email" type="email" className="input" />
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input name="phone" type="tel" className="input" />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Customer</button>
                </form>
            </div>
        </div>
    );
}
