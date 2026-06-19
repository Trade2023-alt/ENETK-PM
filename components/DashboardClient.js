'use client'

import { useState } from 'react';
import JobCard from '@/components/JobCard';
import JobGantt from '@/components/JobGantt';
import Calendar from '@/components/Calendar';
import ScheduleSpreadsheet from '@/components/ScheduleSpreadsheet';
import OnCallEditor from '@/components/OnCallEditor';
import Link from 'next/link';
import { updateJobStatus } from '@/app/actions/updateJob';
import { deleteJob } from '@/app/actions/deleteJob';

export default function DashboardClient({ initialJobs, userRole, users = [], subTasks = [], onCallSchedule = [], currentUser = null }) {
    const [grouping, setGrouping] = useState('customer'); // none, customer, status, assigned
    const [viewMode, setViewMode] = useState('grid'); // grid, cards, gantt
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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
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

        return (
        <div className="card" style={{ padding: 0, overflowX: 'auto', borderLeft: 'none', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                        <th onClick={() => handleSort('jobName')} style={{ padding: '1rem 1rem 1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                            Job Name {sortConfig.key === 'jobName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th onClick={() => handleSort('customer_name')} style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                            Customer Name {sortConfig.key === 'customer_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th onClick={() => handleSort('jobNumber')} style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px', cursor: 'pointer' }}>
                            Job Number {sortConfig.key === 'jobNumber' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
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
                                    padding: '0.75rem 1rem 0.75rem 1.5rem', 
                                    verticalAlign: 'middle',
                                    borderLeft: `5px solid ${statusColor}`
                                }}>
                                    <Link href={`/jobs/${job.id}`} style={{
                                        fontWeight: 500,
                                        fontSize: '0.95rem',
                                        textDecoration: isComplete ? 'line-through' : 'none',
                                        color: isComplete ? 'var(--text-muted)' : 'var(--foreground)'
                                    }}>
                                        {jobName}
                                        {job.is_hidden && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Hidden</span>}
                                    </Link>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: isComplete ? 'var(--text-muted)' : 'var(--foreground)', fontSize: '0.9rem' }}>
                                    📍 {job.customer_name || 'N/A'}
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
                gap: '1rem',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '0.75rem'
            }}>
                {/* View Selector (Left) */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            background: viewMode === 'grid' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                            border: viewMode === 'grid' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                            color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>田</span> Grid
                    </button>
                    <button
                        onClick={() => setViewMode('cards')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            background: viewMode === 'cards' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                            border: viewMode === 'cards' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                            color: viewMode === 'cards' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>📋</span> Cards
                    </button>
                    <button
                        onClick={() => setViewMode('gantt')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            background: viewMode === 'gantt' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                            border: viewMode === 'gantt' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                            color: viewMode === 'gantt' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>📊</span> Gantt
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            background: viewMode === 'calendar' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                            border: viewMode === 'calendar' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                            color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>🗓️</span> Calendar
                    </button>
                    <button
                        onClick={() => setViewMode('spreadsheet')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '0.5rem',
                            background: viewMode === 'spreadsheet' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                            border: viewMode === 'spreadsheet' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                            color: viewMode === 'spreadsheet' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>🗃️</span> Spreadsheet
                    </button>
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

            {viewMode === 'gantt' ? (
                <div style={{ marginTop: '0.5rem' }}>
                    <JobGantt jobs={jobs.filter(j => j.scheduled_date)} users={[]} />
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
