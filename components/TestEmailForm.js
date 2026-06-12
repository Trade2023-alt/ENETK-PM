'use client'

import { useState } from 'react';
import { sendTestEmail } from '@/app/actions/testEmail';

export default function TestEmailForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { success: boolean, message: string }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setStatus({ success: false, message: 'Please enter a valid email address.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const result = await sendTestEmail(email);
            if (result.success) {
                setStatus({ success: true, message: result.message });
            } else {
                setStatus({ success: false, message: result.error || 'Failed to send test email.' });
            }
        } catch (err) {
            setStatus({ success: false, message: err.message || 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const isAppPasswordError = status && !status.success && (
        status.message.includes('535') || 
        status.message.includes('BadCredentials') || 
        status.message.includes('Username and Password not accepted')
    );

    return (
        <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🛠️</span> SMTP Configuration Diagnostic
            </h2>
            <p className="page-subtitle" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Test your Gmail SMTP connection by sending a diagnostic email to any address.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <label htmlFor="test-recipient" className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Recipient Email Address
                    </label>
                    <input
                        id="test-recipient"
                        type="email"
                        className="input"
                        placeholder="e.g. your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        style={{ width: '100%' }}
                    />
                </div>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ height: '42px', minWidth: '150px', whiteSpace: 'nowrap' }}
                >
                    {loading ? 'Sending Test...' : '📧 Send Test Email'}
                </button>
            </form>

            {status && (
                <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    background: status.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: status.success ? '#10b981' : '#ef4444',
                    border: `1px solid ${status.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {status.success ? '✅ Success!' : '❌ Error Details:'}
                    </div>
                    <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-all', 
                        fontFamily: 'monospace', 
                        background: 'rgba(0,0,0,0.15)', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                    }}>
                        {status.message}
                    </pre>

                    {isAppPasswordError && (
                        <div style={{ 
                            marginTop: '1rem', 
                            paddingTop: '0.75rem', 
                            borderTop: '1px solid rgba(239, 68, 68, 0.2)', 
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                        }}>
                            <strong style={{ color: '#ef4444' }}>💡 Troubleshooting App Password Error (535):</strong>
                            <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                                <li style={{ marginBottom: '0.25rem' }}>
                                    Confirm that your Google account <strong>2-Step Verification</strong> is turned ON.
                                </li>
                                <li style={{ marginBottom: '0.25rem' }}>
                                    Go to Google Account settings &rarr; Security &rarr; 2-Step Verification &rarr; <strong>App Passwords</strong> (at the very bottom).
                                </li>
                                <li style={{ marginBottom: '0.25rem' }}>
                                    Generate a new App Password (e.g. name it <em>"ENETK-PM"</em>).
                                </li>
                                <li style={{ marginBottom: '0.25rem' }}>
                                    Copy the <strong>16-character code</strong> (looks like <code>luqg uzsh xamz fqqa</code>).
                                </li>
                                <li>
                                    Open your project's <code>.env</code> file and update the line:
                                    <pre style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', margin: '0.25rem 0', borderRadius: '4px', display: 'inline-block', fontFamily: 'monospace' }}>
                                        EMAIL_PASS=your_16_character_code
                                    </pre>
                                </li>
                            </ol>
                            <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                Note: If you recently changed your main Google account password, Google automatically revokes all generated App Passwords, and you must create a new one.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
