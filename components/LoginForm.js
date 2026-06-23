'use client'

import { useActionState, useState } from 'react';
import { login } from '@/app/actions/auth';
import { useFormStatus } from 'react-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { generateAuthenticationOptions, verifyAuthentication } from '@/app/actions/webauthn';

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
    const [passkeyLoading, setPasskeyLoading] = useState(false);

    const handlePasskeyLogin = async () => {
        try {
            setPasskeyLoading(true);
            const options = await generateAuthenticationOptions();
            if (options.error) throw new Error(options.error);

            const authResp = await startAuthentication(options);
            const verification = await verifyAuthentication(authResp);

            if (verification.success) {
                window.location.href = '/';
            } else {
                alert(verification.error || 'Authentication failed');
            }
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                alert('Passkey error: ' + err.message);
            }
        } finally {
            setPasskeyLoading(false);
        }
    };

    return (
        <form action={formAction} className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <img
                    src="/logo.webp"
                    alt="ENETK Logo"
                    style={{ height: '44px', width: 'auto', margin: '0 auto 1rem', display: 'block', filter: 'drop-shadow(0 0 10px rgba(159, 18, 57, 0.45))' }}
                />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    Welcome to <span className="text-primary">ENETK</span>
                </h2>
                <p className="label" style={{ marginBottom: 0 }}>Enter your credentials to access the workspace</p>
            </div>

            {state?.error && (
                <div className="form-error">
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

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
                </div>

                <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading}
                    className="btn"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
                >
                    <span style={{ fontSize: '1.2rem' }}>👤</span>
                    {passkeyLoading ? 'Waiting for Face ID / Touch ID...' : 'Sign in with Face ID / Passkey'}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Want to see our SCADA App?</p>
                <a href="/scada" className="btn" style={{ 
                    display: 'inline-block', 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    color: '#10b981', 
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    textDecoration: 'none'
                }}>
                    View ENETK SCADA
                </a>
            </div>
        </form>
    );
}
