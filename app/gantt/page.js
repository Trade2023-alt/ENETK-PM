import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import JobGantt from '@/components/JobGantt';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Gantt Timeline | ENETK PM',
    description: 'Full-screen master schedule Gantt chart for all ENETK projects',
};

export default async function GanttPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) redirect('/login');

    // Fetch all jobs with assignments
    let query = supabase
        .from('jobs')
        .select(`
            *,
            customer:customers(name),
            lead:users(username),
            assignments:job_assignments(
                user_id,
                user:users(username)
            )
        `)
        .order('scheduled_date', { ascending: true });

    // Non-admins only see their jobs
    if (userRole === 'customer') {
        query = query.eq('customer_id', userId);
    } else if (userRole !== 'admin' && userRole !== 'system_integrator') {
        const { data: userAssignments } = await supabase
            .from('job_assignments')
            .select('job_id')
            .eq('user_id', userId);
        const assignedJobIds = userAssignments?.map(a => a.job_id) || [];
        if (assignedJobIds.length > 0) {
            query = query.or(`id.in.(${assignedJobIds.join(',')}),lead_id.eq.${userId}`);
        } else {
            query = query.eq('lead_id', userId);
        }
    }

    const { data: jobsRaw } = await query;

    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

    const jobs = (jobsRaw || []).map(job => ({
        ...job,
        customer_name: job.customer?.name,
        lead_name: job.lead?.username,
        assigned_ids: job.assignments?.map(a => a.user_id).join(','),
        assigned_users: job.assignments?.map(a => a.user?.username).filter(Boolean).join(', ')
    })).filter(job => job.scheduled_date); // Only jobs with a date

    // Compute stats
    const total = jobs.length;
    const scheduled = jobs.filter(j => j.status === 'Scheduled').length;
    const inProgress = jobs.filter(j => j.status === 'In Progress').length;
    const complete = jobs.filter(j => j.status === 'Complete').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = jobs.filter(j =>
        j.status !== 'Complete' && j.due_date && j.due_date < today
    ).length;

    return (
        <div style={{ padding: '0 1.5rem 4rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Header userRole={userRole} />

            {/* Page Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>
                        📊 Master Schedule — Gantt Timeline
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        All active jobs on one timeline · Drag bars to reschedule · Switch Day / Week / Month zoom
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link href="/calendar" className="btn" style={{ fontSize: '0.82rem' }}>🗓️ Calendar</Link>
                    <Link href="/schedule/v2" className="btn" style={{ fontSize: '0.82rem' }}>🗃️ Schedule</Link>
                    <Link href="/jobs/new" className="btn btn-primary">+ New Job</Link>
                </div>
            </div>

            {/* KPI Ribbon */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem'
            }}>
                {[
                    { label: 'Total Jobs', value: total, color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)', icon: '📋' },
                    { label: 'Scheduled', value: scheduled, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
                    { label: 'In Progress', value: inProgress, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
                    { label: 'Complete', value: complete, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
                    { label: 'Overdue', value: overdue, color: overdue > 0 ? '#ef4444' : '#10b981', bg: overdue > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.08)', icon: overdue > 0 ? '⚠️' : '✅' },
                ].map(({ label, value, color, bg, icon }) => (
                    <div key={label} className="card" style={{
                        padding: '0.875rem 1.1rem',
                        background: bg,
                        borderLeft: `3px solid ${color}`,
                        display: 'flex', flexDirection: 'column', gap: '0.25rem'
                    }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {icon} {label}
                        </div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Gantt Chart */}
            <JobGantt jobs={jobs} users={users || []} />

            {jobs.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No Scheduled Jobs</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Jobs need a scheduled date to appear on the Gantt timeline.
                    </p>
                    <Link href="/jobs/new" className="btn btn-primary">+ Create Your First Job</Link>
                </div>
            )}
        </div>
    );
}
