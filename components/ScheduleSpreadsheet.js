'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(username) {
    if (!username) return '??';
    const cleaned = username.trim();
    const parts = cleaned.split(/[\s_\-]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    const uppercase = cleaned.replace(/[^A-Z]/g, '');
    if (uppercase.length >= 2) return uppercase.slice(0, 2);
    return cleaned.slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusColor(status) {
    switch (status) {
        case 'Complete': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b981' };
        case 'In Progress': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
        case 'Scheduled': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' };
        case 'Pending': return { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: '#64748b' };
        default: return { bg: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: '#475569' };
    }
}

function priorityBadge(priority) {
    switch (priority) {
        case 'High': return { emoji: '🔴', color: '#ef4444' };
        case 'Medium': return { emoji: '🟡', color: '#f59e0b' };
        case 'Low': return { emoji: '🟢', color: '#10b981' };
        default: return { emoji: '⚪', color: '#64748b' };
    }
}

// ─── Reusable Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }) {
    const s = statusColor(status);
    return (
        <span style={{
            display: 'inline-block',
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}33`,
            borderRadius: '100px',
            padding: '0.15rem 0.6rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em'
        }}>
            {status || 'Unknown'}
        </span>
    );
}

// ─── Assigned Users Pill Row ─────────────────────────────────────────────────

function UserPills({ assignedIds, users }) {
    const ids = assignedIds ? assignedIds.split(',') : [];
    const assigned = users.filter(u => ids.includes(String(u.id)));
    if (assigned.length === 0) return (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', opacity: 0.6 }}>Unassigned</span>
    );
    return (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {assigned.map(u => (
                <span key={u.id} style={{
                    background: 'rgba(159, 18, 57, 0.15)',
                    border: '1px solid rgba(159, 18, 57, 0.3)',
                    borderRadius: '100px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#fda4af',
                    whiteSpace: 'nowrap'
                }} title={u.username}>
                    {getInitials(u.username)}
                </span>
            ))}
        </div>
    );
}

// ─── Sort Arrow ──────────────────────────────────────────────────────────────

function SortArrow({ field, sort }) {
    if (sort.field !== field) return <span style={{ opacity: 0.25, marginLeft: '4px' }}>⇅</span>;
    return <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>;
}

// ─── Spreadsheet Table ───────────────────────────────────────────────────────

function SpreadsheetTable({ rows, type, users, sort, onSort, onJobSelect }) {
    if (rows.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                No records found
            </div>
        );
    }

    const thStyle = {
        padding: '0.65rem 0.75rem',
        textAlign: 'left',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        position: 'sticky',
        top: 0,
        zIndex: 2,
    };

    const tdStyle = {
        padding: '0.6rem 0.75rem',
        fontSize: '0.8rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        verticalAlign: 'middle',
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                    <tr>
                        {type === 'job' ? (
                            <>
                                <th style={{ ...thStyle, width: '36px' }}>#</th>
                                <th style={thStyle} onClick={() => onSort('title')}>
                                    Job Title <SortArrow field="title" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('customer_name')}>
                                    Client <SortArrow field="customer_name" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('status')}>
                                    Status <SortArrow field="status" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('priority')}>
                                    Priority <SortArrow field="priority" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('scheduled_date')}>
                                    Start Date <SortArrow field="scheduled_date" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('due_date')}>
                                    Due Date <SortArrow field="due_date" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('estimated_hours')}>
                                    Est. Hrs <SortArrow field="estimated_hours" sort={sort} />
                                </th>
                                <th style={thStyle}>Assigned</th>
                            </>
                        ) : (
                            <>
                                <th style={{ ...thStyle, width: '36px' }}>#</th>
                                <th style={thStyle} onClick={() => onSort('title')}>
                                    Task Title <SortArrow field="title" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('status')}>
                                    Status <SortArrow field="status" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('priority')}>
                                    Priority <SortArrow field="priority" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('due_date')}>
                                    Due Date <SortArrow field="due_date" sort={sort} />
                                </th>
                                <th style={thStyle} onClick={() => onSort('estimated_hours')}>
                                    Est. Hrs <SortArrow field="estimated_hours" sort={sort} />
                                </th>
                                <th style={thStyle}>Assigned</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const sc = statusColor(row.status);
                        const pr = priorityBadge(row.priority);
                        const href = type === 'job' ? `/jobs/${row.id}` : `/jobs/${row.job_id}`;
                        return (
                            <tr
                                key={row.id}
                                style={{
                                    borderLeft: `3px solid ${sc.border}`,
                                    transition: 'background 0.15s',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={(e) => {
                                    if (type === 'job' && onJobSelect) {
                                        onJobSelect(row.id);
                                    } else {
                                        window.location.href = href;
                                    }
                                }}
                            >
                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center' }}>
                                    {idx + 1}
                                </td>
                                <td style={{ ...tdStyle, fontWeight: 600, maxWidth: '220px' }}>
                                    {type === 'job' && onJobSelect ? (
                                        <button onClick={(e) => { e.stopPropagation(); onJobSelect(row.id); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--foreground)', textDecoration: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                                            {row.title}
                                        </button>
                                    ) : (
                                        <Link
                                            href={href}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ color: 'var(--foreground)', textDecoration: 'none' }}
                                        >
                                            {row.title}
                                        </Link>
                                    )}
                                </td>
                                {type === 'job' && (
                                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        {row.customer_name || '—'}
                                    </td>
                                )}
                                <td style={tdStyle}>
                                    <StatusBadge status={row.status} />
                                </td>
                                <td style={{ ...tdStyle }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                        <span>{pr.emoji}</span>
                                        <span style={{ color: pr.color }}>{row.priority || '—'}</span>
                                    </span>
                                </td>
                                {type === 'job' && (
                                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                        {formatDate(row.scheduled_date)}
                                    </td>
                                )}
                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {formatDate(row.due_date)}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    {row.estimated_hours ? `${row.estimated_hours}h` : '—'}
                                </td>
                                <td style={tdStyle}>
                                    <UserPills assignedIds={row.assigned_ids} users={users} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── By-Person Section ───────────────────────────────────────────────────────

function ByPersonSection({ jobs, subTasks, users, onJobSelect }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {users.map(user => {
                const userJobs = jobs.filter(j =>
                    j.assigned_ids && j.assigned_ids.split(',').includes(String(user.id))
                );
                const userTasks = subTasks.filter(t =>
                    t.assigned_ids && t.assigned_ids.split(',').includes(String(user.id))
                );
                const totalHours = [
                    ...userJobs.map(j => j.estimated_hours || 0),
                    ...userTasks.map(t => t.estimated_hours || 0),
                ].reduce((a, b) => a + b, 0);
                const activeCount = userJobs.filter(j => j.status === 'In Progress').length;

                return (
                    <div key={user.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderLeft: '4px solid var(--primary)',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                    }}>
                        {/* Person Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'rgba(159,18,57,0.06)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(159,18,57,0.25)',
                                    border: '1.5px solid rgba(159,18,57,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#fda4af',
                                    flexShrink: 0,
                                }}>
                                    {getInitials(user.username)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.username}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {userJobs.length} jobs · {userTasks.length} tasks · {Math.round(totalHours)}h total
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {activeCount > 0 && (
                                    <span style={{
                                        background: 'rgba(245,158,11,0.15)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.25)',
                                        borderRadius: '100px',
                                        padding: '0.15rem 0.6rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                    }}>
                                        {activeCount} Active
                                    </span>
                                )}
                                <span style={{
                                    background: 'rgba(16,185,129,0.12)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: '100px',
                                    padding: '0.15rem 0.6rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                }}>
                                    {Math.round(totalHours)}h Est.
                                </span>
                            </div>
                        </div>

                        {/* Jobs list */}
                        {userJobs.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Job Title', 'Status', 'Priority', 'Scheduled', 'Due', 'Hrs'].map(h => (
                                                <th key={h} style={{
                                                    padding: '0.45rem 0.75rem',
                                                    textAlign: 'left',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    color: 'var(--text-muted)',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userJobs.map(job => {
                                            const sc = statusColor(job.status);
                                            const pr = priorityBadge(job.priority);
                                            return (
                                                <tr key={job.id}
                                                    style={{ borderLeft: `3px solid ${sc.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={(e) => {
                                                        if (onJobSelect) {
                                                            onJobSelect(job.id);
                                                        } else {
                                                            window.location.href = `/jobs/${job.id}`;
                                                        }
                                                    }}
                                                >
                                                    <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        {onJobSelect ? (
                                                            <button onClick={(e) => { e.stopPropagation(); onJobSelect(job.id); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--foreground)', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                                                {job.title}
                                                            </button>
                                                        ) : (
                                                            <Link href={`/jobs/${job.id}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
                                                                {job.title}
                                                            </Link>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <StatusBadge status={job.status} />
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <span>{pr.emoji}</span> <span style={{ color: pr.color }}>{job.priority || '—'}</span>
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{formatDate(job.scheduled_date)}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{formatDate(job.due_date)}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{job.estimated_hours ? `${job.estimated_hours}h` : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {userJobs.length === 0 && userTasks.length === 0 && (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                                No assignments
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const TABS = [
    { id: 'all', label: '📋 All Jobs', emoji: '📋' },
    { id: 'active', label: '📌 Active', emoji: '📌' },
    { id: 'by-person', label: '👥 By Person', emoji: '👥' },
    { id: 'completed', label: '✅ Completed', emoji: '✅' },
    { id: 'subtasks', label: '🔩 Sub-Tasks', emoji: '🔩' },
];

export default function ScheduleSpreadsheet({ jobs, subTasks, users, onJobSelect }) {
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [sort, setSort] = useState({ field: 'scheduled_date', dir: 'asc' });

    const handleSort = (field) => {
        setSort(prev => ({
            field,
            dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Compute summary stats
    const stats = useMemo(() => ({
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled').length,
        completed: jobs.filter(j => j.status === 'Complete').length,
        totalHours: jobs.reduce((s, j) => s + (j.estimated_hours || 0), 0) +
            subTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0),
        totalTasks: subTasks.length,
    }), [jobs, subTasks]);

    // Filter and sort logic
    const filteredJobs = useMemo(() => {
        let rows = jobs;

        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(j =>
                j.title?.toLowerCase().includes(q) ||
                j.customer_name?.toLowerCase().includes(q) ||
                j.status?.toLowerCase().includes(q)
            );
        }
        if (filterUser) {
            rows = rows.filter(j =>
                j.assigned_ids && j.assigned_ids.split(',').includes(filterUser)
            );
        }

        rows = [...rows].sort((a, b) => {
            let av = a[sort.field] ?? '';
            let bv = b[sort.field] ?? '';
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return rows;
    }, [jobs, search, filterUser, sort]);

    const filteredSubTasks = useMemo(() => {
        let rows = subTasks;
        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(t => t.title?.toLowerCase().includes(q) || t.status?.toLowerCase().includes(q));
        }
        if (filterUser) {
            rows = rows.filter(t =>
                t.assigned_ids && t.assigned_ids.split(',').includes(filterUser)
            );
        }
        rows = [...rows].sort((a, b) => {
            let av = a[sort.field] ?? '';
            let bv = b[sort.field] ?? '';
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return rows;
    }, [subTasks, search, filterUser, sort]);

    const activeJobs = filteredJobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled');
    const completedJobs = filteredJobs.filter(j => j.status === 'Complete');

    return (
        <div>
            {/* Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
            }}>
                {[
                    { label: 'Total Jobs', value: stats.totalJobs, color: 'var(--primary)', icon: '🏗️' },
                    { label: 'Active', value: stats.activeJobs, color: '#f59e0b', icon: '⚡' },
                    { label: 'Completed', value: stats.completed, color: '#10b981', icon: '✅' },
                    { label: 'Sub-Tasks', value: stats.totalTasks, color: '#8b5cf6', icon: '🔩' },
                    { label: 'Est. Hours', value: `${stats.totalHours}h`, color: '#38bdf8', icon: '⏱️' },
                ].map(s => (
                    <div key={s.label} className="card card-condensed" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Sheet Card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Tab Bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    overflowX: 'auto',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.85rem 1.25rem',
                                background: activeTab === tab.id
                                    ? 'rgba(159,18,57,0.12)'
                                    : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id
                                    ? '2.5px solid var(--primary)'
                                    : '2.5px solid transparent',
                                color: activeTab === tab.id
                                    ? 'var(--foreground)'
                                    : 'var(--text-muted)',
                                fontWeight: activeTab === tab.id ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                letterSpacing: '0.01em',
                            }}
                        >
                            {tab.label}
                            {tab.id === 'active' && (
                                <span style={{
                                    marginLeft: '6px',
                                    background: 'rgba(245,158,11,0.2)',
                                    color: '#f59e0b',
                                    borderRadius: '100px',
                                    padding: '0.05rem 0.4rem',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                }}>
                                    {stats.activeJobs}
                                </span>
                            )}
                            {tab.id === 'completed' && (
                                <span style={{
                                    marginLeft: '6px',
                                    background: 'rgba(16,185,129,0.15)',
                                    color: '#10b981',
                                    borderRadius: '100px',
                                    padding: '0.05rem 0.4rem',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                }}>
                                    {stats.completed}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexWrap: 'wrap',
                    background: 'rgba(255,255,255,0.01)',
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '320px' }}>
                        <span style={{
                            position: 'absolute',
                            left: '0.6rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            pointerEvents: 'none',
                        }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search jobs, tasks…"
                            className="input"
                            style={{
                                paddingLeft: '2rem',
                                fontSize: '0.8rem',
                                padding: '0.45rem 0.75rem 0.45rem 2rem',
                            }}
                        />
                    </div>

                    {/* Filter by user */}
                    <select
                        value={filterUser}
                        onChange={e => setFilterUser(e.target.value)}
                        className="input"
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', minWidth: '140px' }}
                    >
                        <option value="">All Team Members</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>

                    {/* Row count */}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {activeTab === 'all' && `${filteredJobs.length} of ${jobs.length} jobs`}
                        {activeTab === 'active' && `${activeJobs.length} active jobs`}
                        {activeTab === 'completed' && `${completedJobs.length} completed`}
                        {activeTab === 'subtasks' && `${filteredSubTasks.length} tasks`}
                        {activeTab === 'by-person' && `${users.length} team members`}
                    </span>
                </div>

                {/* Tab Content */}
                <div style={{ minHeight: '400px' }}>
                    {activeTab === 'all' && (
                        <SpreadsheetTable rows={filteredJobs} type="job" users={users} sort={sort} onSort={handleSort} onJobSelect={onJobSelect} />
                    )}
                    {activeTab === 'active' && (
                        <SpreadsheetTable rows={activeJobs} type="job" users={users} sort={sort} onSort={handleSort} onJobSelect={onJobSelect} />
                    )}
                    {activeTab === 'completed' && (
                        <SpreadsheetTable rows={completedJobs} type="job" users={users} sort={sort} onSort={handleSort} onJobSelect={onJobSelect} />
                    )}
                    {activeTab === 'subtasks' && (
                        <SpreadsheetTable rows={filteredSubTasks} type="subtask" users={users} sort={sort} onSort={handleSort} onJobSelect={onJobSelect} />
                    )}
                    {activeTab === 'by-person' && (
                        <div style={{ padding: '1rem' }}>
                            <ByPersonSection
                                jobs={filterUser
                                    ? jobs.filter(j => j.assigned_ids && j.assigned_ids.split(',').includes(filterUser))
                                    : jobs}
                                subTasks={filterUser
                                    ? subTasks.filter(t => t.assigned_ids && t.assigned_ids.split(',').includes(filterUser))
                                    : subTasks}
                                users={filterUser ? users.filter(u => String(u.id) === filterUser) : users}
                                onJobSelect={onJobSelect}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
