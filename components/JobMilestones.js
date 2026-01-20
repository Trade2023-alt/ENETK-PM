'use client'

import { useState } from 'react';
import { createMilestone, deleteMilestone, updateMilestone } from '@/app/actions/roadmap';
import RoadmapGantt from './RoadmapGantt';

export default function JobMilestones({ jobId, initialMilestones }) {
    const [milestones, setMilestones] = useState(initialMilestones);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        formData.append('job_id', jobId);
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
        if (!confirm('Delete this milestone?')) return;
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
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🗺️ Project Roadmap
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn"
                    style={{ fontSize: '0.875rem', background: 'var(--card-border)' }}
                >
                    {isAdding ? 'Cancel' : '+ Add Milestone'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleCreate} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label className="label">Milestone Title</label>
                            <input name="title" className="input" placeholder="e.g. Phase 1 Complete" required />
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
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Description</label>
                        <textarea name="description" className="input" rows="2" placeholder="What needs to be achieved..."></textarea>
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                        {loading ? 'Saving...' : 'Add Milestone'}
                    </button>
                </form>
            )}

            {milestones.length > 0 ? (
                <>
                    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                        <RoadmapGantt milestones={milestones} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {milestones.map(m => (
                            <div key={m.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '0.5rem',
                                borderLeft: `3px solid ${m.status === 'Achieved' ? '#10b981' : m.priority === 'Critical' ? '#ef4444' : 'var(--primary)'}`
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(m.start_date).toLocaleDateString()} — {new Date(m.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <select
                                        value={m.status}
                                        onChange={(e) => handleStatusUpdate(m.id, e.target.value)}
                                        className="input"
                                        style={{ width: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                                    >
                                        <option value="Planned">Planned</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Achieved">Achieved</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No milestones yet. Add one to track project phases.
                </div>
            )}
        </div>
    );
}
