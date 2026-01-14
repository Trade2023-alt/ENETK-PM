import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import Link from 'next/link';

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

    // Fetch users
    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

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
                <h2 style={{ fontSize: '1.5rem' }}>Schedule</h2>
                <Link href="/jobs/new" className="btn btn-primary">
                    + Add Job
                </Link>
            </div>

            <Calendar jobs={jobs} subTasks={subTasks} users={users || []} />
        </div>
    );
}

