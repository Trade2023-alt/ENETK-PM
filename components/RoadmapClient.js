'use client'

import { useState, useMemo } from 'react';
import { deleteMilestone, updateMilestone } from '@/app/actions/roadmap';
import RoadmapGantt from './RoadmapGantt';

export default function RoadmapClient({ initialMilestones, userRole }) {
    const [milestones, setMilestones] = useState(initialMilestones);
    const [filterJob, setFilterJob] = useState('all');

    // Group milestones by job for display
    const { groupedMilestones, uniqueJobs } = useMemo(() => {
        const jobs = new Map();
        jobs.set(null, 'Unassigned (General)');

        milestones.forEach(m => {
            if (m.job && !jobs.has(m.job.id)) {
                jobs.set(m.job.id, m.job.title);
            }
        });

        const filtered = filterJob === 'all'
            ? milestones
            : milestones.filter(m =>
                filterJob === 'general' ? !m.job_id : m.job_id?.toString() === filterJob
            );

        return {
            groupedMilestones: filtered,
            uniqueJobs: Array.from(jobs.entries())
        };
    }, [milestones, filterJob]);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this milestone?')) return;
        const res = await deleteMilestone(id);
        if (res.success) {
            setMilestones(milestones.filter(m => m.id !== id));
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        const res = await updateMilestone(id, { status: newStatus });
        if (res.success) {
            setMilestones(milestones.map(m => m.id === id ? { ...m, status: newStatus } : m));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Master Road Map</h1>
                    <p style={{ color: 'var(--text-muted)' }}>All project milestones in one view. Add milestones from individual job pages.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filter:</span>
                    <select
                        className="input"
                        style={{ width: 'auto' }}
                        value={filterJob}
                        onChange={(e) => setFilterJob(e.target.value)}
                    >
                        <option value="all">All Projects</option>
                        <option value="general">General (No Job)</option>
                        {uniqueJobs.filter(([id]) => id !== null).map(([id, title]) => (
                            <option key={id} value={id}>{title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Master Gantt Chart */}
            <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📅 Unified Timeline
                </h3>
                {groupedMilestones.length > 0 ? (
                    <RoadmapGantt milestones={groupedMilestones} showJobLabels={true} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No milestones found. Add milestones from individual job detail pages.
                    </div>
                )}
            </div>

            {/* List View Grouped by Job */}
            {groupedMilestones.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {groupedMilestones.map(m => (
                        <div key={m.id} className="card" style={{
                            borderLeft: `4px solid ${m.status === 'Achieved' ? '#10b981' : m.priority === 'Critical' ? '#ef4444' : 'var(--primary)'}`,
                            position: 'relative'
                        }}>
                            {m.job && (
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--primary)',
                                    marginBottom: '0.5rem',
                                    padding: '0.2rem 0.4rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                }}>
                                    📂 {m.job.title}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{m.title}</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(m.start_date).toLocaleDateString()} — {new Date(m.end_date).toLocaleDateString()}
                                    </span>
                                </div>
                                <button onClick={() => handleDelete(m.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem', padding: '0' }}>×</button>
                            </div>

                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '2em' }}>
                                {m.description || 'No description provided.'}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                                <select
                                    value={m.status}
                                    onChange={(e) => handleStatusUpdate(m.id, e.target.value)}
                                    className="input"
                                    style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Achieved">Achieved</option>
                                    <option value="Delayed">Delayed</option>
                                </select>

                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '100px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase'
                                }}>
                                    {m.priority}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
