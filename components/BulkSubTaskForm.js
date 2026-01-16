'use client'

import { useState } from 'react';
import { bulkCreateSubTasks } from '@/app/actions/subtasks';
import { useRouter } from 'next/navigation';

export default function BulkSubTaskForm({ jobs, users }) {
    const router = useRouter();
    const [rows, setRows] = useState([
        { title: '', description: '', job_id: '', priority: 'Normal', assigned_user_ids: [], due_date: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const addRow = () => {
        setRows([...rows, { title: '', description: '', job_id: '', priority: 'Normal', assigned_user_ids: [], due_date: '' }]);
    };

    const updateRow = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleAssignmentChange = (index, userId) => {
        const newRows = [...rows];
        const currentAssigned = newRows[index].assigned_user_ids;
        if (currentAssigned.includes(userId)) {
            newRows[index].assigned_user_ids = currentAssigned.filter(id => id !== userId);
        } else {
            newRows[index].assigned_user_ids = [...currentAssigned, userId];
        }
        setRows(newRows);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const result = await bulkCreateSubTasks(rows);
        if (result.success) {
            router.push('/todo');
        } else {
            setMessage({ type: 'error', text: result.error });
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '0' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PROJECT / JOB</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>TASK TITLE & DESCRIPTION</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PRIORITY</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>DUE DATE</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ASSIGNED TO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <td style={{ padding: '0.75rem' }}>
                                    <select
                                        className="input"
                                        style={{ fontSize: '0.875rem' }}
                                        required
                                        value={row.job_id}
                                        onChange={(e) => updateRow(idx, 'job_id', e.target.value)}
                                    >
                                        <option value="">Select Job...</option>
                                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}
                                        placeholder="Enter task name..."
                                        required
                                        value={row.title}
                                        onChange={(e) => updateRow(idx, 'title', e.target.value)}
                                    />
                                    <textarea
                                        className="input"
                                        style={{ fontSize: '0.75rem', minHeight: '40px', resize: 'vertical' }}
                                        placeholder="Add description (optional)..."
                                        value={row.description}
                                        onChange={(e) => updateRow(idx, 'description', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <select
                                        className="input"
                                        style={{ fontSize: '0.875rem' }}
                                        value={row.priority}
                                        onChange={(e) => updateRow(idx, 'priority', e.target.value)}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <input
                                        type="date"
                                        className="input"
                                        style={{ fontSize: '0.875rem' }}
                                        value={row.due_date}
                                        onChange={(e) => updateRow(idx, 'due_date', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--card-border)', borderRadius: '4px' }}>
                                        {users.map(u => (
                                            <label key={u.id} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.4rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={row.assigned_user_ids.includes(String(u.id))}
                                                    onChange={() => handleAssignmentChange(idx, String(u.id))}
                                                />
                                                {u.username}
                                            </label>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={addRow} className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    + Add More Rows
                </button>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {message && <div style={{ color: message.type === 'error' ? '#ef4444' : '#10b981', fontSize: '0.875rem' }}>{message.text}</div>}
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                        {loading ? 'Processing...' : '💾 Deploy All Tasks'}
                    </button>
                </div>
            </div>
        </form>
    );
}
