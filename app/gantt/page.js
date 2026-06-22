import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import JobGantt from '@/components/JobGantt';
import AutoSchedulerModal from '@/components/AutoSchedulerModal';
import MSProjectImporter from '@/components/MSProjectImporter';
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
            ),
            sub_tasks(*, assignments:sub_task_assignments(user_id, user:users(username)))
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

    const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

    // Milestones for the timeline + KPI/risk widgets
    let milestones = [];
    try {
        const { data: milestonesRaw } = await supabase
            .from('roadmap_milestones')
            .select('*, job:jobs(id, title, status)')
            .order('end_date', { ascending: true });
        milestones = milestonesRaw || [];
    } catch (e) {
        console.error('Error fetching milestones:', e);
    }

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

    // Milestone stats
    const msComplete = milestones.filter(m => m.status === 'Achieved').length;
    const msOverdue = milestones.filter(m => m.status !== 'Achieved' && m.end_date && m.end_date < today).length;
    const msUpcoming = milestones.length - msComplete - msOverdue;

    // Milestone risk: milestone due within 7 days while its job is still "Scheduled"
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7ISO = in7.toISOString().split('T')[0];
    const milestoneRisks = milestones.filter(m =>
        m.status !== 'Achieved' &&
        m.end_date && m.end_date >= today && m.end_date <= in7ISO &&
        m.job && m.job.status === 'Scheduled'
    );

    // Team workload — job-days assigned per person this month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const DAY_MS = 24 * 60 * 60 * 1000;
    const workloadByUser = {};
    (users || []).forEach(u => { workloadByUser[u.id] = { username: u.username, days: 0 }; });
    jobs.forEach(job => {
        const ids = (job.assigned_ids || '').split(',').filter(Boolean);
        if (ids.length === 0 || !job.scheduled_date) return;
        const start = job.scheduled_date < monthStart ? monthStart : job.scheduled_date;
        let end = job.due_date && job.due_date >= job.scheduled_date ? job.due_date : job.scheduled_date;
        if (end > monthEnd) end = monthEnd;
        if (start > end) return;
        const dayCount = Math.round((new Date(end) - new Date(start)) / DAY_MS) + 1;
        ids.forEach(id => {
            if (workloadByUser[id]) workloadByUser[id].days += dayCount;
        });
    });
    const workload = Object.values(workloadByUser).sort((a, b) => b.days - a.days);
    const maxWorkloadDays = Math.max(1, ...workload.map(w => w.days));
    const workloadColor = (d) => {
        if (d > 30) return '#ef4444';
        if (d >= 15 && d <= 22) return '#10b981';
        if (d < 10 || d > 25) return '#f59e0b';
        return '#3b82f6'; // 10–14 or 23–25: moderate
    };

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
                    <MSProjectImporter users={users || []} />
                    <AutoSchedulerModal users={users || []} />
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
                    { label: 'Milestones', value: `${msComplete}✓ ${msUpcoming}↑ ${msOverdue}⚠`, color: msOverdue > 0 ? '#ef4444' : '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: '◆' },
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
                        <div style={{ fontSize: typeof value === 'string' ? '1rem' : '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Milestone Risk warnings */}
            {milestoneRisks.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.07)' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#ef4444' }}>
                        ⚠️ Milestone Risk — due within 7 days, job not started
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {milestoneRisks.map(m => (
                            <Link key={m.id} href={m.job ? `/jobs/${m.job.id}` : '/roadmap'} style={{
                                textDecoration: 'none', color: 'inherit',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)',
                                fontSize: '0.82rem'
                            }}>
                                <span><strong>{m.title}</strong>{m.job ? ` — ${m.job.title}` : ''}</span>
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>due {m.end_date}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Gantt Chart */}
            <JobGantt jobs={jobs} users={users || []} customers={customers || []} milestones={milestones} />

            {/* Team Workload balance */}
            {workload.length > 0 && (
                <div className="card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>🏗️ Team Workload — this month</h3>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Job-days assigned per person · <span style={{ color: '#10b981' }}>green 15–22</span> · <span style={{ color: '#f59e0b' }}>yellow &lt;10 or &gt;25</span> · <span style={{ color: '#ef4444' }}>red &gt;30</span>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {workload.map(w => (
                            <div key={w.username} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '140px', flexShrink: 0, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.username}</div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '6px', height: '20px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ width: `${Math.round((w.days / maxWorkloadDays) * 100)}%`, height: '100%', background: workloadColor(w.days), transition: 'width 0.3s', minWidth: w.days > 0 ? '2px' : 0 }} />
                                </div>
                                <div style={{ width: '70px', flexShrink: 0, fontSize: '0.78rem', fontWeight: 700, textAlign: 'right', color: workloadColor(w.days) }}>{w.days} d</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
