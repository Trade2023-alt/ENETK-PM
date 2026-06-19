'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

const DAY_MS = 86400000;

function parseLocalDate(str) {
    // Parse YYYY-MM-DD as local date — avoids UTC timezone shift
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
}

function toDateStr(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function addDays(d, n) {
    return new Date(d.getTime() + n * DAY_MS);
}

function diffDays(a, b) {
    // floor difference in whole days
    return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

const STATUS_COLOR = {
    'Scheduled':  '#dc2626',
    'In Progress': '#d97706',
    'Complete':    '#059669',
};

const PX = { Day: 40, Week: 18, Month: 7 };
const LABEL_W = 200;
const ROW_H = 44;
const HEADER_H = 32;

export default function JobGantt({ jobs = [], users = [], milestones = [] }) {
    const zoom = 'Week'; // fixed zoom — controls removed per user request

    const px = PX[zoom];

    const filtered = jobs.filter(j => j.scheduled_date);

    // Compute timeline bounds
    const { rangeStart, totalDays } = useMemo(() => {
        const dates = [];
        filtered.forEach(j => {
            const s = parseLocalDate(j.scheduled_date);
            const e = parseLocalDate(j.due_date) || s;
            if (s) dates.push(s.getTime(), (e || s).getTime());
        });
        milestones.forEach(m => {
            const d = parseLocalDate(m.end_date || m.start_date);
            if (d) dates.push(d.getTime());
        });

        if (dates.length === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return { rangeStart: addDays(today, -7), totalDays: 60 };
        }

        const minT = Math.min(...dates);
        const maxT = Math.max(...dates);
        const start = addDays(new Date(minT), -5);
        start.setHours(0, 0, 0, 0);
        const end = addDays(new Date(maxT), 5);
        const days = Math.max(diffDays(end, start) + 1, 30);
        return { rangeStart: start, totalDays: days };
    }, [filtered, milestones, zoom]);

    const timelineW = totalDays * px;

    // Month header markers
    const monthMarkers = useMemo(() => {
        const out = [];
        const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
        while (diffDays(cur, rangeStart) < totalDays) {
            const off = diffDays(cur, rangeStart);
            if (off >= 0) {
                out.push({
                    left: off * px,
                    label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                });
            }
            cur.setMonth(cur.getMonth() + 1);
        }
        return out;
    }, [rangeStart, totalDays, px]);

    // Today line
    const todayLeft = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const off = diffDays(today, rangeStart);
        if (off < 0 || off > totalDays) return null;
        return off * px;
    }, [rangeStart, totalDays, px]);

    const totalW = LABEL_W + timelineW;
    const containerH = HEADER_H + (filtered.length + (milestones.length > 0 ? 1 : 0)) * ROW_H + 4;

    return (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
            {/* Header — no buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📊 Gantt Timeline</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {milestones.length > 0 ? ` · ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}` : ''}
                </span>
            </div>

            {filtered.length === 0 && milestones.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No scheduled jobs to display. Add scheduled dates to jobs to see them here.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
                    <div style={{ width: `${totalW}px`, minWidth: '100%', position: 'relative', height: `${containerH}px` }}>

                        {/* Sticky header row */}
                        <div style={{
                            position: 'sticky', top: 0, zIndex: 10,
                            display: 'flex', height: `${HEADER_H}px`,
                            background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.1)',
                            width: `${totalW}px`,
                        }}>
                            <div style={{ width: `${LABEL_W}px`, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0 0.75rem', display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                JOB / TASK
                            </div>
                            <div style={{ position: 'relative', width: `${timelineW}px`, height: `${HEADER_H}px`, flexShrink: 0, overflow: 'hidden' }}>
                                {monthMarkers.map((m, i) => (
                                    <div key={i} style={{
                                        position: 'absolute', left: `${m.left}px`, top: 0, height: '100%',
                                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                                        paddingLeft: '4px', paddingTop: '8px',
                                        fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)',
                                        fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none',
                                    }}>
                                        {m.label}
                                    </div>
                                ))}
                                {/* Today marker in header */}
                                {todayLeft !== null && (
                                    <div style={{ position: 'absolute', left: `${todayLeft}px`, top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.8)', pointerEvents: 'none' }} />
                                )}
                            </div>
                        </div>

                        {/* Content rows */}
                        <div style={{ position: 'absolute', top: `${HEADER_H}px`, left: 0, right: 0 }}>
                            {/* Today line across all rows */}
                            {todayLeft !== null && (
                                <div style={{
                                    position: 'absolute', left: `${LABEL_W + todayLeft}px`, top: 0,
                                    bottom: 0, width: '2px', background: 'rgba(239,68,68,0.35)',
                                    zIndex: 2, pointerEvents: 'none',
                                }} />
                            )}

                            {/* Milestones row */}
                            {milestones.length > 0 && (
                                <div style={{ display: 'flex', height: `${ROW_H}px`, borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', background: 'rgba(167,139,250,0.03)' }}>
                                    <div style={{ width: `${LABEL_W}px`, flexShrink: 0, padding: '0 0.75rem', borderRight: '1px solid rgba(255,255,255,0.07)', fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        ◆ Milestones
                                    </div>
                                    <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px`, flexShrink: 0 }}>
                                        {milestones.map(m => {
                                            const d = parseLocalDate(m.end_date || m.start_date);
                                            if (!d) return null;
                                            const left = diffDays(d, rangeStart) * px;
                                            const achieved = m.status === 'Achieved';
                                            const overdue = !achieved && toDateStr(d) < toDateStr(new Date());
                                            const color = achieved ? '#10b981' : overdue ? '#ef4444' : '#a78bfa';
                                            return (
                                                <div key={m.id} title={`${m.title} — ${toDateStr(d)} (${m.status})`}
                                                    style={{ position: 'absolute', left: `${left - 7}px`, top: '14px', width: '14px', height: '14px', background: color, transform: 'rotate(45deg)', borderRadius: '2px', cursor: 'default' }} />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Job rows */}
                            {filtered.map((job, idx) => {
                                const s = parseLocalDate(job.scheduled_date);
                                const e = parseLocalDate(job.due_date) || s;
                                const eAdj = e < s ? s : e;
                                const left = diffDays(s, rangeStart) * px;
                                const width = Math.max((diffDays(eAdj, s) + 1) * px, px);
                                const color = STATUS_COLOR[job.status] || '#9f1239';
                                const progress = job.status === 'Complete' ? 100 : job.status === 'In Progress' ? 50 : 0;
                                const assignedIds = (job.assigned_ids || '').split(',').filter(Boolean);
                                const workerNames = assignedIds.map(id => users.find(u => String(u.id) === String(id))?.username || '').filter(Boolean);
                                const bg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)';

                                return (
                                    <div key={job.id} style={{ display: 'flex', height: `${ROW_H}px`, borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', background: bg }}>
                                        {/* Label */}
                                        <div style={{ width: `${LABEL_W}px`, flexShrink: 0, padding: '0 0.75rem', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                            <Link href={`/jobs/${job.id}`} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                                            </Link>
                                            {workerNames.length > 0 && (
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    👤 {workerNames.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        {/* Bar */}
                                        <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px`, flexShrink: 0 }}>
                                            <div title={`${job.title} | ${job.status} | ${toDateStr(s)} → ${toDateStr(eAdj)}${job.customer_name ? ' | ' + job.customer_name : ''}`}
                                                style={{
                                                    position: 'absolute', left: `${left}px`, top: '9px',
                                                    width: `${width}px`, height: '26px',
                                                    background: color, borderRadius: '4px', overflow: 'hidden',
                                                    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                                }}>
                                                {/* Progress fill */}
                                                {progress > 0 && (
                                                    <div style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: 'rgba(255,255,255,0.2)', borderRadius: '4px 0 0 4px' }} />
                                                )}
                                                <span style={{ position: 'relative', fontSize: '0.65rem', color: '#fff', fontWeight: 700, padding: '0 0.4rem', lineHeight: '26px', whiteSpace: 'nowrap', overflow: 'hidden', display: 'block', textOverflow: 'ellipsis' }}>
                                                    {job.title}
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

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.25rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--card-border)', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                {[['#dc2626','Scheduled'],['#d97706','In Progress'],['#059669','Complete'],['#a78bfa','Milestone ◆']].map(([color,label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: color }} />
                        {label}
                    </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Hover bars for details</span>
            </div>
        </div>
    );
}
