'use client'

import { useState, useRef } from 'react';
import { bulkCreateSubTasks } from '@/app/actions/subtasks';
import { useRouter } from 'next/navigation';

export default function BulkSubTaskForm({ jobs, users }) {
    const router = useRouter();
    const [rows, setRows] = useState([
        { title: '', job_id: '', priority: 'Normal', assigned_user_ids: [], due_date: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [defaultJobId, setDefaultJobId] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    
    const fileInputRef = useRef(null);

    const addRow = () => {
        setRows([...rows, { title: '', job_id: '', priority: 'Normal', assigned_user_ids: [], due_date: '' }]);
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

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setMessage(null);

        // 1. Handle MPP Binary via proxy API route
        if (file.name.endsWith('.mpp')) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/mpp', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                if (data.tasks && data.tasks.length > 0) {
                    populateRowsFromImport(data.tasks);
                } else {
                    throw new Error('No tasks returned by parser.');
                }
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: err.message || 'Failed to parse MPP file. Ensure the Docker container is running.' });
            } finally {
                setIsParsing(false);
            }
            return;
        }

        // 2. Handle XML and CSV client-side
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result;
                if (file.name.endsWith('.xml')) {
                    parseXMLProject(text);
                } else if (file.name.endsWith('.csv')) {
                    parseCSVProject(text);
                } else {
                    throw new Error('Unsupported format. Please upload .mpp, .xml, or .csv');
                }
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: err.message || 'Failed to parse file.' });
                setIsParsing(false);
            }
        };
        reader.readAsText(file);
    };

    const parseXMLProject = (xmlText) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
        if (parserError) throw new Error('Invalid XML format.');

        const tasksNode = xmlDoc.getElementsByTagName('Tasks')[0];
        if (!tasksNode) throw new Error('No tasks found.');

        const tasksList = tasksNode.getElementsByTagName('Task');
        const tasks = [];

        for (let i = 0; i < tasksList.length; i++) {
            const taskNode = tasksList[i];
            const outlineLevelStr = taskNode.getElementsByTagName('OutlineLevel')[0]?.textContent || '1';
            const outlineLevel = parseInt(outlineLevelStr);
            if (outlineLevel === 0) continue; // Skip root project summary task

            const name = taskNode.getElementsByTagName('Name')[0]?.textContent || 'Unnamed Task';
            const finish = taskNode.getElementsByTagName('Finish')[0]?.textContent?.split('T')[0] || '';
            
            tasks.push({ name, finish });
        }

        populateRowsFromImport(tasks);
    };

    const parseCSVProject = (csvText) => {
        const lines = csvText.split('\n');
        if (lines.length < 2) throw new Error('CSV is empty.');

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('title'));
        const finishIdx = headers.findIndex(h => h.toLowerCase().includes('finish') || h.toLowerCase().includes('end') || h.toLowerCase().includes('due'));

        if (nameIdx === -1) throw new Error('CSV must contain a "Name" or "Title" column.');

        const tasks = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
            if (cols.length <= nameIdx) continue;

            const name = cols[nameIdx] || 'Unnamed Task';
            const finish = cols[finishIdx] ? cols[finishIdx].split(' ')[0] : '';
            tasks.push({ name, finish });
        }

        populateRowsFromImport(tasks);
    };

    const populateRowsFromImport = (importedTasks) => {
        const newRows = importedTasks.map(t => ({
            title: t.name || t.title || 'Unnamed Task',
            job_id: defaultJobId,
            priority: 'Normal',
            assigned_user_ids: [],
            due_date: t.finish || t.due_date || ''
        }));

        // Append to existing non-empty rows, or overwrite if all are empty
        const filteredCurrent = rows.filter(r => r.title !== '');
        if (filteredCurrent.length === 0) {
            setRows(newRows);
        } else {
            setRows([...filteredCurrent, ...newRows]);
        }
        
        setMessage({ type: 'success', text: `Imported ${newRows.length} tasks from Microsoft Project schedule!` });
        setIsParsing(false);
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Import toolbar */}
            <div className="card flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex-1 min-w-[200px]">
                        <label className="label uppercase tracking-wider text-xs font-bold block mb-1">
                            Default Job/Project
                        </label>
                        <select
                          value={defaultJobId}
                          onChange={(e) => {
                              const val = e.target.value;
                              setDefaultJobId(val);
                              // Update empty rows to match default job
                              setRows(rows.map(r => r.job_id === '' ? { ...r, job_id: val } : r));
                          }}
                          className="input py-1.5 px-3 font-semibold text-slate-800"
                        >
                            <option value="">Select Target Project...</option>
                            {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                    {j.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <input
                      type="file"
                      accept=".mpp,.xml,.csv"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isParsing}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn flex items-center gap-2 bg-rose-50 text-rose-900 border-rose-200"
                    >
                        📤 {isParsing ? 'Importing...' : 'Import from MS Project (.MPP / .XML)'}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '0' }}>
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
                                            style={{ fontSize: '0.875rem' }}
                                            placeholder="Enter task name..."
                                            required
                                            value={row.title}
                                            onChange={(e) => updateRow(idx, 'title', e.target.value)}
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
            </div>
        </form>
    );
}
