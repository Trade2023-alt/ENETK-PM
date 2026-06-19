import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import ScheduleSpreadsheet from '@/components/ScheduleSpreadsheet';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Schedule V2 | ENETK PM',
    description: 'Spreadsheet-style master schedule for ENETK project management',
};

export default async function ScheduleV2Page() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) redirect('/login');

    // Fetch jobs with assignments
    const { data: jobsRaw } = await supabase
        .from('jobs')
        .select(`
            *,
            assignments:job_assignments(user_id),
            customer:customers(name)
        `)
        .order('scheduled_date', { ascending: true });

    // Fetch sub-tasks with assignments
    const { data: subTasksRaw } = await supabase
        .from('sub_tasks')
        .select(`
            *,
            assignments:sub_task_assignments(user_id)
        `)
        .order('due_date', { ascending: true });

    // Fetch users
    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

    // Transform assigned_ids to a comma-separated string
    const jobs = (jobsRaw || []).map(job => ({
        ...job,
        assigned_ids: job.assignments?.map(a => a.user_id).join(','),
        customer_name: job.customer?.name || null,
    }));

    const subTasks = (subTasksRaw || []).map(st => ({
        ...st,
        assigned_ids: st.assignments?.map(a => a.user_id).join(','),
    }));

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                        📊 Schedule V2 — Spreadsheet View
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Sortable, filterable master schedule across all jobs and tasks
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href="/calendar" className="btn" style={{ fontSize: '0.85rem' }}>
                        🗓️ Calendar
                    </Link>
                    <Link href="/jobs/new" className="btn btn-primary">
                        + Add Job
                    </Link>
                </div>
            </div>

            <ScheduleSpreadsheet
                jobs={jobs}
                subTasks={subTasks}
                users={users || []}
                userRole={userRole}
            />
        </div>
    );
}
