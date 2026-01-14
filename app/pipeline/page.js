'use client'

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getProspects, updateProspect, deleteProspect, createProspect } from '@/app/actions/prospects';

export default function PipelinePage() {
    const [prospects, setProspects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getProspects();
        setProspects(data);
        setLoading(false);
    };

    const handleEditStart = (prospect) => {
        setEditingId(prospect.id);
        setEditForm({ ...prospect });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!editForm) return;
        const res = await updateProspect(editingId, editForm);
        if (res.error) {
            alert('Update failed: ' + res.error);
        } else {
            setEditingId(null);
            setEditForm(null);
            loadData();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this prospect?')) return;
        const res = await deleteProspect(id);
        if (res.error) {
            alert('Delete failed: ' + res.error);
        } else {
            loadData();
        }
    };

    const handleAddStart = () => {
        setIsAdding(true);
        setEditForm({
            name: '',
            state: '',
            description: '',
            location_city: '',
            phone: '',
            email: '',
            website: '',
            priority: 'MED',
            is_contacted: false,
            comments: ''
        });
    };

    const handleSaveNew = async () => {
        const res = await createProspect(editForm);
        if (res.error) {
            alert('Creation failed: ' + res.error);
        } else {
            setIsAdding(false);
            setEditForm(null);
            loadData();
        }
    };

    const toggleContacted = async (id, current) => {
        await updateProspect(id, { is_contacted: !current });
        loadData();
    };

    const filtered = prospects.filter(p =>
        p.name?.toLowerCase().includes(filter.toLowerCase()) ||
        p.description?.toLowerCase().includes(filter.toLowerCase()) ||
        p.state?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="container">
            <Header />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>ENETK Prospects</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your lead pipeline and outreach.</p>
                </div>
                <button onClick={handleAddStart} className="btn btn-primary">
                    + Add New Prospect
                </button>
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

            {/* Addition Form Modal-like Overlay (Simplified) */}
            {(isAdding || editingId) && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>{isAdding ? 'Add New Prospect' : 'Edit Prospect'}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Company Name</label>
                                <input name="name" value={editForm?.name || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input name="state" value={editForm?.state || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input name="location_city" value={editForm?.location_city || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Description</label>
                                <input name="description" value={editForm?.description || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input name="phone" value={editForm?.phone || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" value={editForm?.email || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Website</label>
                                <input name="website" value={editForm?.website || ''} onChange={handleEditChange} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select name="priority" value={editForm?.priority || 'MED'} onChange={handleEditChange} className="form-control">
                                    <option value="HIGH">HIGH</option>
                                    <option value="MED">MED</option>
                                    <option value="LOW">LOW</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Comments</label>
                                <textarea name="comments" value={editForm?.comments || ''} onChange={handleEditChange} className="form-control" style={{ height: '80px' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); setEditForm(null); }} className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button onClick={isAdding ? handleSaveNew : handleSave} className="btn btn-primary">{isAdding ? 'Create Prospect' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name / State</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Priority</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contacted?</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Details</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
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
                                    {p.website && <a href={p.website} target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }}>🌐 Website</a>}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button onClick={() => handleEditStart(p)} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Edit</button>
                                        <button onClick={() => handleDelete(p.id)} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
