'use client'

export default function EmailReminderButton() {
    return (
        <button
            className="btn"
            style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'var(--card-border)' }}
            onClick={() => alert('Email notification logic would go here!')}
        >
            🔔 Send Reminder
        </button>
    );
}
