'use client'

import { useState } from 'react';
import { setOnCallOverride, removeOnCallOverride, getOnCallRoster } from '@/app/actions/oncall';

// Default roster for client-side display
const ON_CALL_ROSTER = [
    'Matt Huber',
    'Loren McCray',
    'Rami Douri',
    'Seth Peterson',
    'Cole Kadrmas',
    'Jack Morris',
    'Kyle Merrill'
];

export default function OnCallEditor({ initialSchedule = [], userRole }) {
    const [schedule, setSchedule] = useState(initialSchedule);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async (weekStart, personName) => {
        setLoading(true);
        const res = await setOnCallOverride(weekStart, personName);
        if (res.success) {
            setSchedule(schedule.map(s =>
                s.weekStart === weekStart
                    ? { ...s, person: personName, isOverride: true }
                    : s
            ));
            setEditing(null);
        } else {
            alert(res.error || 'Failed to save');
        }
        setLoading(false);
    };

    const handleRevert = async (weekStart, defaultPerson) => {
        if (!confirm('Revert to default rotation?')) return;
        setLoading(true);
        const res = await removeOnCallOverride(weekStart);
        if (res.success) {
            setSchedule(schedule.map(s =>
                s.weekStart === weekStart
                    ? { ...s, person: defaultPerson, isOverride: false }
                    : s
            ));
        }
        setLoading(false);
    };

    if (userRole !== 'admin') {
        return null; // Only admins can edit
    }

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📞 On-Call Schedule Editor
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Click on a person's name to change who is on-call for that week. Changes override the default rotation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {schedule.map(week => (
                    <div key={week.weekStart} style={{
                        padding: '0.75rem',
                        background: week.isOverride ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        border: `1px solid ${week.isOverride ? 'rgba(239, 68, 68, 0.3)' : 'var(--card-border)'}`
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {new Date(week.weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.weekEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>

                        {editing === week.weekStart ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    defaultValue={week.person}
                                    onChange={(e) => handleSave(week.weekStart, e.target.value)}
                                    disabled={loading}
                                    className="input"
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem' }}
                                >
                                    {ON_CALL_ROSTER.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setEditing(null)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span
                                    onClick={() => setEditing(week.weekStart)}
                                    style={{
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: week.isOverride ? '#ef4444' : 'var(--foreground)'
                                    }}
                                >
                                    {week.person}
                                    {week.isOverride && <span style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}>✎</span>}
                                </span>
                                {week.isOverride && (
                                    <button
                                        onClick={() => handleRevert(week.weekStart, week.person)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '0.65rem'
                                        }}
                                        title="Revert to default"
                                    >
                                        ↩
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
