'use client'

import { createSubTask, updateSubTask } from '@/app/actions/subtasks';
import { useState } from 'react';

export default function SubTaskList({ jobId, subTasks, users }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Sub Tasks</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="btn" style={{ fontSize: '0.875rem', background: 'var(--card-border)' }}>
                    {isAdding ? 'Cancel' : '+ Add Sub Task'}
                </button>
            </div>

            {isAdding && (
                <form action={(formData) => { createSubTask(formData); setIsAdding(false); }} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '0.5rem' }}>
                    <input type="hidden" name="job_id" value={jobId} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <input name="title" placeholder="Task Title" className="input" required />
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: '0.25rem',
                            padding: '0.5rem',
                            maxHeight: '100px',
                            overflowY: 'auto',
                            border: '1px solid var(--input-border)',
                            background: 'var(--input-bg)',
                            borderRadius: '0.375rem'
                        }}>
                            {users.map(u => (
                                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                    <input type="checkbox" name="assigned_user_ids" value={u.id} />
                                    {u.username}
                                </label>
                            ))}
                        </div>
                        <input name="due_date" type="date" className="input" />
                        <select name="priority" className="input" defaultValue="Normal">
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '150px' }}>
                            <input name="estimated_hours" type="number" step="0.5" placeholder="Est. Hours" className="input" />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Save Task</button>
                    </div>
                </form>
            )}

            {subTasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No sub-tasks yet.</p>
            ) : (
                <ul style={{ listStyle: 'none' }}>
                    {subTasks.map(task => {
                        const isEditing = editingTaskId === task.id;

                        if (isEditing) {
                            return (
                                <li key={task.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--card-border)' }}>
                                    <form action={async (formData) => {
                                        await updateSubTask(formData);
                                        setEditingTaskId(null);
                                    }}>
                                        <input type="hidden" name="id" value={task.id} />
                                        <input type="hidden" name="job_id" value={jobId} />

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <input name="title" defaultValue={task.title} className="input" required placeholder="Task Title" />
                                            <input name="due_date" type="date" className="input" defaultValue={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''} />
                                            <input name="estimated_hours" type="number" step="0.5" className="input" defaultValue={task.estimated_hours} placeholder="Est. Hrs" />
                                            <select name="priority" className="input" defaultValue={task.priority || 'Normal'}>
                                                <option value="Low">Low</option>
                                                <option value="Normal">Normal</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                            gap: '0.25rem',
                                            marginBottom: '0.5rem',
                                            padding: '0.5rem',
                                            border: '1px solid var(--input-border)',
                                            background: 'var(--input-bg)',
                                            borderRadius: '0.375rem'
                                        }}>
                                            {users.map(u => {
                                                const assignedIds = task.assigned_ids ? task.assigned_ids.toString().split(',') : [];
                                                const isAssigned = assignedIds.includes(u.id.toString());
                                                return (
                                                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                                        <input type="checkbox" name="assigned_user_ids" value={u.id} defaultChecked={isAssigned} />
                                                        {u.username}
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.75rem' }}>Add Hrs:</label>
                                                <input name="used_hours" type="number" step="0.5" className="input" defaultValue="0" style={{ width: '80px', display: 'inline-block', marginLeft: '0.5rem' }} />
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Current: {task.used_hours}h</span>
                                            </div>
                                            <button type="button" onClick={() => setEditingTaskId(null)} className="btn" style={{ fontSize: '0.75rem', background: 'var(--card-border)' }}>Cancel</button>
                                            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Save Changes</button>
                                        </div>
                                    </form>
                                </li>
                            );
                        }

                        return (
                            <li key={task.id} style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid var(--card-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                opacity: task.status === 'Complete' ? 0.6 : 1
                            }}>
                                <form action={updateSubTask} style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="hidden" name="id" value={task.id} />
                                    <input type="hidden" name="job_id" value={jobId} />
                                    <input
                                        type="checkbox"
                                        name="status"
                                        onChange={(e) => e.target.form.requestSubmit()}
                                        defaultChecked={task.status === 'Complete'}
                                        style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                                    />
                                </form>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <div style={{ fontWeight: 500, textDecoration: task.status === 'Complete' ? 'line-through' : 'none' }}>
                                            {task.title}
                                        </div>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '0.25rem',
                                            background: task.priority === 'High' || task.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                            color: task.priority === 'High' || task.priority === 'Urgent' ? 'var(--danger)' : 'var(--text-muted)'
                                        }}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                                        <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Date'}</span>
                                        <span>Assigned: {task.assigned_ids ?
                                            users.filter(u => task.assigned_ids.split(',').includes(u.id.toString())).map(u => u.username).join(', ')
                                            : 'Unassigned'}
                                        </span>
                                        <span>Est: {task.estimated_hours}h</span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Used Hrs: {task.used_hours}</div>
                                    <button onClick={() => { setEditingTaskId(task.id); setIsAdding(false); }} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--card-border)' }}>
                                        Edit
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
