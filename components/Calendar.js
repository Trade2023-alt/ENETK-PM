'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Default on-call rotation roster (fallback if no schedule passed)
const DEFAULT_ROSTER = [
    'Matt Huber',
    'Loren McCray',
    'Rami Douri',
    'Seth Peterson',
    'Cole Kadrmas'
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

function getInitials(username) {
    if (!username) return '??';
    const cleaned = username.trim();
    const parts = cleaned.split(/[\s_\-]+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    const uppercaseLetters = cleaned.replace(/[^A-Z]/g, '');
    if (uppercaseLetters.length >= 2) {
        return uppercaseLetters.slice(0, 2);
    }
    return cleaned.slice(0, 2).toUpperCase();
}

export default function Calendar({ jobs, subTasks = [], users = [], onCallSchedule = [] }) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const [draggedOverDay, setDraggedOverDay] = useState(null);
    const [draggedOverItem, setDraggedOverItem] = useState(null);

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
        if (job.scheduled_date) {
            const dateKey = new Date(job.scheduled_date).toISOString().split('T')[0];
            if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
            itemsByDate[dateKey].push({ ...job, type: 'job' });
        }
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

    // Drag-and-drop handlers for rescheduling items (jobs/subtasks)
    const handleDragStartItem = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'item', itemId: item.id, itemType: item.type }));
    };

    const handleDragOverDay = (e) => {
        e.preventDefault();
    };

    const handleDropOnDay = async (e, dateKey) => {
        e.preventDefault();
        if (!dateKey) return;

        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const dragData = JSON.parse(dataStr);

            if (dragData.type === 'item') {
                setIsUpdating(true);
                if (dragData.itemType === 'job') {
                    const { error } = await supabase
                        .from('jobs')
                        .update({ scheduled_date: dateKey, updated_at: new Date().toISOString() })
                        .eq('id', dragData.itemId);
                    if (error) throw error;
                } else if (dragData.itemType === 'subtask') {
                    const { error } = await supabase
                        .from('sub_tasks')
                        .update({ due_date: dateKey, updated_at: new Date().toISOString() })
                        .eq('id', dragData.itemId);
                    if (error) throw error;
                }
                router.refresh();
            }
        } catch (err) {
            console.error('Error updating item date via drag & drop:', err);
            alert('Failed to update date: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Drag-and-drop handlers for assigning users
    const handleDragStartUser = (e, user) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'user', userId: user.id }));
    };

    const handleDropOnItem = async (e, targetItem) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const dragData = JSON.parse(dataStr);

            if (dragData.type === 'user') {
                const userId = dragData.userId;
                const assignedIds = targetItem.assigned_ids ? targetItem.assigned_ids.split(',') : [];

                if (assignedIds.includes(String(userId))) {
                    return; // Already assigned
                }

                setIsUpdating(true);
                if (targetItem.type === 'job') {
                    const { error } = await supabase
                        .from('job_assignments')
                        .insert([{ job_id: targetItem.id, user_id: userId }]);
                    if (error) throw error;
                } else if (targetItem.type === 'subtask') {
                    const { error } = await supabase
                        .from('sub_task_assignments')
                        .insert([{ sub_task_id: targetItem.id, user_id: userId }]);
                    if (error) throw error;
                }
                router.refresh();
            }
        } catch (err) {
            console.error('Error assigning user via drag & drop:', err);
            alert('Failed to assign user: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveAssignment = async (item, userId) => {
        if (!confirm(`Are you sure you want to remove this user from "${item.title}"?`)) {
            return;
        }

        try {
            setIsUpdating(true);
            if (item.type === 'job') {
                const { error } = await supabase
                    .from('job_assignments')
                    .delete()
                    .eq('job_id', item.id)
                    .eq('user_id', userId);
                if (error) throw error;
            } else if (item.type === 'subtask') {
                const { error } = await supabase
                    .from('sub_task_assignments')
                    .delete()
                    .eq('sub_task_id', item.id)
                    .eq('user_id', userId);
                if (error) throw error;
            }
            router.refresh();
        } catch (err) {
            console.error('Error removing user assignment:', err);
            alert('Failed to remove assignment: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const nextMonth = () => setMonthOffset(prev => prev + 1);
    const prevMonth = () => setMonthOffset(prev => prev - 1);
    const resetMonth = () => setMonthOffset(0);

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
            {/* Loading Overlay */}
            {isUpdating && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '1rem'
                }}>
                    Saving changes...
                </div>
            )}

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

            {/* Draggable User Bar */}
            <div style={{
                padding: '0.6rem 1rem',
                background: 'rgba(255,255,255,0.01)',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    👋 Drag team member onto a task to assign them:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {users.map(user => (
                        <div
                            key={user.id}
                            draggable
                            onDragStart={(e) => handleDragStartUser(e, user)}
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '100px',
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                cursor: 'grab',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                userSelect: 'none',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                e.currentTarget.style.borderColor = 'var(--card-border)';
                            }}
                        >
                            👤 {user.username}
                        </div>
                    ))}
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
                        <div 
                            key={idx}
                            onDragOver={day ? handleDragOverDay : undefined}
                            onDragEnter={day ? () => setDraggedOverDay(dateKey) : undefined}
                            onDragLeave={day ? () => setDraggedOverDay(null) : undefined}
                            onDrop={day ? async (e) => {
                                setDraggedOverDay(null);
                                await handleDropOnDay(e, dateKey);
                            } : undefined}
                            style={{
                                minHeight: '120px',
                                background: draggedOverDay === dateKey 
                                    ? 'rgba(59, 130, 246, 0.08)' 
                                    : 'var(--card-bg)',
                                border: draggedOverDay === dateKey 
                                    ? '1.5px dashed var(--primary)' 
                                    : '1px solid transparent',
                                padding: '0.5rem',
                                opacity: day ? 1 : 0.5,
                                transition: 'background-color 0.2s, border-color 0.2s'
                            }}
                        >
                            {day && (
                                <>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.35rem'
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

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {itemsByDate[dateKey]?.map((item, i) => {
                                            const assignedIds = item.assigned_ids ? item.assigned_ids.split(',') : [];
                                            const assignedUsers = users.filter(u => assignedIds.includes(String(u.id)));

                                            return (
                                                <div
                                                    key={`${item.type}-${item.id}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStartItem(e, item)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnter={() => setDraggedOverItem(`${item.type}-${item.id}`)}
                                                    onDragLeave={() => setDraggedOverItem(null)}
                                                    onDrop={async (e) => {
                                                        setDraggedOverItem(null);
                                                        await handleDropOnItem(e, item);
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const url = item.type === 'job' ? `/jobs/${item.id}` : `/jobs/${item.job_id}`;
                                                        router.push(url);
                                                     }}
                                                     style={{
                                                         display: 'inline-flex',
                                                         alignItems: 'center',
                                                         gap: '2px',
                                                         background: draggedOverItem === `${item.type}-${item.id}`
                                                             ? 'rgba(59, 130, 246, 0.35)'
                                                             : item.status === 'Complete'
                                                                 ? 'rgba(16, 185, 129, 0.15)'
                                                                 : item.type === 'job' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                         color: item.status === 'Complete'
                                                             ? 'var(--success)'
                                                             : item.type === 'job' ? 'var(--primary)' : 'var(--warning)',
                                                         padding: '0.25rem 0.45rem',
                                                         borderRadius: '6px',
                                                         borderLeft: item.type === 'subtask' ? '2.5px solid var(--warning)' : '2.5px solid var(--primary)',
                                                         cursor: 'pointer',
                                                         boxShadow: draggedOverItem === `${item.type}-${item.id}` ? '0 0 6px var(--primary)' : 'none',
                                                         transition: 'all 0.15s',
                                                         fontSize: '0.7rem',
                                                         fontWeight: 700,
                                                         userSelect: 'none'
                                                     }}
                                                     title={`${item.type === 'job' ? 'Job' : 'Subtask'}: ${item.title} (${item.status})`}
                                                 >
                                                     {assignedUsers.length === 0 ? (
                                                         <span style={{ opacity: 0.75 }}>UN</span>
                                                     ) : (
                                                         assignedUsers.map(u => (
                                                             <span
                                                                 key={u.id}
                                                                 style={{
                                                                     background: 'rgba(255, 255, 255, 0.08)',
                                                                     border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                     borderRadius: '3px',
                                                                     padding: '1px 3px',
                                                                     fontSize: '0.65rem'
                                                                 }}
                                                             >
                                                                 {getInitials(u.username)}
                                                             </span>
                                                         ))
                                                     )}
                                                 </div>
                                             );
                                         })}
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
