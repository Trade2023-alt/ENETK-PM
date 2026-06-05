'use client'
import { useState } from 'react';
import { createCustomer } from '@/app/actions/customers';
import { useRouter } from 'next/navigation';

export default function CustomerForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(event.target);
        const result = await createCustomer(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            // Success! The server action handled the redirect, 
            // but if it returned an object check if it's the redirect error.
            // Actually, with standard server actions returning objects, 
            // you usually handle redirect on the client or the server.
            // My fixed action does: if (success) redirect(...)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Full Name / Company Name</label>
                <input name="name" type="text" className="input" required disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Address</label>
                <input name="address" type="text" className="input" disabled={loading} placeholder="123 Industrial Way, Suite 100" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <label className="label">Email</label>
                    <input name="email" type="email" className="input" placeholder="office@company.com" disabled={loading} />
                </div>
                <div>
                    <label className="label">Phone</label>
                    <input name="phone" type="tel" className="input" placeholder="(555) 000-0000" disabled={loading} />
                </div>
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Customer Login Access</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="label">Username</label>
                        <input name="username" type="text" className="input" placeholder="e.g. comp_admin" disabled={loading} />
                    </div>
                    <div>
                        <label className="label">Password</label>
                        <input name="password" type="password" className="input" placeholder="Leave blank to not set" disabled={loading} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input type="checkbox" name="access_disabled" id="access_disabled" disabled={loading} style={{ width: '1.2rem', height: '1.2rem' }} />
                    <label htmlFor="access_disabled" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Disable login access for this customer
                    </label>
                </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Customer'}
            </button>
        </form>
    );
}
