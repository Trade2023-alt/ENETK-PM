'use client'

import { useState, useEffect } from 'react';
import JobCard from '@/components/JobCard';
import JobGantt from '@/components/JobGantt';
import Calendar from '@/components/Calendar';
import ScheduleSpreadsheet from '@/components/ScheduleSpreadsheet';
import OnCallEditor from '@/components/OnCallEditor';
import MyWeekView from '@/components/MyWeekView';
import MonthlyWorkforceView from '@/components/MonthlyWorkforceView';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateJobStatus } from '@/app/actions/updateJob';
import { deleteJob } from '@/app/actions/deleteJob';

export default function DashboardClient({ initialJobs, userRole, users = [], customers = [], subTasks = [], onCallSchedule = [], currentUser = null }) {
    const router = useRouter();
    const isAdmin = userRole === 'admin' || userRole === 'system_integrator';
    const [grouping, setGrouping] = useState('customer'); // none, customer, status, assigned
    const [viewMode, setViewMode] = useState(isAdmin ? 'grid' : 'my-week'); // grid, cards, gantt, calendar, spreadsheet, my-week, workforce
    // Inline editing state for the grid view
    const [editingCell, setEditingCell] = useState(null); // { jobId, field }
    const [savingCell, setSavingCell] = useState(null); // { jobId, field }
    const [savedCell, setSavedCell] = useState(null); // { jobId, field }
    const [selectedLead, setSelectedLead] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState('All');
    const [showHidden, setShowHidden] = useState(false);
    const [statusFilter, setStatusFilter] = useState('Active'); // Default to Active (hides Completed)
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const uniqueLeads = Array.from(new Set(initialJobs.map(j => j.lead_name || 'Unassigned'))).sort();
    const uniqueCustomers = Array.from(new Set(initialJobs.map(j => j.customer_name).filter(Boolean))).sort();

    let filteredJobs = initialJobs;
    if (!showHidden) {
        filteredJobs = filteredJobs.filter(j => !j.is_hidden);
    }
    if (selectedLead !== 'All') {
        filteredJobs = filteredJobs.filter(j => (j.lead_name || 'Unassigned') === selectedLead);
    }
    if (statusFilter === 'Active') {
        filteredJobs = filteredJobs.filter(j => j.status !== 'Complete');
    } else if (statusFilter !== 'All') {
        filteredJobs = filteredJobs.filter(j => j.status === statusFilter);
    }
    if (priorityFilter !== 'All') {
        filteredJobs = filteredJobs.filter(j => j.priority === priorityFilter);
    }
    if (selectedCustomer !== 'All') {
        filteredJobs = filteredJobs.filter(j => j.customer_name === selectedCustomer);
    }
    if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filteredJobs = filteredJobs.filter(j => 
            (j.title || '').toLowerCase().includes(term) ||
            (j.customer_name || '').toLowerCase().includes(term) ||
            (j.job_number || '').toLowerCase().includes(term)
        );
    }

    const jobs = filteredJobs;

    const groupedJobs = {};

    if (grouping === 'customer') {
        jobs.forEach(job => {
            const key = job.customer_name || 'Unknown';
            if (!groupedJobs[key]) groupedJobs[key] = [];
            groupedJobs[key].push(job);
        });
    } else if (grouping === 'status') {
        jobs.forEach(job => {
            const key = job.status;
            if (!groupedJobs[key]) groupedJobs[key] = [];
            groupedJobs[key].push(job);
        });
    } else if (grouping === 'assigned') {
        jobs.forEach(job => {
            const key = job.assigned_users || 'Unassigned';
            if (!groupedJobs[key]) groupedJobs[key] = [];
            groupedJobs[key].push(job);
        });
    }

    const parseJobDetails = (job) => {
        const title = job.title || '';
        let jobNumber = job.job_number || (job.id ? `#${job.id}` : 'N/A');
        let cleanTitle = title;
        
        // Even if we have job.job_number, we might want to clean it out of the title if it's there
        const match = title.match(/\b\d{3}-\d{4}\b/);
        if (match) {
            if (!job.job_number) {
                jobNumber = match[0];
            }
            cleanTitle = title
                .replace(/^\d+-\d+\s*(:|-|🛠️|🚀)?\s*/, '')
                .replace(/\s*\(\b\d{3}-\d{4}\b\)/, '')
                .trim();
            if (!cleanTitle) cleanTitle = title;
        }
        
        
        return {
            jobNumber,
            jobName: cleanTitle
        };
    };

    const handleToggleJob = async (jobId, currentStatus) => {
        const newStatus = currentStatus === 'Complete' ? 'Scheduled' : 'Complete';
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('status', newStatus);
        await updateJobStatus(formData);
    };

    const handleDeleteJob = async (jobId) => {
        if (confirm('Are you sure you want to delete this job? This cannot be undone.')) {
            await deleteJob(jobId);
        }
    };

    // Inline edit: save a single changed field without wiping job assignments.
    // updateJobStatus deletes all job_assignments unless assigned_user_ids is sent,
    // so we always re-send the job's existing assignments alongside the changed field.
    const handleInlineSave = async (job, field, value) => {
        setEditingCell(null);
        setSavingCell({ jobId: job.id, field });
        const formData = new FormData();
        formData.append('job_id', job.id);
        formData.append(field, value ?? '');

        const existingAssignedIds = (job.assigned_ids || '').split(',').filter(Boolean);
        existingAssignedIds.forEach(id => formData.append('assigned_user_ids', id));

        try {
            await updateJobStatus(formData);
            setSavingCell(null);
            setSavedCell({ jobId: job.id, field });
            router.refresh();
            setTimeout(() => {
                setSavedCell(prev => (prev && prev.jobId === job.id && prev.field === field ? null : prev));
            }, 1500);
        } catch (e) {
            console.error('Inline save failed:', e);
            setSavingCell(null);
        }
    };

    useEffect(() => {
        if (!editingCell) return;
        const onKey = (e) => { if (e.key === 'Escape') setEditingCell(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editingCell]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Renders a grid cell that becomes an inline editor on click.
    // `field` is the FormData field sent to updateJobStatus; `type` selects the input.
    const renderEditableCell = (job, field, type, currentValue, display) => {
        const isEditing = editingCell && editingCell.jobId === job.id && editingCell.field === field;
        const isSaving = savingCell && savingCell.jobId === job.id && savingCell.field === field;
        const isSaved = savedCell && savedCell.jobId === job.id && savedCell.field === field;

        const indicator = isSaving
            ? <span title="Saving…" style={{ marginLeft: '0.4rem', display: 'inline-block', width: '0.85rem', height: '0.85rem', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', verticalAlign: 'middle' }} />
            : isSaved
                ? <span title="Saved" style={{ marginLeft: '0.4rem', color: '#10b981', fontWeight: 700 }}>✓</span>
                : null;

        if (!isEditing) {
            return (
                <span
                    onClick={() => setEditingCell({ jobId: job.id, field })}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', borderRadius: '6px', padding: '0.25rem 0.4rem', transition: 'background 0.15s' }}
                    className="inline-edit-trigger"
                    title="Click to edit"
                >
                    {display}
                    {indicator}
                </span>
            );
        }

        const inputStyle = {
            width: '100%',
            minWidth: type === 'date' ? '140px' : '120px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderBottom: '2px solid var(--primary)',
            color: 'var(--foreground)',
            fontSize: '0.88rem',
            padding: '0.35rem 0.4rem',
            borderRadius: '4px 4px 0 0',
            outline: 'none'
        };
        const commit = (val) => handleInlineSave(job, field, val);

        if (type === 'text') {
            return (
                <input
                    type="text"
                    autoFocus
                    defaultValue={currentValue || ''}
                    style={inputStyle}
                    onBlur={(e) => { if (e.target.value !== (currentValue || '')) commit(e.target.value); else setEditingCell(null); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); }
                        if (e.key === 'Escape') setEditingCell(null);
                    }}
                />
            );
        }

        let options = [];
        if (type === 'status') options = ['Scheduled', 'In Progress', 'Complete'];
        else if (type === 'priority') options = ['Normal', 'High', 'Urgent'];

        if (type === 'date') {
            return (
                <input
                    type="date"
                    autoFocus
                    defaultValue={currentValue || ''}
                    style={inputStyle}
                    onChange={(e) => commit(e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null); }}
                />
            );
        }

        if (type === 'customer') {
            return (
                <select autoFocus value={currentValue || ''} style={inputStyle}
                    onChange={(e) => commit(e.target.value)} onBlur={() => setEditingCell(null)}>
                    <option value="">— Unassigned —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            );
        }

        if (type === 'lead') {
            return (
                <select autoFocus value={currentValue || ''} style={inputStyle}
                    onChange={(e) => commit(e.target.value)} onBlur={() => setEditingCell(null)}>
                    <option value="">— Unassigned —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
            );
        }

        // status / priority selects
        return (
            <select autoFocus value={currentValue || ''} style={inputStyle}
                onChange={(e) => commit(e.target.value)} onBlur={() => setEditingCell(null)}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    };

    const renderGridTable = (jobsArray) => {
        const sortedJobs = [...jobsArray].sort((a, b) => {
            if (!sortConfig.key) return 0;
            
            const aDetails = parseJobDetails(a);
            const bDetails = parseJobDetails(b);
            
            let aValue = sortConfig.key === 'customer_name' ? (a.customer_name || '').toLowerCase() : (aDetails[sortConfig.key] || '').toLowerCase();
            let bValue = sortConfig.key === 'customer_name' ? (b.customer_name || '').toLowerCase() : (bDetails[sortConfig.key] || '').toLowerCase();
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        const statusBorderColors = {
            'Scheduled': 'var(--danger)',
            'In Progress': 'var(--warning)',
            'Complete': 'var(--success)'
        };

        const th = (label, sortKey, extra = {}) => (
            <th
                onClick={sortKey ? () => handleSort(sortKey) : undefined}
                style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: sortKey ? 'pointer' : 'default', whiteSpace: 'nowrap', ...extra }}
            >
                {label}{sortKey ? ` ${sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}` : ''}
            </th>
        );

        return (
        <div className="card" style={{ padding: 0, overflowX: 'auto', borderLeft: 'none', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                        {th('Job Name', 'jobName', { padding: '1rem 1rem 1rem 1.5rem' })}
                        {th('Customer', 'customer_name')}
                        {th('Job Number', 'jobNumber', { width: '140px' })}
                        {th('Status', null)}
                        {th('Lead', null)}
                        {th('Priority', null)}
                        {th('Scheduled', null)}
                        {th('Due', null)}
                        <th style={{ padding: '1rem', width: '60px' }}>Actions</th>
                        {userRole === 'admin' && <th style={{ padding: '1rem', width: '50px' }}></th>}
                    </tr>
                </thead>
                <tbody>
                    {sortedJobs.map(job => {
                        const isComplete = job.status === 'Complete';
                        const { jobNumber, jobName } = parseJobDetails(job);
                        const statusColor = statusBorderColors[job.status] || 'var(--primary)';
                        return (
                            <tr key={job.id} style={{
                                borderBottom: '1px solid var(--card-border)',
                                background: isComplete ? 'rgba(255,255,255,0.01)' : 'transparent',
                                transition: 'background 0.2s',
                                opacity: job.is_hidden ? 0.6 : 1
                            }} className="grid-row">
                                <td style={{
                                    padding: '0.4rem 1rem 0.4rem 1.5rem',
                                    verticalAlign: 'middle',
                                    borderLeft: `5px solid ${statusColor}`
                                }}>
                                    {renderEditableCell(job, 'title', 'text', jobName, (
                                        <span style={{
                                            fontWeight: 500,
                                            fontSize: '0.95rem',
                                            textDecoration: isComplete ? 'line-through' : 'none',
                                            color: isComplete ? 'var(--text-muted)' : 'var(--foreground)'
                                        }}>
                                            {jobName}
                                            {job.is_hidden && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Hidden</span>}
                                        </span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 1rem', verticalAlign: 'middle', color: isComplete ? 'var(--text-muted)' : 'var(--foreground)', fontSize: '0.9rem' }}>
                                    {renderEditableCell(job, 'customer_id', 'customer', job.customer_id, (
                                        <span>📍 {job.customer_name || 'N/A'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1px solid var(--card-border)',
                                        color: isComplete ? 'var(--text-muted)' : 'var(--foreground)',
                                        fontFamily: 'monospace',
                                        fontWeight: 600
                                    }}>
                                        {jobNumber}
                                    </span>
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                    {renderEditableCell(job, 'status', 'status', job.status, (
                                        <span style={{ color: statusColor, fontWeight: 600 }}>{job.status || '—'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                    {renderEditableCell(job, 'lead_id', 'lead', job.lead_id, (
                                        <span>{job.lead_name || 'Unassigned'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                    {renderEditableCell(job, 'priority', 'priority', job.priority, (
                                        <span>{job.priority || 'Normal'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                    {renderEditableCell(job, 'scheduled_date', 'date', job.scheduled_date, (
                                        <span style={{ color: job.scheduled_date ? 'var(--foreground)' : 'var(--text-muted)' }}>{job.scheduled_date || '—'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                    {renderEditableCell(job, 'due_date', 'date', job.due_date, (
                                        <span style={{ color: job.due_date ? 'var(--foreground)' : 'var(--text-muted)' }}>{job.due_date || '—'}</span>
                                    ))}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                    <Link href={`/jobs/${job.id}`} className="btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.06)' }}>Open</Link>
                                </td>
                                {userRole === 'admin' && (
                                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDeleteJob(job.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                                            title="Delete Job"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        );
    };

    // KPI stats from current filtered jobs list
    const allJobsForStats = initialJobs.filter(j => !j.is_hidden || showHidden);
    const todayStr = new Date().toISOString().split('T')[0];
    const kpiStats = {
        total: allJobsForStats.filter(j => j.status !== 'Complete').length,
        scheduled: allJobsForStats.filter(j => j.status === 'Scheduled').length,
        inProgress: allJobsForStats.filter(j => j.status === 'In Progress').length,
        complete: allJobsForStats.filter(j => j.status === 'Complete').length,
        overdue: allJobsForStats.filter(j => j.status !== 'Complete' && j.due_date && j.due_date < todayStr).length,
    };

    return (
        <div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .inline-edit-trigger:hover { background: rgba(255,255,255,0.07); }
            `}</style>
            {/* KPI Metric Ribbon */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem',
                marginBottom: '1.25rem'
            }}>
                {[
                    { label: 'Active Jobs', value: kpiStats.total, color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.04)', icon: '📋', border: 'rgba(255,255,255,0.15)' },
                    { label: 'Scheduled', value: kpiStats.scheduled, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴', border: '#ef4444' },
                    { label: 'In Progress', value: kpiStats.inProgress, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡', border: '#f59e0b' },
                    { label: 'Complete', value: kpiStats.complete, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '🟢', border: '#10b981' },
                    { label: 'Overdue', value: kpiStats.overdue, color: kpiStats.overdue > 0 ? '#ef4444' : '#10b981', bg: kpiStats.overdue > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)', icon: kpiStats.overdue > 0 ? '⚠️' : '✅', border: kpiStats.overdue > 0 ? '#ef4444' : '#10b981' },
                ].map(({ label, value, color, bg, icon, border }) => (
                    <div key={label} className="card" style={{
                        padding: '0.75rem 1rem',
                        background: bg,
                        borderLeft: `3px solid ${border}`,
                        display: 'flex', flexDirection: 'column', gap: '0.2rem',
                        borderRadius: '10px'
                    }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {icon} {label}
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            {/* View and Grouping Switchers (Row 1) */}
            <div style={{ 
                marginBottom: '1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '0.75rem'
            }}>
                {/* View Selector — compact horizontal pill strip */}
                <div style={{
                    display: 'inline-flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '10px',
                    padding: '3px',
                    gap: '2px',
                    flexShrink: 0,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                }}>
                    {([
                        !isAdmin ? { mode: 'my-week',     icon: '🗓️', label: 'My Week'     } : null,
                        isAdmin  ? { mode: 'workforce',   icon: '👥', label: 'Workforce'   } : null,
                        { mode: 'grid',        icon: '⊞',  label: 'Grid'        },
                        { mode: 'cards',       icon: '📋', label: 'Cards'       },
                        { mode: 'gantt',       icon: '📊', label: 'Gantt'       },
                        { mode: 'calendar',    icon: '📅', label: 'Calendar'    },
                        { mode: 'spreadsheet', icon: '🗃️', label: 'Schedule'    },
                    ].filter(Boolean)).map(({ mode, icon, label }) => {
                        const active = viewMode === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: active ? 'var(--primary)' : 'transparent',
                                    color: active ? '#fff' : 'var(--text-muted)',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    fontSize: '0.78rem',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{icon}</span>
                                {label}
                            </button>
                        );
                    })}
                </div>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '0.2rem',
                        marginLeft: '1rem'
                    }}>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: 'var(--primary)',
                            background: 'rgba(159, 18, 57, 0.15)',
                            border: '1px solid rgba(159, 18, 57, 0.3)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '10px',
                            lineHeight: '1.2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }} title="Total jobs showing">
                            {jobs.length}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                id="showHidden" 
                                checked={showHidden} 
                                onChange={(e) => setShowHidden(e.target.checked)} 
                                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="showHidden" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                Show Hidden
                            </label>
                        </div>
                    </div>
                </div>

                {/* Grouping Selectors (Right) */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Group by:</span>
                    <button
                        onClick={() => setGrouping('none')}
                        className={`btn ${grouping === 'none' ? 'btn-primary' : ''}`}
                        style={{ background: grouping === 'none' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                        All Jobs
                    </button>
                    <button
                        onClick={() => setGrouping('customer')}
                        className={`btn ${grouping === 'customer' ? 'btn-primary' : ''}`}
                        style={{ background: grouping === 'customer' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                        By Customer
                    </button>
                    <button
                        onClick={() => setGrouping('status')}
                        className={`btn ${grouping === 'status' ? 'btn-primary' : ''}`}
                        style={{ background: grouping === 'status' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                        By Status
                    </button>
                    <button
                        onClick={() => setGrouping('assigned')}
                        className={`btn ${grouping === 'assigned' ? 'btn-primary' : ''}`}
                        style={{ background: grouping === 'assigned' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                        By Assigned
                    </button>
                </div>
            </div>

            {/* Search and Filters Toolbar (Row 2) */}
            <div className="card" style={{ 
                marginBottom: '1.5rem', 
                padding: '0.75rem 1.25rem',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem'
            }}>
                {/* Search Input + Customer Dropdown (Left) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search job title, customer, or number..."
                            className="input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', height: '38px', width: '100%', background: 'rgba(255,255,255,0.05)' }}
                        />
                    </div>
                    <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="input"
                        style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.85rem',
                            height: '38px',
                            minWidth: '150px',
                            maxWidth: '200px',
                            background: selectedCustomer !== 'All' ? 'rgba(159,18,57,0.15)' : 'rgba(255,255,255,0.05)',
                            borderColor: selectedCustomer !== 'All' ? 'rgba(159,18,57,0.5)' : undefined,
                            color: selectedCustomer !== 'All' ? '#fda4af' : undefined,
                            fontWeight: selectedCustomer !== 'All' ? 700 : undefined,
                        }}
                    >
                        <option value="All">All Customers</option>
                        {uniqueCustomers.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Filters Dropdowns (Right) */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filters:</span>
                    
                    {/* Lead filter */}
                    <select 
                        value={selectedLead} 
                        onChange={(e) => setSelectedLead(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', width: '140px', height: '38px', background: 'rgba(255,255,255,0.05)' }}
                    >
                        <option value="All">All Leads</option>
                        {uniqueLeads.map(lead => (
                            <option key={lead} value={lead}>{lead}</option>
                        ))}
                    </select>

                    {/* Status filter */}
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', width: '140px', height: '38px', background: 'rgba(255,255,255,0.05)' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active Only</option>
                        <option value="Scheduled">Scheduled Only</option>
                        <option value="In Progress">In Progress Only</option>
                        <option value="Complete">Completed Only</option>
                    </select>

                    {/* Priority filter */}
                    <select 
                        value={priorityFilter} 
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', width: '140px', height: '38px', background: 'rgba(255,255,255,0.05)' }}
                    >
                        <option value="All">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>

            {viewMode === 'my-week' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <MyWeekView jobs={jobs} subTasks={subTasks} users={users} currentUser={currentUser} onCallSchedule={onCallSchedule} />
                </div>
            ) : viewMode === 'workforce' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <MonthlyWorkforceView jobs={jobs} subTasks={subTasks} users={users} />
                </div>
            ) : viewMode === 'gantt' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <JobGantt jobs={jobs.filter(j => j.scheduled_date)} users={users} />
                    {jobs.filter(j => j.scheduled_date).length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
                            <p>No jobs with scheduled dates to display on the Gantt.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Add a scheduled date to your jobs to see them here.</p>
                        </div>
                    )}
                </div>
            ) : viewMode === 'calendar' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <OnCallEditor initialSchedule={onCallSchedule} userRole={userRole} />
                    <Calendar jobs={jobs} subTasks={subTasks} users={users} currentUser={currentUser} />
                </div>
            ) : viewMode === 'spreadsheet' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <ScheduleSpreadsheet jobs={jobs} users={users} subTasks={subTasks} />
                </div>
            ) : (grouping === 'none' || grouping === 'incomplete') ? (
                viewMode === 'grid' ? (
                    renderGridTable(jobs)
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '1rem'
                    }}>
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} userRole={userRole} onDelete={() => handleDeleteJob(job.id)} />
                        ))}
                        {jobs.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No jobs found.</p>}
                    </div>
                )
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.keys(groupedJobs).sort().map(group => (
                        <div key={group}>
                            <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                                {group} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({groupedJobs[group].length})</span>
                            </h3>
                            {viewMode === 'grid' ? (
                                renderGridTable(groupedJobs[group])
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    {groupedJobs[group].map(job => (
                                        <JobCard key={job.id} job={job} userRole={userRole} onDelete={() => handleDeleteJob(job.id)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
