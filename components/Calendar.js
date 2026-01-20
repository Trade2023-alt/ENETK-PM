'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Default on-call rotation roster (fallback if no schedule passed)
const DEFAULT_ROSTER = [
    'Matt Huber',
    'Loren McCray',
    'Rami Douri',
    'Seth Peterson',
    'Cole Kadrmas',
    'Jack Morris',
    'Kyle Merrill'
];
const ROTATION_START_DATE = new Date('2026-01-20');

function getDefaultOnCallForDate(date) {
    const startDate = new Date(ROTATION_START_DATE);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((date - startDate) / msPerWeek);
    const adjustedWeeks = weeksSinceStart < 0
        ? DEFAULT_ROSTER.length - (Math.abs(weeksSinceStart) % DEFAULT_ROSTER.length)
        : weeksSinceStart;
    return DEFAULT_ROSTER[adjustedWeeks % DEFAULT_ROSTER.length];
}

export default function Calendar({ jobs, subTasks = [], users = [], onCallSchedule = [] }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [showSubTasks, setShowSubTasks] = useState(true);
    const [showOnCall, setShowOnCall] = useState(true);
    const [filterUser, setFilterUser] = useState('');

    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    // Build on-call lookup from schedule or use fallback
    const onCallByWeek = useMemo(() => {
        const lookup = {};
        if (onCallSchedule.length > 0) {
            onCallSchedule.forEach(s => {
                lookup[s.weekStart] = { person: s.person, isOverride: s.isOverride };
            });
        }
        return lookup;
    }, [onCallSchedule]);

    // Get on-call person for a date
    const getOnCallForDate = (date) => {
        // Find the Monday of this week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const weekStart = d.toISOString().split('T')[0];

        if (onCallByWeek[weekStart]) {
            return onCallByWeek[weekStart];
        }
        return { person: getDefaultOnCallForDate(date), isOverride: false };
    };

    // Get current on-call person
    const currentOnCall = getOnCallForDate(today);

    // Filter Items
    const filteredJobs = filterUser
        ? jobs.filter(j => j.assigned_ids && j.assigned_ids.split(',').includes(filterUser))
        : jobs;

    const filteredSubTasks = filterUser
        ? subTasks.filter(t => t.assigned_ids && t.assigned_ids.split(',').includes(filterUser))
        : subTasks;

    // Group jobs and subtasks by date
    const itemsByDate = {};

    filteredJobs.forEach(job => {
        const dateKey = new Date(job.scheduled_date).toISOString().split('T')[0];
        if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
        itemsByDate[dateKey].push({ ...job, type: 'job' });
    });

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
            {/* Current On-Call Banner */}
            {showOnCall && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: currentOnCall.isOverride
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(239, 68, 68, 0.15))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span style={{ fontSize: '1.25rem' }}>📞</span>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>On-Call This Week:</span>
                    <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{currentOnCall.person}</span>
                    {currentOnCall.isOverride && (
                        <span style={{
                            fontSize: '0.6rem',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#8b5cf6',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px'
                        }}>
                            OVERRIDE
                        </span>
                    )}
                </div>
            )}

            <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="input"
                        style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                    >
                        <option value="">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showSubTasks} onChange={(e) => setShowSubTasks(e.target.checked)} />
                        Sub-tasks
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#ef4444' }}>
                        <input type="checkbox" checked={showOnCall} onChange={(e) => setShowOnCall(e.target.checked)} />
                        📞 On-Call
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

                {days.map((day, idx) => {
                    const isMonday = day && day.getDay() === 1;
                    const dateKey = day ? day.toISOString().split('T')[0] : null;
                    const onCall = day ? getOnCallForDate(day) : null;

                    return (
                        <div key={idx} style={{
                            minHeight: '120px',
                            background: 'var(--card-bg)',
                            padding: '0.5rem',
                            opacity: day ? 1 : 0.5
                        }}>
                            {day && (
                                <>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.25rem'
                                    }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: day.toDateString() === new Date().toDateString() ? 'var(--primary)' : 'var(--text-muted)',
                                            fontWeight: day.toDateString() === new Date().toDateString() ? 'bold' : 'normal'
                                        }}>
                                            {day.getDate()}
                                        </span>
                                        {showOnCall && isMonday && (
                                            <span style={{
                                                fontSize: '0.55rem',
                                                background: onCall.isOverride ? 'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                                color: onCall.isOverride ? '#8b5cf6' : '#ef4444',
                                                padding: '0.1rem 0.3rem',
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap'
                                            }} title={`On-Call: ${onCall.person}${onCall.isOverride ? ' (Override)' : ''}`}>
                                                📞 {onCall.person?.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {itemsByDate[dateKey]?.map((item, i) => (
                                            <Link key={`${item.type}-${item.id}`} href={item.type === 'job' ? `/jobs/${item.id}` : `/jobs/${item.job_id}`} style={{
                                                display: 'block',
                                                fontSize: '0.7rem',
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
                    );
                })}
            </div>
        </div>
    );
}
