'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { reassignTaskAction } from '@/app/actions/reassign';

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

function truncateTitle(title, maxLen = 22) {
    if (!title) return '';
    return title.length > maxLen ? title.slice(0, maxLen) + '…' : title;
}

// Toast notification component
function Toast({ toasts, onDismiss }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            pointerEvents: 'none'
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    pointerEvents: 'all',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    background: t.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
                    cursor: 'pointer',
                    userSelect: 'none'
                }} onClick={() => onDismiss(t.id)}>
                    <span style={{ fontSize: '1.1rem' }}>{t.type === 'error' ? '❌' : '✅'}</span>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

// Expanded day modal — shows all tasks for a day
function DayModal({ day, items, users, onClose, onNavigate }) {
    if (!day || !items) return null;
    const dateLabel = day.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 5000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '1.5rem',
                minWidth: '340px',
                maxWidth: '500px',
                maxHeight: '70vh',
                overflowY: 'auto',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{dateLabel}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map(item => {
                        const assignedIds = item.assigned_ids ? item.assigned_ids.split(',') : [];
                        const assignedUsers = users.filter(u => assignedIds.includes(String(u.id)));
                        const isJob = item.type === 'job';
                        const href = isJob ? `/jobs/${item.id}` : `/jobs/${item.job_id}`;
                        return (
                            <div key={`${item.type}-${item.id}`} style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid rgba(255,255,255,0.1)`,
                                borderLeft: `3px solid ${isJob ? 'var(--primary)' : 'var(--warning)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                            {isJob ? '🔧' : '📌'} {item.title}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {isJob ? 'Job' : 'Sub-task'} · {item.status || 'Pending'}
                                        </div>
                                        {assignedUsers.length > 0 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                👤 {assignedUsers.map(u => u.username).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <Link href={href} onClick={onClose} style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.6rem',
                                        background: 'rgba(159,18,57,0.2)',
                                        color: 'var(--primary)',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(159,18,57,0.3)',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>Open →</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function Calendar({ jobs, subTasks = [], users = [], onCallSchedule = [] }) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const [draggedOverDay, setDraggedOverDay] = useState(null);
    const [draggedOverItem, setDraggedOverItem] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [expandedDay, setExpandedDay] = useState(null); // date object for modal
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
    const [copiedItem, setCopiedItem] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('enetk_copied_task');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });

    // Toast helpers
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handleCloseMenu = () => setContextMenu(null);
        window.addEventListener('click', handleCloseMenu);
        window.addEventListener('contextmenu', handleCloseMenu);
        return () => {
            window.removeEventListener('click', handleCloseMenu);
            window.removeEventListener('contextmenu', handleCloseMenu);
        };
    }, []);

    const handleItemContextMenu = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'item', target: item });
    };

    const handleDayContextMenu = (e, dateKey) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'day', target: dateKey });
    };

    const handleCopyItem = (item) => {
        setCopiedItem(item);
        sessionStorage.setItem('enetk_copied_task', JSON.stringify(item));
        setContextMenu(null);
        addToast('Task copied to clipboard');
    };

    const insertJobSafely = async (jobData) => {
        let { data, error } = await supabase.from('jobs').insert([jobData]).select().single();
        if (error && error.message.includes('jobs_pkey')) {
            const { data: lastItem } = await supabase.from('jobs').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            jobData.id = nextId;
            const retry = await supabase.from('jobs').insert([jobData]).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) throw error;
        return data;
    };

    const insertSubTaskSafely = async (subData) => {
        let { data, error } = await supabase.from('sub_tasks').insert([subData]).select().single();
        if (error && error.message.includes('sub_tasks_pkey')) {
            const { data: lastItem } = await supabase.from('sub_tasks').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            subData.id = nextId;
            const retry = await supabase.from('sub_tasks').insert([subData]).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) throw error;
        return data;
    };

    const handlePasteTask = async (targetDate) => {
        if (!copiedItem) return;
        setContextMenu(null);
        setIsUpdating(true);
        try {
            if (copiedItem.type === 'job') {
                const jobData = {
                    title: `${copiedItem.title} (Copy)`,
                    description: copiedItem.description,
                    customer_id: copiedItem.customer_id,
                    customer_contact_id: copiedItem.customer_contact_id,
                    lead_id: copiedItem.lead_id,
                    scheduled_date: targetDate,
                    due_date: copiedItem.due_date,
                    estimated_hours: copiedItem.estimated_hours,
                    priority: copiedItem.priority,
                    status: 'Scheduled'
                };
                const pastedJob = await insertJobSafely(jobData);
                const newJobId = pastedJob.id;
                if (copiedItem.assigned_ids) {
                    const userIds = copiedItem.assigned_ids.split(',');
                    const assignments = userIds.map(userId => ({ job_id: newJobId, user_id: userId }));
                    const { error: assignError } = await supabase.from('job_assignments').insert(assignments);
                    if (assignError) throw assignError;
                }
            } else {
                const subData = {
                    job_id: copiedItem.jobId || copiedItem.job_id,
                    title: `${copiedItem.title} (Copy)`,
                    status: 'Pending',
                    priority: copiedItem.priority,
                    due_date: targetDate,
                    estimated_hours: copiedItem.estimated_hours,
                    parent_id: copiedItem.parent_id
                };
                const pastedSub = await insertSubTaskSafely(subData);
                const newSubId = pastedSub.id;
                if (copiedItem.assigned_ids) {
                    const userIds = copiedItem.assigned_ids.split(',');
                    const assignments = userIds.map(userId => ({ sub_task_id: newSubId, user_id: userId }));
                    const { error: assignError } = await supabase.from('sub_task_assignments').insert(assignments);
                    if (assignError) throw assignError;
                }
            }
            router.refresh();
            addToast('Task pasted successfully');
        } catch (err) {
            console.error('Error pasting task:', err);
            addToast('Failed to paste task: ' + err.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReassignTask = async (item, targetUserId) => {
        setContextMenu(null);
        setIsUpdating(true);
        try {
            const res = await reassignTaskAction({ itemId: item.id, itemType: item.type, userId: targetUserId });
            if (res.error) throw new Error(res.error);
            router.refresh();
            addToast('Task reassigned');
        } catch (err) {
            console.error('Error reassigning task:', err);
            addToast('Failed to reassign task: ' + err.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const [monthOffset, setMonthOffset] = useState(0);
    const [weekOffset, setWeekOffset] = useState(0);
    const [showTasks, setShowTasks] = useState(true);
    const [showSubTasks, setShowSubTasks] = useState(true);
    const [showOnCall, setShowOnCall] = useState(true);
    const [filterUser, setFilterUser] = useState('');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Month view calculations
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthDays = [];
    for (let i = 0; i < firstDay; i++) monthDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) monthDays.push(new Date(year, month, i));

    // Week view calculations
    const getWeekStart = (offset) => {
        const d = new Date(today);
        const day = d.getDay();
        const diff = d.getDate() - day; // Sunday
        d.setDate(diff + offset * 7);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const weekStart = getWeekStart(weekOffset);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    // On-call lookup
    const onCallByWeek = useMemo(() => {
        const lookup = {};
        if (onCallSchedule.length > 0) {
            onCallSchedule.forEach(s => { lookup[s.weekStart] = { person: s.person, isOverride: s.isOverride }; });
        }
        return lookup;
    }, [onCallSchedule]);

    const getOnCallForDate = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const weekStart = d.toISOString().split('T')[0];
        if (onCallByWeek[weekStart]) return onCallByWeek[weekStart];
        return { person: getDefaultOnCallForDate(date), isOverride: false };
    };

    const currentOnCall = getOnCallForDate(today);

    // Filter items
    const filteredJobs = filterUser
        ? jobs.filter(j => j.assigned_ids && j.assigned_ids.split(',').includes(filterUser))
        : jobs;

    const filteredSubTasks = filterUser
        ? subTasks.filter(t => t.assigned_ids && t.assigned_ids.split(',').includes(filterUser))
        : subTasks;

    // Group by date
    const itemsByDate = useMemo(() => {
        const map = {};
        if (showTasks) {
            filteredJobs.forEach(job => {
                if (job.scheduled_date) {
                    const dateKey = new Date(job.scheduled_date).toISOString().split('T')[0];
                    if (!map[dateKey]) map[dateKey] = [];
                    map[dateKey].push({ ...job, type: 'job' });
                }
            });
        }
        if (showSubTasks) {
            filteredSubTasks.forEach(task => {
                if (task.due_date) {
                    const dateKey = new Date(task.due_date).toISOString().split('T')[0];
                    if (!map[dateKey]) map[dateKey] = [];
                    map[dateKey].push({ ...task, type: 'subtask' });
                }
            });
        }
        return map;
    }, [filteredJobs, filteredSubTasks, showTasks, showSubTasks]);

    // D&D handlers
    const handleDragStartItem = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'item', itemId: item.id, itemType: item.type }));
    };
    const handleDragOverDay = (e) => e.preventDefault();

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
                    const { error } = await supabase.from('jobs').update({ scheduled_date: dateKey, updated_at: new Date().toISOString() }).eq('id', dragData.itemId);
                    if (error) throw error;
                } else if (dragData.itemType === 'subtask') {
                    const { error } = await supabase.from('sub_tasks').update({ due_date: dateKey, updated_at: new Date().toISOString() }).eq('id', dragData.itemId);
                    if (error) throw error;
                }
                router.refresh();
                addToast('Date updated');
            }
        } catch (err) {
            console.error('Error updating item date via drag & drop:', err);
            addToast('Failed to update date: ' + err.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

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
                if (assignedIds.includes(String(userId))) return;
                setIsUpdating(true);
                if (targetItem.type === 'job') {
                    const { error } = await supabase.from('job_assignments').insert([{ job_id: targetItem.id, user_id: userId }]);
                    if (error) throw error;
                } else if (targetItem.type === 'subtask') {
                    const { error } = await supabase.from('sub_task_assignments').insert([{ sub_task_id: targetItem.id, user_id: userId }]);
                    if (error) throw error;
                }
                router.refresh();
                addToast('User assigned');
            }
        } catch (err) {
            console.error('Error assigning user via drag & drop:', err);
            addToast('Failed to assign user: ' + err.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveAssignment = async (item, userId) => {
        if (!confirm(`Are you sure you want to remove this user from "${item.title}"?`)) return;
        try {
            setIsUpdating(true);
            if (item.type === 'job') {
                const { error } = await supabase.from('job_assignments').delete().eq('job_id', item.id).eq('user_id', userId);
                if (error) throw error;
            } else if (item.type === 'subtask') {
                const { error } = await supabase.from('sub_task_assignments').delete().eq('sub_task_id', item.id).eq('user_id', userId);
                if (error) throw error;
            }
            router.refresh();
            addToast('Assignment removed');
        } catch (err) {
            console.error('Error removing user assignment:', err);
            addToast('Failed to remove assignment: ' + err.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const nextMonth = () => setMonthOffset(prev => prev + 1);
    const prevMonth = () => setMonthOffset(prev => prev - 1);
    const resetMonth = () => { setMonthOffset(0); setWeekOffset(0); };
    const nextWeek = () => setWeekOffset(prev => prev + 1);
    const prevWeek = () => setWeekOffset(prev => prev - 1);

    // Task pill component (shared between month/week views)
    const TaskPill = ({ item, compact = false }) => {
        const assignedIds = item.assigned_ids ? item.assigned_ids.split(',') : [];
        const assignedUsers = users.filter(u => assignedIds.includes(String(u.id)));
        const isJob = item.type === 'job';
        const isDone = item.status === 'Complete' || item.status === 'Achieved';
        const isOverdue = !isDone && item.scheduled_date && new Date(item.scheduled_date) < today;
        const url = isJob ? `/jobs/${item.id}` : `/jobs/${item.job_id}`;

        const bgColor = isDone
            ? 'rgba(16,185,129,0.18)'
            : isOverdue
                ? 'rgba(239,68,68,0.18)'
                : isJob
                    ? 'rgba(159,18,57,0.18)'
                    : 'rgba(245,158,11,0.18)';

        const borderColor = isDone
            ? '#10b981'
            : isOverdue
                ? '#ef4444'
                : isJob
                    ? 'var(--primary)'
                    : 'var(--warning)';

        const textColor = isDone
            ? '#10b981'
            : isOverdue
                ? '#ef4444'
                : isJob
                    ? '#fda4af'
                    : '#fcd34d';

        const jobNum = item.job_number ? `${item.job_number} ` : '';

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStartItem(e, item)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDraggedOverItem(`${item.type}-${item.id}`)}
                onDragLeave={() => setDraggedOverItem(null)}
                onDrop={async (e) => { setDraggedOverItem(null); await handleDropOnItem(e, item); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(url); }}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                title={`${isJob ? 'Job' : 'Sub-task'}: ${item.title}\nStatus: ${item.status}\nAssigned: ${assignedUsers.map(u => u.username).join(', ') || 'Unassigned'}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: draggedOverItem === `${item.type}-${item.id}` ? 'rgba(59,130,246,0.35)' : bgColor,
                    color: textColor,
                    padding: compact ? '0.2rem 0.5rem' : '0.3rem 0.6rem',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${borderColor}`,
                    cursor: 'pointer',
                    boxShadow: draggedOverItem === `${item.type}-${item.id}` ? '0 0 8px rgba(59,130,246,0.5)' : 'none',
                    transition: 'all 0.15s',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    userSelect: 'none',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                    textDecoration: isDone ? 'line-through' : 'none',
                    opacity: isDone ? 0.75 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
            >
                <span style={{ fontSize: '0.65rem', flexShrink: 0 }}>{isJob ? '🔧' : '📌'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {jobNum}{truncateTitle(item.title)}
                </span>
                {assignedUsers.length > 0 && (
                    <span style={{
                        flexShrink: 0,
                        background: 'rgba(255,255,255,0.12)',
                        borderRadius: '4px',
                        padding: '0 3px',
                        fontSize: '0.6rem',
                        fontWeight: 700
                    }}>
                        {assignedUsers.slice(0, 2).map(u => getInitials(u.username)).join(' ')}
                        {assignedUsers.length > 2 ? `+${assignedUsers.length - 2}` : ''}
                    </span>
                )}
            </div>
        );
    };

    // Month view day cell
    const MAX_VISIBLE = 3;
    const DayCell = ({ day }) => {
        if (!day) {
            return <div style={{ background: 'rgba(255,255,255,0.01)', minHeight: '160px' }} />;
        }

        const dateKey = day.toISOString().split('T')[0];
        const isToday = dateKey === todayStr;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const isMonday = day.getDay() === 1;
        const onCall = getOnCallForDate(day);
        const allItems = itemsByDate[dateKey] || [];
        const visibleItems = allItems.slice(0, MAX_VISIBLE);
        const hiddenCount = allItems.length - MAX_VISIBLE;

        return (
            <div
                onDragOver={handleDragOverDay}
                onDragEnter={() => setDraggedOverDay(dateKey)}
                onDragLeave={() => setDraggedOverDay(null)}
                onDrop={async (e) => { setDraggedOverDay(null); await handleDropOnDay(e, dateKey); }}
                onContextMenu={(e) => handleDayContextMenu(e, dateKey)}
                style={{
                    minHeight: '160px',
                    background: draggedOverDay === dateKey
                        ? 'rgba(59,130,246,0.1)'
                        : isToday
                            ? 'rgba(159,18,57,0.07)'
                            : isWeekend
                                ? 'rgba(0,0,0,0.15)'
                                : 'var(--card-bg)',
                    border: draggedOverDay === dateKey
                        ? '1.5px dashed var(--primary)'
                        : isToday
                            ? '1.5px solid rgba(159,18,57,0.35)'
                            : '1px solid transparent',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'background-color 0.2s, border-color 0.2s',
                    cursor: 'default'
                }}
            >
                {/* Date header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    {/* Today ring or plain date number */}
                    <div style={{
                        width: isToday ? '28px' : 'auto',
                        height: isToday ? '28px' : 'auto',
                        borderRadius: isToday ? '50%' : '0',
                        background: isToday ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: isToday ? 800 : (isWeekend ? 600 : 400),
                        fontSize: '0.85rem',
                        color: isToday ? '#fff' : isWeekend ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
                        flexShrink: 0
                    }}>
                        {day.getDate()}
                    </div>

                    {/* On-call badge — show on Monday */}
                    {showOnCall && isMonday && (
                        <span style={{
                            fontSize: '0.55rem',
                            background: onCall.isOverride ? 'rgba(139,92,246,0.2)' : 'rgba(239,68,68,0.15)',
                            color: onCall.isOverride ? '#8b5cf6' : '#ef4444',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                        }} title={`On-Call: ${onCall.person}${onCall.isOverride ? ' (Override)' : ''}`}>
                            📞 {onCall.person?.split(' ')[0]}
                        </span>
                    )}
                </div>

                {/* Task pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                    {visibleItems.map(item => (
                        <TaskPill key={`${item.type}-${item.id}`} item={item} />
                    ))}

                    {/* +N more button */}
                    {hiddenCount > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpandedDay(day); }}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                borderRadius: '5px',
                                color: 'var(--text-muted)',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.4rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s',
                                width: '100%'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(159,18,57,0.15)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(159,18,57,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        >
                            +{hiddenCount} more
                        </button>
                    )}

                    {/* Empty drop zone hint */}
                    {allItems.length === 0 && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.1)',
                            fontSize: '0.65rem',
                            fontStyle: 'italic',
                            pointerEvents: 'none',
                            minHeight: '60px'
                        }}>
                            drop here
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Week view
    const WeekView = () => {
        const weekLabel = `${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        return (
            <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--card-border)' }}>
                    {weekDays.map((day, i) => {
                        const dateKey = day.toISOString().split('T')[0];
                        const isToday = dateKey === todayStr;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const allItems = itemsByDate[dateKey] || [];
                        return (
                            <div key={i} style={{
                                background: isToday ? 'rgba(159,18,57,0.07)' : isWeekend ? 'rgba(0,0,0,0.15)' : 'var(--card-bg)',
                                border: isToday ? '1.5px solid rgba(159,18,57,0.35)' : '1px solid transparent'
                            }}>
                                {/* Day header */}
                                <div style={{
                                    padding: '0.6rem 0.5rem 0.4rem',
                                    borderBottom: '1px solid var(--card-border)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {day.toLocaleDateString('default', { weekday: 'short' })}
                                    </div>
                                    <div style={{
                                        width: isToday ? '32px' : 'auto',
                                        height: isToday ? '32px' : 'auto',
                                        borderRadius: isToday ? '50%' : '0',
                                        background: isToday ? 'var(--primary)' : 'transparent',
                                        margin: '0.2rem auto 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1rem',
                                        fontWeight: isToday ? 800 : 500,
                                        color: isToday ? '#fff' : isWeekend ? 'rgba(255,255,255,0.4)' : 'var(--foreground)'
                                    }}>
                                        {day.getDate()}
                                    </div>
                                </div>
                                {/* Items */}
                                <div
                                    style={{ padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '3px', minHeight: '300px' }}
                                    onDragOver={handleDragOverDay}
                                    onDragEnter={() => setDraggedOverDay(dateKey)}
                                    onDragLeave={() => setDraggedOverDay(null)}
                                    onDrop={async (e) => { setDraggedOverDay(null); await handleDropOnDay(e, dateKey); }}
                                    onContextMenu={(e) => handleDayContextMenu(e, dateKey)}
                                >
                                    {allItems.map(item => (
                                        <TaskPill key={`${item.type}-${item.id}`} item={item} compact />
                                    ))}
                                    {allItems.length === 0 && (
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'rgba(255,255,255,0.08)',
                                            fontSize: '0.65rem',
                                            fontStyle: 'italic',
                                            minHeight: '60px'
                                        }}>drop here</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const weekLabelStr = viewMode === 'week'
        ? `${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '';

    return (
        <>
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .cal-header-btn {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid var(--card-border);
                    border-radius: 8px;
                    padding: 0.35rem 0.9rem;
                    color: var(--foreground);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .cal-header-btn:hover { background: rgba(255,255,255,0.12); }
                .cal-header-btn.active {
                    background: rgba(159,18,57,0.2);
                    border-color: rgba(159,18,57,0.5);
                    color: #fda4af;
                }
            `}</style>

            <Toast toasts={toasts} onDismiss={dismissToast} />

            {expandedDay && (
                <DayModal
                    day={expandedDay}
                    items={itemsByDate[expandedDay.toISOString().split('T')[0]] || []}
                    users={users}
                    onClose={() => setExpandedDay(null)}
                />
            )}

            <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative', borderLeft: 'none' }}>
                {/* Loading Overlay */}
                {isUpdating && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
                        zIndex: 1000, display: 'flex', justifyContent: 'center',
                        alignItems: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                            Saving changes...
                        </div>
                    </div>
                )}

                {/* Current On-Call Banner */}
                {showOnCall && (
                    <div style={{
                        padding: '0.6rem 1.25rem',
                        background: currentOnCall.isOverride
                            ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(239,68,68,0.15))'
                            : 'linear-gradient(135deg, rgba(159,18,57,0.12), rgba(245,158,11,0.12))',
                        borderBottom: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>📞</span>
                        <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.85rem' }}>On-Call This Week:</span>
                        <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{currentOnCall.person}</span>
                        {currentOnCall.isOverride && (
                            <span style={{
                                fontSize: '0.6rem', background: 'rgba(139,92,246,0.2)',
                                color: '#8b5cf6', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700
                            }}>OVERRIDE</span>
                        )}
                    </div>
                )}

                {/* Calendar Header */}
                <div style={{
                    padding: '0.9rem 1.25rem',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    {/* Title + Nav */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button className="cal-header-btn" onClick={viewMode === 'month' ? prevMonth : prevWeek}>‹</button>
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', minWidth: '200px', textAlign: 'center' }}>
                            {viewMode === 'month'
                                ? currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                                : weekLabelStr}
                        </h3>
                        <button className="cal-header-btn" onClick={viewMode === 'month' ? nextMonth : nextWeek}>›</button>
                        <button className="cal-header-btn" onClick={resetMonth} style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}>Today</button>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* View mode toggle */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', border: '1px solid var(--card-border)' }}>
                            {[['month', '📅 Month'], ['week', '📆 Week']].map(([mode, label]) => (
                                <button
                                    key={mode}
                                    className={`cal-header-btn${viewMode === mode ? ' active' : ''}`}
                                    onClick={() => setViewMode(mode)}
                                    style={{ border: 'none', borderRadius: '6px', fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* User filter */}
                        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
                            className="input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: '36px', minWidth: '120px' }}>
                            <option value="">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>

                        {/* Toggles */}
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#fda4af', userSelect: 'none' }}>
                            <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} />
                            🔧 Tasks
                        </label>
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showSubTasks} onChange={(e) => setShowSubTasks(e.target.checked)} />
                            📌 Sub-tasks
                        </label>
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#ef4444', userSelect: 'none' }}>
                            <input type="checkbox" checked={showOnCall} onChange={(e) => setShowOnCall(e.target.checked)} />
                            📞 On-Call
                        </label>
                    </div>
                </div>

                {/* Draggable User Bar */}
                <div style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(255,255,255,0.015)',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        👋 Drag team member onto a task to assign:
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {users.map(user => (
                            <div key={user.id} draggable onDragStart={(e) => handleDragStartUser(e, user)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)',
                                    borderRadius: '100px', padding: '0.2rem 0.7rem',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'grab',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    userSelect: 'none', transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(159,18,57,0.15)'; e.currentTarget.style.borderColor = 'rgba(159,18,57,0.4)'; e.currentTarget.style.color = '#fda4af'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = ''; }}
                            >
                                👤 {user.username}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calendar Grid */}
                {viewMode === 'month' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--card-border)', gap: '1px' }}>
                        {/* Day of week headers */}
                        {DAY_LABELS.map((d, i) => (
                            <div key={d} style={{
                                padding: '0.6rem 0.5rem',
                                background: 'rgba(255,255,255,0.03)',
                                textAlign: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: (i === 0 || i === 6) ? 'rgba(255,255,255,0.3)' : 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {d}
                            </div>
                        ))}
                        {/* Day cells */}
                        {monthDays.map((day, idx) => (
                            <DayCell key={idx} day={day} />
                        ))}
                    </div>
                ) : (
                    <WeekView />
                )}

                {/* Legend */}
                <div style={{
                    padding: '0.6rem 1.25rem',
                    borderTop: '1px solid var(--card-border)',
                    display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center',
                    background: 'rgba(255,255,255,0.01)'
                }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>LEGEND:</span>
                    {[
                        { color: 'var(--primary)', label: '🔧 Job' },
                        { color: 'var(--warning)', label: '📌 Sub-task' },
                        { color: '#10b981', label: '✅ Complete' },
                        { color: '#ef4444', label: '⚠️ Overdue' },
                    ].map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                            {label}
                        </div>
                    ))}
                </div>

                {/* Custom Context Menu */}
                {contextMenu && (
                    <div
                        style={{
                            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
                            background: '#1e293b', border: '1px solid #334155',
                            borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            zIndex: 10000, padding: '0.3rem 0', minWidth: '165px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {contextMenu.type === 'item' && (
                            <div style={{ position: 'relative' }}>
                                <div onClick={() => handleCopyItem(contextMenu.target)}
                                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontWeight: 500, transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    📋 Copy Task
                                </div>
                                <div
                                    onMouseEnter={() => setHoveredMenuItem('reassign')}
                                    onMouseLeave={() => setHoveredMenuItem(null)}
                                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', color: '#f8fafc', background: hoveredMenuItem === 'reassign' ? '#334155' : 'transparent', fontWeight: 500, position: 'relative', transition: 'background 0.15s' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👤 Reassign To</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>▶</span>
                                    {hoveredMenuItem === 'reassign' && (
                                        <div style={{
                                            position: 'absolute', left: '100%', top: 0,
                                            background: '#1e293b', border: '1px solid #334155',
                                            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                            padding: '0.3rem 0', minWidth: '160px', zIndex: 10001,
                                            maxHeight: '200px', overflowY: 'auto'
                                        }}>
                                            {users.map(u => (
                                                <div key={u.id}
                                                    onClick={async (e) => { e.stopPropagation(); await handleReassignTask(contextMenu.target, u.id); }}
                                                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 500, transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    👤 {u.username}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {contextMenu.type === 'day' && (
                            <div
                                onClick={copiedItem ? () => handlePasteTask(contextMenu.target) : undefined}
                                style={{ padding: '0.5rem 1rem', cursor: copiedItem ? 'pointer' : 'not-allowed', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: copiedItem ? '#f8fafc' : '#64748b', fontWeight: 500, transition: 'background 0.15s' }}
                                onMouseEnter={e => { if (copiedItem) e.currentTarget.style.background = '#334155'; }}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                📋 Paste Task {copiedItem ? `(${copiedItem.title?.slice(0, 10)}...)` : ''}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
