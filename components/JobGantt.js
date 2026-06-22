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

const PX = { Day: 50, Week: 24, Month: 10 };
const ROW_H = 38;
const HEADER_H = 32;

// Editable cell that saves on blur
function EditableCell({ value, onSave, type = 'text', style = {}, options, renderDisplay }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value ?? '');
    const inputRef = useRef(null);

    useEffect(() => { setVal(value ?? ''); }, [value]);

    useEffect(() => {
        if (editing && inputRef.current && (type === 'text' || type === 'number' || type === 'date')) {
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
                {(options || []).map(o => {
                    const optVal = typeof o === 'object' ? o.value : o;
                    const optLabel = typeof o === 'object' ? o.label : o;
                    return (
                        <option key={optVal} value={optVal} style={{ background: '#1a0508', color: '#fff' }}>
                            {optLabel}
                        </option>
                    );
                })}
            </select>
        );
    }

    if (type === 'users') {
        const currentIds = Array.isArray(val) ? val : (typeof val === 'string' && val ? val.split(',') : []);
        
        return (
            <div style={{ position: 'relative', width: '100%' }}>
                <div
                    onDoubleClick={() => setEditing(true)}
                    style={{ cursor: 'pointer', minHeight: '1.2em', width: '100%', ...style }}
                    title="Double-click to change assignments"
                >
                    {renderDisplay ? renderDisplay(currentIds) : (currentIds.length === 0 ? '—' : currentIds.map(id => {
                        const u = (options || []).find(o => String(o.id) === String(id));
                        return u ? u.username : '';
                    }).filter(Boolean).join(', '))}
                </div>
                {editing && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setEditing(false)} />
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, zIndex: 100,
                            background: '#1a0508', border: '1px solid rgba(159,18,57,0.5)',
                            borderRadius: '4px', padding: '6px', width: '160px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px',
                            maxHeight: '180px', overflowY: 'auto'
                        }}>
                            {(options || []).map(u => {
                                const isAssigned = currentIds.some(id => String(id) === String(u.id));
                                return (
                                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#fff', padding: '2px 4px', borderRadius: '3px', background: isAssigned ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                        <input
                                            type="checkbox"
                                            checked={isAssigned}
                                            onChange={(e) => {
                                                let nextIds;
                                                if (e.target.checked) {
                                                    nextIds = [...currentIds, u.id];
                                                } else {
                                                    nextIds = currentIds.filter(id => String(id) !== String(u.id));
                                                }
                                                setVal(nextIds);
                                                onSave(nextIds);
                                            }}
                                        />
                                        {u.username}
                                    </label>
                                );
                            })}
                            <button
                                onClick={() => setEditing(false)}
                                style={{
                                    marginTop: '4px', background: '#9f1239', color: '#fff', border: 'none',
                                    borderRadius: '3px', padding: '3px', fontSize: '0.65rem', cursor: 'pointer',
                                    fontWeight: 700
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (!editing) {
        return (
            <div
                onDoubleClick={() => setEditing(true)}
                style={{ cursor: 'text', minHeight: '1em', width: '100%', ...style }}
                title="Double-click to edit"
            >
                {renderDisplay ? renderDisplay(val) : (type === 'number' ? (val || 0) : (val || '—'))}
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
const DEFAULT_COLS = [
    { key: 'title', label: 'Task Name', width: 220, minWidth: 100, align: 'left' },
    { key: 'customer', label: 'Customer', width: 130, minWidth: 60, align: 'left' },
    { key: 'assigned', label: 'Assigned To', width: 150, minWidth: 60, align: 'left' },
    { key: 'work', label: 'Work', width: 55, minWidth: 35, align: 'center' },
    { key: 'remaining', label: 'Remaining', width: 80, minWidth: 40, align: 'center' },
    { key: 'pct', label: '% Comp', width: 65, minWidth: 40, align: 'center' },
    { key: 'start', label: 'Start', width: 90, minWidth: 50, align: 'center' },
    { key: 'finish', label: 'Finish', width: 90, minWidth: 50, align: 'center' },
    { key: 'status', label: 'Status', width: 80, minWidth: 50, align: 'center' },
];
const DEFAULT_GRID_W = DEFAULT_COLS.reduce((sum, c) => sum + c.width, 0);

export default function JobGantt({ jobs = [], users = [], customers = [], milestones = [], onJobSelect }) {
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState('Week');
    const [expandedJobs, setExpandedJobs] = useState(new Set());
    const router = useRouter();
    const [dragState, setDragState] = useState(null);
    const [colWidths, setColWidths] = useState(DEFAULT_COLS.map(c => c.width));
    const [colResizing, setColResizing] = useState(null); // { colIndex, startX, startWidth }
    const [sortCol, setSortCol] = useState('start'); // column key to sort by
    const [sortDir, setSortDir] = useState('asc'); // 'asc' or 'desc'
    const GRID_COLS = DEFAULT_COLS.map((c, i) => ({ ...c, width: colWidths[i] }));
    const currentGridW = colWidths.reduce((sum, w) => sum + w, 0);
    const [dividerX, setDividerX] = useState(DEFAULT_GRID_W);
    const [draggingDivider, setDraggingDivider] = useState(false);

    // Dynamic width tracking
    const [containerWidth, setContainerWidth] = useState(1200);

    const filtered = useMemo(() => jobs.filter(j => j.scheduled_date), [jobs]);

    const sortedFiltered = useMemo(() => {
        if (!sortCol) return filtered;
        const sorted = [...filtered].sort((a, b) => {
            let valA, valB;
            switch (sortCol) {
                case 'title':
                    valA = (a.title || '').toLowerCase();
                    valB = (b.title || '').toLowerCase();
                    break;
                case 'customer':
                    valA = (a.customer?.name || '').toLowerCase();
                    valB = (b.customer?.name || '').toLowerCase();
                    break;
                case 'work':
                    valA = a.estimated_hours || 0;
                    valB = b.estimated_hours || 0;
                    break;
                case 'remaining':
                    valA = Math.max(0, (a.estimated_hours || 0) - (a.actual_hours || 0));
                    valB = Math.max(0, (b.estimated_hours || 0) - (b.actual_hours || 0));
                    break;
                case 'pct': {
                    const estA = a.estimated_hours || 0, actA = a.actual_hours || 0;
                    const estB = b.estimated_hours || 0, actB = b.actual_hours || 0;
                    valA = a.status === 'Complete' ? 100 : (estA > 0 ? (actA / estA) * 100 : 0);
                    valB = b.status === 'Complete' ? 100 : (estB > 0 ? (actB / estB) * 100 : 0);
                    break;
                }
                case 'start':
                    valA = a.scheduled_date || '';
                    valB = b.scheduled_date || '';
                    break;
                case 'finish':
                    valA = a.due_date || '';
                    valB = b.due_date || '';
                    break;
                case 'status':
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                    break;
                case 'assigned': {
                    const getAssigned = (j) => (j.assignments || []).map(a => a.user?.username || '').join(', ').toLowerCase();
                    valA = getAssigned(a);
                    valB = getAssigned(b);
                    break;
                }
                default:
                    return 0;
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filtered, sortCol, sortDir]);

    // Compute timeline bounds
    const { rangeStart, totalDays } = useMemo(() => {
        const dates = [];
        sortedFiltered.forEach(j => {
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
    }, [sortedFiltered, milestones, zoom]);

    const basePx = PX[zoom];
    const visibleTimelineW = Math.max(0, containerWidth - dividerX - 24);
    const px = useMemo(() => {
        const defaultW = totalDays * basePx;
        if (defaultW < visibleTimelineW) {
            return visibleTimelineW / totalDays;
        }
        return basePx;
    }, [zoom, totalDays, visibleTimelineW, basePx]);

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

        sortedFiltered.forEach((job, idx) => {
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
    }, [sortedFiltered, expandedJobs, milestones]);

    const totalH = HEADER_H + rows.length * ROW_H + 4;


    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Creation modal states
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);
    const [showSubtaskModal, setShowSubtaskModal] = useState(false);

    // New items temporary state
    const [newMilestone, setNewMilestone] = useState({ title: '', description: '', startDate: '', endDate: '', status: 'Planned', priority: 'Normal', jobId: '' });
    const [newJob, setNewJob] = useState({ title: '', jobNumber: '', customerId: '', scheduledDate: '', dueDate: '', estimatedHours: 0, priority: 'Normal', assignedUserIds: [] });
    const [newSubtask, setNewSubtask] = useState({ jobId: '', title: '', startDate: '', dueDate: '', estimatedHours: 0, priority: 'Normal', assignedUserIds: [] });

    const handleAddMilestone = async (e) => {
        e.preventDefault();
        const { title, description, startDate, endDate, status, priority, jobId } = newMilestone;
        if (!title || !startDate || !endDate) return alert("Title, Start Date, and End Date are required.");
        
        const { error } = await supabase.from('roadmap_milestones').insert([{
            title,
            description,
            start_date: startDate,
            end_date: endDate,
            status,
            priority,
            job_id: jobId ? parseInt(jobId, 10) : null
        }]);
        if (error) return alert("Failed to add milestone: " + error.message);
        
        setShowMilestoneModal(false);
        setNewMilestone({ title: '', description: '', startDate: '', endDate: '', status: 'Planned', priority: 'Normal', jobId: '' });
        router.refresh();
    };

    const handleAddJob = async (e) => {
        e.preventDefault();
        const { title, jobNumber, customerId, scheduledDate, dueDate, estimatedHours, priority, assignedUserIds } = newJob;
        if (!title || !customerId || !scheduledDate || !dueDate || assignedUserIds.length === 0) {
            return alert("Missing required fields. Please ensure Title, Customer, Team, Schedule, and Due Date are set.");
        }
        
        const jobToInsert = {
            title,
            job_number: jobNumber || null,
            customer_id: customerId,
            scheduled_date: scheduledDate,
            due_date: dueDate,
            estimated_hours: estimatedHours || 0,
            status: 'Scheduled',
            priority
        };
        
        let { data, error } = await supabase.from('jobs').insert([jobToInsert]).select().single();
        if (error && error.message.includes('jobs_pkey')) {
            const { data: lastItem } = await supabase.from('jobs').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            jobToInsert.id = nextId;
            const retry = await supabase.from('jobs').insert([jobToInsert]).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) return alert("Failed to add job: " + error.message);
        
        const newJobId = data.id;
        
        // Phases
        const defaultPhases = [
            { job_id: newJobId, phase_name: 'Opportunity', status: 'Not Started', sequence_order: 1 },
            { job_id: newJobId, phase_name: 'Estimating', status: 'Not Started', sequence_order: 2 },
            { job_id: newJobId, phase_name: 'Planning', status: 'Not Started', sequence_order: 3 },
            { job_id: newJobId, phase_name: 'Procurement', status: 'Not Started', sequence_order: 4 },
            { job_id: newJobId, phase_name: 'Installation', status: 'Not Started', sequence_order: 5 },
            { job_id: newJobId, phase_name: 'Finish', status: 'Not Started', sequence_order: 6 },
            { job_id: newJobId, phase_name: 'Customer Follow UP / Turnover', status: 'Not Started', sequence_order: 7 }
        ];
        await supabase.from('job_phases').insert(defaultPhases);
        
        // Assignments
        if (assignedUserIds.length > 0) {
            await supabase.from('job_assignments').insert(
                assignedUserIds.map(uid => ({ job_id: newJobId, user_id: uid }))
            );
        }
        
        setShowJobModal(false);
        setNewJob({ title: '', jobNumber: '', customerId: '', scheduledDate: '', dueDate: '', estimatedHours: 0, priority: 'Normal', assignedUserIds: [] });
        router.refresh();
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        const { jobId, title, startDate, dueDate, estimatedHours, priority, assignedUserIds } = newSubtask;
        if (!jobId || !title) return alert("Parent Job and Title are required.");
        
        const taskToInsert = {
            job_id: parseInt(jobId, 10),
            title,
            start_date: startDate || null,
            due_date: dueDate || null,
            estimated_hours: estimatedHours || 0,
            status: 'Scheduled',
            priority
        };
        
        let { data, error } = await supabase.from('sub_tasks').insert([taskToInsert]).select().single();
        if (error && error.message.includes('sub_tasks_pkey')) {
            const { data: lastItem } = await supabase.from('sub_tasks').select('id').order('id', { ascending: false }).limit(1);
            const nextId = (lastItem && lastItem[0]?.id ? lastItem[0].id : 0) + 1;
            taskToInsert.id = nextId;
            const retry = await supabase.from('sub_tasks').insert([taskToInsert]).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) return alert("Failed to add subtask: " + error.message);
        
        const newStId = data.id;
        
        // Assignments
        if (assignedUserIds.length > 0) {
            await supabase.from('sub_task_assignments').insert(
                assignedUserIds.map(uid => ({ sub_task_id: newStId, user_id: uid }))
            );
        }
        
        setShowSubtaskModal(false);
        setNewSubtask({ jobId: '', title: '', startDate: '', dueDate: '', estimatedHours: 0, priority: 'Normal', assignedUserIds: [] });
        router.refresh();
    };

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

    // Column resize drag
    useEffect(() => {
        if (!colResizing) return;
        const handleMove = (e) => {
            const delta = e.clientX - colResizing.startX;
            const newWidth = Math.max(DEFAULT_COLS[colResizing.colIndex].minWidth, colResizing.startWidth + delta);
            setColWidths(prev => {
                const next = [...prev];
                next[colResizing.colIndex] = newWidth;
                return next;
            });
        };
        const handleUp = () => {
            // Update divider position to match new total grid width
            setDividerX(colWidths.reduce((sum, w) => sum + w, 0));
            setColResizing(null);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    }, [colResizing, colWidths]);

    // Keep divider in sync with column widths
    useEffect(() => {
        setDividerX(colWidths.reduce((sum, w) => sum + w, 0));
    }, [colWidths]);

    // Resizable divider drag (between grid and timeline)
    useEffect(() => {
        if (!draggingDivider) return;
        const handleMove = (e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            setDividerX(Math.max(200, Math.min(x, rect.width - 200)));
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

    // --- Inline Save Logic ---
    const saveJobField = async (jobId, field, value) => {
        await supabase.from('jobs').update({ [field]: value }).eq('id', jobId);
        router.refresh();
    };

    const saveSubTaskField = async (stId, field, value) => {
        await supabase.from('sub_tasks').update({ [field]: value }).eq('id', stId);
        router.refresh();
    };

    const saveJobAssignments = async (jobId, newUserIds) => {
        await supabase.from('job_assignments').delete().eq('job_id', jobId);
        if (newUserIds.length > 0) {
            await supabase.from('job_assignments').insert(
                newUserIds.map(uid => ({ job_id: jobId, user_id: uid }))
            );
        }
        router.refresh();
    };

    const saveSubTaskAssignments = async (stId, newUserIds) => {
        await supabase.from('sub_task_assignments').delete().eq('sub_task_id', stId);
        if (newUserIds.length > 0) {
            await supabase.from('sub_task_assignments').insert(
                newUserIds.map(uid => ({ sub_task_id: stId, user_id: uid }))
            );
        }
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <EditableCell
                                value={job.title || ''}
                                onSave={(v) => saveJobField(job.id, 'title', v)}
                                renderDisplay={(val) => (
                                    onJobSelect ? (
                                        <button onClick={(e) => { e.stopPropagation(); onJobSelect(job.id); }} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
                                            {job.job_number ? `${job.job_number} ` : ''}{val || 'Untitled'}
                                        </button>
                                    ) : (
                                        <Link href={`/jobs/${job.id}`} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                                            {job.job_number ? `${job.job_number} ` : ''}{val || 'Untitled'}
                                        </Link>
                                    )
                                )}
                            />
                        </div>
                    </div>
                    {/* Customer */}
                    <div style={{ width: GRID_COLS[1].width, flexShrink: 0, padding: '0 4px', overflow: 'visible', fontSize: '0.68rem' }}>
                        <EditableCell
                            value={job.customer_id || ''}
                            type="select"
                            options={[
                                { value: '', label: '—' },
                                ...customers.map(c => ({ value: c.id, label: c.name }))
                            ]}
                            onSave={(v) => saveJobField(job.id, 'customer_id', v === '' ? null : v)}
                            style={{ fontSize: '0.68rem', color: '#60a5fa' }}
                        />
                    </div>
                    {/* Assigned To */}
                    <div style={{ width: GRID_COLS[2].width, flexShrink: 0, padding: '0 4px', overflow: 'visible', fontSize: '0.66rem' }}>
                        <EditableCell
                            value={(job.assignments || []).map(a => a.user_id)}
                            type="users"
                            options={users}
                            onSave={(v) => saveJobAssignments(job.id, v)}
                            style={{ fontSize: '0.66rem', color: '#fbbf24' }}
                            renderDisplay={(assignedIds) => {
                                const names = (job.assignments || []).map(a => a.user?.username).filter(Boolean).join(', ');
                                return (
                                    <div title={names} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {names || '—'}
                                    </div>
                                );
                            }}
                        />
                    </div>
                    {/* Work (Est Hrs) */}
                    <div style={{ width: GRID_COLS[3].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={estHrs} type="number" onSave={(v) => saveJobField(job.id, 'estimated_hours', v)} />
                    </div>
                    {/* Remaining */}
                    <div style={{ width: GRID_COLS[4].width, flexShrink: 0, padding: '0 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {remaining}h
                    </div>
                    {/* % Complete */}
                    <div style={{ width: GRID_COLS[5].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', height: '14px', position: 'relative' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 100 ? '#059669' : pct > 0 ? '#d97706' : 'transparent', transition: 'width 0.3s' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{pct}%</span>
                        </div>
                    </div>
                    {/* Start */}
                    <div style={{ width: GRID_COLS[6].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={job.scheduled_date || ''} type="date" onSave={(v) => saveJobField(job.id, 'scheduled_date', v)} />
                    </div>
                    {/* Finish */}
                    <div style={{ width: GRID_COLS[7].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={job.due_date || ''} type="date" onSave={(v) => saveJobField(job.id, 'due_date', v)} />
                    </div>
                    {/* Status */}
                    <div style={{ width: GRID_COLS[8].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
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
                    <div style={{ width: GRID_COLS[0].width, flexShrink: 0, padding: '0 4px 0 28px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <EditableCell
                                value={st.title || ''}
                                onSave={(v) => saveSubTaskField(st.id, 'title', v)}
                                renderDisplay={(val) => (
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                                        ↳ {val || 'Untitled'}
                                    </span>
                                )}
                            />
                        </div>
                    </div>
                    {/* Customer (inherit from parent job) */}
                    <div style={{ width: GRID_COLS[1].width, flexShrink: 0, padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.62rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    </div>
                    {/* Assigned To (subtask level) */}
                    <div style={{ width: GRID_COLS[2].width, flexShrink: 0, padding: '0 4px', overflow: 'visible', fontSize: '0.62rem' }}>
                        <EditableCell
                            value={(st.assignments || []).map(a => a.user_id)}
                            type="users"
                            options={users}
                            onSave={(v) => saveSubTaskAssignments(st.id, v)}
                            style={{ fontSize: '0.62rem', color: '#fbbf24' }}
                            renderDisplay={(assignedIds) => {
                                const names = (st.assignments || []).map(a => a.user?.username).filter(Boolean).join(', ');
                                return (
                                    <div title={names} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {names || '—'}
                                    </div>
                                );
                            }}
                        />
                    </div>
                    {/* Work */}
                    <div style={{ width: GRID_COLS[3].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={estHrs} type="number" onSave={(v) => saveSubTaskField(st.id, 'estimated_hours', v)} />
                    </div>
                    {/* Remaining */}
                    <div style={{ width: GRID_COLS[4].width, flexShrink: 0, padding: '0 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {remaining}h
                    </div>
                    {/* % */}
                    <div style={{ width: GRID_COLS[5].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', height: '12px', position: 'relative' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 100 ? '#059669' : pct > 0 ? '#d97706' : 'transparent' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{pct}%</span>
                        </div>
                    </div>
                    {/* Start */}
                    <div style={{ width: GRID_COLS[6].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={st.start_date || ''} type="date" onSave={(v) => saveSubTaskField(st.id, 'start_date', v)} />
                    </div>
                    {/* Finish */}
                    <div style={{ width: GRID_COLS[7].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
                        <EditableCell value={st.due_date || ''} type="date" onSave={(v) => saveSubTaskField(st.id, 'due_date', v)} />
                    </div>
                    {/* Status */}
                    <div style={{ width: GRID_COLS[8].width, flexShrink: 0, padding: '0 4px', textAlign: 'center' }}>
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
        <div ref={containerRef} style={{ background: isFullscreen ? 'var(--background)' : 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--card-border)', overflow: 'hidden', height: isFullscreen ? '100vh' : 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📊 Gantt Timeline</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {milestones.length > 0 ? ` · ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}` : ''}
                    <span style={{ marginLeft: '0.5rem', color: '#a78bfa', fontWeight: 600 }}>✏️ Double-click cells to edit</span>
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1rem' }}>
                    <button type="button" onClick={() => setShowMilestoneModal(true)} style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.4)', borderRadius: '4px', padding: '0.25rem 0.6rem', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ◆ + Milestone
                    </button>
                    <button type="button" onClick={() => setShowJobModal(true)} style={{ background: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(5, 150, 105, 0.4)', borderRadius: '4px', padding: '0.25rem 0.6rem', color: '#34d399', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📋 + Task
                    </button>
                    <button type="button" onClick={() => setShowSubtaskModal(true)} style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '4px', padding: '0.25rem 0.6rem', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ↳ + Sub Task
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Sort:</span>
                    <select
                        value={sortCol || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                setSortCol(val);
                                setSortDir('asc');
                            } else {
                                setSortCol(null);
                            }
                        }}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--foreground)',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="" style={{ background: '#1a0508' }}>Default (Start)</option>
                        <option value="title" style={{ background: '#1a0508' }}>Task Name</option>
                        <option value="customer" style={{ background: '#1a0508' }}>Customer</option>
                        <option value="assigned" style={{ background: '#1a0508' }}>Assigned To</option>
                        <option value="status" style={{ background: '#1a0508' }}>Status</option>
                        <option value="work" style={{ background: '#1a0508' }}>Work</option>
                        <option value="remaining" style={{ background: '#1a0508' }}>Remaining</option>
                        <option value="pct" style={{ background: '#1a0508' }}>% Comp</option>
                    </select>
                    {sortCol && (
                        <button
                            type="button"
                            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                            style={{
                                background: 'rgba(255,255,255,0.08)', border: 'none',
                                borderRadius: '4px', padding: '0.1rem 0.3rem', color: '#fff',
                                fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            {sortDir === 'asc' ? '▲' : '▼'}
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', border: '1px solid var(--card-border)' }}>
                    {['Day', 'Week', 'Month'].map(z => (
                        <button
                            key={z}
                            type="button"
                            onClick={() => setZoom(z)}
                            style={{
                                background: zoom === z ? '#9f1239' : 'transparent',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {z}
                        </button>
                    ))}
                </div>
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
                                {GRID_COLS.map((col, colIdx) => (
                                    <div key={col.key} style={{
                                        width: col.width, flexShrink: 0, display: 'flex', alignItems: 'center',
                                        justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                                        padding: '0 6px', fontSize: '0.6rem', fontWeight: 700,
                                        color: sortCol === col.key ? '#fff' : 'rgba(255,255,255,0.4)',
                                        textTransform: 'uppercase', letterSpacing: '0.04em',
                                        position: 'relative', userSelect: 'none', cursor: 'pointer',
                                        background: sortCol === col.key ? 'rgba(159,18,57,0.15)' : 'transparent',
                                        transition: 'background 0.15s'
                                    }}
                                    onClick={() => handleSort(col.key)}
                                    title={`Sort by ${col.label}`}
                                    >
                                        {col.label}
                                        <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: sortCol === col.key ? '#f43f5e' : 'rgba(255,255,255,0.18)' }}>
                                            {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                                        </span>
                                        {/* Column resize handle */}
                                        <div
                                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setColResizing({ colIndex: colIdx, startX: e.clientX, startWidth: col.width }); }}
                                            style={{
                                                position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px',
                                                cursor: 'col-resize', background: colResizing?.colIndex === colIdx ? 'rgba(159,18,57,0.6)' : 'rgba(255,255,255,0.08)',
                                                transition: colResizing ? 'none' : 'background 0.15s',
                                                zIndex: 2
                                            }}
                                            onMouseEnter={(e) => { if (!colResizing) e.currentTarget.style.background = 'rgba(159,18,57,0.4)'; }}
                                            onMouseLeave={(e) => { if (!colResizing) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                            title="Drag to resize column"
                                        />
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
                            <div style={{ position: 'sticky', top: 0, zIndex: 4, height: `${HEADER_H}px`, background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.1)', width: `${timelineW}px` }}>
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

            {/* MILESTONE MODAL */}
            {showMilestoneModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleAddMilestone} style={{ background: '#1a0508', border: '1px solid rgba(159,18,57,0.5)', borderRadius: '8px', padding: '1.5rem', width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: 0, color: '#a78bfa', fontSize: '1.1rem' }}>◆ Add Milestone</h3>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Milestone Title *</label>
                            <input required type="text" value={newMilestone.title} onChange={e => setNewMilestone(prev => ({ ...prev, title: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                            <textarea value={newMilestone.description} onChange={e => setNewMilestone(prev => ({ ...prev, description: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none', height: '60px', resize: 'none' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Date *</label>
                                <input required type="date" value={newMilestone.startDate} onChange={e => setNewMilestone(prev => ({ ...prev, startDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>End Date *</label>
                                <input required type="date" value={newMilestone.endDate} onChange={e => setNewMilestone(prev => ({ ...prev, endDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</label>
                                <select value={newMilestone.status} onChange={e => setNewMilestone(prev => ({ ...prev, status: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                    <option value="Planned">Planned</option>
                                    <option value="Achieved">Achieved</option>
                                    <option value="At Risk">At Risk</option>
                                    <option value="Delayed">Delayed</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</label>
                                <select value={newMilestone.priority} onChange={e => setNewMilestone(prev => ({ ...prev, priority: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                    <option value="Low">Low</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Link to Task/Job (Optional)</label>
                            <select value={newMilestone.jobId} onChange={e => setNewMilestone(prev => ({ ...prev, jobId: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                <option value="">Select Job...</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.job_number ? `[${j.job_number}] ` : ''}{j.title}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setShowMilestoneModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ background: '#a78bfa', border: 'none', color: '#1a0508', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Save Milestone</button>
                        </div>
                    </form>
                </div>
            )}

            {/* JOB (TASK) MODAL */}
            {showJobModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleAddJob} style={{ background: '#1a0508', border: '1px solid rgba(159,18,57,0.5)', borderRadius: '8px', padding: '1.5rem', width: '450px', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: 0, color: '#34d399', fontSize: '1.1rem' }}>📋 Add Task (Job)</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Task Name *</label>
                                <input required type="text" value={newJob.title} onChange={e => setNewJob(prev => ({ ...prev, title: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Job Number</label>
                                <input type="text" value={newJob.jobNumber} onChange={e => setNewJob(prev => ({ ...prev, jobNumber: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Customer *</label>
                                <select required value={newJob.customerId} onChange={e => setNewJob(prev => ({ ...prev, customerId: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                    <option value="">Select Customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Est. Hours (Work)</label>
                                <input type="number" min="0" value={newJob.estimatedHours || ''} onChange={e => setNewJob(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Date *</label>
                                <input required type="date" value={newJob.scheduledDate} onChange={e => setNewJob(prev => ({ ...prev, scheduledDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Finish (Due Date) *</label>
                                <input required type="date" value={newJob.dueDate} onChange={e => setNewJob(prev => ({ ...prev, dueDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Assigned Team (Select multiple) *</label>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {users.map(u => {
                                    const isSelected = newJob.assignedUserIds.includes(u.id);
                                    return (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#fff' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setNewJob(prev => ({ ...prev, assignedUserIds: [...prev.assignedUserIds, u.id] }));
                                                    } else {
                                                        setNewJob(prev => ({ ...prev, assignedUserIds: prev.assignedUserIds.filter(id => id !== u.id) }));
                                                    }
                                                }}
                                            />
                                            {u.username}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</label>
                            <select value={newJob.priority} onChange={e => setNewJob(prev => ({ ...prev, priority: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                <option value="Low">Low</option>
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setShowJobModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ background: '#059669', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Save Task</button>
                        </div>
                    </form>
                </div>
            )}

            {/* SUBTASK MODAL */}
            {showSubtaskModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleAddSubtask} style={{ background: '#1a0508', border: '1px solid rgba(159,18,57,0.5)', borderRadius: '8px', padding: '1.5rem', width: '450px', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '1.1rem' }}>↳ Add Subtask</h3>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Parent Task (Job) *</label>
                            <select required value={newSubtask.jobId} onChange={e => {
                                const selectedJob = jobs.find(j => String(j.id) === String(e.target.value));
                                setNewSubtask(prev => ({ 
                                    ...prev, 
                                    jobId: e.target.value,
                                    startDate: selectedJob?.scheduled_date || '',
                                    dueDate: selectedJob?.due_date || ''
                                }));
                            }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                <option value="">Select Parent Job...</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.job_number ? `[${j.job_number}] ` : ''}{j.title}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subtask Title *</label>
                                <input required type="text" value={newSubtask.title} onChange={e => setNewSubtask(prev => ({ ...prev, title: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Est. Hours (Work)</label>
                                <input type="number" min="0" value={newSubtask.estimatedHours || ''} onChange={e => setNewSubtask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Date</label>
                                <input type="date" value={newSubtask.startDate} onChange={e => setNewSubtask(prev => ({ ...prev, startDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Finish Date</label>
                                <input type="date" value={newSubtask.dueDate} onChange={e => setNewSubtask(prev => ({ ...prev, dueDate: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Assigned Team (Select multiple)</label>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {users.map(u => {
                                    const isSelected = newSubtask.assignedUserIds.includes(u.id);
                                    return (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#fff' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setNewSubtask(prev => ({ ...prev, assignedUserIds: [...prev.assignedUserIds, u.id] }));
                                                    } else {
                                                        setNewSubtask(prev => ({ ...prev, assignedUserIds: prev.assignedUserIds.filter(id => id !== u.id) }));
                                                    }
                                                }}
                                            />
                                            {u.username}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</label>
                            <select value={newSubtask.priority} onChange={e => setNewSubtask(prev => ({ ...prev, priority: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', outline: 'none' }}>
                                <option value="Low">Low</option>
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setShowSubtaskModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Save Subtask</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

