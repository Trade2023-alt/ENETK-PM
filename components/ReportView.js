'use client'

import { useState } from 'react';
import Link from 'next/link';

export default function ReportView({ jobs, subTasks, users }) {
    const [copied, setCopied] = useState(false);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

    // Filter Overdue
    const overdueJobs = jobs.filter(j => j.status !== 'Complete' && j.status !== 'Completed' && j.due_date && new Date(j.due_date) < today);
    const overdueSubTasks = subTasks.filter(t => t.status !== 'Complete' && t.due_date && new Date(t.due_date) < today);

    // Filter Weekly Completed
    const completedThisWeek = jobs.filter(j => {
        // Assuming we have a completed_date or we just check status + scheduled_date fall in range?
        // DB doesn't track completed_at yet. Use scheduled_date as proxy for now or just status.
        const d = new Date(j.scheduled_date);
        return j.status === 'Complete' && d >= startOfWeek && d <= endOfWeek;
    });

    const totalUsedHours = jobs.reduce((acc, j) => acc + (j.actual_hours || 0), 0);
    const totalEstHours = jobs.reduce((acc, j) => acc + (j.estimated_hours || 0), 0);

    const generateEmailText = () => {
        let text = `Weekly Report (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()})\n\n`;

        text += `SUMMARY:\n`;
        text += `- Completed Jobs: ${completedThisWeek.length}\n`;
        text += `- Total Hours Used: ${totalUsedHours}\n`;
        text += `- Efficiency: ${Math.round((totalUsedHours / (totalEstHours || 1)) * 100)}% of Estimates\n\n`;

        text += `OVERDUE ITEMS (${overdueJobs.length + overdueSubTasks.length}):\n`;
        overdueJobs.forEach(j => text += `[JOB] ${j.title} (Due: ${new Date(j.due_date).toLocaleDateString()})\n`);
        overdueSubTasks.forEach(t => text += `[SUB] ${t.title} (Due: ${new Date(t.due_date).toLocaleDateString()})\n`);

        return text;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateEmailText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'grid', gap: '2rem' }}>

            {/* Action Bar */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Weekly Summary</h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {startOfWeek.toLocaleDateString()} - {endOfWeek.toLocaleDateString()}
                    </div>
                </div>
                <button onClick={handleCopy} className="btn btn-primary">
                    {copied ? 'Copied to Clipboard!' : 'Copy Report for Email'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                {/* Overdue Alert */}
                <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>⚠️ Overdue Items</h3>
                    {overdueJobs.length === 0 && overdueSubTasks.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No overdue items! Great job.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {overdueJobs.map(j => (
                                <li key={'j' + j.id}>
                                    <Link href={`/jobs/${j.id}`} style={{ fontWeight: 500, color: 'var(--foreground)' }}>{j.title}</Link>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Job Due: {new Date(j.due_date).toLocaleDateString()}</div>
                                </li>
                            ))}
                            {overdueSubTasks.map(t => (
                                <li key={'t' + t.id}>
                                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Sub-task Due: {new Date(t.due_date).toLocaleDateString()}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Stats */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Performance</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{completedThisWeek.length}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jobs Completed</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalUsedHours}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours logged</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
