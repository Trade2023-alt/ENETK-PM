import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getAttendanceStats } from '@/app/actions/attendance';
import dynamic_next from 'next/dynamic';

const AttendanceCharts = dynamic_next(() => import('@/components/AttendanceCharts'), { ssr: false });

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    const stats = await getAttendanceStats();
    if (stats.error) {
        return <div className="container"><Header userRole={userRole} />Error: {stats.error}</div>;
    }

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Attendance Analytics</h2>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Lates ({'>'} 6:15 AM)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.totalLate}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Partial Days ({'<'} 6 hrs)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.totalPartial}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Today's Absences</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.todayAbsent}</div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Punctuality Trend (Last 7 Days)</h3>
                <AttendanceCharts data={stats.chartData} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Activity Log</h3>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Employee</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check In</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Check Out</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Duration</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.logs.map(log => {
                            const checkIn = new Date(log.check_in);
                            const checkOut = log.check_out ? new Date(log.check_out) : null;

                            return (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                        {log.user?.username}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user?.company || 'ENETK'}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                        {checkIn.toLocaleDateString()} {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                        {checkOut ? `${checkOut.toLocaleDateString()} ${checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : <span style={{ color: '#10b981' }}>Active</span>}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{log.duration} hrs</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {log.isLate && <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>LATE</span>}
                                            {log.isPartial && <span style={{ fontSize: '0.7rem', background: '#f59e0b', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>PARTIAL</span>}
                                            {!log.isLate && !log.isPartial && log.check_out && <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>OK</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
