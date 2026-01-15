'use client'

import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import './gantt.css';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobGantt({ jobs, users }) {
    const ganttRef = useRef(null);
    const [viewMode, setViewMode] = useState('Day');

    useEffect(() => {
        if (typeof window === 'undefined' || !ganttRef.current) return;

        const container = ganttRef.current;
        container.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted)">No active jobs to display on the timeline.</div>';
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
                workers: workerNames.join(', ') || 'Unassigned'
            };
        });

        // Set dimensions BEFORE init
        const calculatedHeight = Math.max(tasks.length * 45 + 100, 300);
        container.style.height = `${calculatedHeight}px`;

        try {
            const gantt = new Gantt(container, tasks, {
                view_modes: ['Day', 'Week', 'Month'],
                view_mode: viewMode,
                bar_height: 25,
                padding: 15,
                header_height: 50,
                column_width: viewMode === 'Day' ? 30 : (viewMode === 'Week' ? 100 : 300),
                on_date_change: async (task, start, end) => {
                    const formData = new FormData();
                    formData.append('job_id', task.id);
                    formData.append('scheduled_date', start.toISOString().split('T')[0]);
                    formData.append('due_date', end.toISOString().split('T')[0]);
                    await updateJobStatus(formData);
                },
                custom_popup_html: (task) => {
                    return `
                        <div class="gantt-popup">
                            <div class="title">${task.name}</div>
                            <div class="subtitle">Assignees: ${task.workers}</div>
                            <div class="subtitle">Timeline: ${task.start} to ${task.end}</div>
                        </div>
                    `;
                }
            });

            // Ensure SVG fills container
            const svg = container.querySelector('svg');
            if (svg) {
                svg.classList.add('gantt-svg');
                svg.setAttribute('height', calculatedHeight);
                svg.setAttribute('width', '100%');
            }
        } catch (e) {
            console.error("Gantt Chart Error:", e);
            container.innerHTML = `<div style="padding: 2rem; color: #ef4444">Failed to load Gantt view: ${e.message}</div>`;
        }
    }, [jobs, viewMode, users]);

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Master Schedule Timeline</h3>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px' }}>
                    {['Day', 'Week', 'Month'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                border: 'none',
                                padding: '0.4rem 1rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
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

            <div style={{ overflowX: 'auto', background: '#0a0a0a' }}>
                <div ref={ganttRef} className="gantt-target"></div>
            </div>
        </div>
    );
}
