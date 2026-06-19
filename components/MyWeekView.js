'use client'

import { useMemo } from 'react';
import Link from 'next/link';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toISODate(d) {
    return d.toISOString().split('T')[0];
}

// Monday of the current week (local), then Mon–Fri dates.
function getWeekDays(reference = new Date()) {
    const d = new Date(reference);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    return Array.from({ length: 5 }, (_, i) => {
        const cur = new Date(monday);
        cur.setDate(monday.getDate() + i);
        return cur;
    });
}

const statusStyle = (status) => {
    if (status === 'Complete') return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Complete' };
    if (status === 'In Progress') return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'In Progress' };
    return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: status || 'Scheduled' };
};

export default function MyWeekView({ jobs = [], subTasks = [], users = [], currentUser = null, onJobSelect, onCallSchedule = [] }) {
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    const username = currentUser?.username || null;

    const weekDays = useMemo(() => getWeekDays(), []);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[4];
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);

    // Items belonging to the current user, indexed by ISO date.
    const itemsByDate = useMemo(() => {
        const map = {};
        weekDays.forEach(d => { map[toISODate(d)] = []; });

        const inWeek = (iso) => iso && iso >= weekStartISO && iso <= weekEndISO && map[iso] !== undefined;

        const isMine = (assignedIds, leadId) => {
            if (!userId) return true; // no id → show all assigned jobs already filtered server-side
            const ids = (assignedIds || '').split(',').filter(Boolean);
            if (ids.includes(userId)) return true;
            if (leadId != null && String(leadId) === userId) return true;
            return false;
        };

        jobs.forEach(job => {
            const iso = job.scheduled_date;
            if (!inWeek(iso)) return;
            if (!isMine(job.assigned_ids, job.lead_id)) return;
            map[iso].push({
                key: `job-${job.id}`,
                type: 'job',
                jobId: job.id,
                title: job.title || 'Untitled Job',
                status: job.status,
                customer: job.customer_name,
                hours: job.estimated_hours || 0
            });
        });

        subTasks.forEach(st => {
            const iso = st.due_date;
            if (!inWeek(iso)) return;
            const ids = (st.assigned_ids || '').split(',').filter(Boolean);
            if (userId && !ids.includes(userId)) return;
            map[iso].push({
                key: `subtask-${st.id}`,
                type: 'subtask',
                jobId: st.job_id,
                title: st.title || 'Sub-task',
                status: st.status,
                customer: null,
                hours: st.estimated_hours || 0
            });
        });

        return map;
    }, [jobs, subTasks, weekDays, weekStartISO, weekEndISO, userId]);

    const summary = useMemo(() => {
        const all = Object.values(itemsByDate).flat();
        const jobItems = all.filter(i => i.type === 'job');
        return {
            totalItems: all.length,
            totalJobs: jobItems.length,
            totalHours: all.reduce((sum, i) => sum + (i.hours || 0), 0),
            complete: all.filter(i => i.status === 'Complete').length
        };
    }, [itemsByDate]);

    // On-call: a week entry whose person matches this user's name, overlapping this week.
    const onCallThisWeek = useMemo(() => {
        if (!username) return false;
        return (onCallSchedule || []).some(w =>
            w.person === username && w.weekStart <= weekEndISO && w.weekEnd >= weekStartISO
        );
    }, [onCallSchedule, username, weekStartISO, weekEndISO]);

    const todayISO = toISODate(new Date());

    return (
        <div>
            {/* This Week summary */}
            <div className="card" style={{
                display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center',
                marginBottom: '1rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)'
            }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    🗓️ This Week
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </div>
                </div>
                <SummaryStat label="Jobs" value={summary.totalJobs} />
                <SummaryStat label="Total Items" value={summary.totalItems} />
                <SummaryStat label="Est. Hours" value={Math.round(summary.totalHours * 10) / 10} />
                <SummaryStat label="Complete" value={`${summary.complete}/${summary.totalItems}`} />
            </div>

            {/* On-call banner */}
            {onCallThisWeek && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(90deg, rgba(124,58,237,0.2), rgba(124,58,237,0.08))',
                    border: '1px solid rgba(124,58,237,0.5)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    fontWeight: 700, color: '#c4b5fd'
                }}>
                    <span style={{ fontSize: '1.3rem' }}>📟</span>
                    You are ON-CALL this week. Keep your phone handy.
                </div>
            )}

            {/* 5-column Mon–Fri grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '0.75rem'
            }}>
                {weekDays.map(day => {
                    const iso = toISODate(day);
                    const items = itemsByDate[iso] || [];
                    const isToday = iso === todayISO;
                    return (
                        <div key={iso} className="card" style={{
                            padding: '0.75rem',
                            minHeight: '180px',
                            border: isToday ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                            background: isToday ? 'rgba(159,18,57,0.06)' : 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{ marginBottom: '0.6rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.4rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isToday ? 'var(--primary)' : 'var(--foreground)' }}>
                                    {DAY_LABELS[weekDays.indexOf(day)]}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {day.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                                </div>
                            </div>

                            {items.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0.5rem', opacity: 0.7 }}>
                                    No work scheduled
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {items.map(item => {
                                        const s = statusStyle(item.status);
                                        return onJobSelect ? (
                                            <button key={item.key} onClick={(e) => { e.preventDefault(); onJobSelect(item.jobId); }} style={{
                                                textAlign: 'left',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textDecoration: 'none', color: 'inherit',
                                                display: 'block',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid var(--card-border)',
                                                borderLeft: `3px solid ${s.color}`
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.2 }}>
                                                    {item.type === 'subtask' ? '☑️ ' : ''}{item.title}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: s.bg, color: s.color }}>
                                                        {s.label}
                                                    </span>
                                                    {item.customer && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>📍 {item.customer}</span>
                                                    )}
                                                    {item.hours > 0 && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⏱ {item.hours}h</span>
                                                    )}
                                                </div>
                                            </button>
                                        ) : (
                                            <Link key={item.key} href={`/jobs/${item.jobId}`} style={{
                                                textDecoration: 'none', color: 'inherit',
                                                display: 'block',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid var(--card-border)',
                                                borderLeft: `3px solid ${s.color}`
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.2 }}>
                                                    {item.type === 'subtask' ? '☑️ ' : ''}{item.title}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: s.bg, color: s.color }}>
                                                        {s.label}
                                                    </span>
                                                    {item.customer && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>📍 {item.customer}</span>
                                                    )}
                                                    {item.hours > 0 && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⏱ {item.hours}h</span>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SummaryStat({ label, value }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
    );
}
