import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getHoursWorkedTrend } from '@/app/actions/attendance';
import AttendanceTrendChart from '@/components/AttendanceTrendChart';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    const trendData = await getHoursWorkedTrend(30);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Attendance - Hours Worked Trend</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View hours worked per day for each team member over the last 30 days.</p>
            </div>

            <AttendanceTrendChart
                chartData={trendData.chartData}
                users={trendData.users}
            />
        </div>
    );
}
