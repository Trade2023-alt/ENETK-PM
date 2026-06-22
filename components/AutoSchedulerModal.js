'use client'

import { useState, useEffect } from 'react';
import { generateSchedulePreview, applySchedule } from '@/app/actions/scheduler';

export default function AutoSchedulerModal({ users }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    const [jobProposals, setJobProposals] = useState([]);
    const [subtaskProposals, setSubtaskProposals] = useState([]);

    const handleRunAI = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await generateSchedulePreview();
            if (res.error) {
                setError(res.error);
            } else if (res.proposals) {
                setJobProposals(res.proposals.job_proposals || []);
                setSubtaskProposals(res.proposals.subtask_proposals || []);
            } else {
                setError('Invalid response from AI');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJobChange = (index, field, value) => {
        const newProposals = [...jobProposals];
        newProposals[index][field] = value;
        setJobProposals(newProposals);
    };

    const handleSubtaskChange = (index, field, value) => {
        const newProposals = [...subtaskProposals];
        newProposals[index][field] = value;
        setSubtaskProposals(newProposals);
    };

    const handleUserToggleJob = (index, userId) => {
        const newProposals = [...jobProposals];
        const current = newProposals[index].assigned_user_ids || [];
        if (current.includes(userId)) {
            newProposals[index].assigned_user_ids = current.filter(id => id !== userId);
        } else {
            newProposals[index].assigned_user_ids = [...current, userId];
        }
        setJobProposals(newProposals);
    };

    const handleUserToggleSubtask = (index, userId) => {
        const newProposals = [...subtaskProposals];
        const current = newProposals[index].assigned_user_ids || [];
        if (current.includes(userId)) {
            newProposals[index].assigned_user_ids = current.filter(id => id !== userId);
        } else {
            newProposals[index].assigned_user_ids = [...current, userId];
        }
        setSubtaskProposals(newProposals);
    };

    const handleApply = async () => {
        setIsSaving(true);
        setError('');
        try {
            const res = await applySchedule({
                job_proposals: jobProposals,
                subtask_proposals: subtaskProposals
            });
            if (res.error) {
                setError(res.error);
            } else {
                setIsOpen(false);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="btn" style={{ fontSize: '0.82rem', background: 'var(--primary)', color: '#fff', border: 'none' }}>
                ✨ Auto Schedule
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--card-bg)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>✨ AI Auto Scheduler</h2>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>

                        {!jobProposals.length && !subtaskProposals.length && !isLoading && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <p style={{ color: 'var(--text-muted)' }}>The AI will analyze active jobs, subtasks, budgeted hours, milestones, and team responsibilities to propose an optimal schedule.</p>
                                <button onClick={handleRunAI} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                                    Run AI Analysis
                                </button>
                            </div>
                        )}

                        {isLoading && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <h3 style={{ animation: 'pulse 1.5s infinite' }}>🧠 AI is analyzing your schedule...</h3>
                                <p style={{ color: 'var(--text-muted)' }}>This may take a few moments as it balances workloads and respects deadlines.</p>
                            </div>
                        )}

                        {error && (
                            <div className="form-error">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {!isLoading && (jobProposals.length > 0 || subtaskProposals.length > 0) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                
                                {jobProposals.length > 0 && (
                                    <div>
                                        <h3 style={{ marginBottom: '1rem' }}>Project Rescheduling Proposals</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {jobProposals.map((job, idx) => (
                                                <div key={job.job_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{job.job_title || `Job #${job.job_id}`}</div>
                                                    
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Date</label>
                                                            <input type="date" value={job.proposed_scheduled_date || ''} onChange={e => handleJobChange(idx, 'proposed_scheduled_date', e.target.value)} className="input" style={{ padding: '0.4rem' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due Date</label>
                                                            <input type="date" value={job.proposed_due_date || ''} onChange={e => handleJobChange(idx, 'proposed_due_date', e.target.value)} className="input" style={{ padding: '0.4rem' }} />
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Assigned Team</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            {users.map(u => {
                                                                const isAssigned = (job.assigned_user_ids || []).includes(u.id);
                                                                return (
                                                                    <label key={u.id} style={{
                                                                        padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
                                                                        background: isAssigned ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                        border: `1px solid ${isAssigned ? '#3b82f6' : 'var(--card-border)'}`
                                                                    }}>
                                                                        <input type="checkbox" checked={isAssigned} onChange={() => handleUserToggleJob(idx, u.id)} style={{ display: 'none' }} />
                                                                        {u.username}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid #a855f7' }}>
                                                        <strong style={{ color: '#a855f7' }}>AI Reasoning:</strong> {job.reasoning}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {subtaskProposals.length > 0 && (
                                    <div>
                                        <h3 style={{ marginBottom: '1rem' }}>Subtask Rescheduling Proposals</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {subtaskProposals.map((st, idx) => (
                                                <div key={st.subtask_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1rem' }}>{st.subtask_title || `Subtask #${st.subtask_id}`}</div>
                                                    
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due Date</label>
                                                            <input type="date" value={st.proposed_due_date || ''} onChange={e => handleSubtaskChange(idx, 'proposed_due_date', e.target.value)} className="input" style={{ padding: '0.4rem' }} />
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Assigned Team</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            {users.map(u => {
                                                                const isAssigned = (st.assigned_user_ids || []).includes(u.id);
                                                                return (
                                                                    <label key={u.id} style={{
                                                                        padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
                                                                        background: isAssigned ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                        border: `1px solid ${isAssigned ? '#3b82f6' : 'var(--card-border)'}`
                                                                    }}>
                                                                        <input type="checkbox" checked={isAssigned} onChange={() => handleUserToggleSubtask(idx, u.id)} style={{ display: 'none' }} />
                                                                        {u.username}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid #a855f7' }}>
                                                        <strong style={{ color: '#a855f7' }}>AI Reasoning:</strong> {st.reasoning}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}

                        {!isLoading && (jobProposals.length > 0 || subtaskProposals.length > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                                <button onClick={() => setIsOpen(false)} className="btn" disabled={isSaving}>Cancel</button>
                                <button onClick={handleApply} className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Apply Schedule to Database'}
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}
