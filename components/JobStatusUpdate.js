'use client'

import { updateJobStatus } from '@/app/actions/updateJob';
import { useFormStatus } from 'react-dom';
import { useState } from 'react';

function UpdateButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '0.875rem' }} disabled={pending}>
            {pending ? 'Updating...' : 'Update Job'}
        </button>
    );
}

export default function JobStatusUpdate({ job, allUsers }) {
    const [result, setResult] = useState(null);

    const handleSubmit = async (formData) => {
        setResult({ loading: true });
        const res = await updateJobStatus(formData);
        if (res && res.error) {
            setResult({ error: res.error });
        } else {
            setResult({ success: true });
            // Reset the Add Hours input specifically
            const hoursInput = document.querySelector('input[name="used_hours"]');
            if (hoursInput) hoursInput.value = '0';

            setTimeout(() => setResult(null), 3000); // Clear success message after 3s
        }
    };

    return (
        <form action={handleSubmit} className="card" style={{ marginTop: '2rem', border: '1px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Update Job</h3>
            <input type="hidden" name="job_id" value={job.id} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                    <label className="label">Status</label>
                    <select name="status" className="input" defaultValue={job.status}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                    </select>
                </div>
                <div>
                    <label className="label">Priority</label>
                    <select name="priority" className="input" defaultValue={job.priority || 'Normal'}>
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
                <div>
                    <label className="label">Add Hours</label>
                    <input name="used_hours" type="number" step="0.5" className="input" defaultValue="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Current: {job.used_hours || 0} hrs</div>
                </div>
                <div>
                    <label className="label">Estimated Hours</label>
                    <input name="estimated_hours" type="number" step="0.5" className="input" defaultValue={job.estimated_hours || 0} />
                </div>
                <div>
                    <label className="label">Due Date</label>
                    <input name="due_date" type="date" className="input" defaultValue={job.due_date ? new Date(job.due_date).toISOString().split('T')[0] : ''} />
                </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <label className="label">Notes / Description Update</label>
                <textarea name="description" className="input" rows="2" defaultValue={job.description} />
            </div>

            <div style={{ marginTop: '1rem' }}>
                <label className="label">Update Assignments</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)'
                }}>
                    {allUsers.map(u => {
                        const assignedIds = job.assigned_user_ids ? job.assigned_user_ids : [];
                        const isAssigned = assignedIds.includes(u.id);
                        return (
                            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                <input
                                    type="checkbox"
                                    name="assigned_user_ids"
                                    value={u.id}
                                    defaultChecked={isAssigned}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                {u.username}
                            </label>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <UpdateButton />
                {result?.error && <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '1rem' }}>Error: {result.error}</span>}
                {result?.success && <span style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '1rem' }}>✓ Updated Successfully</span>}
            </div>
        </form>
    );
}
