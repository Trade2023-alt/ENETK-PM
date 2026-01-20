'use client'

import { useState } from 'react';

export default function ManloadingChart({ manloading, users = [] }) {
    const [expanded, setExpanded] = useState(false);

    if (!manloading || manloading.error) {
        return null;
    }

    const { team_size, total_active_jobs, total_active_subtasks, job_manloading } = manloading;
    const tasksPerPerson = team_size > 0 ? (total_active_subtasks / team_size).toFixed(1) : 0;
    const isOverloaded = total_active_subtasks > team_size * 5;

    // Calculate per-user load
    const userLoad = users.map(user => {
        const assignedJobs = job_manloading?.filter(jm =>
            jm.assigned_user_ids?.includes(user.id)
        ) || [];
        return {
            ...user,
            job_count: assignedJobs.length,
            total_hours: assignedJobs.reduce((sum, jm) => sum + (jm.estimated_hours || 0) + (jm.subtask_hours || 0), 0)
        };
    }).sort((a, b) => b.total_hours - a.total_hours);

    const maxHours = Math.max(...userLoad.map(u => u.total_hours), 1);

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    👥 Team Manloading
                    <span style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '100px',
                        background: isOverloaded ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isOverloaded ? '#ef4444' : '#10b981',
                        fontWeight: 600
                    }}>
                        {tasksPerPerson} tasks/person
                    </span>
                </h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>{expanded ? '−' : '+'}</span>
            </div>

            {/* Summary Row - Always Visible */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{team_size}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Team</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{total_active_jobs}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Jobs</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{total_active_subtasks}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasks</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isOverloaded ? '#ef4444' : '#10b981' }}>
                        {job_manloading?.reduce((sum, jm) => sum + (jm.estimated_hours || 0) + (jm.subtask_hours || 0), 0) || 0}h
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Est.</div>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                    {/* Per-User Load */}
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Load by Team Member</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {userLoad.map(user => (
                            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '100px', fontSize: '0.8rem', fontWeight: 600 }}>{user.username}</div>
                                <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(user.total_hours / maxHours) * 100}%`,
                                        height: '100%',
                                        background: user.total_hours > 40 ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : 'linear-gradient(90deg, var(--primary), #10b981)',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <div style={{ width: '80px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                    {user.job_count} jobs / {user.total_hours}h
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Per-Job Breakdown */}
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Per-Job Allocation</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                        {job_manloading?.slice(0, 8).map(jm => (
                            <div key={jm.job_id} style={{
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '6px',
                                borderLeft: `3px solid ${jm.status === 'In Progress' ? 'var(--primary)' : '#6b7280'}`
                            }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{jm.job_title}</div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <span>👥 {jm.assigned_count}</span>
                                    <span>📋 {jm.subtask_count} tasks</span>
                                    <span>⏱️ {jm.estimated_hours + jm.subtask_hours}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
