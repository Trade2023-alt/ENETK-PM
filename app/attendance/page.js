import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getAllAttendanceLogs } from '@/app/actions/attendance';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    const logs = await getAllAttendanceLogs();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Employee Attendance Logs</h2>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Employee</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Company</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check In</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check Out</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => {
                            const checkIn = new Date(log.check_in);
                            const checkOut = log.check_out ? new Date(log.check_out) : null;
                            let duration = '-';

                            if (checkOut) {
                                const diff = (checkOut - checkIn) / (1000 * 60 * 60);
                                duration = diff.toFixed(2) + ' hrs';
                            }

                            return (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{log.user?.username}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px'
                                        }}>
                                            {log.user?.company || 'ENETK'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                        {checkIn.toLocaleDateString()} {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                        {checkOut ? `${checkOut.toLocaleDateString()} ${checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : <span style={{ color: '#10b981' }}>Active</span>}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{duration}</td>
                                </tr>
                            );
                        })}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No attendance records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
