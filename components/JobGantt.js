'use client'

import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import './gantt.css';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobGantt({ jobs, users = [] }) {
    const ganttRef = useRef(null);
    const [viewMode, setViewMode] = useState('Week');
    const [filterStatus, setFilterStatus] = useState('All');

    const filteredJobs = filterStatus === 'All'
        ? jobs
        : jobs.filter(j => j.status === filterStatus);

    useEffect(() => {
        if (typeof window === 'undefined' || !ganttRef.current) return;

        const container = ganttRef.current;
        container.innerHTML = '';

        if (!filteredJobs || filteredJobs.length === 0) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No scheduled jobs to display on the timeline.</div>';
            return;
        }

        const tasks = filteredJobs.map(job => {
            const start = job.scheduled_date || new Date().toISOString().split('T')[0];
            let end = job.due_date || start;
            // Ensure end >= start
            if (end < start) end = start;

            const assignedList = (job.assigned_ids || '').split(',').filter(id => id !== '');
            const workerNames = assignedList.map(id => {
                const found = users.find(u => u.id.toString() === id);
                return found?.username || id;
            });
            const manLoadingStr = workerNames.length > 0 ? ` [${workerNames.length}👤]` : '';

            const progress = job.status === 'Complete' ? 100
                : job.status === 'In Progress' ? 50
                    : 0;

            return {
                id: job.id.toString(),
                name: (job.job_number ? `${job.job_number} ` : '') + (job.title || 'Untitled') + manLoadingStr,
                start,
                end,
                progress,
                custom_class: `job-status-${(job.status || 'scheduled').toLowerCase().replace(/\s+/g, '-')} priority-${(job.priority || 'Normal').toLowerCase()}`,
                job_id: job.id,
                workers: workerNames.join(', ') || 'Unassigned',
                customer: job.customer_name || '',
                status: job.status || 'Scheduled'
            };
        });

        const calculatedHeight = Math.max(tasks.length * 50 + 120, 320);
        container.style.height = `${calculatedHeight}px`;

        const columnWidth = viewMode === 'Day' ? 38
            : viewMode === 'Week' ? 120
                : viewMode === 'Month' ? 220
                    : 300; // Quarter

        try {
            const gantt = new Gantt(container, tasks, {
                view_modes: ['Day', 'Week', 'Month'],
                view_mode: viewMode === 'Quarter' ? 'Month' : viewMode,
                bar_height: 28,
                padding: 14,
                header_height: 52,
                column_width: columnWidth,
                on_date_change: async (task, start, end) => {
                    const formData = new FormData();
                    formData.append('job_id', task.id);
                    formData.append('scheduled_date', start.toISOString().split('T')[0]);
                    formData.append('due_date', end.toISOString().split('T')[0]);
                    await updateJobStatus(formData);
                },
                custom_popup_html: (task) => {
                    const statusEmoji = task.status === 'Complete' ? '✅'
                        : task.status === 'In Progress' ? '🟡'
                            : task.status === 'Scheduled' ? '🔴'
                                : '⚪';
                    return `
                        <div style="padding: 0.75rem 1rem; background: #1e293b; border-radius: 8px; min-width: 200px; font-family: inherit;">
                            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.4rem; color: #f8fafc;">${task.name}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.2rem;">${statusEmoji} Status: ${task.status}</div>
                            ${task.customer ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.2rem;">📍 ${task.customer}</div>` : ''}
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.2rem;">👤 ${task.workers}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">📅 ${task.start} → ${task.end}</div>
                            <div style="margin-top: 0.5rem; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
                                <div style="height: 100%; width: ${task.progress}%; background: ${task.progress === 100 ? '#10b981' : '#f59e0b'}; border-radius: 2px;"></div>
                            </div>
                            <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.25rem; text-align: right;">${task.progress}% complete</div>
                        </div>
                    `;
                }
            });

            // Style the SVG
            const svg = container.querySelector('svg');
            if (svg) {
                svg.classList.add('gantt-svg');
                svg.setAttribute('height', calculatedHeight);
                svg.setAttribute('width', '100%');
            }
        } catch (e) {
            console.error('Gantt Chart Error:', e);
            container.innerHTML = `<div style="padding: 2rem; color: #ef4444; font-size: 0.875rem;">Failed to load Gantt view: ${e.message}</div>`;
        }
    }, [filteredJobs, viewMode, users]);

    const statusOptions = ['All', 'Scheduled', 'In Progress', 'Complete'];

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📊 Master Schedule Timeline</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Drag bars to reschedule · Hover for details · {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} displayed
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Status filter */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="input"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', height: '34px', minWidth: '120px' }}
                    >
                        {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                    </select>

                    {/* Zoom toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        {['Day', 'Week', 'Month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    border: 'none',
                                    padding: '0.35rem 0.9rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
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
                padding: '0.5rem 1.5rem',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center',
                background: 'rgba(255,255,255,0.01)'
            }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEGEND:</span>
                {[
                    { color: '#ef4444', label: '🔴 Scheduled' },
                    { color: '#f59e0b', label: '🟡 In Progress' },
                    { color: '#10b981', label: '🟢 Complete' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                        {label}
                    </div>
                ))}
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    💡 Drag bar edges to resize duration · Drag bar body to move
                </span>
            </div>

            {/* Gantt area */}
            <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)' }}>
                <div ref={ganttRef} className="gantt-target" />
            </div>
        </div>
    );
}
