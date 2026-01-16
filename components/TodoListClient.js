'use client'

import { useState, useEffect } from 'react';
import { updateJobStatus } from '@/app/actions/updateJob';
import { updateSubTask } from '@/app/actions/subtasks';
import { getTodoItems } from '@/app/actions/todo';

export default function TodoListClient({ initialTasks, users, currentUserId, userRole }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [filter, setFilter] = useState('active'); // active, completed, all
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date'); // date, priority
    const [selectedUser, setSelectedUser] = useState(currentUserId);
    const [loading, setLoading] = useState(false);

    const loadTasks = async (userId) => {
        setLoading(true);
        const res = await getTodoItems(userId);
        if (!res.error) {
            setTasks(res.tasks);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (selectedUser !== currentUserId) {
            loadTasks(selectedUser);
        }
    }, [selectedUser]);

    const handleToggle = async (task) => {
        const newStatus = task.status === 'Complete' || task.status === 'Completed' ? 'In Progress' : 'Complete';

        // Optimistic UI
        const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
        setTasks(updatedTasks);

        const formData = new FormData();
        if (task.type === 'Job') {
            formData.append('job_id', task.originalId);
            formData.append('status', newStatus === 'Complete' ? 'Complete' : 'In Progress');
            await updateJobStatus(formData);
        } else {
            formData.append('id', task.originalId);
            formData.append('status', newStatus === 'Complete' ? 'on' : 'off');
            await updateSubTask(formData);
        }
    };

    const sortedAndFiltered = tasks
        .filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.customer.toLowerCase().includes(search.toLowerCase());
            const isComplete = t.status === 'Complete' || t.status === 'Completed';

            if (filter === 'active') return !isComplete && matchesSearch;
            if (filter === 'completed') return isComplete && matchesSearch;
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'priority') {
                const weights = { 'Urgent': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
                return (weights[b.priority] || 0) - (weights[a.priority] || 0);
            }
            return new Date(a.date || '9999-12-31') - new Date(b.date || '9999-12-31');
        });

    const priorityColors = {
        'Urgent': '#ef4444',
        'High': '#f59e0b',
        'Normal': '#3b82f6',
        'Low': '#6b7280'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Controls */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search tasks or customers..."
                        className="input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <select className="input" style={{ width: '150px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="all">All Items</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sort by:</span>
                    <select className="input" style={{ width: '120px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Date</option>
                        <option value="priority">Priority</option>
                    </select>

                    {userRole === 'admin' && (
                        <>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>User:</span>
                            <select className="input" style={{ width: '150px' }} value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>Loading tasks...</div>
                ) : sortedAndFiltered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tasks found for this view.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {sortedAndFiltered.map(task => {
                            const isComplete = task.status === 'Complete' || task.status === 'Completed';
                            return (
                                <div key={task.id} style={{
                                    padding: '1.25rem',
                                    borderBottom: '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    background: isComplete ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isComplete}
                                        onChange={() => handleToggle(task)}
                                        style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                                    />

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <h4 style={{
                                                fontSize: '1rem',
                                                margin: 0,
                                                textDecoration: isComplete ? 'line-through' : 'none',
                                                color: isComplete ? 'var(--text-muted)' : 'inherit'
                                            }}>
                                                {task.title}
                                            </h4>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                background: task.type === 'Job' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                color: task.type === 'Job' ? '#3b82f6' : '#8b5cf6',
                                                fontWeight: 600
                                            }}>
                                                {task.type}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                background: `${priorityColors[task.priority]}22`,
                                                color: priorityColors[task.priority],
                                                fontWeight: 700,
                                                border: `1px solid ${priorityColors[task.priority]}44`
                                            }}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>📍 {task.customer}</span>
                                            {task.parentTitle && <span>📂 Part of: {task.parentTitle}</span>}
                                            {task.date && <span>📅 {new Date(task.date).toLocaleDateString()}</span>}
                                        </div>
                                        {task.description && !isComplete && (
                                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                                {task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description}
                                            </p>
                                        )}
                                    </div>

                                    {task.type === 'Job' && (
                                        <a href={`/jobs/${task.originalId}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>
                                            View Details →
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
