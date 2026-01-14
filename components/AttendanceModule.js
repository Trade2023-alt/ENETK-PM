'use client'

import { useState, useEffect } from 'react';
import { checkIn, checkOut } from '@/app/actions/attendance';

export default function AttendanceModule({ initialStatus }) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = async () => {
        setLoading(true);
        const result = await checkIn();
        if (result.success) {
            window.location.reload(); // Refresh to update server-side state
        } else {
            console.error('Check-in error:', result.error);
            alert('Check-in failed: ' + result.error);
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!confirm('Are you sure you want to check out?')) return;
        setLoading(true);
        const result = await checkOut();
        if (result.success) {
            window.location.reload();
        } else {
            alert(result.error);
            setLoading(false);
        }
    };

    const isCheckedIn = !!status;

    return (
        <div className="card" style={{
            background: isCheckedIn ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            borderLeft: `4px solid ${isCheckedIn ? '#10b981' : '#6b7280'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '1.5rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Work Status</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>
                        {isCheckedIn ? 'Status: Active' : 'Status: Off Clock'}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{currentTime.toLocaleDateString()}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>

            {isCheckedIn ? (
                <div>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                        Checked in at: {new Date(status.check_in).toLocaleTimeString()}
                    </div>
                    <button
                        onClick={handleCheckOut}
                        disabled={loading}
                        className="btn"
                        style={{ width: '100%', background: 'var(--danger)', color: 'white' }}
                    >
                        {loading ? 'Processing...' : 'Check Out Now'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                >
                    {loading ? 'Processing...' : 'Check In to Shift'}
                </button>
            )}
        </div>
    );
}
