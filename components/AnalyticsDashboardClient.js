'use client'
import React, { useState, useEffect } from 'react';

export default function AnalyticsDashboardMock({ jobs, aiUsage }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const losingProjects = jobs.filter(j => (j.actual_hours || 0) > (j.estimated_hours || 0));
    const winningProjects = jobs.filter(j => (j.actual_hours || 0) <= (j.estimated_hours || 0) && (j.status === 'Completed' || j.status === 'Complete'));
    const totalAiCost = aiUsage ? aiUsage.reduce((acc, u) => acc + parseFloat(u.cost_usd || 0), 0) : 0;

    if (!mounted) return <div style={{ height: 500, background: 'rgba(255,255,255,0.02)' }} />;

    return (
        <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #10b981' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>"Winning" Bids</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{winningProjects.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>"Losing" Bids</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{losingProjects.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>AI Usage Cost</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${totalAiCost.toFixed(4)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <h3>Project Performance</h3>
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {jobs.slice(0, 5).map((job, i) => {
                            const pct = Math.min((job.actual_hours / job.estimated_hours) * 100, 100) || 0;
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                                        <span>{job.title}</span>
                                        <span>{job.actual_hours} / {job.estimated_hours} hrs</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: pct > 100 ? '#ef4444' : 'var(--primary)' }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="card">
                    <h3>AI Usage Log</h3>
                    <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {aiUsage.slice(-5).map((u, i) => (
                            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{new Date(u.created_at).toLocaleDateString()}</span>
                                <span style={{ color: 'var(--primary)' }}>${parseFloat(u.cost_usd).toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
