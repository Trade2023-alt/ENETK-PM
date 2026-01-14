import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

    try {
        // Fetch Job with related data
        const { data: jobRaw, error: jobError } = await supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(id, name),
                contact:customer_contacts(name, phone),
                assignments:job_assignments(
                    user:users(id, username)
                )
            `)
            .eq('id', id)
            .single();

        if (jobError || !jobRaw) {
            return <div className="container">Job not found</div>;
        }

        // Fetch Subtasks
        const { data: subTasksRaw, error: subTasksError } = await supabase
            .from('sub_tasks')
            .select(`
                *,
                assignments:sub_task_assignments(
                    user:users(username)
                )
            `)
            .eq('job_id', id)
            .order('due_date', { ascending: true });

        // Fetch all users for the update modal
        const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .order('username', { ascending: true });

        // Transform data for UI compatibility
        const job = {
            ...jobRaw,
            customer_name: jobRaw.customer?.name,
            contact_name: jobRaw.contact?.name,
            contact_phone: jobRaw.contact?.phone,
            assigned_users: jobRaw.assignments?.map(a => a.user?.username).filter(Boolean).join(', '),
            assigned_user_ids: jobRaw.assignments?.map(a => a.user?.id)
        };

        const subTasks = (subTasksRaw || []).map(st => ({
            ...st,
            assigned_users: st.assignments?.map(a => a.user?.username).filter(Boolean).join(', ')
        }));

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
                            <div style={{ fontWeight: 500 }}>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not set'}</div>
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
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: job.actual_hours > job.estimated_hours ? 'var(--danger)' : 'var(--success)' }}>{job.actual_hours || 0}</div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description</h3>
                        <p style={{ lineHeight: '1.6' }}>{job.description}</p>
                    </div>

                    <JobStatusUpdate job={{ ...job, used_hours: job.actual_hours }} allUsers={users} />

                    <SubTaskList jobId={job.id} subTasks={subTasks} users={users} />
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error loading job detail page:', error);
        return <div className="container">Error loading job details</div>;
    }
}

