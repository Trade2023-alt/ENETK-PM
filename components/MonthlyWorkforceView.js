'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';

function toISODate(d) {
    return d.toISOString().split('T')[0];
}

function getInitials(username) {
    if (!username) return '??';
    const parts = username.trim().split(/[\s_\-]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.slice(0, 2).toUpperCase();
}

// Deterministic color from a user id/name so each person is visually consistent.
function colorForUser(key) {
    const str = String(key || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Inclusive full range of ISO dates for an item (including additional intermittent dates).
function getFullScheduledDates(item) {
    const dates = new Set();
    const start = item.scheduled_date || item.start_date;
    const end = item.due_date || start;
    if (start && end) {
        let cur = new Date(start + 'T00:00:00');
        const last = new Date(end + 'T00:00:00');
        while (cur <= last) {
            dates.add(toISODate(cur));
            cur.setDate(cur.getDate() + 1);
        }
    }
    if (Array.isArray(item.additional_dates)) {
        item.additional_dates.forEach(d => { if (d) dates.add(d); });
    }
    return Array.from(dates);
}

export default function MonthlyWorkforceView({ jobs = [], subTasks = [], users = [] }) {
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [dayDetail, setDayDetail] = useState(null); // { iso, entries }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const numDays = daysInMonth(year, month);
    const monthStartISO = toISODate(new Date(year, month, 1));
    const monthEndISO = toISODate(new Date(year, month, numDays));

    const dates = useMemo(
        () => Array.from({ length: numDays }, (_, i) => toISODate(new Date(year, month, i + 1))),
        [year, month, numDays]
    );

    // assignmentsByUser[userId][iso] = [{ jobId, title, status, hours }]
    const { assignmentsByUser, dayCellEntries } = useMemo(() => {
        const byUser = {};
        const byDay = {}; // iso -> [{ userId, username, jobId, title, status, hours }]
        users.forEach(u => { byUser[u.id] = {}; });
        dates.forEach(iso => { byDay[iso] = []; });

        const place = (userId, iso, entry) => {
            if (byUser[userId] === undefined) byUser[userId] = {};
            if (!byUser[userId][iso]) byUser[userId][iso] = [];
            byUser[userId][iso].push(entry);
            if (byDay[iso]) byDay[iso].push({ userId, ...entry });
        };

        const processItem = (item, isSubtask) => {
            const ids = (item.assigned_ids || '').split(',').filter(Boolean);
            if (ids.length === 0) return;

            const allDates = getFullScheduledDates(item);
            if (allDates.length === 0) return;

            const estHours = item.estimated_hours || 0;
            const hoursPerPersonPerDay = estHours / (ids.length * allDates.length);

            const visibleDates = allDates.filter(iso => iso >= monthStartISO && iso <= monthEndISO);
            visibleDates.forEach(iso => {
                ids.forEach(uid => place(uid, iso, {
                    jobId: isSubtask ? item.job_id : item.id,
                    title: item.title || (isSubtask ? 'Sub-task' : 'Untitled'),
                    status: item.status,
                    type: isSubtask ? 'subtask' : 'job',
                    hours: hoursPerPersonPerDay,
                    username: (users.find(u => String(u.id) === String(uid)) || {}).username
                }));
            });
        };

        jobs.forEach(job => processItem(job, false));
        subTasks.forEach(st => processItem(st, true));

        return { assignmentsByUser: byUser, dayCellEntries: byDay };
    }, [jobs, subTasks, users, dates, monthStartISO, monthEndISO]);

    // Per-person utilization / gaps / overload.
    const stats = useMemo(() => {
        return users.map(u => {
            const byDate = assignmentsByUser[u.id] || {};
            let workingDays = 0;
            let overloadedDays = 0;
            dates.forEach(iso => {
                const cnt = (byDate[iso] || []).length;
                if (cnt > 0) workingDays++;
                if (cnt >= 3) overloadedDays++;
            });
            return {
                id: u.id,
                username: u.username,
                workingDays,
                gaps: numDays - workingDays,
                overloadedDays
            };
        });
    }, [users, assignmentsByUser, dates, numDays]);

    const totalOverloaded = stats.reduce((s, p) => s + p.overloadedDays, 0);

    const changeMonth = (delta) => {
        setViewDate(new Date(year, month + delta, 1));
    };

    const monthLabel = viewDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    const todayISO = toISODate(today);

    const openDay = (iso) => {
        const entries = dayCellEntries[iso] || [];
        if (entries.length > 0) setDayDetail({ iso, entries });
    };

    return (
        <div>
            {/* Header / navigation */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', padding: '0.85rem 1.25rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>👥 Where is everyone — {monthLabel}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => changeMonth(-1)} style={{ background: 'rgba(255,255,255,0.06)' }}>← Prev</button>
                    <button className="btn" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ background: 'rgba(255,255,255,0.06)' }}>Today</button>
                    <button className="btn" onClick={() => changeMonth(1)} style={{ background: 'rgba(255,255,255,0.06)' }}>Next →</button>
                </div>
            </div>

            {/* Utilization summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {stats.map(p => (
                    <div key={p.id} className="card" style={{ padding: '0.75rem', borderLeft: `4px solid ${colorForUser(p.id)}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: colorForUser(p.id), color: '#fff', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {getInitials(p.username)}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.username}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span>📅 {p.workingDays} working day{p.workingDays !== 1 ? 's' : ''}</span>
                            <span>🕳️ {p.gaps} gap day{p.gaps !== 1 ? 's' : ''}</span>
                            <span style={{ color: p.overloadedDays > 0 ? '#f59e0b' : 'var(--text-muted)' }}>⚠️ {p.overloadedDays} overloaded (3+)</span>
                        </div>
                    </div>
                ))}
                {users.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No team members found.</p>}
            </div>

            {totalOverloaded > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
                    ⚠️ {totalOverloaded} overloaded person-day{totalOverloaded !== 1 ? 's' : ''} this month (3+ assignments on a single day).
                </div>
            )}

            {/* People × Days matrix */}
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${160 + numDays * 30}px` }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                            <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#1a1a1a', padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '150px' }}>Team Member</th>
                            {dates.map(iso => {
                                const d = new Date(iso + 'T00:00:00');
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const isToday = iso === todayISO;
                                return (
                                    <th key={iso} title={iso} style={{
                                        padding: '0.35rem 0', textAlign: 'center', fontSize: '0.62rem',
                                        color: isToday ? 'var(--primary)' : isWeekend ? 'rgba(255,255,255,0.3)' : 'var(--text-muted)',
                                        fontWeight: isToday ? 800 : 600, minWidth: '30px',
                                        cursor: 'pointer'
                                    }} onClick={() => openDay(iso)}>
                                        <div>{d.getDate()}</div>
                                        <div style={{ fontSize: '0.55rem' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const byDate = assignmentsByUser[u.id] || {};
                            const color = colorForUser(u.id);
                            return (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#1a1a1a', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                                            {u.username}
                                        </span>
                                    </td>
                                    {dates.map(iso => {
                                        const entries = byDate[iso] || [];
                                        const d = new Date(iso + 'T00:00:00');
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        const overloaded = entries.length >= 3;
                                        return (
                                            <td key={iso} onClick={() => openDay(iso)} title={entries.map(e => e.title).join(', ')} style={{
                                                textAlign: 'center', padding: '2px', cursor: entries.length ? 'pointer' : 'default',
                                                background: isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                                                borderLeft: '1px solid rgba(255,255,255,0.04)'
                                            }}>
                                                {entries.length > 0 && (
                                                    <span style={{
                                                        display: 'inline-block', minWidth: '20px', height: '18px', lineHeight: '18px',
                                                        borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700,
                                                        background: overloaded ? '#f59e0b' : color, color: '#fff'
                                                    }}>
                                                        {entries.length}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem' }}>
                Each cell shows the number of jobs/tasks a person is on that day. Amber = overloaded (3+). Click any cell or date header for details.
            </p>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>⏱️ Estimated Hours</h3>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${160 + numDays * 30}px` }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                            <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#1a1a1a', padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '150px' }}>Team Member</th>
                            {dates.map(iso => {
                                const d = new Date(iso + 'T00:00:00');
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const isToday = iso === todayISO;
                                return (
                                    <th key={iso} title={iso} style={{
                                        padding: '0.35rem 0', textAlign: 'center', fontSize: '0.62rem',
                                        color: isToday ? 'var(--primary)' : isWeekend ? 'rgba(255,255,255,0.3)' : 'var(--text-muted)',
                                        fontWeight: isToday ? 800 : 600, minWidth: '30px',
                                        cursor: 'pointer'
                                    }} onClick={() => openDay(iso)}>
                                        <div>{d.getDate()}</div>
                                        <div style={{ fontSize: '0.55rem' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const byDate = assignmentsByUser[u.id] || {};
                            const color = colorForUser(u.id);
                            return (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#1a1a1a', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                                            {u.username}
                                        </span>
                                    </td>
                                    {dates.map(iso => {
                                        const entries = byDate[iso] || [];
                                        const d = new Date(iso + 'T00:00:00');
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        
                                        const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
                                        const displayHours = Math.round(totalHours * 10) / 10;
                                        const overloaded = totalHours > 8; // > 8 hours is considered overloaded
                                        
                                        return (
                                            <td key={iso} onClick={() => openDay(iso)} title={entries.map(e => `${e.title} (${Math.round(e.hours*10)/10}h)`).join(', ')} style={{
                                                textAlign: 'center', padding: '2px', cursor: entries.length ? 'pointer' : 'default',
                                                background: isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                                                borderLeft: '1px solid rgba(255,255,255,0.04)'
                                            }}>
                                                {displayHours > 0 && (
                                                    <span style={{
                                                        display: 'inline-block', minWidth: '20px', height: '18px', lineHeight: '18px',
                                                        borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700,
                                                        background: overloaded ? '#ef4444' : color, color: '#fff',
                                                        padding: '0 0.15rem'
                                                    }}>
                                                        {displayHours}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Each cell shows the total estimated hours per person per day. Red = overloaded (&gt; 8 hours). Click any cell for details.
            </p>

            {/* Day detail modal */}
            {dayDetail && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDayDetail(null)}>
                    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.5rem', minWidth: '340px', maxWidth: '520px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                {new Date(dayDetail.iso + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                            <button onClick={() => setDayDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dayDetail.entries.map((e, i) => (
                                <Link key={`${e.userId}-${e.jobId}-${i}`} href={`/jobs/${e.jobId}`} style={{
                                    textDecoration: 'none', color: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                                    background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${colorForUser(e.userId)}`
                                }}>
                                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: colorForUser(e.userId), color: '#fff', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {getInitials(e.username)}
                                    </span>
                                    <span style={{ flex: 1, fontSize: '0.82rem' }}>
                                        <strong>{e.username || 'Unknown'}</strong> — {e.type === 'subtask' ? '☑️ ' : ''}{e.title}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{e.status}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
