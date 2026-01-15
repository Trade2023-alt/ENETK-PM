'use client'

import { createContact } from '@/app/actions/contacts';
import { useState } from 'react';

export default function ContactForm({ customerId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (formData) => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const res = await createContact(formData);

        if (res && res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Form specifically clears if successful via redirect in action, 
            // but if we stay on page (e.g. no redirect), we'd reset.
            // The action currently redirects.
        }
    };

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Add New Contact</h4>
            <form action={handleSubmit}>
                <input type="hidden" name="customer_id" value={customerId} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input name="name" placeholder="Name" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} required />
                    <input name="role" placeholder="Role (e.g. Site Mgr)" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input name="email" placeholder="Email" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                    <input name="phone" placeholder="Phone" className="input" style={{ fontSize: '0.875rem', padding: '0.4rem' }} />
                </div>

                {error && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</div>}

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.4rem' }}
                    disabled={loading}
                >
                    {loading ? 'Adding...' : 'Add Contact'}
                </button>
            </form>
        </div>
    );
}
