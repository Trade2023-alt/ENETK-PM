'use client'

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={pending}>
            {pending ? 'Signing in...' : 'Sign In'}
        </button>
    );
}

export default function LoginForm() {
    const [state, formAction] = useActionState(login, { error: null });

    return (
        <form action={formAction} className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome Back</h2>
                <p className="label">Enter your credentials to access the workspace</p>
            </div>

            {state?.error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                }}>
                    {state.error}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="username" className="label">Username</label>
                <input name="username" id="username" type="text" className="input" placeholder="admin" required />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="password" className="label">Password</label>
                <input name="password" id="password" type="password" className="input" placeholder="••••••••" required />
            </div>

            <SubmitButton />

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <p>Default Login: admin / admin123</p>
            </div>
        </form>
    );
}
