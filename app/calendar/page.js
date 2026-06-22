import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import OnCallEditor from '@/components/OnCallEditor';
import AutoSchedulerModal from '@/components/AutoSchedulerModal';
import Link from 'next/link';
import { getOnCallScheduleForMonth } from '@/app/actions/oncall';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Calendar | ENETK PM',
    description: 'Full-screen monthly calendar for ENETK project management',
};

export default async function CalendarPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) redirect('/login');

    // Fetch jobs with assignments
    const { data: jobsRaw } = await supabase
        .from('jobs')
        .select(`
            *,
            assignments:job_assignments(user_id)
        `);

    // Fetch sub-tasks with assignments
    const { data: subTasksRaw } = await supabase
        .from('sub_tasks')
        .select(`
            *,
            assignments:sub_task_assignments(user_id)
        `);

    // Fetch users
    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

    // Fetch on-call schedule for current month
    const today = new Date();
    const onCallSchedule = await getOnCallScheduleForMonth(today.getFullYear(), today.getMonth());

    // Transform assigned_ids
    const jobs = (jobsRaw || []).map(job => ({
        ...job,
        assigned_ids: job.assignments?.map(a => a.user_id).join(',')
    }));

    const subTasks = (subTasksRaw || []).map(st => ({
        ...st,
        assigned_ids: st.assignments?.map(a => a.user_id).join(',')
    }));

    return (
        <div style={{ padding: '0 1.5rem 4rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Header userRole={userRole} />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                marginTop: '0.5rem',
            }}>
                <div>
                    <h2 className="page-title">
                        🗓️ Calendar
                    </h2>
                    <p className="page-subtitle" style={{ fontSize: '0.82rem' }}>
                        Full-screen monthly &amp; weekly calendar · Drag &amp; drop to reschedule · Right-click for options
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <AutoSchedulerModal users={users || []} />
                    <Link href="/gantt" className="btn" style={{ fontSize: '0.82rem' }}>
                        📊 Gantt View
                    </Link>
                    <Link href="/schedule/v2" className="btn" style={{ fontSize: '0.82rem' }}>
                        🗃️ Spreadsheet
                    </Link>
                    <Link href="/jobs/new" className="btn btn-primary">
                        + New Job
                    </Link>
                </div>
            </div>

            {/* On-Call Editor */}
            <OnCallEditor initialSchedule={onCallSchedule} userRole={userRole} />

            {/* Full Calendar */}
            <Calendar
                jobs={jobs}
                subTasks={subTasks}
                users={users || []}
                onCallSchedule={onCallSchedule}
            />
        </div>
    );
}
