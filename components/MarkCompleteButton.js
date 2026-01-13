'use client'

import { updateJobStatus } from '@/app/actions/updateJob';
import { useState } from 'react';

export default function MarkCompleteButton({ jobId }) {
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('status', 'Complete');

        setLoading(true);
        await updateJobStatus(formData);
        // Page will revalidate and update
        setLoading(false);
    };

    return (
        <button
            onClick={handleComplete}
            disabled={loading}
            style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                border: '1px solid var(--success)',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 500
            }}
        >
            {loading ? '...' : 'Mark Complete'}
        </button>
    );
}
