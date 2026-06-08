'use client'

import { useState } from 'react';
import JobCard from '@/components/JobCard';
import Link from 'next/link';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function DashboardClient({ initialJobs }) {
    const [grouping, setGrouping] = useState('incomplete'); // none, customer, status, incomplete, assigned
    const [viewMode, setViewMode] = useState('grid'); // Default to grid view like Microsoft Planner
    const [selectedLead, setSelectedLead] = useState('All');
    const [showHidden, setShowHidden] = useState(false);

    const uniqueLeads = Array.from(new Set(initialJobs.map(j => j.lead_name || 'Unassigned'))).sort();

    let filteredJobs = initialJobs;
    if (!showHidden) {
        filteredJobs = filteredJobs.filter(j => !j.is_hidden);
    }
    if (selectedLead !== 'All') {
        filteredJobs = filteredJobs.filter(j => (j.lead_name || 'Unassigned') === selectedLead);
    }

    const jobs = grouping === 'incomplete'
        ? filteredJobs.filter(j => j.status !== 'Complete')
        : filteredJobs;

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

    const renderGridTable = (jobsArray) => (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                        <th style={{ padding: '1rem', width: '50px' }}></th>
                        <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Name</th>
                        <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</th>
                        <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>Job Number</th>
                    </tr>
                </thead>
                <tbody>
                    {jobsArray.map(job => {
                        const isComplete = job.status === 'Complete';
                        const { jobNumber, jobName } = parseJobDetails(job);
                        return (
                            <tr key={job.id} style={{
                                borderBottom: '1px solid var(--card-border)',
                                background: isComplete ? 'rgba(255,255,255,0.01)' : 'transparent',
                                transition: 'background 0.2s',
                                opacity: job.is_hidden ? 0.6 : 1
                            }} className="grid-row">
                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isComplete}
                                        onChange={() => handleToggleJob(job.id, job.status)}
                                        style={{ 
                                            width: '1.25rem', 
                                            height: '1.25rem', 
                                            cursor: 'pointer',
                                            borderRadius: '50%',
                                            display: 'inline-block'
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
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
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div>
            {/* View and Grouping Switchers */}
            <div style={{ 
                marginBottom: '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '1rem',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '0.75rem'
            }}>
                {/* View Selector (Left) */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                        <input 
                            type="checkbox" 
                            id="showHidden" 
                            checked={showHidden} 
                            onChange={(e) => setShowHidden(e.target.checked)} 
                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <label htmlFor="showHidden" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                            Show Hidden
                        </label>
                    </div>
                </div>

                {/* Grouping Selectors (Right) */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select 
                        value={selectedLead} 
                        onChange={(e) => setSelectedLead(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', maxWidth: '200px', height: '100%' }}
                    >
                        <option value="All">All Leads</option>
                        {uniqueLeads.map(lead => (
                            <option key={lead} value={lead}>{lead}</option>
                        ))}
                    </select>
                    <div style={{ width: '1px', height: '24px', background: 'var(--card-border)', margin: '0 0.5rem' }}></div>
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
                    <button
                        onClick={() => setGrouping('incomplete')}
                        className={`btn ${grouping === 'incomplete' ? 'btn-primary' : ''}`}
                        style={{ background: grouping === 'incomplete' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                        Active Only
                    </button>
                </div>
            </div>

            {(grouping === 'none' || grouping === 'incomplete') ? (
                viewMode === 'grid' ? (
                    renderGridTable(jobs)
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '1rem'
                    }}>
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} />
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
                                        <JobCard key={job.id} job={job} />
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
