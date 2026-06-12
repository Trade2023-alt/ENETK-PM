import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import TestEmailForm from '@/components/TestEmailForm';

export const revalidate = 0; // Disable caching so logs are always fresh

export default async function EmailLogsPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    // Fetch logs, newest first
    const { data: logs, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">System Email Logs</h1>
                    <p className="page-subtitle">Track the delivery status of all automated system emails.</p>
                </div>
            </header>

            {/* Test Email SMTP Diagnostic Form */}
            <TestEmailForm />

            <div className="card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Delivery Log</h2>
                {error ? (
                    <div style={{ color: '#ef4444', padding: '20px' }}>
                        Error loading logs. Please ensure you have run the SQL command to create the <strong>email_logs</strong> table in Supabase.
                        <br/><br/>
                        <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                            {error.message}
                        </pre>
                    </div>
                ) : !logs || logs.length === 0 ? (
                    <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
                        No emails have been logged yet.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Time</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Recipient</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Subject</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover">
                                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{log.recipient_email}</td>
                                        <td style={{ padding: '1rem' }}>{log.subject}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                background: log.status === 'Success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: log.status === 'Success' ? '#10b981' : '#ef4444',
                                                border: `1px solid ${log.status === 'Success' ? '#10b981' : '#ef4444'}`
                                            }}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', color: log.status === 'Error' ? '#ef4444' : 'var(--text-secondary)' }}>
                                            {log.error_message || 'Delivered'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

