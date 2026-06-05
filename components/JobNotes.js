'use client'

import { useState } from 'react';
import { addJobNote } from '@/app/actions/notes';

export default function JobNotes({ jobId, initialNotes = [] }) {
    const [notes, setNotes] = useState(initialNotes);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

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
            setNotes([result.note, ...notes]);
            setContent('');
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📝</span> Job Notes History
                </h2>
            </div>

            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        className="input" 
                        placeholder="Add a timestamped note about this job..." 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        style={{ flex: 1 }}
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !content.trim()}>
                        {loading ? 'Adding...' : 'Add Note'}
                    </button>
                </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                        No notes recorded for this job yet.
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} style={{ 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            border: '1px solid var(--card-border)', 
                            borderRadius: 'var(--radius)', 
                            padding: '0.75rem 1rem' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                    {note.user?.username || 'System User'}
                                </span>
                                <span>
                                    {new Date(note.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                {note.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
