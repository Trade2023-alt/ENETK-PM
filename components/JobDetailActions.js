'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateJobStatus } from '@/app/actions/updateJob';

export default function JobDetailActions({ jobId, isHidden }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleToggleHide = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('is_hidden', (!isHidden).toString());
        await updateJobStatus(formData);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
                onClick={handleToggleHide} 
                className="btn" 
                style={{ 
                    background: isHidden ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: isHidden ? 'var(--success)' : '#ef4444',
                    border: `1px solid ${isHidden ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: '0.85rem'
                }}
                disabled={loading}
            >
                {loading ? 'Updating...' : isHidden ? '👁️ Unhide Job' : '🚫 Hide from Dashboard'}
            </button>
            <button 
                onClick={() => router.push('/')} 
                className="btn"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--card-border)',
                    fontSize: '0.85rem'
                }}
            >
                ✕ Close
            </button>
        </div>
    );
}
