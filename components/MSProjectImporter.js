'use client'

import { useState, useRef } from 'react';
import { importMSProject } from '@/app/actions/importProject';
import { useRouter } from 'next/navigation';

// Parse ISO 8601 duration (PT3718H14M23.69S) to hours
function parseDuration(str) {
    if (!str) return 0;
    const match = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseFloat(match[3] || 0);
    return Math.round((h + m / 60 + s / 3600) * 100) / 100;
}

// Parse date from XML datetime string
function parseXMLDate(str) {
    if (!str) return null;
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function getTagValue(el, tag) {
    const child = el.getElementsByTagName(tag)[0];
    return child ? child.textContent : null;
}

function percentToStatus(pct) {
    const n = parseInt(pct || '0');
    if (n >= 100) return 'Complete';
    if (n > 0) return 'In Progress';
    return 'Scheduled';
}

export default function MSProjectImporter({ users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileRef = useRef(null);
    const router = useRouter();

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setError(null);
        setResult(null);
        setParsing(true);

        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/xml');

            // Check for parse errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML file. Please export your MS Project file as XML first (File → Save As → XML).');
            }

            // Parse Resources (for reference)
            const resourceMap = {};
            const resourceEls = doc.getElementsByTagName('Resource');
            for (let i = 0; i < resourceEls.length; i++) {
                const r = resourceEls[i];
                const uid = getTagValue(r, 'UID');
                const name = getTagValue(r, 'Name');
                const type = getTagValue(r, 'Type');
                if (uid && name && type === '1') { // Type 1 = Work resource (person)
                    resourceMap[uid] = name;
                }
            }

            // Parse Assignments (TaskUID → ResourceUID mapping)
            const assignmentMap = {}; // taskUID → [resourceName, ...]
            const assignEls = doc.getElementsByTagName('Assignment');
            for (let i = 0; i < assignEls.length; i++) {
                const a = assignEls[i];
                const taskUID = getTagValue(a, 'TaskUID');
                const resUID = getTagValue(a, 'ResourceUID');
                if (taskUID && resUID && resourceMap[resUID]) {
                    if (!assignmentMap[taskUID]) assignmentMap[taskUID] = [];
                    assignmentMap[taskUID].push(resourceMap[resUID]);
                }
            }

            // Parse Tasks — build tree using OutlineLevel
            const taskEls = doc.getElementsByTagName('Task');
            const allTasks = [];
            for (let i = 0; i < taskEls.length; i++) {
                const t = taskEls[i];
                const uid = getTagValue(t, 'UID');
                const name = getTagValue(t, 'Name');
                const outlineLevel = parseInt(getTagValue(t, 'OutlineLevel') || '0');
                const isSummary = getTagValue(t, 'Summary') === '1';
                const isNull = getTagValue(t, 'IsNull') === '1';
                const active = getTagValue(t, 'Active') !== '0';
                const wbs = getTagValue(t, 'WBS');
                const start = getTagValue(t, 'Start');
                const finish = getTagValue(t, 'Finish');
                const work = getTagValue(t, 'Work');
                const actualWork = getTagValue(t, 'ActualWork');
                const remainingWork = getTagValue(t, 'RemainingWork');
                const percentComplete = getTagValue(t, 'PercentComplete');
                const priority = getTagValue(t, 'Priority');

                // Skip root project task (UID 0) and null/blank spacer rows
                if (uid === '0') continue;
                if (isNull && !name) continue;

                allTasks.push({
                    uid,
                    name: name || '(Untitled)',
                    outlineLevel,
                    isSummary,
                    isNull,
                    active,
                    wbs,
                    start: parseXMLDate(start),
                    finish: parseXMLDate(finish),
                    workHours: parseDuration(work),
                    actualWorkHours: parseDuration(actualWork),
                    remainingWorkHours: parseDuration(remainingWork),
                    percentComplete: parseInt(percentComplete || '0'),
                    status: percentToStatus(percentComplete),
                    priority: parseInt(priority || '500'),
                    resources: assignmentMap[uid] || []
                });
            }

            // Build hierarchical structure:
            // OutlineLevel 1 = top-level project groups (e.g. "SOGC Work")
            // OutlineLevel 2 = jobs within groups (e.g. "Sinclair State 2-36")
            // OutlineLevel 3+ = subtasks
            // Or if OutlineLevel 1 is not a summary, it's a standalone job

            const jobs = [];
            let currentGroup = null;
            let currentJob = null;

            for (const task of allTasks) {
                if (task.isNull && !task.name) continue; // skip blank spacers

                if (task.outlineLevel <= 1) {
                    // Top level — could be a group (Summary=1) or a standalone job
                    if (currentJob) {
                        jobs.push(currentJob);
                        currentJob = null;
                    }
                    if (task.isSummary) {
                        // It's a group header — its children at level 2 are the jobs
                        currentGroup = task;
                    } else {
                        // Standalone job at level 1
                        currentJob = {
                            title: task.name,
                            scheduled_date: task.start,
                            due_date: task.finish,
                            estimated_hours: task.workHours,
                            actual_hours: task.actualWorkHours,
                            status: task.status,
                            percentComplete: task.percentComplete,
                            resources: task.resources,
                            wbs: task.wbs,
                            subTasks: []
                        };
                    }
                } else if (task.outlineLevel === 2) {
                    // Could be a job under a group, or a subtask of a standalone level-1 job
                    if (currentJob && !currentGroup) {
                        // It's a subtask of the previous standalone job
                        currentJob.subTasks.push({
                            title: task.name,
                            start_date: task.start,
                            due_date: task.finish,
                            estimated_hours: task.workHours,
                            used_hours: task.actualWorkHours,
                            status: task.status,
                            percentComplete: task.percentComplete,
                            resources: task.resources,
                            subTasks: []
                        });
                    } else {
                        // New job under a group
                        if (currentJob) jobs.push(currentJob);

                        currentJob = {
                            title: task.name,
                            job_number: task.wbs,
                            scheduled_date: task.start,
                            due_date: task.finish,
                            estimated_hours: task.workHours,
                            actual_hours: task.actualWorkHours,
                            status: task.status,
                            percentComplete: task.percentComplete,
                            resources: task.resources,
                            groupName: currentGroup?.name,
                            wbs: task.wbs,
                            subTasks: []
                        };
                    }
                } else {
                    // Level 3+ — subtask of current job
                    if (currentJob) {
                        currentJob.subTasks.push({
                            title: task.name,
                            start_date: task.start,
                            due_date: task.finish,
                            estimated_hours: task.workHours,
                            used_hours: task.actualWorkHours,
                            status: task.status,
                            percentComplete: task.percentComplete,
                            resources: task.resources
                        });
                    }
                }
            }
            if (currentJob) jobs.push(currentJob);

            // Filter out empty/null jobs
            const validJobs = jobs.filter(j => j.title && j.title !== '(Untitled)');

            setPreview({
                jobs: validJobs,
                resourceMap,
                totalTasks: allTasks.length,
                fileName: file.name
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setParsing(false);
        }
    };

    const handleImport = async () => {
        if (!preview) return;
        setImporting(true);
        setError(null);

        try {
            const res = await importMSProject({ jobs: preview.jobs });
            if (res.success) {
                setResult(res);
                setTimeout(() => router.refresh(), 500);
            } else {
                setError(res.error || 'Import failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <>
            <button onClick={() => setShowModal(true)} className="btn" style={{ fontSize: '0.82rem' }}>
                📥 Import MS Project
            </button>

            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
                    <div style={{
                        background: '#1a0508', border: '1px solid var(--card-border)',
                        borderRadius: '1rem', padding: '2rem', maxWidth: '900px', width: '100%',
                        maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>📥 Import Microsoft Project File</h2>
                            <button onClick={handleClose} style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)',
                                borderRadius: '8px', color: 'var(--foreground)', padding: '0.3rem 0.8rem',
                                cursor: 'pointer', fontSize: '0.85rem'
                            }}>✕ Close</button>
                        </div>

                        {/* Success state */}
                        {result && (
                            <div style={{
                                padding: '1.5rem', background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.75rem',
                                marginBottom: '1rem', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                                <h3 style={{ color: '#10b981', margin: '0 0 0.5rem' }}>Import Complete!</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Successfully imported <strong style={{ color: '#10b981' }}>{result.importedJobs}</strong> jobs
                                    and <strong style={{ color: '#10b981' }}>{result.importedSubtasks}</strong> sub-tasks.
                                </p>
                                <button onClick={handleClose} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                    Done — View in Gantt
                                </button>
                            </div>
                        )}

                        {/* Error state */}
                        {error && (
                            <div style={{
                                padding: '1rem', background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem',
                                marginBottom: '1rem', color: '#fca5a5', fontSize: '0.85rem'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* File upload */}
                        {!result && (
                            <>
                                <div style={{
                                    padding: '1.5rem', border: '2px dashed rgba(255,255,255,0.15)',
                                    borderRadius: '0.75rem', textAlign: 'center', marginBottom: '1.25rem',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                        Export your MS Project file as XML first:<br/>
                                        <strong>File → Save As → XML Format (*.xml)</strong>
                                    </p>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".xml"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="btn btn-primary"
                                        disabled={parsing}
                                    >
                                        {parsing ? '⏳ Parsing XML...' : '📂 Select XML File'}
                                    </button>
                                </div>

                                {/* Preview */}
                                {preview && (
                                    <div>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '0.75rem', marginBottom: '1.25rem'
                                        }}>
                                            <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{preview.jobs.length}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Jobs Found</div>
                                            </div>
                                            <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                                                    {preview.jobs.reduce((sum, j) => sum + (j.subTasks?.length || 0), 0)}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sub-Tasks</div>
                                            </div>
                                            <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa' }}>
                                                    {Object.keys(preview.resourceMap).length}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resources</div>
                                            </div>
                                        </div>

                                        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Preview — Jobs to Import</h3>
                                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: '0.5rem' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Job Title</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Start</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Due</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Est Hrs</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Used</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>%</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Tasks</th>
                                                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Resources</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {preview.jobs.map((job, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                                                                {job.groupName && <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{job.groupName} → </span>}
                                                                {job.title}
                                                            </td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{job.scheduled_date || '—'}</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{job.due_date || '—'}</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{job.estimated_hours || 0}h</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: '#f59e0b' }}>{job.actual_hours || 0}h</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                                                                    background: job.percentComplete >= 100 ? 'rgba(16,185,129,0.2)' : job.percentComplete > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                                                                    color: job.percentComplete >= 100 ? '#10b981' : job.percentComplete > 0 ? '#f59e0b' : 'var(--text-muted)'
                                                                }}>{job.percentComplete}%</span>
                                                            </td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{job.subTasks?.length || 0}</td>
                                                            <td style={{ padding: '0.5rem', fontSize: '0.72rem', color: '#a78bfa' }}>
                                                                {job.resources?.join(', ') || '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                            <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="btn btn-secondary">
                                                Cancel
                                            </button>
                                            <button onClick={handleImport} className="btn btn-primary" disabled={importing}>
                                                {importing ? '⏳ Importing...' : `✅ Import ${preview.jobs.length} Jobs`}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
