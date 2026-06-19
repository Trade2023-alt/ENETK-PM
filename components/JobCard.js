'use client'

import Link from 'next/link';
import MarkCompleteButton from './MarkCompleteButton';
import { useState, useEffect } from 'react';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobCard({ job, userRole, onDelete }) {
    const [mounted, setMounted] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState(job.title || '');

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleTitleSave = async () => {
        setIsEditingTitle(false);
        if (titleVal.trim() !== '' && titleVal !== job.title) {
            const formData = new FormData();
            formData.append('job_id', job.id);
            formData.append('title', titleVal);
            await updateJobStatus(formData);
        } else {
            setTitleVal(job.title || '');
        }
    };

    const statusBadgeClass = {
        'Scheduled': 'badge-danger',
        'In Progress': 'badge-warning',
        'Complete': 'badge-success'
    };

    const formatDate = (dateStr) => {
        if (!mounted) return dateStr;
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    };

    const statusClass = job.status === 'Complete' ? 'job-card-complete' : job.status === 'In Progress' ? 'job-card-in-progress' : 'job-card-scheduled';

    return (
        <div className={`card card-condensed ${statusClass}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                {isEditingTitle ? (
                    <input 
                        type="text" 
                        value={titleVal}
                        onChange={(e) => setTitleVal(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                        autoFocus
                        style={{ fontSize: '1.17em', fontWeight: 'bold', width: '100%', background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '0.1rem 0.25rem', outline: 'none' }}
                    />
                ) : (
                    <h3 onClick={() => setIsEditingTitle(true)} style={{ color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.5rem' }} title="Click to edit title">
                        {job.title || 'Untitled Job'}
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>✏️</span>
                    </h3>
                )}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <span className={`badge ${statusBadgeClass[job.status] || ''}`}>
                        {job.status}
                    </span>
                </div>
            </div>

            <p style={{ color: 'var(--text-muted)' }}>
                {job.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📅 {formatDate(job.scheduled_date)}</span>
                    <span>📍 {job.customer_address}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>👤 {job.customer_name}</span>
                    <span>👑 Lead: <strong style={{ color: 'var(--primary)' }}>{job.lead_name || 'Unassigned'}</strong></span>
                </div>
                
                {/* Job Completion Progress Bar */}
                {(() => {
                    const subTasks = job.sub_tasks || [];
                    const pct = subTasks.length > 0
                        ? Math.round(subTasks.reduce((sum, st) => sum + (st.completion_percent || 0), 0) / subTasks.length)
                        : (job.status === 'Complete' ? 100 : (job.status === 'In Progress' ? 50 : 0));
                    return (
                        <div style={{ margin: '0.35rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                <span>Completion</span>
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{pct}%</span>
                            </div>
                            <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, background: 'var(--success)', height: '100%', transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        👥 {job.assigned_users || 'Unassigned'}
                    </span>
                    <span>⏱️ {job.actual_hours || 0} / {job.estimated_hours || 0} hrs</span>
                </div>
            </div>

            <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link href={`/jobs/${job.id}`} style={{
                        color: 'var(--primary)',
                        fontWeight: 500
                    }}>
                        View Details →
                    </Link>
                    {userRole === 'admin' && (
                        <button 
                            onClick={onDelete}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                            title="Delete Job"
                        >
                            🗑️
                        </button>
                    )}
                </div>
                {job.status !== 'Complete' && <MarkCompleteButton jobId={job.id} />}
            </div>
        </div>
    );
}
