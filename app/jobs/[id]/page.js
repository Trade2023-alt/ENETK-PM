import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import JobStatusUpdate from '@/components/JobStatusUpdate';
import SubTaskList from '@/components/SubTaskList';
import EmailReminderButton from '@/components/EmailReminderButton';
import JobMilestones from '@/components/JobMilestones';
import LessonsLearned from '@/components/LessonsLearned';
import JobNotes from '@/components/JobNotes';
import { getJobMilestones } from '@/app/actions/roadmap';
import { getLessonsLearned } from '@/app/actions/lessons';
import { getJobNotes, getSubTaskNotesForJob } from '@/app/actions/notes';
import JobDetailActions from '@/components/JobDetailActions';
import JobPhases from '@/components/JobPhases';
import { getJobPhases } from '@/app/actions/phases';

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
                lead:users(id, username),
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
                    user:users(id, username)
                )
            `)
            .eq('job_id', id)
            .order('due_date', { ascending: true });

        // Fetch all users for the update modal
        const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .order('username', { ascending: true });

        // Fetch all customers for the update modal
        const { data: customers } = await supabase
            .from('customers')
            .select('id, name')
            .order('name', { ascending: true });

        // Fetch Job Phases
        const phases = await getJobPhases(id);

        // Fetch all sub-task notes for this job (used by both SubTaskList and JobNotes)
        const subTaskNotes = await getSubTaskNotesForJob(id);

        // Calculate total hours from subtasks
        const subTasksActual = (subTasksRaw || []).reduce((sum, st) => sum + (st.used_hours || 0), 0);
        const subTasksEst = (subTasksRaw || []).reduce((sum, st) => sum + (st.estimated_hours || 0), 0);

        // Transform data for UI compatibility
        const job = {
            ...jobRaw,
            customer_name: jobRaw.customer?.name,
            customer_id: jobRaw.customer?.id || jobRaw.customer_id,
            contact_name: jobRaw.contact?.name,
            contact_phone: jobRaw.contact?.phone,
            lead_name: jobRaw.lead?.username,
            lead_id: jobRaw.lead?.id,
            assigned_users: jobRaw.assignments?.map(a => a.user?.username).filter(Boolean).join(', '),
            assigned_user_ids: jobRaw.assignments?.map(a => a.user?.id),
            // Display total hours (job own hours + subtask hours)
            actual_hours: (jobRaw.actual_hours || 0) + subTasksActual,
            estimated_hours: (jobRaw.estimated_hours || 0) + subTasksEst
        };

        const subTasks = (subTasksRaw || []).map(st => ({
            ...st,
            assigned_users: st.assignments?.map(a => a.user?.username).filter(Boolean).join(', '),
            assigned_ids: st.assignments?.map(a => a.user?.id).filter(Boolean).join(',')
        }));

        // Calculate job completion percentage based on subtasks, phases, or status
        const subTasksCount = subTasksRaw?.length || 0;
        const jobPercentComplete = subTasksCount > 0
            ? Math.round(subTasksRaw.reduce((sum, st) => sum + (st.completion_percent || 0), 0) / subTasksCount)
            : (phases && phases.length > 0 && !phases.error
                ? Math.round((phases.filter(p => p.status === 'Complete').length / phases.length) * 100)
                : (jobRaw.status === 'Complete' ? 100 : (jobRaw.status === 'In Progress' ? 50 : 0)));

        return (
            <div className="container">
                <Header userRole={userRole} />

                <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>{job.title}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <span className={`badge ${job.status === 'Complete' ? 'badge-success' : job.status === 'In Progress' ? 'badge-warning' : 'badge-danger'}`}>
                                    {job.status}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '100px', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${jobPercentComplete}%`, background: 'var(--success)', height: '100%', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
                                        {jobPercentComplete}% Complete
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                            <JobDetailActions jobId={job.id} isHidden={job.is_hidden} />
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Scheduled for</div>
                                <div style={{ fontWeight: 500 }}>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not set'}</div>
                            </div>
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
                                <EmailReminderButton jobId={job.id} />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>👑 Job Lead</h3>
                            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>
                                {job.lead_name || 'Unassigned'}
                            </div>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>👥 Assigned Team</h3>
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

                    <JobPhases jobId={job.id} initialPhases={phases} />

                    <JobStatusUpdate job={{ ...job, used_hours: jobRaw.actual_hours, estimated_hours: jobRaw.estimated_hours }} allUsers={users} allCustomers={customers || []} />

                    <JobMilestones jobId={job.id} initialMilestones={await getJobMilestones(job.id)} subTasks={subTasks} />

                    <SubTaskList jobId={job.id} subTasks={subTasks} users={users} initialSubTaskNotes={subTaskNotes} />

                    <JobNotes jobId={job.id} initialNotes={await getJobNotes(job.id)} initialSubTaskNotes={subTaskNotes} />

                    <LessonsLearned jobId={job.id} initialLessons={await getLessonsLearned(job.id)} />
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error loading job detail page:', error);
        return <div className="container">Error loading job details</div>;
    }
}

