'use client'

import { useState, useEffect } from 'react';
import { updateJobStatus } from '@/app/actions/updateJob';
import { updateSubTask, deleteSubTask } from '@/app/actions/subtasks';
import { deleteJob } from '@/app/actions/deleteJob';
import { getTodoItems } from '@/app/actions/todo';
import { reassignTaskAction } from '@/app/actions/reassign';

export default function TodoListClient({ initialTasks, users, currentUserId, userRole }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [filter, setFilter] = useState('active'); // active, completed, all
    const [typeFilter, setTypeFilter] = useState('subtasks'); // all, jobs, subtasks
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date'); // date, priority
    const [selectedUser, setSelectedUser] = useState(currentUserId);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // Default to grid view like Microsoft Planner
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTitleVal, setEditingTitleVal] = useState('');
    const [contextMenu, setContextMenu] = useState(null); // { x, y, task }
    const [hoveredMenuItem, setHoveredMenuItem] = useState(null);

    const loadTasks = async (userId) => {
        setLoading(true);
        const res = await getTodoItems(userId);
        if (!res.error) {
            setTasks(res.tasks);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTasks(selectedUser);
    }, [selectedUser]);

    useEffect(() => {
        const handleClose = () => {
            setContextMenu(null);
        };
        window.addEventListener('click', handleClose);
        return () => window.removeEventListener('click', handleClose);
    }, []);

    const handleContextMenu = (e, task) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Simple screen boundary check
        const menuWidth = 160;
        const menuHeight = 125;
        let x = e.clientX;
        let y = e.clientY;
        
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }
        
        setContextMenu({ x, y, task });
    };

    const handleReassignTask = async (task, targetUserId) => {
        setContextMenu(null);
        setLoading(true);
        try {
            const itemType = task.type === 'Job' ? 'job' : 'subtask';
            const res = await reassignTaskAction({
                itemId: task.originalId,
                itemType: itemType,
                userId: targetUserId
            });
            if (res.error) throw new Error(res.error);
            
            // Reload tasks for the selected user
            await loadTasks(selectedUser);
        } catch (err) {
            console.error('Error reassigning task:', err);
            alert('Failed to reassign task: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const handleSaveTitle = async (task) => {
        setEditingTaskId(null);
        if (editingTitleVal.trim() === '' || editingTitleVal === task.title) return;

        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: editingTitleVal } : t));

        const formData = new FormData();
        if (task.type === 'Job') {
            formData.append('job_id', task.originalId);
            formData.append('title', editingTitleVal);
            await updateJobStatus(formData);
        } else {
            formData.append('id', task.originalId);
            formData.append('job_id', task.jobId);
            formData.append('title', editingTitleVal);
            await updateSubTask(formData);
        }
    };

    const handleDelete = async (task) => {
        if (!confirm(`Are you sure you want to delete this ${task.type.toLowerCase()}?`)) return;

        // Optimistic UI update
        setTasks(prev => prev.filter(t => t.id !== task.id));

        if (task.type === 'Job') {
            await deleteJob(task.originalId);
        } else {
            await deleteSubTask(task.originalId, task.jobId);
        }
    };

    const sortedAndFiltered = tasks
        .filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.customer.toLowerCase().includes(search.toLowerCase());
            const isComplete = t.status === 'Complete' || t.status === 'Completed';

            // Status Filter
            if (filter === 'active' && isComplete) return false;
            if (filter === 'completed' && !isComplete) return false;

            // Type Filter
            if (typeFilter === 'jobs' && t.type !== 'Job') return false;
            if (typeFilter === 'subtasks' && t.type === 'Job') return false;

            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'priority') {
                const weights = { 'Urgent': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
                return (weights[b.priority] || 0) - (weights[a.priority] || 0);
            }
            return new Date(a.date || '9999-12-31') - new Date(b.date || '9999-12-31');
        });

    const parseJobDetails = (task) => {
        const title = task.title || '';
        const parentTitle = task.parentTitle || '';
        
        let jobNumber = task.jobId ? `#${task.jobId}` : (task.originalId ? `#${task.originalId}` : 'N/A');
        let cleanTitle = title;
        
        const match = title.match(/\b\d{3}-\d{4}\b/) || parentTitle.match(/\b\d{3}-\d{4}\b/);
        if (match) {
            jobNumber = match[0];
            cleanTitle = title
                .replace(/^\d+-\d+\s*(:|-|🛠️|🚀)?\s*/, '')
                .replace(/\s*\(\b\d{3}-\d{4}\b\)/, '')
                .trim();
            if (!cleanTitle) cleanTitle = title;
        }
        
        return {
            jobNumber,
            jobName: cleanTitle
        };
    };

    const priorityColors = {
        'Urgent': '#ef4444',
        'High': '#f59e0b',
        'Normal': '#3b82f6',
        'Low': '#6b7280'
    };

    const statusBorderColors = {
        'Pending': 'var(--danger)',
        'Scheduled': 'var(--danger)',
        'In Progress': 'var(--warning)',
        'Complete': 'var(--success)',
        'Completed': 'var(--success)'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Planner-style View Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                <button
                    onClick={() => setViewMode('grid')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '0.5rem',
                        background: viewMode === 'grid' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                        border: viewMode === 'grid' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                        color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>田</span> Grid
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '0.5rem',
                        background: viewMode === 'list' ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
                        border: viewMode === 'list' ? '1px solid rgba(159, 18, 57, 0.3)' : '1px solid transparent',
                        color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>☰</span> List
                </button>
            </div>

            {/* Controls */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '350px' }}>
                    <input
                        type="text"
                        placeholder="Search tasks or customers..."
                        className="input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <select className="input" style={{ width: '130px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="all">All Items</option>
                    </select>
                    <select className="input" style={{ width: '130px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="jobs">Jobs Only</option>
                        <option value="subtasks">Sub-tasks Only</option>
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

            {/* List / Grid Container */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: 'none' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>Loading tasks...</div>
                ) : sortedAndFiltered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tasks found for this view.
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Planner Grid View */
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Name</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>Job Number</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '130px' }}>Due Date</th>
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFiltered.map(task => {
                                    const isComplete = task.status === 'Complete' || task.status === 'Completed';
                                    const { jobNumber, jobName } = parseJobDetails(task);
                                    const statusColor = statusBorderColors[task.status] || 'var(--primary)';
                                    return (
                                        <tr key={task.id} style={{
                                            borderBottom: '1px solid var(--card-border)',
                                            background: isComplete ? 'rgba(255,255,255,0.01)' : 'transparent',
                                            transition: 'background 0.2s',
                                            cursor: 'context-menu'
                                        }} 
                                        className="grid-row"
                                        onContextMenu={(e) => handleContextMenu(e, task)}
                                        >
                                            <td style={{ 
                                                padding: '0.75rem 1rem', 
                                                verticalAlign: 'middle', 
                                                textAlign: 'center',
                                                borderLeft: `5px solid ${statusColor}`
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isComplete}
                                                    onChange={() => handleToggle(task)}
                                                    style={{ 
                                                        width: '1.25rem', 
                                                        height: '1.25rem', 
                                                        cursor: 'pointer',
                                                        borderRadius: '50%',
                                                        display: 'inline-block'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                                                {editingTaskId === task.id ? (
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        value={editingTitleVal}
                                                        onChange={(e) => setEditingTitleVal(e.target.value)}
                                                        onBlur={() => handleSaveTitle(task)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(task)}
                                                        autoFocus
                                                        style={{ 
                                                            fontSize: '0.95rem', 
                                                            fontWeight: 500, 
                                                            padding: '0.2rem 0.5rem', 
                                                            background: 'rgba(255,255,255,0.05)', 
                                                            color: 'var(--foreground)', 
                                                            border: '1px solid var(--primary)', 
                                                            borderRadius: '4px',
                                                            outline: 'none',
                                                            width: '100%',
                                                            maxWidth: '400px'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span 
                                                                onClick={() => {
                                                                    setEditingTaskId(task.id);
                                                                    setEditingTitleVal(task.title);
                                                                }}
                                                                style={{
                                                                    fontWeight: 500,
                                                                    fontSize: '0.95rem',
                                                                    textDecoration: isComplete ? 'line-through' : 'none',
                                                                    color: isComplete ? 'var(--text-muted)' : 'var(--foreground)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Click to edit name"
                                                            >
                                                                {jobName} <span style={{ fontSize: '0.75rem', opacity: 0.3, marginLeft: '0.25rem' }}>✏️</span>
                                                            </span>
                                                            <span style={{
                                                                 fontSize: '0.65rem',
                                                                 padding: '0.1rem 0.35rem',
                                                                 borderRadius: '4px',
                                                                 background: task.type === 'Job' ? 'rgba(59, 130, 246, 0.1)' : task.type === 'Follow-up' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                                                                 color: task.type === 'Job' ? '#3b82f6' : task.type === 'Follow-up' ? '#f43f5e' : '#8b5cf6',
                                                                 fontWeight: 600,
                                                                 whiteSpace: 'nowrap'
                                                             }}>
                                                                 {task.type}
                                                             </span>
                                                         </div>
                                                         {task.parentTitle && (
                                                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                                 📂 Part of: {task.parentTitle}
                                                             </span>
                                                         )}
                                                         {task.assignedTo && (
                                                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                 👤 Assignee: <strong style={{ color: 'var(--foreground)' }}>{task.assignedTo}</strong>
                                                             </span>
                                                         )}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: isComplete ? 'var(--text-muted)' : 'var(--foreground)', fontSize: '0.9rem' }}>
                                                📍 {task.customer}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '6px',
                                                    background: 'rgba(255,255,255,0.12)',
                                                    border: '1px solid var(--card-border)',
                                                    color: isComplete ? 'var(--text-muted)' : 'var(--foreground)',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600
                                                }}>
                                                    {jobNumber}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: isComplete ? 'var(--text-muted)' : 'var(--foreground)', fontSize: '0.9rem' }}>
                                                {task.date ? (() => {
                                                    try {
                                                        const d = new Date(task.date + 'T00:00:00');
                                                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                                    } catch {
                                                        return task.date;
                                                    }
                                                })() : '—'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handleDelete(task)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title={`Delete ${task.type}`}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Original List View */
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {sortedAndFiltered.map(task => {
                            const isComplete = task.status === 'Complete' || task.status === 'Completed';
                            const statusColor = statusBorderColors[task.status] || 'var(--primary)';
                            return (
                                <div key={task.id} style={{
                                    padding: '1.25rem',
                                    borderBottom: '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    background: isComplete ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    transition: 'all 0.2s',
                                    borderLeft: `5px solid ${statusColor}`,
                                    cursor: 'context-menu'
                                }}
                                onContextMenu={(e) => handleContextMenu(e, task)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isComplete}
                                        onChange={() => handleToggle(task)}
                                        style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                                    />

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            {editingTaskId === task.id ? (
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={editingTitleVal}
                                                    onChange={(e) => setEditingTitleVal(e.target.value)}
                                                    onBlur={() => handleSaveTitle(task)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(task)}
                                                    autoFocus
                                                    style={{ 
                                                        fontSize: '1rem', 
                                                        fontWeight: 'bold', 
                                                        padding: '0.2rem 0.5rem', 
                                                        background: 'rgba(255,255,255,0.05)', 
                                                        color: 'var(--foreground)', 
                                                        border: '1px solid var(--primary)', 
                                                        borderRadius: '4px',
                                                        outline: 'none',
                                                        width: '100%',
                                                        maxWidth: '400px'
                                                    }}
                                                />
                                            ) : (
                                                <h4 
                                                    onClick={() => {
                                                        setEditingTaskId(task.id);
                                                        setEditingTitleVal(task.title);
                                                    }}
                                                    style={{
                                                        fontSize: '1rem',
                                                        margin: 0,
                                                        textDecoration: isComplete ? 'line-through' : 'none',
                                                        color: isComplete ? 'var(--text-muted)' : 'inherit',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Click to edit name"
                                                >
                                                    {task.title} <span style={{ fontSize: '0.75rem', opacity: 0.3, marginLeft: '0.25rem' }}>✏️</span>
                                                </h4>
                                            )}
                                            <span style={{
                                                 fontSize: '0.7rem',
                                                 padding: '0.1rem 0.4rem',
                                                 borderRadius: '4px',
                                                 background: task.type === 'Job' ? 'rgba(59, 130, 246, 0.1)' : task.type === 'Follow-up' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                                                 color: task.type === 'Job' ? '#3b82f6' : task.type === 'Follow-up' ? '#f43f5e' : '#8b5cf6',
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
                                             {task.assignedTo && <span>👤 Assignee: <strong style={{ color: 'var(--foreground)' }}>{task.assignedTo}</strong></span>}
                                         </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {task.type === 'Job' && (
                                            <a href={`/jobs/${task.originalId}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>
                                                View Details →
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(task)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                                            title={`Delete ${task.type}`}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Custom Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        zIndex: 10000,
                        padding: '0.25rem 0',
                        minWidth: '160px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        onClick={() => {
                            setEditingTaskId(contextMenu.task.id);
                            setEditingTitleVal(contextMenu.task.title);
                            setContextMenu(null);
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#f8fafc',
                            transition: 'background 0.2s',
                            fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        ✏️ Edit Name
                    </div>
                    <div
                        onMouseEnter={() => setHoveredMenuItem('reassign')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            color: '#f8fafc',
                            background: hoveredMenuItem === 'reassign' ? '#334155' : 'transparent',
                            transition: 'background 0.2s',
                            fontWeight: 500,
                            position: 'relative'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👤 Reassign To</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>▶</span>

                        {hoveredMenuItem === 'reassign' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '100%',
                                    top: 0,
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                    padding: '0.25rem 0',
                                    minWidth: '150px',
                                    zIndex: 10001,
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}
                            >
                                {users.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleReassignTask(contextMenu.task, u.id);
                                        }}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            color: '#f8fafc',
                                            transition: 'background 0.2s',
                                            fontWeight: 500
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        👤 {u.username}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div
                        onClick={async () => {
                            setContextMenu(null);
                            await handleDelete(contextMenu.task);
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#ef4444',
                            transition: 'background 0.2s',
                            fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        🗑️ Delete
                    </div>
                </div>
            )}
        </div>
    );
}
