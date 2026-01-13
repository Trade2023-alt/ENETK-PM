import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import Link from 'next/link';
import JobStatusUpdate from '@/components/JobStatusUpdate';
import SubTaskList from '@/components/SubTaskList';
import EmailReminderButton from '@/components/EmailReminderButton';

export default async function JobDetailPage({ params }) {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    const { id } = await params;
    const job = db.prepare(`
    SELECT jobs.*, 
           customers.name as customer_name, 
           GROUP_CONCAT(users.username, ', ') as assigned_users,
           GROUP_CONCAT(users.id) as assigned_user_ids,
           customer_contacts.name as contact_name,
           customer_contacts.phone as contact_phone
    FROM jobs 
    JOIN customers ON jobs.customer_id = customers.id 
    LEFT JOIN job_assignments ON jobs.id = job_assignments.job_id
    LEFT JOIN users ON job_assignments.user_id = users.id 
    LEFT JOIN customer_contacts ON jobs.customer_contact_id = customer_contacts.id
    WHERE jobs.id = ?
    GROUP BY jobs.id
  `).get(id);

    const subTasks = db.prepare(`
        SELECT sub_tasks.*, 
               GROUP_CONCAT(users.username, ', ') as assigned_users
        FROM sub_tasks 
        LEFT JOIN sub_task_assignments ON sub_tasks.id = sub_task_assignments.sub_task_id
        LEFT JOIN users ON sub_task_assignments.user_id = users.id
        WHERE sub_tasks.job_id = ? 
        GROUP BY sub_tasks.id
        ORDER BY sub_tasks.due_date
    `).all(id);
    const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();

    if (!job) {
        return <div className="container">Job not found</div>;
    }

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>{job.title}</h2>
                        <span style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: 'var(--primary)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                        }}>
                            {job.status}
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Scheduled for</div>
                        <div style={{ fontWeight: 500 }}>{new Date(job.scheduled_date).toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <div>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Customer</h3>
                            <Link href={`/customers/${job.customer_id}`} style={{ fontSize: '1.125rem', color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>
                                {job.customer_name}
                            </Link>
                            {job.contact_name && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>
                                    Contact: {job.contact_name} {job.contact_phone && `(${job.contact_phone})`}
                                </div>
                            )}
                            {job.due_date && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--warning)', marginTop: '0.5rem' }}>
                                    Due: {new Date(job.due_date).toLocaleDateString()}
                                </div>
                            )}
                            <EmailReminderButton />
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Assigned To</h3>
                        <div style={{ fontSize: '1.125rem' }}>{job.assigned_users || 'Unassigned'}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Estimated Hours</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{job.estimated_hours || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Used Hours</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: job.used_hours > job.estimated_hours ? 'var(--danger)' : 'var(--success)' }}>{job.used_hours || 0}</div>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description</h3>
                    <p style={{ lineHeight: '1.6' }}>{job.description}</p>
                </div>

                <JobStatusUpdate job={job} allUsers={users} />

                <SubTaskList jobId={job.id} subTasks={subTasks} users={users} />
            </div>
        </div>
    );
}
