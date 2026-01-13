import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import Link from 'next/link';

export default async function SchedulePage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) redirect('/login');

    // Fetch all jobs with assignments
    const jobs = db.prepare(`
        SELECT jobs.*, GROUP_CONCAT(job_assignments.user_id) as assigned_ids 
        FROM jobs 
        LEFT JOIN job_assignments ON jobs.id = job_assignments.job_id
        GROUP BY jobs.id
    `).all();

    // Fetch all sub-tasks with assignments
    const subTasks = db.prepare(`
        SELECT sub_tasks.*, GROUP_CONCAT(sub_task_assignments.user_id) as assigned_ids
        FROM sub_tasks
        LEFT JOIN sub_task_assignments ON sub_tasks.id = sub_task_assignments.sub_task_id
        GROUP BY sub_tasks.id
    `).all();

    const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Schedule</h2>
                <Link href="/jobs/new" className="btn btn-primary">
                    + Add Job
                </Link>
            </div>

            <Calendar jobs={jobs} subTasks={subTasks} users={users} />
        </div>
    );
}
