'use client'

import { useState } from 'react';
import JobCard from '@/components/JobCard';
import Link from 'next/link';

export default function DashboardClient({ initialJobs }) {
    const [grouping, setGrouping] = useState('none'); // none, customer, status, incomplete

    // Filter out complete jobs if grouping is 'incomplete'
    // Or maybe 'incomplete' is just a filter, not a grouping.
    // User asked for "Overview to organize jobs by customers, or by complete and not complete".

    const jobs = grouping === 'incomplete'
        ? initialJobs.filter(j => j.status !== 'Complete')
        : initialJobs;

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

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setGrouping('none')}
                    className={`btn ${grouping === 'none' ? 'btn-primary' : ''}`}
                    style={{ background: grouping === 'none' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                    All Jobs
                </button>
                <button
                    onClick={() => setGrouping('customer')}
                    className={`btn ${grouping === 'customer' ? 'btn-primary' : ''}`}
                    style={{ background: grouping === 'customer' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                    By Customer
                </button>
                <button
                    onClick={() => setGrouping('status')}
                    className={`btn ${grouping === 'status' ? 'btn-primary' : ''}`}
                    style={{ background: grouping === 'status' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                    By Status
                </button>
                <button
                    onClick={() => setGrouping('assigned')}
                    className={`btn ${grouping === 'assigned' ? 'btn-primary' : ''}`}
                    style={{ background: grouping === 'assigned' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                    By Assigned To
                </button>
                <button
                    onClick={() => setGrouping('incomplete')}
                    className={`btn ${grouping === 'incomplete' ? 'btn-primary' : ''}`}
                    style={{ background: grouping === 'incomplete' ? undefined : 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                    Active Only
                </button>
            </div>

            {(grouping === 'none' || grouping === 'incomplete') ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {jobs.map(job => (
                        <JobCard key={job.id} job={job} />
                    ))}
                    {jobs.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No jobs found.</p>}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(groupedJobs).sort().map(group => (
                        <div key={group}>
                            <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                                {group} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({groupedJobs[group].length})</span>
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {groupedJobs[group].map(job => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
