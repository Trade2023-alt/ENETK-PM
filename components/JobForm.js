'use client'

import { useState } from 'react';
import { createJob } from '@/app/actions/jobs';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
            {pending ? 'Create Job...' : 'Create Job'}
        </button>
    );
}

export default function JobForm({ customers, contacts, users, userRole }) {
    const [state, formAction] = useActionState(createJob, null);
    
    // Automatically select the customer if there's only one (e.g. for customer role)
    const initialCustomer = (userRole === 'customer' && customers.length === 1) ? customers[0].id.toString() : '';
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer);

    const filteredContacts = selectedCustomerId
        ? contacts.filter(c => c.customer_id.toString() === selectedCustomerId)
        : [];

    return (
        <form action={formAction}>
            {state?.error && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
                    {state.error}
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <label className="label">Job Title</label>
                    <input name="title" type="text" className="input" placeholder="e.g. Kitchen Wiring" required />
                </div>
                <div>
                    <label className="label">Job Number</label>
                    <input name="job_number" type="text" className="input" placeholder="e.g. 123-4567" />
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Customer</label>
                {userRole === 'customer' && customers.length === 1 ? (
                    <>
                        <input type="hidden" name="customer_id" value={customers[0].id} />
                        <input type="text" className="input" disabled value={customers[0].name} style={{ background: 'var(--input-bg)', opacity: 0.8 }} />
                    </>
                ) : customers.length > 0 ? (
                    <select
                        name="customer_id"
                        className="input"
                        required
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        value={selectedCustomerId}
                    >
                        <option value="">Select Customer...</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                ) : (
                    <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', marginRight: '0.5rem' }}>No customers found.</span>
                        {userRole !== 'customer' && <Link href="/customers/new" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>Create Customer +</Link>}
                    </div>
                )}
            </div>

            {/* Contact Dropdown - Only shows if customer selected and has contacts */}
            {selectedCustomerId && (
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Contact Person</label>
                    <select name="customer_contact_id" className="input">
                        <option value="">Select Contact (Optional)...</option>
                        {filteredContacts.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                        ))}
                    </select>
                    {filteredContacts.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            No specific contacts found for this customer.
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Job Lead</label>
                <select name="lead_id" className="input">
                    <option value="">Select Job Lead (Optional)...</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Assign Team Members</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)'
                }}>
                    {users.map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                                type="checkbox"
                                name="assigned_user_ids"
                                value={u.id}
                                style={{ width: '1rem', height: '1rem' }}
                            />
                            {u.username}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <label className="label">Scheduled Date</label>
                    <input name="scheduled_date" type="datetime-local" className="input" required />
                </div>
                <div>
                    <label className="label">Est. Hours</label>
                    <input name="estimated_hours" type="number" step="0.5" className="input" placeholder="0" />
                </div>
                <div>
                    <label className="label">Due Date</label>
                    <input name="due_date" type="date" className="input" required />
                </div>
                <div>
                    <label className="label">Priority</label>
                    <select name="priority" className="input" defaultValue="Normal">
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Description</label>
                <textarea name="description" className="input" rows="3" placeholder="Job details..."></textarea>
            </div>

            <SubmitButton />
        </form>
    );
}
