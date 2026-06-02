import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import ManloadingChart from '@/components/ManloadingChart';
import OnCallEditor from '@/components/OnCallEditor';
import Link from 'next/link';
import MSProjectImportButton from '@/components/MSProjectImportButton';
import { getManloadingData } from '@/app/actions/roadmap';
import { getOnCallScheduleForMonth } from '@/app/actions/oncall';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
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

    // Fetch users (needed for workers display on Gantt)
    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

    // Fetch manloading data
    const manloading = await getManloadingData();

    // Fetch on-call schedule for current and next 2 months
    const today = new Date();
    const onCallSchedule = await getOnCallScheduleForMonth(today.getFullYear(), today.getMonth());

    // Transform for UI (GROUP_CONCAT equivalent)
    const jobs = (jobsRaw || []).map(job => ({
        ...job,
        assigned_ids: job.assignments?.map(a => a.user_id).join(',')
    }));

    const subTasks = (subTasksRaw || []).map(st => ({
        ...st,
        assigned_ids: st.assignments?.map(a => a.user_id).join(',')
    }));

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Master Schedule & Man-Loading</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <MSProjectImportButton />
                    <Link href="/jobs/new" className="btn btn-primary">
                        + Add Job
                    </Link>
                </div>
            </div>

            {/* Manloading Overview */}
            <ManloadingChart manloading={manloading} users={users || []} alwaysExpanded={true} />

            {/* On-Call Editor (Admin Only) */}
            <OnCallEditor initialSchedule={onCallSchedule} userRole={userRole} />

            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Monthly Calendar</h3>
            <Calendar jobs={jobs} subTasks={subTasks} users={users || []} onCallSchedule={onCallSchedule} />
        </div>
    );
}
