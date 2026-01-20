'use client'

import { useState } from 'react';
import { addLessonLearned, deleteLessonLearned, updateLessonLearned } from '@/app/actions/lessons';

const CATEGORIES = [
    'What Went Well',
    'What Could Improve',
    'Safety Concern',
    'Process Improvement',
    'Client Feedback',
    'Technical Issue',
    'Resource Issue',
    'Other'
];

const IMPACT_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export default function LessonsLearned({ jobId, initialLessons = [] }) {
    const [lessons, setLessons] = useState(initialLessons);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        formData.append('job_id', jobId);

        const result = await addLessonLearned(formData);

        if (result.success) {
            setLessons([result.lesson, ...lessons]);
            setIsAdding(false);
            e.target.reset();
        } else {
            alert(result.error || 'Failed to add lesson');
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this lesson learned?')) return;
        const result = await deleteLessonLearned(id, jobId);
        if (result.success) {
            setLessons(lessons.filter(l => l.id !== id));
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'What Went Well': return '#10b981';
            case 'What Could Improve': return '#f59e0b';
            case 'Safety Concern': return '#ef4444';
            case 'Process Improvement': return '#3b82f6';
            case 'Client Feedback': return '#8b5cf6';
            case 'Technical Issue': return '#ec4899';
            case 'Resource Issue': return '#f97316';
            default: return '#6b7280';
        }
    };

    const filteredLessons = searchQuery
        ? lessons.filter(l =>
            l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : lessons;

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📝 Lessons Learned
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '100px' }}>
                        {lessons.length}
                    </span>
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {lessons.length > 0 && (
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input"
                            style={{ width: '150px', padding: '0.4rem', fontSize: '0.8rem' }}
                        />
                    )}
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="btn"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    >
                        {isAdding ? 'Cancel' : '+ Add'}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label className="label">Category</label>
                            <select name="category" className="input" required>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Impact Level</label>
                            <select name="impact" className="input" required>
                                {IMPACT_LEVELS.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Title</label>
                        <input name="title" className="input" placeholder="Brief summary of the lesson..." required />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Description / Details</label>
                        <textarea name="description" className="input" rows="3" placeholder="Describe what happened, what was learned, and recommendations for the future..." required />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                        {loading ? 'Saving...' : 'Save Lesson Learned'}
                    </button>
                </form>
            )}

            {/* Lessons List */}
            {filteredLessons.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredLessons.map(lesson => (
                        <div key={lesson.id} style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '0.5rem',
                            borderLeft: `4px solid ${getCategoryColor(lesson.category)}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '4px',
                                        background: getCategoryColor(lesson.category),
                                        color: '#fff',
                                        marginRight: '0.5rem'
                                    }}>
                                        {lesson.category}
                                    </span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '4px',
                                        background: lesson.impact === 'Critical' ? '#ef4444' :
                                            lesson.impact === 'High' ? '#f59e0b' :
                                                lesson.impact === 'Medium' ? '#3b82f6' : '#6b7280',
                                        color: '#fff'
                                    }}>
                                        {lesson.impact}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDelete(lesson.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem' }}
                                >
                                    ×
                                </button>
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{lesson.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                {lesson.description}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                                Added {new Date(lesson.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                    {searchQuery ? 'No lessons match your search.' : 'No lessons learned recorded yet. Add feedback to improve future projects.'}
                </div>
            )}
        </div>
    );
}
