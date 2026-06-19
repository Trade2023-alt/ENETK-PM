'use client'

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import JobStatusUpdate from '@/components/JobStatusUpdate';
import SubTaskList from '@/components/SubTaskList';
import EmailReminderButton from '@/components/EmailReminderButton';
import JobMilestones from '@/components/JobMilestones';
import LessonsLearned from '@/components/LessonsLearned';
import JobNotes from '@/components/JobNotes';
import JobDetailActions from '@/components/JobDetailActions';
import JobPhases from '@/components/JobPhases';

// We import the server actions to fetch supplementary data
import { getJobPhases } from '@/app/actions/phases';
import { getJobMilestones } from '@/app/actions/roadmap';
import { getLessonsLearned } from '@/app/actions/lessons';
import { getJobNotes, getSubTaskNotesForJob } from '@/app/actions/notes';

export default function JobDetailSidePanel({ jobId, job, subTasks, users, customers, onClose }) {
    const [isPending, startTransition] = useTransition();
    const [phases, setPhases] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [jobNotes, setJobNotes] = useState([]);
    const [subTaskNotes, setSubTaskNotes] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!jobId) return;
        setLoading(true);
        startTransition(async () => {
            try {
                const [ph, ms, jn, stn, ll] = await Promise.all([
                    getJobPhases(jobId),
                    getJobMilestones(jobId),
                    getJobNotes(jobId),
                    getSubTaskNotesForJob(jobId),
                    getLessonsLearned(jobId)
                ]);
                setPhases(ph || []);
                setMilestones(ms || []);
                setJobNotes(jn || []);
                setSubTaskNotes(stn || []);
                setLessons(ll || []);
            } catch (err) {
                console.error("Failed to load supplementary job data", err);
            } finally {
                setLoading(false);
            }
        });
    }, [jobId]);

    if (!job) return null;

    // Calculate job completion percentage
    const subTasksCount = subTasks?.length || 0;
    const jobPercentComplete = subTasksCount > 0
        ? Math.round(subTasks.reduce((sum, st) => sum + (st.completion_percent || 0), 0) / subTasksCount)
        : (phases && phases.length > 0 && !phases.error
            ? Math.round((phases.filter(p => p.status === 'Complete').length / phases.length) * 100)
            : (job.status === 'Complete' ? 100 : (job.status === 'In Progress' ? 50 : 0)));

    return (
        <>
            {/* Backdrop */}
            <div 
                style={{ 
                    position: 'fixed', inset: 0, zIndex: 9998, 
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' 
                }} 
                onClick={onClose} 
            />

            {/* Sliding Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '800px',
                background: 'var(--background)', zIndex: 9999,
                boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
                overflowY: 'auto',
                borderLeft: '1px solid var(--card-border)',
                animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                <style>{`
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}</style>

                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(18, 18, 18, 0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Job Details</h2>
                    <button onClick={onClose} className="btn" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', fontSize: '1.25rem', padding: '0.25rem 0.75rem' }}>✕ Close</button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>{job.title}</h2>
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

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading supplementary data...</div>
                    ) : (
                        <>
                            <JobPhases jobId={job.id} initialPhases={phases} />
                            <JobStatusUpdate job={{ ...job, used_hours: job.actual_hours - (subTasks.reduce((s, st) => s + (st.used_hours||0), 0)), estimated_hours: job.estimated_hours - (subTasks.reduce((s, st) => s + (st.estimated_hours||0), 0)) }} allUsers={users} allCustomers={customers} />
                            <JobMilestones jobId={job.id} initialMilestones={milestones} subTasks={subTasks} />
                            <SubTaskList jobId={job.id} subTasks={subTasks} users={users} initialSubTaskNotes={subTaskNotes} />
                            <JobNotes jobId={job.id} initialNotes={jobNotes} initialSubTaskNotes={subTaskNotes} />
                            <LessonsLearned jobId={job.id} initialLessons={lessons} />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
