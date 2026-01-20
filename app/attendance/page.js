import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getHoursWorkedTrend, getAttendanceMetrics } from '@/app/actions/attendance';
import AttendanceTrendChart from '@/components/AttendanceTrendChart';
import AttendancePieCharts from '@/components/AttendancePieCharts';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    // Fetch data in parallel
    const [trendData, metricsData] = await Promise.all([
        getHoursWorkedTrend(30),
        getAttendanceMetrics(30)
    ]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Attendance Analytics</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track hours, punctuality, and attendance patterns over the last 30 days.</p>
            </div>

            {/* Pie Charts Section */}
            <AttendancePieCharts metrics={metricsData} />

            {/* Hours Trend Chart */}
            <AttendanceTrendChart
                chartData={trendData.chartData}
                users={trendData.users}
            />
        </div>
    );
}
