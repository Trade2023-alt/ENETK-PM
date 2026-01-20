import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getHoursWorkedTrend, getAttendanceMetrics } from '@/app/actions/attendance';
import AttendanceClient from '@/components/AttendanceClient';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    // Fetch data for 90 days to allow filtering
    const [trendData, metricsData] = await Promise.all([
        getHoursWorkedTrend(90),
        getAttendanceMetrics(90)
    ]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#1a1a1a' }}>Attendance Analytics</h2>
                <p style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>Track hours, punctuality, and attendance patterns.</p>
            </div>

            <AttendanceClient
                initialTrendData={trendData}
                initialMetricsData={metricsData}
                users={trendData.users}
            />
        </div>
    );
}
