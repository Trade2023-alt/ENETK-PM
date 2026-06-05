'use client'

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getReportCustomers, getCustomerReportData, updateReportSubTask } from '@/app/actions/reports';


export default function ReportsPage() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [jobsData, setJobsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            loadReportData(selectedCustomerId);
        } else {
            setJobsData([]);
        }
    }, [selectedCustomerId]);

    const loadCustomers = async () => {
        const data = await getReportCustomers();
        setCustomers(data);
        if (data.length > 0) {
            setSelectedCustomerId(data[0].id.toString());
        } else {
            setLoading(false);
        }
    };

    const loadReportData = async (customerId) => {
        setLoading(true);
        const { jobs } = await getCustomerReportData(customerId);
        setJobsData(jobs || []);
        setLoading(false);
    };

    const handleUpdateTask = async (taskId, field, value) => {
        // Optimistic UI update
        const updatedJobs = jobsData.map(job => ({
            ...job,
            sub_tasks: job.sub_tasks.map(task => 
                task.id === taskId ? { ...task, [field]: value } : task
            )
        }));
        setJobsData(updatedJobs);

        // Server update
        setSaving(true);
        await updateReportSubTask(taskId, { [field]: value });
        setSaving(false);
    };

    // Calculate Completion Percentages
    const calculateJobCompletion = (job) => {
        if (!job.sub_tasks || job.sub_tasks.length === 0) return 0;
        const total = job.sub_tasks.reduce((sum, task) => sum + (task.completion_percent || 0), 0);
        return Math.round(total / job.sub_tasks.length);
    };

    const overallProjectCompletion = jobsData.length === 0 ? 0 : 
        Math.round(jobsData.reduce((sum, job) => sum + calculateJobCompletion(job), 0) / jobsData.length);

    // Format Date helper
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    return (
        <div className="container" style={{ maxWidth: '100%', padding: '1rem' }}>
            <Header />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Customer Project Reports</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Aggregate view of project tasks and completion status.</p>
                </div>
                <div style={{ width: '300px' }}>
                    <label className="label">Select Customer</label>
                    <select 
                        className="input" 
                        value={selectedCustomerId} 
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">-- Select Customer --</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="card text-center" style={{ padding: '3rem' }}>Loading report data...</div>
            ) : !selectedCustomerId ? (
                <div className="card text-center" style={{ padding: '3rem' }}>Please select a customer to view reports.</div>
            ) : jobsData.length === 0 ? (
                <div className="card text-center" style={{ padding: '3rem' }}>No active jobs found for this customer.</div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    
                    {/* Top Summary Section (Excel Style) */}
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '250px 250px 1fr 50px', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold' }}>All Tasks</div>
                            <div style={{ fontWeight: 'bold' }}>Total Project Completion</div>
                            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${overallProjectCompletion}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.5s ease' }}></div>
                            </div>
                            <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{overallProjectCompletion}</div>
                        </div>

                        {jobsData.map(job => {
                            const jobComp = calculateJobCompletion(job);
                            return (
                                <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '250px 250px 1fr 50px', gap: '1rem', alignItems: 'center', padding: '0.25rem 0' }}>
                                    <div style={{ fontWeight: 500 }}>{job.title}</div>
                                    <div>Overall Completion</div>
                                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${jobComp}%`, background: 'var(--primary)', height: '100%', opacity: 0.8, transition: 'width 0.5s ease' }}></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>{jobComp}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Details Table Section */}
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Task</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sub-Task</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Scope of Work</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '130px' }}>Start</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '130px' }}>End Date</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '150px' }}>Current Status</th>
                                    <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '100px' }}>% Complete</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobsData.map(job => (
                                    (job.sub_tasks || []).map((task, idx) => {
                                        const isComplete = task.status === 'Complete';
                                        const isProgress = task.status === 'In Progress' || (task.completion_percent > 0 && task.completion_percent < 100);
                                        
                                        const statusBg = isComplete ? 'rgba(16, 185, 129, 0.1)' : isProgress ? 'rgba(245, 158, 11, 0.1)' : 'transparent';
                                        const statusColor = isComplete ? 'var(--success)' : isProgress ? 'var(--warning)' : 'var(--text-muted)';
                                        
                                        return (
                                            <tr key={task.id} style={{ borderBottom: '1px solid var(--card-border)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                {/* Task (Job Title) */}
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                    {idx === 0 ? job.title : ''}
                                                </td>
                                                
                                                {/* Sub-Task */}
                                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                    {task.title}
                                                </td>
                                                
                                                {/* Scope of Work */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                    <textarea 
                                                        style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', padding: '0.75rem 1rem', resize: 'vertical', color: 'var(--foreground)' }}
                                                        value={task.description || ''}
                                                        onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                                                        placeholder="Enter scope..."
                                                    />
                                                </td>
                                                
                                                {/* Start Date */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                    <input 
                                                        type="date"
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)' }}
                                                        value={formatDateForInput(task.start_date)}
                                                        onChange={(e) => handleUpdateTask(task.id, 'start_date', e.target.value)}
                                                    />
                                                </td>
                                                
                                                {/* End Date */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                    <input 
                                                        type="date"
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)' }}
                                                        value={formatDateForInput(task.due_date)}
                                                        onChange={(e) => handleUpdateTask(task.id, 'due_date', e.target.value)}
                                                    />
                                                </td>
                                                
                                                {/* Current Status */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)', background: statusBg }}>
                                                    <select 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', cursor: 'pointer', color: statusColor, fontWeight: 600 }}
                                                        value={task.status || 'Not Started'}
                                                        onChange={(e) => handleUpdateTask(task.id, 'status', e.target.value)}
                                                    >
                                                        <option value="Not Started" style={{color: 'black'}}>Not Started</option>
                                                        <option value="Pending" style={{color: 'black'}}>Pending</option>
                                                        <option value="In Progress" style={{color: 'black'}}>In Progress</option>
                                                        <option value="Complete" style={{color: 'black'}}>Complete</option>
                                                    </select>
                                                </td>
                                                
                                                {/* % Complete */}
                                                <td style={{ padding: '0', verticalAlign: 'middle', borderRight: '1px solid var(--card-border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem' }}>
                                                        <div style={{ width: '40px', background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '4px', marginRight: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${task.completion_percent || 0}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.3s ease' }}></div>
                                                        </div>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            style={{ width: '45px', border: 'none', background: 'transparent', padding: '0', textAlign: 'right', color: 'var(--foreground)' }}
                                                            value={task.completion_percent || 0}
                                                            onChange={(e) => handleUpdateTask(task.id, 'completion_percent', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </td>
                                                
                                                {/* Notes */}
                                                <td style={{ padding: '0', verticalAlign: 'top' }}>
                                                    <textarea 
                                                        style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', padding: '0.75rem 1rem', resize: 'vertical', color: 'var(--foreground)' }}
                                                        value={task.notes || ''}
                                                        onChange={(e) => handleUpdateTask(task.id, 'notes', e.target.value)}
                                                        placeholder="Enter notes..."
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
