'use client'

import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import './gantt.css';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobGantt({ jobs, users }) {
    const ganttRef = useRef(null);
    const [viewMode, setViewMode] = useState('Day');

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined' || !ganttRef.current) return;

        // Clean up handle
        const container = ganttRef.current;
        container.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted)">No jobs found to display on schedule.</div>';
            return;
        }

        const tasks = jobs.map(job => {
            const start = job.scheduled_date || new Date().toISOString().split('T')[0];
            const end = job.due_date || start;

            const assignedList = (job.assigned_ids || '').split(',').filter(id => id !== '');
            const workerNames = assignedList.map(id => users.find(u => u.id.toString() === id)?.username || id);
            const manLoading = workerNames.length > 0 ? ` (${workerNames.length})` : '';

            return {
                id: job.id.toString(),
                name: job.title + manLoading,
                start: start,
                end: end,
                progress: job.status === 'Completed' ? 100 : (job.status === 'In Progress' ? 50 : 0),
                custom_class: `priority-${(job.priority || 'Normal').toLowerCase()}`,
                job_id: job.id,
                workers: workerNames.join(', ')
            };
        });

        try {
            const gantt = new Gantt(container, tasks, {
                view_modes: ['Day', 'Week', 'Month'],
                view_mode: viewMode,
                bar_height: 35,
                padding: 18,
                column_width: viewMode === 'Day' ? 30 : (viewMode === 'Week' ? 100 : 300),
                on_date_change: async (task, start, end) => {
                    const formData = new FormData();
                    formData.append('job_id', task.job_id);
                    formData.append('scheduled_date', start.toISOString().split('T')[0]);
                    formData.append('due_date', end.toISOString().split('T')[0]);
                    await updateJobStatus(formData);
                },
                custom_popup_html: (task) => {
                    return `
                        <div class="gantt-popup">
                            <div class="title">${task.name}</div>
                            <div class="subtitle">Workers: ${task.workers || 'None'}</div>
                            <div class="subtitle">Dates: ${task.start} to ${task.end}</div>
                        </div>
                    `;
                }
            });

            // Post-rendering fix: Frappe Gantt sometimes defaults to black backgrounds
            // We force transparency or theme colors
            const svg = container.querySelector('svg');
            if (svg) {
                svg.style.backgroundColor = 'transparent';
                svg.querySelectorAll('rect').forEach(rect => {
                    if (!rect.classList.contains('bar')) rect.style.fill = 'transparent';
                });
            }
        } catch (e) {
            console.error("Gantt Error:", e);
        }

    }, [jobs, viewMode, users]);

    return (
        <div className="card" style={{ padding: '1.5rem', overflowX: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Timeline View</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['Day', 'Week', 'Month'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className="btn"
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                background: viewMode === mode ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: viewMode === mode ? 'white' : 'inherit',
                                borderRadius: '4px'
                            }}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
                <div ref={ganttRef} className="gantt-wrapper" style={{ minWidth: '900px' }}></div>
            </div>
        </div>
    );
}
