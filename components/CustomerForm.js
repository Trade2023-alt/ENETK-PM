'use client'
import { useState } from 'react';
import { createCustomer, updateCustomer } from '@/app/actions/customers';
import { useRouter } from 'next/navigation';

export default function CustomerForm({ initialData = null }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const isEdit = !!initialData;

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(event.target);
        if (isEdit) {
            formData.append('customer_id', initialData.id);
        }

        const result = isEdit ? await updateCustomer(formData) : await createCustomer(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            // Success handles redirect server-side
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <button 
                type="button" 
                onClick={() => router.back()} 
                style={{ 
                    position: 'absolute', 
                    top: '-3rem', 
                    right: '0', 
                    background: 'transparent', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer', 
                    color: 'var(--text-muted)' 
                }}
                aria-label="Close"
            >
                &times;
            </button>

            {error && (
                <div className="form-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Full Name / Company Name</label>
                <input name="name" type="text" className="input" defaultValue={initialData?.name} required disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Address</label>
                <input name="address" type="text" className="input" defaultValue={initialData?.address} disabled={loading} placeholder="123 Industrial Way, Suite 100" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <label className="label">Email</label>
                    <input name="email" type="email" className="input" defaultValue={initialData?.email} placeholder="office@company.com" disabled={loading} />
                </div>
                <div>
                    <label className="label">Phone</label>
                    <input name="phone" type="tel" className="input" defaultValue={initialData?.phone} placeholder="(555) 000-0000" disabled={loading} />
                </div>
            </div>

            <div className="form-section" style={{ marginBottom: '1.5rem' }}>
                <div className="form-section-title">Customer Login Access</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="label">Username</label>
                        <input name="username" type="text" className="input" defaultValue={initialData?.username} placeholder="e.g. comp_admin" disabled={loading} />
                    </div>
                    <div>
                        <label className="label">Password</label>
                        <input name="password" type="password" className="input" placeholder={isEdit ? "Leave blank to keep unchanged" : "Leave blank to not set"} disabled={loading} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input type="checkbox" name="access_disabled" id="access_disabled" defaultChecked={initialData?.access_disabled} disabled={loading} style={{ width: '1.2rem', height: '1.2rem' }} />
                    <label htmlFor="access_disabled" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Disable login access for this customer
                    </label>
                </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save Customer')}
            </button>
        </form>
    );
}
