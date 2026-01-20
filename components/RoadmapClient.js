'use client'

import { useState, useMemo } from 'react';
import { deleteMilestone, updateMilestone } from '@/app/actions/roadmap';
import RoadmapGantt from './RoadmapGantt';

export default function RoadmapClient({ initialMilestones, initialSubTasks = [], manloading = {}, users = [], userRole }) {
    const [milestones, setMilestones] = useState(initialMilestones);
    const [subTasks] = useState(initialSubTasks);

    // Filters
    const [filterJob, setFilterJob] = useState('all');
    const [filterUser, setFilterUser] = useState('all');
    const [showMilestones, setShowMilestones] = useState(true);
    const [showSubTasks, setShowSubTasks] = useState(true);
    const [showManloading, setShowManloading] = useState(false);

    // Combine and filter items
    const { filteredItems, uniqueJobs } = useMemo(() => {
        const jobs = new Map();
        jobs.set(null, 'Unassigned (General)');

        // Collect unique jobs from milestones
        milestones.forEach(m => {
            if (m.job && !jobs.has(m.job.id)) {
                jobs.set(m.job.id, m.job.title);
            }
        });

        // Collect unique jobs from subtasks
        subTasks.forEach(st => {
            if (st.job && !jobs.has(st.job.id)) {
                jobs.set(st.job.id, st.job.title);
            }
        });

        // Build combined items list
        let items = [];

        if (showMilestones) {
            items = [...items, ...milestones.map(m => ({ ...m, type: 'milestone' }))];
        }

        if (showSubTasks) {
            items = [...items, ...subTasks];
        }

        // Apply job filter
        if (filterJob !== 'all') {
            items = items.filter(item =>
                filterJob === 'general' ? !item.job_id : item.job_id?.toString() === filterJob
            );
        }

        // Apply user filter
        if (filterUser !== 'all') {
            items = items.filter(item => {
                if (item.type === 'subtask') {
                    return item.assigned_users?.some(u => u.id?.toString() === filterUser);
                }
                return true; // Milestones don't have user assignments currently
            });
        }

        // Sort by date
        items.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        return { filteredItems: items, uniqueJobs: Array.from(jobs.entries()) };
    }, [milestones, subTasks, filterJob, filterUser, showMilestones, showSubTasks]);

    const handleDelete = async (id) => {
        if (id.toString().startsWith('subtask-')) return; // Can't delete subtasks from here
        if (!confirm('Delete this milestone?')) return;
        const res = await deleteMilestone(id);
        if (res.success) {
            setMilestones(milestones.filter(m => m.id !== id));
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        if (id.toString().startsWith('subtask-')) return; // Subtasks handled elsewhere
        const res = await updateMilestone(id, { status: newStatus });
        if (res.success) {
            setMilestones(milestones.map(m => m.id === id ? { ...m, status: newStatus } : m));
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Master Road Map</h1>
                <p style={{ color: 'var(--text-muted)' }}>All milestones and sub-tasks across all projects.</p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                {/* Type Checkboxes */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Show:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showMilestones}
                            onChange={(e) => setShowMilestones(e.target.checked)}
                        />
                        🎯 Milestones
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showSubTasks}
                            onChange={(e) => setShowSubTasks(e.target.checked)}
                        />
                        ✅ Sub-Tasks
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showManloading}
                            onChange={(e) => setShowManloading(e.target.checked)}
                        />
                        👥 Manloading
                    </label>
                </div>

                {/* Dropdowns */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Project:</span>
                        <select
                            className="input"
                            style={{ width: 'auto', minWidth: '150px' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>User:</span>
                        <select
                            className="input"
                            style={{ width: 'auto', minWidth: '150px' }}
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                        >
                            <option value="all">All Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Manloading Summary */}
            {showManloading && manloading && !manloading.error && (
                <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        👥 Manloading Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{manloading.team_size}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team Size</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{manloading.total_active_jobs}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Jobs</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{manloading.total_active_subtasks}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Tasks</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: manloading.total_active_subtasks > manloading.team_size * 5 ? '#ef4444' : '#10b981' }}>
                                {manloading.team_size > 0 ? (manloading.total_active_subtasks / manloading.team_size).toFixed(1) : 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks / Person</div>
                        </div>
                    </div>

                    {/* Per-Job Breakdown */}
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Per-Job Load</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {manloading.job_manloading?.map(jm => (
                            <div key={jm.job_id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem 0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '4px',
                                fontSize: '0.85rem'
                            }}>
                                <span style={{ fontWeight: 600 }}>{jm.job_title}</span>
                                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <span>👥 {jm.assigned_count}</span>
                                    <span>📋 {jm.subtask_count} tasks</span>
                                    <span>⏱️ {jm.estimated_hours + jm.subtask_hours}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Gantt Chart */}
            <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📅 Unified Timeline
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        ({filteredItems.length} items)
                    </span>
                </h3>
                {filteredItems.length > 0 ? (
                    <RoadmapGantt items={filteredItems} showJobLabels={true} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No items match the current filters.
                    </div>
                )}
            </div>

            {/* List View */}
            {filteredItems.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {filteredItems.slice(0, 20).map(item => (
                        <div key={item.id} className="card" style={{
                            borderLeft: `4px solid ${item.type === 'subtask' ? '#8b5cf6' : item.status === 'Achieved' ? '#10b981' : 'var(--primary)'}`,
                            padding: '1rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '4px', background: item.type === 'subtask' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: item.type === 'subtask' ? '#8b5cf6' : 'var(--primary)' }}>
                                        {item.type === 'subtask' ? 'TASK' : 'MILESTONE'}
                                    </span>
                                    {item.job && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {item.job.title}
                                        </span>
                                    )}
                                </div>
                                {item.type === 'milestone' && (
                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                )}
                            </div>
                            <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{item.title}</h4>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                {new Date(item.start_date).toLocaleDateString()}
                                {item.start_date !== item.end_date && ` — ${new Date(item.end_date).toLocaleDateString()}`}
                            </div>
                            {item.assigned_users?.length > 0 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    👤 {item.assigned_users.map(u => u.username).join(', ')}
                                </div>
                            )}
                            {item.type === 'milestone' && (
                                <select
                                    value={item.status}
                                    onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                                    className="input"
                                    style={{ width: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.4rem', marginTop: '0.5rem' }}
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Achieved">Achieved</option>
                                    <option value="Delayed">Delayed</option>
                                </select>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
