'use client'

import { useState } from 'react';
import { createMilestone, deleteMilestone, updateMilestone } from '@/app/actions/roadmap';
import RoadmapGantt from './RoadmapGantt';

export default function RoadmapClient({ initialMilestones, userRole }) {
    const [milestones, setMilestones] = useState(initialMilestones);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const res = await createMilestone(formData);
        if (res.success) {
            setMilestones([...milestones, res.milestone].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
            setIsAdding(false);
            e.target.reset();
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Road Map</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Interactive project milestones and strategy tracking.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn btn-primary"
                >
                    {isAdding ? 'Cancel' : '+ New Milestone'}
                </button>
            </div>

            {isAdding && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="label">Milestone Title</label>
                                <input name="title" className="input" placeholder="e.g. Q1 Phase Deployment" required />
                            </div>
                            <div>
                                <label className="label">Priority</label>
                                <select name="priority" className="input">
                                    <option value="Low">Low</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="label">Start Date</label>
                                <input name="start_date" type="date" className="input" required />
                            </div>
                            <div>
                                <label className="label">Target End Date</label>
                                <input name="end_date" type="date" className="input" required />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label">Description & Goals</label>
                            <textarea name="description" className="input" rows="3" placeholder="Context for this milestone..."></textarea>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                            {loading ? 'Saving...' : 'Create Milestone'}
                        </button>
                    </form>
                </div>
            )}

            {/* Gantt Chart Section */}
            <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📅 Interactive Timeline
                </h3>
                {milestones.length > 0 ? (
                    <RoadmapGantt milestones={milestones} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No milestones created yet. Add one to see your project timeline.
                    </div>
                )}
            </div>

            {/* List View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {milestones.map(m => (
                    <div key={m.id} className="card" style={{
                        borderLeft: `4px solid ${m.status === 'Achieved' ? '#10b981' : m.priority === 'Critical' ? '#ef4444' : 'var(--primary)'}`,
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{m.title}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(m.start_date).toLocaleDateString()} — {new Date(m.end_date).toLocaleDateString()}
                                </span>
                            </div>
                            <button onClick={() => handleDelete(m.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem', padding: '0' }}>×</button>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '3em' }}>
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
        </div>
    );
}
