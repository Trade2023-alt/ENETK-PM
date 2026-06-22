'use client'

import { useState, useEffect } from 'react';
import { generateSchedulePreview, applySchedule } from '@/app/actions/scheduler';
import { findDuplicates, removeDuplicates } from '@/app/actions/duplicates';

export default function AutoSchedulerModal({ users }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'duplicates'
    
    const [jobProposals, setJobProposals] = useState([]);
    const [subtaskProposals, setSubtaskProposals] = useState([]);

    // Duplicate detection state
    const [dupScanning, setDupScanning] = useState(false);
    const [dupResult, setDupResult] = useState(null);
    const [selectedDupJobs, setSelectedDupJobs] = useState(new Set());
    const [selectedDupSubtasks, setSelectedDupSubtasks] = useState(new Set());
    const [dupRemoving, setDupRemoving] = useState(false);
    const [dupRemoveResult, setDupRemoveResult] = useState(null);
    const [aiUsage, setAiUsage] = useState(null); // { inputTokens, outputTokens, cost }

    // Loading progress state
    const [elapsed, setElapsed] = useState(0);
    const ESTIMATED_AI_SECONDS = 45; // rough estimate for AI analysis
    const AI_STATUS_MSGS = [
        '📡 Fetching all active jobs and subtasks...',
        '👥 Loading team member responsibilities...',
        '📊 Analyzing budgeted vs actual hours...',
        '📅 Checking deadlines and milestones...',
        '🧠 Claude AI is optimizing your schedule...',
        '⚖️ Balancing workloads across the team...',
        '🔄 Resolving scheduling conflicts...',
        '✍️ Generating proposals and reasoning...',
        '📝 Finalizing schedule recommendations...',
        '⏳ Almost done, wrapping up analysis...'
    ];

    const handleRunAI = async () => {
        setIsLoading(true);
        setError('');
        setElapsed(0);
        try {
            const res = await generateSchedulePreview();
            if (res.error) {
                setError(res.error);
            } else if (res.proposals) {
                setJobProposals(res.proposals.job_proposals || []);
                setSubtaskProposals(res.proposals.subtask_proposals || []);
                if (res.usage) setAiUsage(res.usage);
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

    // --- Duplicates ---
    const handleFindDuplicates = async () => {
        setDupScanning(true);
        setError('');
        setDupResult(null);
        setSelectedDupJobs(new Set());
        setSelectedDupSubtasks(new Set());
        setDupRemoveResult(null);
        setElapsed(0);
        try {
            const res = await findDuplicates();
            if (res.success) {
                setDupResult(res);
            } else {
                setError(res.error || 'Failed to scan for duplicates');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setDupScanning(false);
        }
    };

    const toggleDupJob = (id) => {
        setSelectedDupJobs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleDupSubtask = (id) => {
        setSelectedDupSubtasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemoveDuplicates = async () => {
        if (selectedDupJobs.size === 0 && selectedDupSubtasks.size === 0) return;
        const totalToDelete = selectedDupJobs.size + selectedDupSubtasks.size;
        if (!confirm(`Are you sure you want to delete ${totalToDelete} selected duplicate(s)? This cannot be undone.`)) return;

        setDupRemoving(true);
        setError('');
        try {
            const res = await removeDuplicates([...selectedDupJobs], [...selectedDupSubtasks]);
            if (res.success) {
                setDupRemoveResult(res);
                // Re-scan
                setTimeout(() => handleFindDuplicates(), 1000);
            } else {
                setError(res.error || 'Failed to remove duplicates');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setDupRemoving(false);
        }
    };

    const tabStyle = (tab) => ({
        padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        background: activeTab === tab ? 'rgba(159,18,57,0.2)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${activeTab === tab ? 'rgba(159,18,57,0.5)' : 'var(--card-border)'}`,
        borderBottom: activeTab === tab ? 'none' : '1px solid var(--card-border)',
        borderRadius: '8px 8px 0 0', color: activeTab === tab ? '#fff' : 'var(--text-muted)',
        transition: 'all 0.2s'
    });

    // Elapsed timer
    useEffect(() => {
        if (!isLoading && !dupScanning) { setElapsed(0); return; }
        const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [isLoading, dupScanning]);

    const progressPct = Math.min(95, (elapsed / ESTIMATED_AI_SECONDS) * 100);
    const currentStatusIdx = Math.min(Math.floor(elapsed / 5), AI_STATUS_MSGS.length - 1);
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--card-border)' }}>
                            <button onClick={() => setActiveTab('schedule')} style={tabStyle('schedule')}>🤖 AI Schedule</button>
                            <button onClick={() => setActiveTab('duplicates')} style={tabStyle('duplicates')}>🔍 Find Duplicates</button>
                        </div>

                        {error && (
                            <div className="form-error">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {/* ====== SCHEDULE TAB ====== */}
                        {activeTab === 'schedule' && (
                            <>
                                {!jobProposals.length && !subtaskProposals.length && !isLoading && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>The AI will analyze active jobs, subtasks, budgeted hours, milestones, and team responsibilities to propose an optimal schedule.</p>
                                        <button onClick={handleRunAI} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                                            Run AI Analysis
                                        </button>
                                    </div>
                                )}

                                {isLoading && (
                                    <div style={{ padding: '2rem 1rem' }}>
                                        <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🧠 AI is analyzing your schedule...</h3>
                                        
                                        {/* Progress bar */}
                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '28px', overflow: 'hidden', position: 'relative', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <div style={{
                                                height: '100%', borderRadius: '8px',
                                                background: 'linear-gradient(90deg, #9f1239, #a855f7, #3b82f6)',
                                                width: `${progressPct}%`,
                                                transition: 'width 1s ease-out',
                                                boxShadow: '0 0 15px rgba(168,85,247,0.4)'
                                            }} />
                                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                                {Math.round(progressPct)}%
                                            </span>
                                        </div>

                                        {/* Status message */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                            <span style={{ color: '#a78bfa', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                                                {AI_STATUS_MSGS[currentStatusIdx]}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                ⏱️ {formatTime(elapsed)}
                                            </span>
                                        </div>

                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>
                                            Estimated time: ~30–60 seconds depending on the number of active jobs.
                                        </p>
                                    </div>
                                )}

                                {!isLoading && (jobProposals.length > 0 || subtaskProposals.length > 0) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        
                                        {/* Cost Banner */}
                                        {aiUsage && (
                                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '8px', fontSize: '0.78rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, color: '#a855f7' }}>💰 AI Cost:</span>
                                                <span style={{ color: 'var(--text-muted)' }}>Input: <strong style={{ color: '#60a5fa' }}>{aiUsage.inputTokens?.toLocaleString()}</strong> tokens</span>
                                                <span style={{ color: 'var(--text-muted)' }}>Output: <strong style={{ color: '#60a5fa' }}>{aiUsage.outputTokens?.toLocaleString()}</strong> tokens</span>
                                                <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 'auto' }}>Total: ${aiUsage.cost?.toFixed(4)}</span>
                                            </div>
                                        )}

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
                            </>
                        )}

                        {/* ====== DUPLICATES TAB ====== */}
                        {activeTab === 'duplicates' && (
                            <>
                                {!dupResult && !dupScanning && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                            Scan your database for duplicate jobs and subtasks with matching titles.<br/>
                                            You will be able to review and select which duplicates to remove before anything is deleted.
                                        </p>
                                        <button onClick={handleFindDuplicates} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                                            🔍 Scan for Duplicates
                                        </button>
                                    </div>
                                )}

                                {dupScanning && (
                                    <div style={{ padding: '2rem 1rem' }}>
                                        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>🔍 Scanning for duplicates...</h3>
                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '20px', overflow: 'hidden', position: 'relative', marginBottom: '0.75rem' }}>
                                            <div style={{
                                                height: '100%', borderRadius: '8px',
                                                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                                                width: `${Math.min(95, elapsed * 15)}%`,
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>⏱️ {formatTime(elapsed)}</div>
                                    </div>
                                )}

                                {dupRemoveResult && (
                                    <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                                        ✅ Removed <strong>{dupRemoveResult.deletedJobs}</strong> duplicate job(s) and <strong>{dupRemoveResult.deletedSubtasks}</strong> duplicate subtask(s).
                                    </div>
                                )}

                                {dupResult && !dupScanning && (
                                    <div>
                                        {dupResult.totalDuplicateJobs === 0 && dupResult.totalDuplicateSubTasks === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981' }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                                                <h3>No duplicates found!</h3>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your database is clean.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                    <div className="card" style={{ padding: '0.75rem 1.25rem', flex: 1, textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{dupResult.totalDuplicateJobs}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duplicate Jobs</div>
                                                    </div>
                                                    <div className="card" style={{ padding: '0.75rem 1.25rem', flex: 1, textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{dupResult.totalDuplicateSubTasks}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duplicate Subtasks</div>
                                                    </div>
                                                    <div className="card" style={{ padding: '0.75rem 1.25rem', flex: 1, textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{selectedDupJobs.size + selectedDupSubtasks.size}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Selected to Remove</div>
                                                    </div>
                                                </div>

                                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                    ⚠️ Check the boxes next to the duplicates you want to <strong>DELETE</strong>. Leave at least one unchecked in each group to keep.
                                                </p>

                                                {/* Duplicate Jobs */}
                                                {dupResult.duplicateJobs.length > 0 && (
                                                    <div style={{ marginBottom: '1.5rem' }}>
                                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#ef4444' }}>🗂️ Duplicate Jobs ({dupResult.duplicateJobs.length} groups)</h3>
                                                        {dupResult.duplicateJobs.map((group, gIdx) => (
                                                            <div key={gIdx} style={{ marginBottom: '1rem', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.08)', fontSize: '0.82rem', fontWeight: 700, borderBottom: '1px solid var(--card-border)' }}>
                                                                    "{group[0].title}" — {group.length} copies found
                                                                </div>
                                                                {group.map((item, iIdx) => (
                                                                    <label key={item.id} style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                                        padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.78rem',
                                                                        borderBottom: iIdx < group.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                                        background: selectedDupJobs.has(item.id) ? 'rgba(239,68,68,0.08)' : 'transparent',
                                                                        transition: 'background 0.15s'
                                                                    }}>
                                                                        <input type="checkbox" checked={selectedDupJobs.has(item.id)} onChange={() => toggleDupJob(item.id)}
                                                                            style={{ width: '16px', height: '16px', accentColor: '#ef4444' }} />
                                                                        <span style={{ flex: 1 }}>
                                                                            <strong>{item.title}</strong>
                                                                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                                                                | {item.customer_name} | {item.status} | Est: {item.estimated_hours}h | Used: {item.actual_hours}h
                                                                                {item.scheduled_date && ` | Start: ${item.scheduled_date}`}
                                                                                {item.due_date && ` | Due: ${item.due_date}`}
                                                                            </span>
                                                                        </span>
                                                                        {selectedDupJobs.has(item.id) && (
                                                                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.7rem' }}>🗑️ DELETE</span>
                                                                        )}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Duplicate Subtasks */}
                                                {dupResult.duplicateSubTasks.length > 0 && (
                                                    <div style={{ marginBottom: '1.5rem' }}>
                                                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#f59e0b' }}>📋 Duplicate Subtasks ({dupResult.duplicateSubTasks.length} groups)</h3>
                                                        {dupResult.duplicateSubTasks.map((group, gIdx) => (
                                                            <div key={gIdx} style={{ marginBottom: '1rem', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div style={{ padding: '0.6rem 1rem', background: 'rgba(245,158,11,0.08)', fontSize: '0.82rem', fontWeight: 700, borderBottom: '1px solid var(--card-border)' }}>
                                                                    "{group[0].title}" — {group.length} copies found
                                                                </div>
                                                                {group.map((item, iIdx) => (
                                                                    <label key={item.id} style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                                        padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.78rem',
                                                                        borderBottom: iIdx < group.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                                        background: selectedDupSubtasks.has(item.id) ? 'rgba(245,158,11,0.08)' : 'transparent',
                                                                        transition: 'background 0.15s'
                                                                    }}>
                                                                        <input type="checkbox" checked={selectedDupSubtasks.has(item.id)} onChange={() => toggleDupSubtask(item.id)}
                                                                            style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }} />
                                                                        <span style={{ flex: 1 }}>
                                                                            <strong>{item.title}</strong>
                                                                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                                                                | {item.status} | Est: {item.estimated_hours}h | Used: {item.used_hours}h
                                                                                {item.start_date && ` | Start: ${item.start_date}`}
                                                                                {item.due_date && ` | Due: ${item.due_date}`}
                                                                            </span>
                                                                        </span>
                                                                        {selectedDupSubtasks.has(item.id) && (
                                                                            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.7rem' }}>🗑️ DELETE</span>
                                                                        )}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Action bar */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                                                    <button onClick={handleFindDuplicates} className="btn" style={{ fontSize: '0.82rem' }}>🔄 Re-Scan</button>
                                                    <button
                                                        onClick={handleRemoveDuplicates}
                                                        className="btn"
                                                        disabled={dupRemoving || (selectedDupJobs.size === 0 && selectedDupSubtasks.size === 0)}
                                                        style={{
                                                            background: (selectedDupJobs.size + selectedDupSubtasks.size) > 0 ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                                            color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 700
                                                        }}
                                                    >
                                                        {dupRemoving ? '⏳ Removing...' : `🗑️ Remove ${selectedDupJobs.size + selectedDupSubtasks.size} Selected Duplicates`}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}
