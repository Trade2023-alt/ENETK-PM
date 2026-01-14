'use client'

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getProspects, updateProspect } from '@/app/actions/prospects';

export default function PipelinePage() {
    const [prospects, setProspects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getProspects();
        setProspects(data);
        setLoading(false);
    };


    const toggleContacted = async (id, current) => {
        await updateProspect(id, { is_contacted: !current });
        loadData();
    };

    const filtered = prospects.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.description.toLowerCase().includes(filter.toLowerCase()) ||
        p.state.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="container">
            <Header />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Sales Pipeline</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage potential customers and outreach.</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Filter by name, industry, or state..."
                    className="form-control"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name / State</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Priority</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contacted?</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.state} - {p.location_city}</div>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{p.description}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        background: p.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: p.priority === 'HIGH' ? '#ef4444' : 'inherit'
                                    }}>
                                        {p.priority}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button
                                        onClick={() => toggleContacted(p.id, p.is_contacted)}
                                        className="btn"
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.75rem',
                                            background: p.is_contacted ? '#10b981' : 'rgba(255,255,255,0.05)',
                                            color: p.is_contacted ? 'white' : 'inherit'
                                        }}
                                    >
                                        {p.is_contacted ? 'YES' : 'NO'}
                                    </button>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.8125rem' }}>
                                    {p.phone && <div>📞 {p.phone}</div>}
                                    {p.email && <div>✉️ {p.email}</div>}
                                    {p.website && <a href={p.website} target="_blank" style={{ color: 'var(--primary)' }}>🌐 Website</a>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
