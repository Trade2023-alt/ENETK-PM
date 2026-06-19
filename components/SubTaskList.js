'use client'

import { createSubTask, updateSubTask, deleteSubTask } from '@/app/actions/subtasks';
import { addSubTaskNote, getSubTaskNotes } from '@/app/actions/notes';
import { useState } from 'react';

const MAROON = '#7b1e3a';

function formatNoteTime(value) {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', '').replace(/(\d{4}) /, '$1 at ');
}

function groupNotesBySubTask(notes = []) {
    const grouped = {};
    for (const note of notes) {
        const key = note.sub_task_id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(note);
    }
    for (const key of Object.keys(grouped)) {
        grouped[key].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return grouped;
}

function MultiDatePicker({ name, initialDates = [] }) {
    const [dates, setDates] = useState(initialDates);
    const [input, setInput] = useState('');

    const addDate = () => {
        if (input && !dates.includes(input)) {
            setDates([...dates, input].sort());
            setInput('');
        }
    };

    const removeDate = (d) => setDates(dates.filter(x => x !== d));

    return (
        <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ fontSize: '0.75rem', color: '#a78bfa' }}>◆ Intermittent Dates</label>
            <input type="hidden" name={name} value={JSON.stringify(dates)} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                <input type="date" className="input" style={{ padding: '0.25rem', fontSize: '0.75rem' }} value={input} onChange={e => setInput(e.target.value)} />
                <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#a78bfa', color: '#1a0508' }} onClick={addDate}>Add</button>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {dates.map(d => (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', background: 'rgba(167,139,250,0.1)', color: '#d8b4fe', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.7rem', gap: '0.2rem' }}>
                        {new Date(d).toLocaleDateString()}
                        <button type="button" onClick={() => removeDate(d)} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem' }}>&times;</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SubTaskList({ jobId, subTasks, users, initialSubTaskNotes = [] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [addingChildTo, setAddingChildTo] = useState(null);
    const [notesOpen, setNotesOpen] = useState(new Set());
    const [subTaskNotes, setSubTaskNotes] = useState(() => groupNotesBySubTask(initialSubTaskNotes));
    const [loadedSubTasks, setLoadedSubTasks] = useState(() => new Set(Object.keys(groupNotesBySubTask(initialSubTaskNotes))));
    const [noteDrafts, setNoteDrafts] = useState({});
    const [savingNote, setSavingNote] = useState(null);

    const toggleNotes = async (taskId) => {
        setNotesOpen(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });

        if (!loadedSubTasks.has(taskId.toString())) {
            setLoadedSubTasks(prev => new Set(prev).add(taskId.toString()));
            const notes = await getSubTaskNotes(taskId);
            setSubTaskNotes(prev => ({ ...prev, [taskId]: notes }));
        }
    };

    const handleAddNote = async (taskId) => {
        const content = (noteDrafts[taskId] || '').trim();
        if (!content) return;

        setSavingNote(taskId);
        const formData = new FormData();
        formData.append('sub_task_id', taskId);
        formData.append('job_id', jobId);
        formData.append('content', content);

        const result = await addSubTaskNote(formData);
        if (result.error) {
            alert(result.error);
        } else if (result.note) {
            setSubTaskNotes(prev => ({
                ...prev,
                [taskId]: [result.note, ...(prev[taskId] || [])]
            }));
            setNoteDrafts(prev => ({ ...prev, [taskId]: '' }));
        }
        setSavingNote(null);
    };

    // Form fragment used for both adding top-level and adding child
    const TaskForm = ({ parentId = null, onCancel }) => (
        <form action={async (formData) => { 
            const result = await createSubTask(formData); 
            if (result && result.error) {
                alert(result.error);
                return;
            }
            if (parentId) setAddingChildTo(null);
            else setIsAdding(false);
        }} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '0.5rem' }}>
            <input type="hidden" name="job_id" value={jobId} />
            {parentId && <input type="hidden" name="parent_id" value={parentId} />}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input name="title" placeholder="Task Title" className="input" required autoFocus />
                <select 
                    multiple 
                    name="assigned_user_ids" 
                    className="input" 
                    style={{ height: '80px', padding: '0.25rem' }}
                    title="Ctrl+Click to select multiple"
                >
                    {users.map(u => (
                        <option key={u.id} value={u.id} style={{ padding: '0.1rem 0.25rem', fontSize: '0.75rem' }}>
                            {u.username}
                        </option>
                    ))}
                </select>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input name="start_date" type="date" className="input" title="Start Date" />
                    <input name="due_date" type="date" className="input" title="End Date" />
                </div>
                <select name="priority" className="input" defaultValue="Normal">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                </select>
            </div>
            <MultiDatePicker name="additional_dates" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '150px' }}>
                    <input name="estimated_hours" type="number" step="0.5" placeholder="Est. Hours" className="input" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={onCancel} className="btn" style={{ fontSize: '0.875rem', background: 'var(--card-border)' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Save Task</button>
                </div>
            </div>
        </form>
    );

    const renderTaskNode = (task, level = 0) => {
        const isEditing = editingTaskId === task.id;
        const isAddingChild = addingChildTo === task.id;
        const children = subTasks.filter(t => t.parent_id === task.id);

        return (
            <div key={task.id}>
                {isEditing ? (
                    <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--card-border)', marginLeft: `${level * 2}rem` }}>
                        <form action={async (formData) => {
                            const result = await updateSubTask(formData);
                            if (result && result.error) {
                                alert(result.error);
                                return;
                            }
                            setEditingTaskId(null);
                        }}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="job_id" value={jobId} />

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input name="title" defaultValue={task.title} className="input" required placeholder="Task Title" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <input name="start_date" type="date" className="input" defaultValue={task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : ''} title="Start Date" style={{ padding: '0.25rem', fontSize: '0.75rem' }} />
                                    <input name="due_date" type="date" className="input" defaultValue={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''} title="End Date" style={{ padding: '0.25rem', fontSize: '0.75rem' }} />
                                </div>
                                <input name="estimated_hours" type="number" step="0.5" className="input" defaultValue={task.estimated_hours} placeholder="Est. Hrs" />
                                <select name="priority" className="input" defaultValue={task.priority || 'Normal'}>
                                    <option value="Low">Low</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                            <select 
                                multiple 
                                name="assigned_user_ids" 
                                className="input" 
                                style={{ height: '80px', padding: '0.25rem', marginBottom: '0.5rem' }}
                                title="Ctrl+Click to select multiple"
                                defaultValue={task.assigned_ids ? task.assigned_ids.toString().split(',') : []}
                            >
                                {users.map(u => (
                                    <option key={u.id} value={u.id} style={{ padding: '0.1rem 0.25rem', fontSize: '0.75rem' }}>
                                        {u.username}
                                    </option>
                                ))}
                            </select>

                            <MultiDatePicker name="additional_dates" initialDates={task.additional_dates || []} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                <div style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem' }}>Add Hrs:</label>
                                        <input name="used_hours" type="number" step="0.5" className="input" defaultValue="0" style={{ width: '70px', display: 'inline-block', marginLeft: '0.5rem', padding: '0.4rem' }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Current: {task.used_hours}h</span>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem' }}>% Complete:</label>
                                        <input name="completion_percent" type="number" min="0" max="100" className="input" defaultValue={task.completion_percent || 0} style={{ width: '70px', display: 'inline-block', marginLeft: '0.5rem', padding: '0.4rem' }} />
                                    </div>
                                </div>
                                <button type="button" onClick={() => setEditingTaskId(null)} className="btn" style={{ fontSize: '0.75rem', background: 'var(--card-border)' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Save Changes</button>
                            </div>
                        </form>
                    </li>
                ) : (
                    <li style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid var(--card-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        opacity: task.status === 'Complete' ? 0.6 : 1,
                        marginLeft: `${level * 2}rem`,
                        borderLeft: level > 0 ? '2px solid var(--glass-border)' : 'none',
                        paddingLeft: level > 0 ? '1rem' : '0.75rem'
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
                                    {task.title} <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>({task.completion_percent || 0}%)</span>
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

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Used: {task.used_hours}h</div>
                            <button onClick={() => toggleNotes(task.id)} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(123, 30, 58, 0.1)', color: MAROON, borderColor: 'rgba(123, 30, 58, 0.25)' }} title="Task Notes">
                                📝 Notes ({(subTaskNotes[task.id] || []).length})
                            </button>
                            <button onClick={() => { setAddingChildTo(task.id); setIsAdding(false); setEditingTaskId(null); }} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderColor: 'rgba(59, 130, 246, 0.2)' }} title="Add Micro Task">
                                + Micro Task
                            </button>
                            <button onClick={() => { setEditingTaskId(task.id); setIsAdding(false); setAddingChildTo(null); }} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--card-border)' }}>
                                Edit
                            </button>
                            <button 
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this task?')) {
                                        await deleteSubTask(task.id, jobId);
                                    }
                                }} 
                                className="btn" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                )}

                {notesOpen.has(task.id) && (
                    <div style={{
                        marginLeft: `${level * 2 + 1.5}rem`,
                        marginTop: '0.25rem',
                        marginBottom: '0.5rem',
                        paddingLeft: '0.75rem',
                        borderLeft: `2px solid ${MAROON}`
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {(subTaskNotes[task.id] || []).length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    No notes yet for this task.
                                </div>
                            ) : (
                                (subTaskNotes[task.id] || []).map(note => (
                                    <div key={note.id} style={{
                                        background: 'rgba(123, 30, 58, 0.04)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem 0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: MAROON, fontSize: '0.8rem' }}>
                                                {note.user?.username || 'System User'}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {formatNoteTime(note.created_at)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                            {note.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <textarea
                                rows={2}
                                className="input"
                                placeholder="Add a note to this task..."
                                value={noteDrafts[task.id] || ''}
                                onChange={e => setNoteDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                                style={{ flex: 1, resize: 'vertical', fontSize: '0.8rem' }}
                                disabled={savingNote === task.id}
                            />
                            <button
                                type="button"
                                onClick={() => handleAddNote(task.id)}
                                className="btn"
                                disabled={savingNote === task.id || !(noteDrafts[task.id] || '').trim()}
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: MAROON, color: '#fff', whiteSpace: 'nowrap' }}
                            >
                                {savingNote === task.id ? 'Adding...' : 'Add Note'}
                            </button>
                        </div>
                    </div>
                )}

                {isAddingChild && (
                    <div style={{ marginLeft: `${(level + 1) * 2}rem`, marginTop: '0.5rem' }}>
                        <TaskForm parentId={task.id} onCancel={() => setAddingChildTo(null)} />
                    </div>
                )}

                {children.length > 0 && (
                    <div style={{ marginTop: '0' }}>
                        {children.map(child => renderTaskNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const rootTasks = subTasks.filter(t => !t.parent_id);

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Sub Tasks</h3>
                <button onClick={() => { setIsAdding(!isAdding); setAddingChildTo(null); setEditingTaskId(null); }} className="btn" style={{ fontSize: '0.875rem', background: 'var(--card-border)' }}>
                    {isAdding ? 'Cancel' : '+ Add Sub Task'}
                </button>
            </div>

            {isAdding && <TaskForm onCancel={() => setIsAdding(false)} />}

            {subTasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No sub-tasks yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {rootTasks.map(task => renderTaskNode(task, 0))}
                </ul>
            )}
        </div>
    );
}
