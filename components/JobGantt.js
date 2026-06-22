'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DAY_MS = 86400000;

function parseLocalDate(str) {
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
    return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

const STATUS_COLOR = {
    'Scheduled':  '#dc2626',
    'In Progress': '#d97706',
    'Complete':    '#059669',
};

const PX = { Day: 40, Week: 18, Month: 7 };
const ROW_H = 38;
const HEADER_H = 32;

// Editable cell that saves on blur
function EditableCell({ value, onSave, type = 'text', style = {}, options }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value ?? '');
    const inputRef = useRef(null);

    useEffect(() => { setVal(value ?? ''); }, [value]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'number') inputRef.current.select();
        }
    }, [editing, type]);

    const commit = () => {
        setEditing(false);
        const newVal = type === 'number' ? parseFloat(val) || 0 : val;
        if (String(newVal) !== String(value ?? '')) {
            onSave(newVal);
        }
    };

    if (type === 'select') {
        return (
            <select
                value={val}
                onChange={(e) => { setVal(e.target.value); onSave(e.target.value); }}
                style={{
                    background: 'transparent', border: 'none', color: 'inherit',
                    fontSize: 'inherit', padding: '0 2px', width: '100%', cursor: 'pointer',
                    outline: 'none', ...style
                }}
            >
                {(options || []).map(o => <option key={o} value={o} style={{ background: '#1a0508', color: '#fff' }}>{o}</option>)}
            </select>
        );
    }

    if (!editing) {
        return (
            <div
                onDoubleClick={() => setEditing(true)}
                style={{ cursor: 'text', minHeight: '1em', width: '100%', ...style }}
                title="Double-click to edit"
            >
                {type === 'number' ? (val || 0) : (val || '—')}
            </div>
        );
    }

    return (
        <input
            ref={inputRef}
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); } }}
            style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(159,18,57,0.5)',
                color: 'var(--foreground)', fontSize: 'inherit', padding: '1px 4px',
                borderRadius: '3px', width: '100%', outline: 'none', ...style
            }}
        />
    );
}

// Grid column config — mirrors MS Project layout
const GRID_COLS = [
    { key: 'title', label: 'Task Name', width: 220, align: 'left' },
    { key: 'work', label: 'Work', width: 55, align: 'center' },
    { key: 'remaining', label: 'Remaining', width: 65, align: 'center' },
    { key: 'pct', label: '% Comp', width: 55, align: 'center' },
    { key: 'start', label: 'Start', width: 90, align: 'center' },
    { key: 'finish', label: 'Finish', width: 90, align: 'center' },
    { key: 'status', label: 'Status', width: 80, align: 'center' },
];
const GRID_W = GRID_COLS.reduce((sum, c) => sum + c.width, 0);

export default function JobGantt({ jobs = [], users = [], milestones = [], onJobSelect }) {
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const zoom = 'Week';
    const [expandedJobs, setExpandedJobs] = useState(new Set());
    const router = useRouter();
    const [dragState, setDragState] = useState(null);
    const [dividerX, setDividerX] = useState(GRID_W);
    const [draggingDivider, setDraggingDivider] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error('Error attempting to enable fullscreen:', err));
        } else {
            document.exitFullscreen().catch(err => console.error('Error attempting to disable fullscreen:', err));
        }
    };

    // Resizable divider drag
    useEffect(() => {
        if (!draggingDivider) return;
        const handleMove = (e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            setDividerX(Math.max(300, Math.min(x, rect.width - 200)));
        };
        const handleUp = () => setDraggingDivider(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    }, [draggingDivider]);

    const toggleExpand = (jobId) => {
        setExpandedJobs(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
    };

    const px = PX[zoom];

    // --- Inline Save Logic ---
    const saveJobField = async (jobId, field, value) => {
        await supabase.from('jobs').update({ [field]: value }).eq('id', jobId);
        router.refresh();
    };

    const saveSubTaskField = async (stId, field, value) => {
        await supabase.from('sub_tasks').update({ [field]: value }).eq('id', stId);
        router.refresh();
    };

    // --- Drag and Drop Logic ---
    const handleMouseDown = (e, item, type, itemType) => {
        e.preventDefault();
        e.stopPropagation();
        const initialStart = itemType === 'job' ? item.scheduled_date : item.start_date;
        const initialEnd = item.due_date || initialStart;
        setDragState({ id: item.id, type, startX: e.clientX, initialStart, initialEnd, itemType });
    };

    useEffect(() => {
        if (!dragState) return;
        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / px);
            const sDate = parseLocalDate(dragState.initialStart);
            const eDate = parseLocalDate(dragState.initialEnd);
            if (!sDate || !eDate) return;
            let newStart = sDate, newEnd = eDate;
            if (dragState.type === 'move') { newStart = addDays(sDate, deltaDays); newEnd = addDays(eDate, deltaDays); }
            else if (dragState.type === 'resize-left') { newStart = addDays(sDate, deltaDays); if (newStart > newEnd) newStart = newEnd; }
            else if (dragState.type === 'resize-right') { newEnd = addDays(eDate, deltaDays); if (newEnd < newStart) newEnd = newStart; }
            setDragState(prev => ({ ...prev, currentStart: toDateStr(newStart), currentEnd: toDateStr(newEnd) }));
        };
        const handleMouseUp = async (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / px);
            if (deltaDays !== 0) {
                const sDate = parseLocalDate(dragState.initialStart);
                const eDate = parseLocalDate(dragState.initialEnd);
                if (sDate && eDate) {
                    let newStart = sDate, newEnd = eDate;
                    if (dragState.type === 'move') { newStart = addDays(sDate, deltaDays); newEnd = addDays(eDate, deltaDays); }
                    else if (dragState.type === 'resize-left') { newStart = addDays(sDate, deltaDays); if (newStart > newEnd) newStart = newEnd; }
                    else if (dragState.type === 'resize-right') { newEnd = addDays(eDate, deltaDays); if (newEnd < newStart) newEnd = newStart; }
                    const startStr = toDateStr(newStart), endStr = toDateStr(newEnd);
                    if (dragState.itemType === 'job') await supabase.from('jobs').update({ scheduled_date: startStr, due_date: endStr }).eq('id', dragState.id);
                    else await supabase.from('sub_tasks').update({ start_date: startStr, due_date: endStr }).eq('id', dragState.id);
                    router.refresh();
                }
            }
            setDragState(null);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [dragState, px, router]);

    const handleDoubleClick = async (e, item, type) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedDate = addDays(rangeStart, Math.floor(clickX / px));
        const dateStr = toDateStr(clickedDate);
        const choice = window.prompt(`Add date to "${item.title}" on ${dateStr}?\n\nType '1' to set as Due Date\nType '2' to add as an Intermittent Scheduled Date`);
        if (choice === '1') {
            await supabase.from(type === 'job' ? 'jobs' : 'sub_tasks').update({ due_date: dateStr }).eq('id', item.id);
            router.refresh();
        } else if (choice === '2') {
            const currentDates = Array.isArray(item.additional_dates) ? [...item.additional_dates] : [];
            if (!currentDates.includes(dateStr)) {
                currentDates.push(dateStr);
                await supabase.from(type === 'job' ? 'jobs' : 'sub_tasks').update({ additional_dates: currentDates }).eq('id', item.id);
                router.refresh();
            }
        }
    };

    const filtered = jobs.filter(j => j.scheduled_date);

    // Compute timeline bounds
    const { rangeStart, totalDays } = useMemo(() => {
        const dates = [];
        filtered.forEach(j => {
            const s = parseLocalDate(j.scheduled_date);
            const e = parseLocalDate(j.due_date) || s;
            if (s) dates.push(s.getTime(), (e || s).getTime());
            if (Array.isArray(j.additional_dates)) j.additional_dates.forEach(d => { const pd = parseLocalDate(d); if (pd) dates.push(pd.getTime()); });
            if (Array.isArray(j.sub_tasks)) {
                j.sub_tasks.forEach(st => {
                    const sts = parseLocalDate(st.start_date); const ste = parseLocalDate(st.due_date) || sts;
                    if (sts) dates.push(sts.getTime(), (ste || sts).getTime());
                    if (Array.isArray(st.additional_dates)) st.additional_dates.forEach(d => { const pd = parseLocalDate(d); if (pd) dates.push(pd.getTime()); });
                });
            }
        });
        milestones.forEach(m => { const d = parseLocalDate(m.end_date || m.start_date); if (d) dates.push(d.getTime()); });
        if (dates.length === 0) { const today = new Date(); today.setHours(0,0,0,0); return { rangeStart: addDays(today, -7), totalDays: 60 }; }
        const minT = Math.min(...dates), maxT = Math.max(...dates);
        const start = addDays(new Date(minT), -5); start.setHours(0,0,0,0);
        const end = addDays(new Date(maxT), 5);
        const days = Math.max(diffDays(end, start) + 1, 30);
        return { rangeStart: start, totalDays: days };
    }, [filtered, milestones, zoom]);

    const timelineW = totalDays * px;

    const monthMarkers = useMemo(() => {
        const out = [];
        const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
        while (diffDays(cur, rangeStart) < totalDays) {
            const off = diffDays(cur, rangeStart);
            if (off >= 0) out.push({ left: off * px, label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
            cur.setMonth(cur.getMonth() + 1);
        }
        return out;
    }, [rangeStart, totalDays, px]);

    const todayLeft = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const off = diffDays(today, rangeStart);
        if (off < 0 || off > totalDays) return null;
        return off * px;
    }, [rangeStart, totalDays, px]);

    // Build flat rows list for rendering
    const rows = useMemo(() => {
        const out = [];
        // Milestones row
        if (milestones.length > 0) out.push({ type: 'milestones' });

        filtered.forEach((job, idx) => {
            const isExpanded = expandedJobs.has(job.id);
            const hasSubTasks = Array.isArray(job.sub_tasks) && job.sub_tasks.length > 0;
            out.push({ type: 'job', job, idx, isExpanded, hasSubTasks });
            if (isExpanded && hasSubTasks) {
                job.sub_tasks.forEach((st, stIdx) => {
                    out.push({ type: 'subtask', st, job, stIdx });
                });
            }
        });
        return out;
    }, [filtered, expandedJobs, milestones]);

    const totalH = HEADER_H + rows.length * ROW_H + 4;

    // --- Render helper for a grid row (the left pane editable spreadsheet) ---
    const renderGridRow = (row) => {
        if (row.type === 'milestones') {
            return (
                <div style={{ display: 'flex', height: `${ROW_H}px`, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(167,139,250,0.03)' }}>
                    <div style={{ width: GRID_COLS[0].width, flexShrink: 0, padding: '0 8px', fontWeight: 700, fontSize: '0.72rem', color: '#a78bfa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>◆ Milestones</div>
                    {GRID_COLS.slice(1).map(c => <div key={c.key} style={{ width: c.width, flexShrink: 0 }} />)}
                </div>
            );
        }

        if (row.type === 'job') {
            const { job, hasSubTasks, isExpanded, idx } = row;
            const bg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)';
            const estHrs = job.estimated_hours || 0;
            const actHrs = job.actual_hours || 0;
            const remaining = Math.max(0, estHrs - actHrs);
            const pct = job.status === 'Complete' ? 100 : (estHrs > 0 ? Math.round((actHrs / estHrs) * 100) : 0);

            return (
                <div style={{ display: 'flex', height: `${ROW_H}px`, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: bg, fontSize: '0.72rem' }}>
                    {/* Task Name */}
                    <div style={{ width: GRID_COLS[0].width, flexShrink: 0, padding: '0 4px 0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {hasSubTasks && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(job.id); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>
                                {isExpanded ? '−' : '+'}
                            </button>
                        )}
                        {onJobSelect ? (
                            <button onClick={(e) => { e.stopPropagation(); onJobSelect(job.id); }} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                            </button>
                        ) : (
                            <Link href={`/jobs/${job.id}`} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {job.job_number ? `${job.job_number} ` : ''}{job.title || 'Untitled'}
                            </Link>
                        )}
                    </div>
                    {/* Work (Est Hrs) */}
                    <div style={{ width: GRID_COLS[1].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={estHrs} type="number" onSave={(v) => saveJobField(job.id, 'estimated_hours', v)} />
                    </div>
                    {/* Remaining */}
                    <div style={{ width: GRID_COLS[2].width, flexShrink: 0, padding: '0 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {remaining}h
                    </div>
                    {/* % Complete */}
                    <div style={{ width: GRID_COLS[3].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', height: '14px', position: 'relative' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 100 ? '#059669' : pct > 0 ? '#d97706' : 'transparent', transition: 'width 0.3s' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{pct}%</span>
                        </div>
                    </div>
                    {/* Start */}
                    <div style={{ width: GRID_COLS[4].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={job.scheduled_date || ''} type="date" onSave={(v) => saveJobField(job.id, 'scheduled_date', v)} />
                    </div>
                    {/* Finish */}
                    <div style={{ width: GRID_COLS[5].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={job.due_date || ''} type="date" onSave={(v) => saveJobField(job.id, 'due_date', v)} />
                    </div>
                    {/* Status */}
                    <div style={{ width: GRID_COLS[6].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={job.status} type="select" options={['Scheduled', 'In Progress', 'Complete']} onSave={(v) => saveJobField(job.id, 'status', v)} style={{ fontSize: '0.68rem', color: STATUS_COLOR[job.status] || 'inherit', fontWeight: 700 }} />
                    </div>
                </div>
            );
        }

        if (row.type === 'subtask') {
            const { st, job } = row;
            const estHrs = st.estimated_hours || 0;
            const usedHrs = st.used_hours || 0;
            const remaining = Math.max(0, estHrs - usedHrs);
            const pct = st.status === 'Complete' ? 100 : (estHrs > 0 ? Math.round((usedHrs / estHrs) * 100) : 0);

            return (
                <div style={{ display: 'flex', height: `${ROW_H}px`, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)', background: 'rgba(0,0,0,0.2)', fontSize: '0.68rem' }}>
                    {/* Task Name indented */}
                    <div style={{ width: GRID_COLS[0].width, flexShrink: 0, padding: '0 4px 0 28px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.7)' }}>
                        ↳ {st.title || 'Untitled'}
                    </div>
                    {/* Work */}
                    <div style={{ width: GRID_COLS[1].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={estHrs} type="number" onSave={(v) => saveSubTaskField(st.id, 'estimated_hours', v)} />
                    </div>
                    {/* Remaining */}
                    <div style={{ width: GRID_COLS[2].width, flexShrink: 0, padding: '0 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {remaining}h
                    </div>
                    {/* % */}
                    <div style={{ width: GRID_COLS[3].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', height: '12px', position: 'relative' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 100 ? '#059669' : pct > 0 ? '#d97706' : 'transparent' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{pct}%</span>
                        </div>
                    </div>
                    {/* Start */}
                    <div style={{ width: GRID_COLS[4].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={st.start_date || ''} type="date" onSave={(v) => saveSubTaskField(st.id, 'start_date', v)} />
                    </div>
                    {/* Finish */}
                    <div style={{ width: GRID_COLS[5].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={st.due_date || ''} type="date" onSave={(v) => saveSubTaskField(st.id, 'due_date', v)} />
                    </div>
                    {/* Status */}
                    <div style={{ width: GRID_COLS[6].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={st.status} type="select" options={['Scheduled', 'In Progress', 'Complete']} onSave={(v) => saveSubTaskField(st.id, 'status', v)} style={{ fontSize: '0.65rem', color: STATUS_COLOR[st.status] || 'inherit', fontWeight: 700 }} />
                    </div>
                </div>
            );
        }
        return null;
    };

    // --- Render helper for a timeline row (the right pane Gantt bars) ---
    const renderTimelineRow = (row) => {
        if (row.type === 'milestones') {
            return (
                <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px` }}>
                    {milestones.map(m => {
                        const d = parseLocalDate(m.end_date || m.start_date);
                        if (!d) return null;
                        const left = diffDays(d, rangeStart) * px;
                        const achieved = m.status === 'Achieved';
                        const overdue = !achieved && toDateStr(d) < toDateStr(new Date());
                        const color = achieved ? '#10b981' : overdue ? '#ef4444' : '#a78bfa';
                        return <div key={m.id} title={`${m.title} — ${toDateStr(d)} (${m.status})`} style={{ position: 'absolute', left: `${left - 7}px`, top: '12px', width: '14px', height: '14px', background: color, transform: 'rotate(45deg)', borderRadius: '2px', cursor: 'default' }} />;
                    })}
                </div>
            );
        }

        if (row.type === 'job') {
            const { job, idx } = row;
            const isDraggedJob = dragState && dragState.id === job.id && dragState.itemType === 'job';
            const s = isDraggedJob && dragState.currentStart ? parseLocalDate(dragState.currentStart) : parseLocalDate(job.scheduled_date);
            const e = isDraggedJob && dragState.currentEnd ? parseLocalDate(dragState.currentEnd) : (parseLocalDate(job.due_date) || s);
            if (!s) return <div style={{ width: `${timelineW}px`, height: `${ROW_H}px` }} />;
            const eAdj = e < s ? s : e;
            const left = diffDays(s, rangeStart) * px;
            const width = Math.max((diffDays(eAdj, s) + 1) * px, px);
            const color = STATUS_COLOR[job.status] || '#9f1239';
            const progress = job.status === 'Complete' ? 100 : job.status === 'In Progress' ? 50 : 0;

            return (
                <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px` }} onDoubleClick={(e) => handleDoubleClick(e, job, 'job')}>
                    <div title={`${job.title} | ${job.status} | ${toDateStr(s)} → ${toDateStr(eAdj)}`}
                        onMouseDown={(e) => handleMouseDown(e, job, 'move', 'job')}
                        style={{
                            position: 'absolute', left: `${left}px`, top: '13px', width: `${width}px`, height: '12px',
                            background: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${color}`, borderRight: `3px solid ${color}`,
                            borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '2px', overflow: 'hidden', cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            opacity: isDraggedJob ? 0.7 : 1
                        }}>
                        <div onMouseDown={(e) => handleMouseDown(e, job, 'resize-left', 'job')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10 }} />
                        <div onMouseDown={(e) => handleMouseDown(e, job, 'resize-right', 'job')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10 }} />
                        {progress > 0 && <div style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: color, opacity: 0.6, pointerEvents: 'none' }} />}
                    </div>
                    <span style={{ position: 'absolute', left: `${left + width + 8}px`, top: '12px', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                        {job.title}
                    </span>
                    {job.due_date && (
                        <div title={`Due: ${job.due_date}`} style={{ position: 'absolute', left: `${diffDays(parseLocalDate(job.due_date), rangeStart) * px + (px/2) - 7}px`, top: '12px', width: '14px', height: '14px', border: '2px solid #ef4444', transform: 'rotate(45deg)', borderRadius: '2px', zIndex: 3, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: '1px', background: '#ef4444', borderRadius: '1px' }} />
                        </div>
                    )}
                    {Array.isArray(job.additional_dates) && job.additional_dates.map(dStr => {
                        const d = parseLocalDate(dStr); if (!d) return null;
                        const dLeft = diffDays(d, rangeStart) * px;
                        return <div key={dStr} title={`Scheduled: ${dStr}`} style={{ position: 'absolute', left: `${dLeft + (px/2) - 6}px`, top: '13px', width: '12px', height: '12px', background: '#a78bfa', transform: 'rotate(45deg)', borderRadius: '2px', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)', zIndex: 2 }} />;
                    })}
                </div>
            );
        }

        if (row.type === 'subtask') {
            const { st, job } = row;
            const isDraggedSt = dragState && dragState.id === st.id && dragState.itemType === 'subtask';
            const sts = isDraggedSt && dragState.currentStart ? parseLocalDate(dragState.currentStart) : parseLocalDate(st.start_date);
            const ste = isDraggedSt && dragState.currentEnd ? parseLocalDate(dragState.currentEnd) : (parseLocalDate(st.due_date) || sts);
            if (!sts && (!st.additional_dates || st.additional_dates.length === 0)) return <div style={{ width: `${timelineW}px`, height: `${ROW_H}px` }} />;
            const steAdj = sts && ste < sts ? sts : ste;
            const stLeft = sts ? diffDays(sts, rangeStart) * px : 0;
            const stWidth = sts ? Math.max((diffDays(steAdj, sts) + 1) * px, px) : 0;
            const stColor = STATUS_COLOR[st.status] || '#6b7280';
            const stProgress = st.status === 'Complete' ? 100 : st.status === 'In Progress' ? 50 : 0;

            return (
                <div style={{ position: 'relative', width: `${timelineW}px`, height: `${ROW_H}px` }} onDoubleClick={(e) => handleDoubleClick(e, st, 'subtask')}>
                    {sts && (
                        <div title={`${st.title} | ${st.status} | ${toDateStr(sts)} → ${toDateStr(steAdj)}`}
                            onMouseDown={(e) => handleMouseDown(e, st, 'move', 'subtask')}
                            style={{
                                position: 'absolute', left: `${stLeft}px`, top: '14px', width: `${stWidth}px`, height: '10px',
                                background: 'rgba(255,255,255,0.05)', borderLeft: `2px solid ${stColor}`, borderRight: `2px solid ${stColor}`,
                                borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '2px', overflow: 'hidden', cursor: 'grab', opacity: isDraggedSt ? 0.7 : 1
                            }}>
                            <div onMouseDown={(e) => handleMouseDown(e, st, 'resize-left', 'subtask')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10 }} />
                            <div onMouseDown={(e) => handleMouseDown(e, st, 'resize-right', 'subtask')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10 }} />
                            {stProgress > 0 && <div style={{ position: 'absolute', inset: 0, width: `${stProgress}%`, background: stColor, opacity: 0.6, pointerEvents: 'none' }} />}
                        </div>
                    )}
                    {st.due_date && (
                        <div title={`Due: ${st.due_date}`} style={{ position: 'absolute', left: `${diffDays(parseLocalDate(st.due_date), rangeStart) * px + (px/2) - 5}px`, top: '13px', width: '10px', height: '10px', border: '1px solid #ef4444', transform: 'rotate(45deg)', borderRadius: '1px', zIndex: 3, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: '1px', background: '#ef4444', borderRadius: '1px' }} />
                        </div>
                    )}
                    {Array.isArray(st.additional_dates) && st.additional_dates.map(dStr => {
                        const d = parseLocalDate(dStr); if (!d) return null;
                        const dLeft = diffDays(d, rangeStart) * px;
                        return <div key={`st-d-${dStr}`} title={`Scheduled: ${dStr}`} style={{ position: 'absolute', left: `${dLeft + (px/2) - 5}px`, top: '13px', width: '10px', height: '10px', background: '#d8b4fe', transform: 'rotate(45deg)', borderRadius: '1px', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)', zIndex: 2 }} />;
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div ref={containerRef} style={{ background: isFullscreen ? 'var(--background)' : 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--card-border)', overflow: 'hidden', height: isFullscreen ? '100vh' : undefined, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📊 Gantt Timeline</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {milestones.length > 0 ? ` · ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}` : ''}
                    <span style={{ marginLeft: '0.5rem', color: '#a78bfa', fontWeight: 600 }}>✏️ Double-click cells to edit</span>
                </span>
                <button onClick={toggleFullscreen} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '0.25rem 0.6rem', color: 'var(--foreground)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {isFullscreen ? '⤓ Exit Fullscreen' : '⤢ Fullscreen'}
                </button>
            </div>

            {filtered.length === 0 && milestones.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No scheduled jobs to display. Add scheduled dates to jobs to see them here.
                </div>
            ) : (
                <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                    {/* Split pane: LEFT = data grid, RIGHT = timeline */}
                    <div style={{ display: 'flex', minWidth: `${dividerX + timelineW + 4}px`, position: 'relative' }}>
                        {/* LEFT: Editable Data Grid */}
                        <div style={{ width: `${dividerX}px`, flexShrink: 0, position: 'sticky', left: 0, zIndex: 5, background: '#1a0508' }}>
                            {/* Grid header */}
                            <div style={{ display: 'flex', height: `${HEADER_H}px`, borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#161b22', position: 'sticky', top: 0, zIndex: 6 }}>
                                {GRID_COLS.map(col => (
                                    <div key={col.key} style={{
                                        width: col.width, flexShrink: 0, display: 'flex', alignItems: 'center',
                                        justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                                        padding: '0 6px', fontSize: '0.6rem', fontWeight: 700,
                                        color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em',
                                        borderRight: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {col.label}
                                    </div>
                                ))}
                            </div>
                            {/* Grid rows */}
                            {rows.map((row, i) => (
                                <div key={i}>
                                    {renderGridRow(row)}
                                </div>
                            ))}
                        </div>

                        {/* Divider handle */}
                        <div
                            onMouseDown={() => setDraggingDivider(true)}
                            style={{
                                width: '4px', flexShrink: 0, cursor: 'col-resize',
                                background: draggingDivider ? 'rgba(159,18,57,0.6)' : 'rgba(255,255,255,0.08)',
                                transition: draggingDivider ? 'none' : 'background 0.2s',
                                position: 'sticky', left: `${dividerX}px`, zIndex: 6
                            }}
                            title="Drag to resize"
                        />

                        {/* RIGHT: Timeline */}
                        <div style={{ flexShrink: 0 }}>
                            {/* Timeline header */}
                            <div style={{ position: 'sticky', top: 0, zIndex: 4, height: `${HEADER_H}px`, background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', width: `${timelineW}px` }}>
                                {monthMarkers.map((m, i) => (
                                    <div key={i} style={{ position: 'absolute', left: `${m.left}px`, top: 0, height: '100%', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '4px', paddingTop: '8px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                                        {m.label}
                                    </div>
                                ))}
                                {todayLeft !== null && <div style={{ position: 'absolute', left: `${todayLeft}px`, top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.8)', pointerEvents: 'none' }} />}
                            </div>

                            {/* Timeline rows */}
                            <div style={{ position: 'relative' }}>
                                {todayLeft !== null && <div style={{ position: 'absolute', left: `${todayLeft}px`, top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.35)', zIndex: 2, pointerEvents: 'none' }} />}
                                {rows.map((row, i) => (
                                    <div key={i} style={{ height: `${ROW_H}px`, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {renderTimelineRow(row)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.25rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--card-border)', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
                {[['#dc2626','Scheduled'],['#d97706','In Progress'],['#059669','Complete'],['#a78bfa','Milestone ◆']].map(([color,label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: color }} />
                        {label}
                    </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Drag divider to resize · Double-click cells to edit</span>
            </div>
        </div>
    );
}
