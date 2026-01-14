'use client'

import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import './gantt.css'; // We'll create this to style it for your theme
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobGantt({ jobs, users }) {
    const ganttRef = useRef(null);
    const [viewMode, setViewMode] = useState('Day');

    useEffect(() => {
        if (!jobs || jobs.length === 0) return;

        // Transform jobs into Frappe Gantt format
        const tasks = jobs.map(job => {
            const start = job.scheduled_date || new Date().toISOString().split('T')[0];
            const end = job.due_date || start;

            // Get assigned user count/names for man-loading display
            const assignedList = (job.assigned_ids || '').split(',').filter(id => id !== '');
            const workerNames = assignedList.map(id => users.find(u => u.id.toString() === id)?.username || id);
            const manLoading = workerNames.length > 0 ? ` (${workerNames.length})` : '';

            return {
                id: job.id.toString(),
                name: job.title + manLoading,
                start: start,
                end: end,
                progress: job.status === 'Completed' ? 100 : (job.status === 'In Progress' ? 50 : 0),
                custom_class: `priority-${job.priority.toLowerCase()}`,
                dependencies: '', // Can add dependencies if needed later
                job_id: job.id,
                workers: workerNames.join(', ')
            };
        });

        const gantt = new Gantt(ganttRef.current, tasks, {
            view_modes: ['Day', 'Week', 'Month'],
            view_mode: viewMode,
            bar_height: 30,
            padding: 18,
            on_date_change: async (task, start, end) => {
                const formData = new FormData();
                formData.append('job_id', task.job_id);
                formData.append('scheduled_date', start.toISOString().split('T')[0]);
                formData.append('due_date', end.toISOString().split('T')[0]);
                await updateJobStatus(formData);
            },
            on_click: (task) => {
                console.log("Task Clicked", task);
            },
            on_progress_change: (task, progress) => {
                console.log("Progress change not yet implemented in DB", progress);
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

    }, [jobs, viewMode, users]);

    return (
        <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
                {['Day', 'Week', 'Month'].map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className="btn"
                        style={{
                            fontSize: '0.75rem',
                            background: viewMode === mode ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: viewMode === mode ? 'white' : 'inherit'
                        }}
                    >
                        {mode}
                    </button>
                ))}
            </div>
            <div ref={ganttRef} className="gantt-container" style={{ minWidth: '800px' }}></div>
        </div>
    );
}
