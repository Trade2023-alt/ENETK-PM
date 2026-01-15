'use client'
import { useState } from 'react';
import { createTeamMember } from '@/app/actions/team';
import { useRouter } from 'next/navigation';

export default function TeamMemberForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(event.target);
        const result = await createTeamMember(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/team');
            router.refresh();
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
                    <strong>Update Required:</strong> {error}
                    {error.includes('missing') && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            Tip: Make sure you've run the SQL migration in Supabase to add 'company', 'phone', and 'email' columns to the 'users' table.
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Username</label>
                <input name="username" type="text" className="input" required disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Password</label>
                <input name="password" type="password" className="input" required disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Email</label>
                <input name="email" type="email" className="input" placeholder="user@example.com" disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Company</label>
                <input name="company" type="text" className="input" defaultValue="ENETK" placeholder="e.g. ENETK" disabled={loading} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Phone</label>
                <input name="phone" type="tel" className="input" placeholder="(555) 123-4567" disabled={loading} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Role</label>
                <select name="role" className="input" disabled={loading}>
                    <option value="user">Tech / User</option>
                    <option value="admin">Admin</option>
                </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
            </button>
        </form>
    );
}
