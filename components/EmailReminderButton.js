'use client'

import { useState } from 'react';
import { sendManualReminder } from '@/app/actions/sendReminder';

export default function EmailReminderButton({ jobId }) {
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!jobId) {
            alert('Job ID is missing');
            return;
        }
        setLoading(true);
        const result = await sendManualReminder(jobId);
        setLoading(false);
        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            alert(result.message || 'Reminder sent successfully!');
        }
    };

    return (
        <button
            className="btn"
            style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'var(--card-border)' }}
            onClick={handleSend}
            disabled={loading}
        >
            {loading ? 'Sending...' : '🔔 Send Reminder'}
        </button>
    );
}
