'use client'

import MarkCompleteButton from './MarkCompleteButton';
import { useState, useEffect } from 'react';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobCard({ job, userRole, onDelete, onClick }) {
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

    const isHidden = job.is_hidden;

    return (
        <div className="card" style={{ 
            opacity: isHidden ? 0.6 : 1, 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            cursor: onClick ? 'pointer' : 'default'
        }}
        onClick={(e) => {
            if (onClick && !e.target.closest('button') && !e.target.closest('input')) {
                onClick();
            }
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className={`badge ${statusBadgeClass[job.status] || 'badge-success'}`}>{job.status}</span>
                <span className="badge" style={{ background: 'transparent', color: 'var(--text-muted)' }}>{job.priority || 'Normal'}</span>
            </div>
            
            {isEditingTitle ? (
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    <input 
                        type="text" 
                        value={titleVal} 
                        onChange={(e) => setTitleVal(e.target.value)}
                        className="input"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '1rem', height: 'auto' }}
                        autoFocus
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    />
                </div>
            ) : (
                <h3 
                    style={{ fontSize: '1.125rem', marginBottom: '0.25rem', cursor: 'text' }}
                    onDoubleClick={() => setIsEditingTitle(true)}
                >
                    {job.title}
                </h3>
            )}
            
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', flexGrow: 1 }}>
                {job.customer_name && <div style={{ marginBottom: '0.25rem' }}>🏢 {job.customer_name}</div>}
                {job.job_number && <div style={{ marginBottom: '0.25rem' }}>#️⃣ {job.job_number}</div>}
                {job.due_date && <div style={{ color: 'var(--warning)', marginBottom: '0.25rem' }}>📅 Due: {formatDate(job.due_date)}</div>}
                
                {(() => {
                    let totalVal = 0;
                    if (job.completion_percent !== undefined && job.completion_percent !== null) {
                        totalVal = job.completion_percent;
                    } else if (job.status === 'Complete') {
                        totalVal = 100;
                    } else if (job.status === 'In Progress') {
                        totalVal = 50;
                    }

                    return (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                <span>Progress</span>
                                <span>{totalVal}%</span>
                            </div>
                            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${totalVal}%`, background: 'var(--success)', height: '100%' }} />
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div style={{
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {onClick ? (
                        <button onClick={onClick} style={{
                            background: 'none', border: 'none', padding: 0,
                            color: 'var(--primary)',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}>
                            View Details →
                        </button>
                    ) : (
                        <a href={`/jobs/${job.id}`} style={{
                            color: 'var(--primary)',
                            fontWeight: 500
                        }}>
                            View Details →
                        </a>
                    )}
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
