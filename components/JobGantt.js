'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

export default function JobGantt({ jobs = [], users = [], milestones = [], onJobSelect }) {
    const zoom = 'Week'; // fixed zoom — controls removed per user request
    const [expandedJobs, setExpandedJobs] = useState(new Set());
    const router = useRouter();
    const [dragState, setDragState] = useState(null); 
    // dragState format: { id, type: 'move'|'resize-left'|'resize-right', startX, initialStart, initialEnd, itemType: 'job'|'subtask' }

    const toggleExpand = (jobId) => {
        setExpandedJobs(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
    };

    const px = PX[zoom];

    // --- Drag and Drop Logic ---
    const handleMouseDown = (e, item, type, itemType) => {
        e.preventDefault();
        e.stopPropagation();
        
        const initialStart = itemType === 'job' ? item.scheduled_date : item.start_date;
        const initialEnd = item.due_date || initialStart;

        setDragState({
            id: item.id,
            type, // 'move', 'resize-left', 'resize-right'
            startX: e.clientX,
            initialStart,
            initialEnd,
            itemType
        });
    };

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / px);
            
            // Determine new visual dates (optimistic)
            const sDate = parseLocalDate(dragState.initialStart);
            const eDate = parseLocalDate(dragState.initialEnd);
            if (!sDate || !eDate) return;

            let newStart = sDate;
            let newEnd = eDate;

            if (dragState.type === 'move') {
                newStart = addDays(sDate, deltaDays);
                newEnd = addDays(eDate, deltaDays);
            } else if (dragState.type === 'resize-left') {
                newStart = addDays(sDate, deltaDays);
                if (newStart > newEnd) newStart = newEnd;
            } else if (dragState.type === 'resize-right') {
                newEnd = addDays(eDate, deltaDays);
                if (newEnd < newStart) newEnd = newStart;
            }

            setDragState(prev => ({
                ...prev,
                currentStart: toDateStr(newStart),
                currentEnd: toDateStr(newEnd)
            }));
        };

        const handleMouseUp = async (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / px);
            
            if (deltaDays !== 0) {
                const sDate = parseLocalDate(dragState.initialStart);
                const eDate = parseLocalDate(dragState.initialEnd);
                if (sDate && eDate) {
                    let newStart = sDate;
                    let newEnd = eDate;

                    if (dragState.type === 'move') {
                        newStart = addDays(sDate, deltaDays);
                        newEnd = addDays(eDate, deltaDays);
                    } else if (dragState.type === 'resize-left') {
                        newStart = addDays(sDate, deltaDays);
                        if (newStart > newEnd) newStart = newEnd;
                    } else if (dragState.type === 'resize-right') {
                        newEnd = addDays(eDate, deltaDays);
                        if (newEnd < newStart) newEnd = newStart;
                    }

                    const startStr = toDateStr(newStart);
                    const endStr = toDateStr(newEnd);

                    if (dragState.itemType === 'job') {
                        await supabase.from('jobs').update({ scheduled_date: startStr, due_date: endStr }).eq('id', dragState.id);
                    } else {
                        await supabase.from('sub_tasks').update({ start_date: startStr, due_date: endStr }).eq('id', dragState.id);
                    }
                    router.refresh();
                }
            }
            setDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, px, router]);
    // ---------------------------

    const filtered = jobs.filter(j => j.scheduled_date);

    // Compute timeline bounds
    const { rangeStart, totalDays } = useMemo(() => {
        const dates = [];
        filtered.forEach(j => {
            const s = parseLocalDate(j.scheduled_date);
            const e = parseLocalDate(j.due_date) || s;
            if (s) dates.push(s.getTime(), (e || s).getTime());
            
            if (Array.isArray(j.additional_dates)) {
                j.additional_dates.forEach(d => {
                    const pd = parseLocalDate(d);
                    if (pd) dates.push(pd.getTime());
                });
            }

            if (Array.isArray(j.sub_tasks)) {
                j.sub_tasks.forEach(st => {
                    const sts = parseLocalDate(st.start_date);
                    const ste = parseLocalDate(st.due_date) || sts;
                    if (sts) dates.push(sts.getTime(), (ste || sts).getTime());
                    if (Array.isArray(st.additional_dates)) {
                        st.additional_dates.forEach(d => {
                            const pd = parseLocalDate(d);
                            if (pd) dates.push(pd.getTime());
                        });
                    }
                });
            }
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
                <div style={{ overflowX: 'auto', overflowY: 'auto', resize: 'vertical', minHeight: '250px', maxHeight: '85vh', paddingBottom: '10px' }}>
                    <div style={{ width: `${totalW}px`, minWidth: '100%', position: 'relative', height: `${containerH}px` }}>

                        {/* Sticky header row */}
                        <div style={{
                            position: 'sticky', top: 0, zIndex: 10,
                            display: 'flex', height: `${HEADER_H}px`,
                            background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.1)',
                            width: `${totalW}px`,
                        }}>
                            <div style={{ position: 'sticky', left: 0, zIndex: 11, background: '#161b22', width: `${LABEL_W}px`, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0 0.75rem', display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                                    <div style={{ position: 'sticky', left: 0, zIndex: 1, background: '#1a0508', width: `${LABEL_W}px`, flexShrink: 0, padding: '0 0.75rem', borderRight: '1px solid rgba(255,255,255,0.07)', fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
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
                            {filtered.flatMap((job, idx) => {
                                const rows = [];
                                
                                const isDraggedJob = dragState && dragState.id === job.id && dragState.itemType === 'job';
                                const s = isDraggedJob && dragState.currentStart ? parseLocalDate(dragState.currentStart) : parseLocalDate(job.scheduled_date);
                                const e = isDraggedJob && dragState.currentEnd ? parseLocalDate(dragState.currentEnd) : (parseLocalDate(job.due_date) || s);
                                
                                const eAdj = e < s ? s : e;
                                const left = diffDays(s, rangeStart) * px;
                                const width = Math.max((diffDays(eAdj, s) + 1) * px, px);
                                const color = STATUS_COLOR[job.status] || '#9f1239';
                                const progress = job.status === 'Complete' ? 100 : job.status === 'In Progress' ? 50 : 0;
                                const assignedIds = (job.assigned_ids || '').split(',').filter(Boolean);
                                const workerNames = assignedIds.map(id => users.find(u => String(u.id) === String(id))?.username || '').filter(Boolean);
                                const bg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)';
                                const isExpanded = expandedJobs.has(job.id);
                                const hasSubTasks = Array.isArray(job.sub_tasks) && job.sub_tasks.length > 0;

                                // Main Job Row
                                rows.push(
                                    <div key={job.id} style={{ display: 'flex', height: `${ROW_H}px`, borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', background: bg }}>
                                        {/* Label */}
                                        <div style={{ position: 'sticky', left: 0, zIndex: 1, background: bg === 'transparent' ? '#1a0508' : '#210a0e', width: `${LABEL_W}px`, flexShrink: 0, padding: '0 0.75rem', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {hasSubTasks && (
                                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(job.id); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '4px', zIndex: 10 }}>
                                                        {isExpanded ? '−' : '+'}
                                                    </button>
                                                )}
                                                {onJobSelect ? (
                                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJobSelect(job.id); }} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                                                        {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                                                    </button>
                                                ) : (
                                                    <Link href={`/jobs/${job.id}`} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                                                    </Link>
                                                )}
                                            </div>
                                            {workerNames.length > 0 && (
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: hasSubTasks ? '1.5rem' : 0 }}>
                                                    👤 {workerNames.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        {/* Bar */}
                                        <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px`, flexShrink: 0 }}>
                                            {/* Tick-marked span bar */}
                                            <div title={`${job.title} | ${job.status} | ${toDateStr(s)} → ${toDateStr(eAdj)}${job.customer_name ? ' | ' + job.customer_name : ''}`}
                                                onMouseDown={(e) => handleMouseDown(e, job, 'move', 'job')}
                                                style={{
                                                    position: 'absolute', left: `${left}px`, top: '16px',
                                                    width: `${width}px`, height: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderLeft: `3px solid ${color}`,
                                                    borderRight: `3px solid ${color}`,
                                                    borderTop: `1px solid rgba(255,255,255,0.2)`,
                                                    borderBottom: `1px solid rgba(255,255,255,0.2)`,
                                                    borderRadius: '2px', overflow: 'hidden',
                                                    cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                                    opacity: isDraggedJob ? 0.7 : 1
                                                }}>
                                                {/* Left handle */}
                                                <div onMouseDown={(e) => handleMouseDown(e, job, 'resize-left', 'job')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10, background: 'rgba(255,255,255,0.01)' }} />
                                                {/* Right handle */}
                                                <div onMouseDown={(e) => handleMouseDown(e, job, 'resize-right', 'job')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10, background: 'rgba(255,255,255,0.01)' }} />
                                                
                                                {/* Progress fill */}
                                                {progress > 0 && (
                                                    <div style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: color, opacity: 0.6, pointerEvents: 'none' }} />
                                                )}
                                            </div>
                                            <span style={{ position: 'absolute', left: `${left + width + 8}px`, top: '14px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                                                {job.title}
                                            </span>
                                            
                                            {/* Intermittent Dates */}
                                            {Array.isArray(job.additional_dates) && job.additional_dates.map(dStr => {
                                                const d = parseLocalDate(dStr);
                                                if (!d) return null;
                                                const dLeft = diffDays(d, rangeStart) * px;
                                                return (
                                                    <div key={dStr} title={`Scheduled: ${dStr}`} style={{
                                                        position: 'absolute', left: `${dLeft + (px/2) - 6}px`, top: '16px',
                                                        width: '12px', height: '12px', background: '#a78bfa', transform: 'rotate(45deg)', borderRadius: '2px',
                                                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5)', zIndex: 2
                                                    }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );

                                // Sub-Task Rows
                                if (isExpanded && hasSubTasks) {
                                    job.sub_tasks.forEach((st, stIdx) => {
                                        const isDraggedSt = dragState && dragState.id === st.id && dragState.itemType === 'subtask';
                                        
                                        const sts = isDraggedSt && dragState.currentStart ? parseLocalDate(dragState.currentStart) : parseLocalDate(st.start_date);
                                        const ste = isDraggedSt && dragState.currentEnd ? parseLocalDate(dragState.currentEnd) : (parseLocalDate(st.due_date) || sts);
                                        
                                        if (!sts && (!st.additional_dates || st.additional_dates.length === 0)) return; // Skip if no dates at all
                                        
                                        const steAdj = sts && ste < sts ? sts : ste;
                                        const stLeft = sts ? diffDays(sts, rangeStart) * px : 0;
                                        const stWidth = sts ? Math.max((diffDays(steAdj, sts) + 1) * px, px) : 0;
                                        const stColor = STATUS_COLOR[st.status] || '#6b7280';
                                        const stProgress = st.status === 'Complete' ? 100 : st.status === 'In Progress' ? 50 : 0;
                                        const stBg = 'rgba(0,0,0,0.2)'; // Darker bg to distinguish sub-tasks

                                        rows.push(
                                            <div key={`st-${st.id}`} style={{ display: 'flex', height: `${ROW_H - 8}px`, borderBottom: '1px solid rgba(255,255,255,0.02)', alignItems: 'center', background: stBg }}>
                                                {/* Label */}
                                                <div style={{ position: 'sticky', left: 0, zIndex: 1, background: '#110305', width: `${LABEL_W}px`, flexShrink: 0, padding: '0 0.75rem 0 2rem', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {onJobSelect ? (
                                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJobSelect(job.id); }} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
                                                                ↳ {st.title || 'Untitled'}
                                                            </button>
                                                        ) : (
                                                            <>↳ {st.title || 'Untitled'}</>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Bar */}
                                                <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H - 8}px`, flexShrink: 0 }}>
                                                    {sts && (
                                                        <div title={`${st.title} | ${st.status}`}
                                                            onMouseDown={(e) => handleMouseDown(e, st, 'move', 'subtask')}
                                                            style={{
                                                                position: 'absolute', left: `${stLeft}px`, top: '8px',
                                                                width: `${stWidth}px`, height: '20px',
                                                                background: stColor, borderRadius: '4px', overflow: 'hidden',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.4)', opacity: isDraggedSt ? 0.6 : 0.85,
                                                                cursor: 'grab'
                                                            }}>
                                                            {/* Left handle */}
                                                            <div onMouseDown={(e) => handleMouseDown(e, st, 'resize-left', 'subtask')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10, background: 'rgba(255,255,255,0.01)' }} />
                                                            {/* Right handle */}
                                                            <div onMouseDown={(e) => handleMouseDown(e, st, 'resize-right', 'subtask')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10, background: 'rgba(255,255,255,0.01)' }} />

                                                            {stProgress > 0 && (
                                                                <div style={{ position: 'absolute', inset: 0, width: `${stProgress}%`, background: 'rgba(255,255,255,0.2)', borderRadius: '4px 0 0 4px', pointerEvents: 'none' }} />
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Sub-task Intermittent Dates */}
                                                    {Array.isArray(st.additional_dates) && st.additional_dates.map(dStr => {
                                                        const d = parseLocalDate(dStr);
                                                        if (!d) return null;
                                                        const dLeft = diffDays(d, rangeStart) * px;
                                                        return (
                                                            <div key={`st-d-${dStr}`} title={`Scheduled: ${dStr}`} style={{
                                                                position: 'absolute', left: `${dLeft + (px/2) - 5}px`, top: '13px',
                                                                width: '10px', height: '10px', background: '#d8b4fe', transform: 'rotate(45deg)', borderRadius: '1px',
                                                                boxShadow: '0 0 0 1px rgba(0,0,0,0.5)', zIndex: 2
                                                            }} />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                }

                                return rows;
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
