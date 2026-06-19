'use client'

import { useState, useMemo } from 'react';
import { addJobNote } from '@/app/actions/notes';

const MAROON = '#7b1e3a';

function formatDayLabel(value) {
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTimeLabel(value) {
    return new Date(value).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function dayKey(value) {
    const d = new Date(value);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function JobNotes({ jobId, initialNotes = [], initialSubTaskNotes = [] }) {
    const [jobNotes, setJobNotes] = useState(initialNotes);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    const merged = useMemo(() => {
        const jobEntries = jobNotes.map(note => ({
            ...note,
            note_type: 'job',
            sub_task_title: null
        }));
        const subTaskEntries = initialSubTaskNotes.map(note => ({
            ...note,
            note_type: 'subtask',
            sub_task_title: note.sub_task_title || note.sub_task?.title || 'Task'
        }));
        return [...jobEntries, ...subTaskEntries].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }, [jobNotes, initialSubTaskNotes]);

    const groupedByDay = useMemo(() => {
        const groups = [];
        let current = null;
        for (const note of merged) {
            const key = dayKey(note.created_at);
            if (!current || current.key !== key) {
                current = { key, label: formatDayLabel(note.created_at), notes: [] };
                groups.push(current);
            }
            current.notes.push(note);
        }
        return groups;
    }, [merged]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('content', content);

        const result = await addJobNote(formData);

        if (result.error) {
            alert(result.error);
        } else if (result.note) {
            setJobNotes([result.note, ...jobNotes]);
            setContent('');
            setAdding(false);
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📝</span> Notes History
                </h2>
                <button
                    type="button"
                    onClick={() => setAdding(a => !a)}
                    className="btn"
                    style={{ fontSize: '0.8rem', background: MAROON, color: '#fff' }}
                >
                    {adding ? 'Cancel' : '+ Add Job Note'}
                </button>
            </div>

            {adding && (
                <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <textarea
                            rows={2}
                            className="input"
                            placeholder="Add a timestamped note about this job..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            style={{ flex: 1, resize: 'vertical' }}
                            disabled={loading}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading || !content.trim()} style={{ whiteSpace: 'nowrap' }}>
                            {loading ? 'Adding...' : 'Add Note'}
                        </button>
                    </div>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {groupedByDay.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                        No notes recorded for this job yet.
                    </div>
                ) : (
                    groupedByDay.map(group => (
                        <div key={group.key}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.75rem 0' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {group.label}
                                </span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {group.notes.map(note => {
                                    const isSubTask = note.note_type === 'subtask';
                                    return (
                                        <div
                                            key={`${note.note_type}-${note.id}`}
                                            style={{
                                                marginLeft: isSubTask ? '1.5rem' : '0',
                                                paddingLeft: isSubTask ? '0.75rem' : '0',
                                                borderLeft: isSubTask ? `2px solid ${MAROON}` : 'none'
                                            }}
                                        >
                                            <div style={{
                                                background: isSubTask ? 'rgba(123, 30, 58, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid var(--card-border)',
                                                borderRadius: 'var(--radius)',
                                                padding: '0.6rem 0.9rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.7rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            padding: '0.1rem 0.35rem',
                                                            borderRadius: '0.25rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.03em',
                                                            background: isSubTask ? 'rgba(123, 30, 58, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                            color: isSubTask ? MAROON : 'var(--primary)'
                                                        }}>
                                                            {isSubTask ? 'Task' : 'Job'}
                                                        </span>
                                                        {isSubTask && (
                                                            <span style={{ color: MAROON, fontWeight: 600 }}>
                                                                ↳ {note.sub_task_title}
                                                            </span>
                                                        )}
                                                        <span style={{ fontWeight: 700, color: isSubTask ? MAROON : 'var(--primary)' }}>
                                                            {note.user?.username || 'System User'}
                                                        </span>
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        {formatTimeLabel(note.created_at)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                                    {note.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
