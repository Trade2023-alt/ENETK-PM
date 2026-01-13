'use client'

import { useState } from 'react';
import Link from 'next/link';

export default function Calendar({ jobs, subTasks = [], users = [] }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [showSubTasks, setShowSubTasks] = useState(true);
    const [filterUser, setFilterUser] = useState('');

    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    // Filter Items
    const filteredJobs = filterUser
        ? jobs.filter(j => j.assigned_ids && j.assigned_ids.split(',').includes(filterUser))
        : jobs;

    const filteredSubTasks = filterUser
        ? subTasks.filter(t => t.assigned_ids && t.assigned_ids.split(',').includes(filterUser))
        : subTasks;

    // Group jobs and subtasks by date
    const itemsByDate = {};

    // Add Jobs
    filteredJobs.forEach(job => {
        const dateKey = new Date(job.scheduled_date).toISOString().split('T')[0];
        if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
        itemsByDate[dateKey].push({ ...job, type: 'job' });
    });

    // Add SubTasks
    if (showSubTasks) {
        filteredSubTasks.forEach(task => {
            if (task.due_date) {
                const dateKey = new Date(task.due_date).toISOString().split('T')[0];
                if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
                itemsByDate[dateKey].push({ ...task, type: 'subtask' });
            }
        });
    }

    const nextMonth = () => setMonthOffset(prev => prev + 1);
    const prevMonth = () => setMonthOffset(prev => prev - 1);
    const resetMonth = () => setMonthOffset(0);

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="input"
                        style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                    >
                        <option value="">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showSubTasks} onChange={(e) => setShowSubTasks(e.target.checked)} />
                        Show Sub-tasks
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={prevMonth} className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '0.25rem 0.75rem' }}>←</button>
                        <button onClick={resetMonth} className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.875rem' }}>Today</button>
                        <button onClick={nextMonth} className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '0.25rem 0.75rem' }}>→</button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--card-border)', gap: '1px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ padding: '0.5rem', background: 'var(--card-bg)', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                        {d}
                    </div>
                ))}

                {days.map((day, idx) => (
                    <div key={idx} style={{
                        minHeight: '120px',
                        background: 'var(--card-bg)',
                        padding: '0.5rem',
                        opacity: day ? 1 : 0.5
                    }}>
                        {day && (
                            <>
                                <div style={{
                                    textAlign: 'right',
                                    fontSize: '0.75rem',
                                    color: day.toDateString() === new Date().toDateString() ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: day.toDateString() === new Date().toDateString() ? 'bold' : 'normal'
                                }}>
                                    {day.getDate()}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                    {itemsByDate[day.toISOString().split('T')[0]]?.map((item, i) => (
                                        <Link key={`${item.type}-${item.id}`} href={item.type === 'job' ? `/jobs/${item.id}` : `/jobs/${item.job_id}`} style={{
                                            display: 'block',
                                            fontSize: '0.75rem',
                                            background: item.status === 'Complete'
                                                ? 'rgba(16, 185, 129, 0.2)'
                                                : item.type === 'job' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: item.status === 'Complete'
                                                ? 'var(--success)'
                                                : item.type === 'job' ? 'var(--primary)' : 'var(--warning)',
                                            padding: '0.125rem 0.25rem',
                                            borderRadius: '0.25rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            borderLeft: item.type === 'subtask' ? '2px solid var(--warning)' : 'none'
                                        }}>
                                            {item.title}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
