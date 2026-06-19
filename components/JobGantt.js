'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react';
import './gantt.css';
import { updateJobStatus } from '@/app/actions/updateJob';

function toISO(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.split('T')[0];
    return d.toISOString().split('T')[0];
}

const STATUS_CLASS = {
    'Scheduled': 'job-status-scheduled',
    'In Progress': 'job-status-in-progress',
    'Complete': 'job-status-complete',
};

export default function JobGantt({ jobs = [], users = [], milestones = [] }) {
    const [viewMode, setViewMode] = useState('Week');
    const [filterStatus, setFilterStatus] = useState('All');
    const [error, setError] = useState(null);

    const ganttRef = useRef(null);
    const ganttInstanceRef = useRef(null);

    const filteredJobs = useMemo(() => (
        filterStatus === 'All' ? jobs : jobs.filter(j => j.status === filterStatus)
    ), [jobs, filterStatus]);

    // Build frappe-gantt task list (jobs + milestones as zero-duration diamonds)
    const tasks = useMemo(() => {
        const out = [];

        filteredJobs.forEach(job => {
            const start = toISO(job.scheduled_date);
            if (!start) return;
            let end = toISO(job.due_date) || start;
            if (end < start) end = start;

            const assignedList = (job.assigned_ids || '').split(',').filter(Boolean);
            const workerNames = assignedList.map(id => {
                const found = users.find(u => String(u.id) === String(id));
                return found?.username || id;
            });

            out.push({
                id: `job-${job.id}`,
                _jobId: job.id,
                name: `${job.job_number ? job.job_number + ' ' : ''}${job.title || 'Untitled'}`,
                start,
                end,
                progress: job.status === 'Complete' ? 100 : job.status === 'In Progress' ? 50 : 0,
                custom_class: STATUS_CLASS[job.status] || 'job-status-scheduled',
                status: job.status,
                customer: job.customer_name || '',
                workers: workerNames.join(', '),
            });
        });

        milestones.forEach(m => {
            const date = toISO(m.end_date || m.start_date);
            if (!date) return;
            const achieved = m.status === 'Achieved';
            const overdue = !achieved && date < toISO(new Date());
            const cls = achieved
                ? 'milestone milestone-achieved'
                : overdue
                    ? 'milestone milestone-overdue'
                    : 'milestone';
            out.push({
                id: `milestone-${m.id}`,
                _milestone: true,
                name: m.title || 'Milestone',
                start: date,
                end: date,
                progress: achieved ? 100 : 0,
                custom_class: cls,
                status: m.status || '',
                customer: '',
                workers: '',
            });
        });

        return out;
    }, [filteredJobs, milestones, users]);

    // Instantiate / re-instantiate the Gantt whenever inputs change
    useEffect(() => {
        let cancelled = false;
        const container = ganttRef.current;
        if (!container) return;

        // reset previous render
        container.innerHTML = '';
        ganttInstanceRef.current = null;
        setError(null);

        if (tasks.length === 0) return;

        // explicit height to avoid zero-height crash
        container.style.height = `${Math.max(tasks.length * 50 + 120, 300)}px`;

        (async () => {
            try {
                const GanttLib = (await import('frappe-gantt')).default;
                if (cancelled || !ganttRef.current) return;

                const instance = new GanttLib(ganttRef.current, tasks, {
                    view_mode: viewMode,
                    bar_height: 28,
                    padding: 14,
                    infinite_padding: false,
                    popup_on: 'hover',
                    popup: (ctx) => {
                        const task = ctx.task;
                        return `<div style="padding:0.75rem;background:#1e293b;border-radius:8px;min-width:200px;font-family:inherit;color:#f8fafc;">
                            <div style="font-weight:700;margin-bottom:0.4rem">${task.name}</div>
                            <div style="font-size:0.75rem;color:#94a3b8">${task.status || ''}</div>
                            ${task.customer ? `<div style="font-size:0.75rem;color:#94a3b8">🏢 ${task.customer}</div>` : ''}
                            ${task.workers ? `<div style="font-size:0.75rem;color:#94a3b8">👤 ${task.workers}</div>` : ''}
                            <div style="font-size:0.75rem;color:#94a3b8">${task.start} → ${task.end}</div>
                        </div>`;
                    },
                    on_date_change: async (task, start, end) => {
                        if (task._milestone) return;
                        const fd = new FormData();
                        fd.append('job_id', task._jobId);
                        fd.append('scheduled_date', start.toISOString().split('T')[0]);
                        fd.append('due_date', end.toISOString().split('T')[0]);
                        await updateJobStatus(fd);
                    },
                });

                ganttInstanceRef.current = instance;
            } catch (e) {
                console.error('Gantt render error:', e);
                if (!cancelled) setError(e?.message || String(e));
            }
        })();

        return () => { cancelled = true; };
    }, [tasks, viewMode]);

    const changeView = (mode) => {
        const instance = ganttInstanceRef.current;
        if (instance) {
            try {
                instance.change_view_mode(mode);
            } catch (e) {
                console.error('change_view_mode error:', e);
            }
        }
        setViewMode(mode);
    };

    const statusOptions = ['All', 'Scheduled', 'In Progress', 'Complete'];
    const scheduledCount = filteredJobs.filter(j => j.scheduled_date).length;

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid var(--card-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📊 Master Schedule Timeline</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {scheduledCount} job{scheduledCount !== 1 ? 's' : ''} · {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} · Drag bars to reschedule · Hover for details
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="input"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', height: '34px', minWidth: '120px' }}
                    >
                        {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                    </select>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        {['Day', 'Week', 'Month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => changeView(mode)}
                                style={{
                                    border: 'none', padding: '0.35rem 0.9rem', fontSize: '0.75rem',
                                    fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
                                    background: viewMode === mode ? 'var(--primary)' : 'transparent',
                                    color: viewMode === mode ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{
                padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--card-border)',
                display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center',
                background: 'rgba(255,255,255,0.01)'
            }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEGEND:</span>
                {[
                    { color: '#dc2626', label: '🔴 Scheduled' },
                    { color: '#d97706', label: '🟡 In Progress' },
                    { color: '#059669', label: '🟢 Complete' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                        {label}
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: '#a78bfa', fontSize: '0.9rem' }}>◆</span> Milestone
                </div>
            </div>

            {/* Timeline */}
            {error ? (
                <div style={{ padding: '2rem 1.5rem', color: '#ef4444', fontSize: '0.85rem' }}>
                    <strong>Could not render the timeline.</strong>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{error}</div>
                </div>
            ) : tasks.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No scheduled jobs to display on the timeline.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)' }}>
                    <div ref={ganttRef} className="gantt-target" />
                </div>
            )}
        </div>
    );
}
