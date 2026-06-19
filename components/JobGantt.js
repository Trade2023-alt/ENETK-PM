'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import './gantt.css';

// Pure-CSS/HTML Gantt — no external library.
// frappe-gantt v1.x changed its API (popup, view_modes/view_mode coupling,
// header_height split) and crashes on SSR / zero-size containers in Next.js.
// A div-based timeline is far more reliable and renders milestones as diamonds.

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(str) {
    if (!str) return null;
    const d = new Date(str + 'T00:00:00');
    return isNaN(d) ? null : d;
}

function toISO(d) {
    return d.toISOString().split('T')[0];
}

function diffDays(a, b) {
    return Math.round((a - b) / DAY_MS);
}

const STATUS_COLOR = {
    'Scheduled': '#dc2626',
    'In Progress': '#d97706',
    'Complete': '#059669'
};

const PX_PER_DAY = {
    Day: 34,
    Week: 16,
    Month: 6
};

export default function JobGantt({ jobs = [], users = [], milestones = [] }) {
    const [viewMode, setViewMode] = useState('Week');
    const [filterStatus, setFilterStatus] = useState('All');

    const filteredJobs = filterStatus === 'All'
        ? jobs
        : jobs.filter(j => j.status === filterStatus);

    const model = useMemo(() => {
        const dated = filteredJobs.filter(j => j.scheduled_date);
        if (dated.length === 0 && milestones.length === 0) return null;

        const allStarts = [];
        const allEnds = [];

        dated.forEach(j => {
            const s = parseDate(j.scheduled_date);
            let e = parseDate(j.due_date) || s;
            if (e < s) e = s;
            allStarts.push(s);
            allEnds.push(e);
        });
        milestones.forEach(m => {
            const d = parseDate(m.end_date || m.start_date);
            if (d) { allStarts.push(d); allEnds.push(d); }
        });

        if (allStarts.length === 0) return null;

        let min = new Date(Math.min(...allStarts.map(d => d.getTime())));
        let max = new Date(Math.max(...allEnds.map(d => d.getTime())));
        // pad a few days each side
        min = new Date(min.getTime() - 3 * DAY_MS);
        max = new Date(max.getTime() + 3 * DAY_MS);
        const totalDays = Math.max(diffDays(max, min) + 1, 7);

        return { dated, min, max, totalDays };
    }, [filteredJobs, milestones]);

    const pxPerDay = PX_PER_DAY[viewMode] || 16;

    // Month gridlines across the timeline
    const monthMarkers = useMemo(() => {
        if (!model) return [];
        const out = [];
        const cur = new Date(model.min.getFullYear(), model.min.getMonth(), 1);
        while (cur <= model.max) {
            const offset = diffDays(cur, model.min);
            if (offset >= 0) {
                out.push({
                    left: offset * pxPerDay,
                    label: cur.toLocaleDateString('default', { month: 'short', year: '2-digit' })
                });
            }
            cur.setMonth(cur.getMonth() + 1);
        }
        return out;
    }, [model, pxPerDay]);

    const todayOffset = useMemo(() => {
        if (!model) return null;
        const today = new Date(toISO(new Date()) + 'T00:00:00');
        if (today < model.min || today > model.max) return null;
        return diffDays(today, model.min) * pxPerDay;
    }, [model, pxPerDay]);

    const statusOptions = ['All', 'Scheduled', 'In Progress', 'Complete'];
    const timelineWidth = model ? model.totalDays * pxPerDay : 0;
    const LABEL_WIDTH = 220;

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid var(--card-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📊 Master Schedule Timeline</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {filteredJobs.filter(j => j.scheduled_date).length} job{filteredJobs.filter(j => j.scheduled_date).length !== 1 ? 's' : ''} · {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} · Hover bars for details
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="input"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', height: '34px', minWidth: '120px' }}
                    >
                        {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                    </select>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        {['Day', 'Week', 'Month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    border: 'none', padding: '0.35rem 0.9rem', fontSize: '0.75rem',
                                    fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
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
                padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--card-border)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: '#a78bfa', fontSize: '0.9rem' }}>◆</span> Milestone
                </div>
            </div>

            {/* Timeline */}
            {!model ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No scheduled jobs to display on the timeline.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
                    <div style={{ minWidth: `${LABEL_WIDTH + timelineWidth}px` }}>
                        {/* Month header row */}
                        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', height: '32px', position: 'sticky', top: 0, background: '#161616', zIndex: 3 }}>
                            <div style={{ width: `${LABEL_WIDTH}px`, flexShrink: 0, padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                JOB
                            </div>
                            <div style={{ position: 'relative', width: `${timelineWidth}px`, flexShrink: 0 }}>
                                {monthMarkers.map((m, i) => (
                                    <div key={i} style={{ position: 'absolute', left: `${m.left}px`, top: 0, fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', padding: '0.5rem 0.25rem', borderLeft: '1px solid rgba(255,255,255,0.06)', height: '32px', whiteSpace: 'nowrap' }}>
                                        {m.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Milestone diamonds row */}
                        {milestones.length > 0 && (
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '34px', alignItems: 'center', background: 'rgba(167,139,250,0.04)' }}>
                                <div style={{ width: `${LABEL_WIDTH}px`, flexShrink: 0, padding: '0 1rem', fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                    ◆ Milestones
                                </div>
                                <div style={{ position: 'relative', width: `${timelineWidth}px`, height: '34px', flexShrink: 0 }}>
                                    {milestones.map(m => {
                                        const d = parseDate(m.end_date || m.start_date);
                                        if (!d) return null;
                                        const left = diffDays(d, model.min) * pxPerDay;
                                        const achieved = m.status === 'Achieved';
                                        const overdue = !achieved && toISO(d) < toISO(new Date());
                                        const color = achieved ? '#10b981' : overdue ? '#ef4444' : '#a78bfa';
                                        return (
                                            <div key={m.id} title={`${m.title} — ${toISO(d)} (${m.status})`} style={{ position: 'absolute', left: `${left - 7}px`, top: '8px' }}>
                                                <span style={{ display: 'inline-block', width: '14px', height: '14px', background: color, transform: 'rotate(45deg)', borderRadius: '2px', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Job rows */}
                        <div style={{ position: 'relative' }}>
                            {/* today line spanning all rows */}
                            {todayOffset !== null && (
                                <div style={{ position: 'absolute', left: `${LABEL_WIDTH + todayOffset}px`, top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.6)', zIndex: 2, pointerEvents: 'none' }} />
                            )}
                            {model.dated.map(job => {
                                const s = parseDate(job.scheduled_date);
                                let e = parseDate(job.due_date) || s;
                                if (e < s) e = s;
                                const left = diffDays(s, model.min) * pxPerDay;
                                const width = Math.max((diffDays(e, s) + 1) * pxPerDay, pxPerDay);
                                const color = STATUS_COLOR[job.status] || '#9f1239';
                                const progress = job.status === 'Complete' ? 100 : job.status === 'In Progress' ? 50 : 0;
                                const assignedList = (job.assigned_ids || '').split(',').filter(Boolean);
                                const workerNames = assignedList.map(id => {
                                    const found = users.find(u => String(u.id) === String(id));
                                    return found?.username || id;
                                });
                                return (
                                    <div key={job.id} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: '42px', alignItems: 'center' }} className="grid-row">
                                        <div style={{ width: `${LABEL_WIDTH}px`, flexShrink: 0, padding: '0.4rem 1rem', borderRight: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                            <Link href={`/jobs/${job.id}`} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                                            </Link>
                                            {workerNames.length > 0 && (
                                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>👤 {workerNames.join(', ')}</div>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative', width: `${timelineWidth}px`, height: '42px', flexShrink: 0 }}>
                                            <div
                                                title={`${job.title} | ${job.status} | ${toISO(s)} → ${toISO(e)}${job.customer_name ? ' | ' + job.customer_name : ''}`}
                                                style={{
                                                    position: 'absolute', left: `${left}px`, top: '8px', width: `${width}px`, height: '26px',
                                                    background: color, borderRadius: '5px', overflow: 'hidden',
                                                    display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'rgba(255,255,255,0.22)' }} />
                                                <span style={{ position: 'relative', fontSize: '0.68rem', color: '#fff', fontWeight: 600, padding: '0 0.4rem', whiteSpace: 'nowrap' }}>
                                                    {job.title || 'Untitled'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
