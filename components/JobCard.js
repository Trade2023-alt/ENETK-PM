'use client'

import Link from 'next/link';
import MarkCompleteButton from './MarkCompleteButton';
import { useState, useEffect } from 'react';

export default function JobCard({ job }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const statusColors = {
        'Scheduled': 'var(--primary)',
        'In Progress': 'var(--warning)',
        'Complete': 'var(--success)'
    };

    const formatDate = (dateStr) => {
        if (!mounted) return dateStr;
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--foreground)' }}>{job.title || 'Untitled Job'}</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '1rem',
                        background: `rgba(0,0,0,0.2)`,
                        color: statusColors[job.status] || 'var(--text-muted)',
                        border: `1px solid ${statusColors[job.status] || 'var(--card-border)'}`
                    }}>
                        {job.status}
                    </span>
                </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {job.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📅 {formatDate(job.scheduled_date)}</span>
                    <span>📍 {job.customer_address}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>👤 {job.customer_name}</span>
                    <span>⏱️ {job.actual_hours || 0} / {job.estimated_hours || 0} hrs</span>
                </div>
            </div>

            <div style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Link href={`/jobs/${job.id}`} style={{
                    color: 'var(--primary)',
                    fontSize: '0.875rem',
                    fontWeight: 500
                }}>
                    View Details →
                </Link>
                {job.status !== 'Complete' && <MarkCompleteButton jobId={job.id} />}
            </div>
        </div>
    );
}
