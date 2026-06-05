'use client'

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getReportCustomers, getCustomerReportData, updateReportSubTask } from '@/app/actions/reports';
import { format } from 'date-fns';

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
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    
                    {/* Top Summary Section (Excel Style) */}
                    <div style={{ padding: '1rem', borderBottom: '2px solid #3b82f6', background: '#f8fafc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '250px 250px 1fr 50px', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold' }}>All Tasks</div>
                            <div style={{ fontWeight: 'bold' }}>Total Project Completion</div>
                            <div style={{ width: '100%', background: '#e2e8f0', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: \`\${overallProjectCompletion}%\`, background: 'linear-gradient(90deg, #86efac 0%, #22c55e 100%)', height: '100%' }}></div>
                            </div>
                            <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{overallProjectCompletion}</div>
                        </div>

                        {jobsData.map(job => {
                            const jobComp = calculateJobCompletion(job);
                            return (
                                <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '250px 250px 1fr 50px', gap: '1rem', alignItems: 'center', padding: '0.25rem 0' }}>
                                    <div style={{ fontWeight: 500 }}>{job.title}</div>
                                    <div>Overall Completion</div>
                                    <div style={{ width: '100%', background: '#e2e8f0', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: \`\${jobComp}%\`, background: 'linear-gradient(90deg, #a7f3d0 0%, #10b981 100%)', height: '100%' }}></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>{jobComp}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Details Table Section */}
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ background: '#2563eb', color: 'white', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8' }}>Task</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8' }}>Sub-Task</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8' }}>Scope of Work</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8', width: '130px' }}>Start</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8', width: '130px' }}>End Date</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8', width: '150px' }}>Current Status</th>
                                    <th style={{ padding: '0.5rem 1rem', borderRight: '1px solid #1d4ed8', width: '100px' }}>% Complete</th>
                                    <th style={{ padding: '0.5rem 1rem' }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobsData.map(job => (
                                    (job.sub_tasks || []).map((task, idx) => {
                                        const isComplete = task.status === 'Complete';
                                        const isProgress = task.status === 'In Progress' || (task.completion_percent > 0 && task.completion_percent < 100);
                                        
                                        const statusBg = isComplete ? '#86efac' : isProgress ? '#fde047' : 'transparent';
                                        
                                        return (
                                            <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                                                {/* Task (Job Title) */}
                                                <td style={{ padding: '0.25rem 0.5rem', fontWeight: 500, verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                                    {idx === 0 ? job.title : ''}
                                                </td>
                                                
                                                {/* Sub-Task */}
                                                <td style={{ padding: '0.25rem 0.5rem', verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                                    {task.title}
                                                </td>
                                                
                                                {/* Scope of Work */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                                    <textarea 
                                                        style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem', resize: 'vertical' }}
                                                        value={task.description || ''}
                                                        onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                                                        placeholder="Enter scope..."
                                                    />
                                                </td>
                                                
                                                {/* Start Date */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                                    <input 
                                                        type="date"
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem' }}
                                                        value={formatDateForInput(task.start_date)}
                                                        onChange={(e) => handleUpdateTask(task.id, 'start_date', e.target.value)}
                                                    />
                                                </td>
                                                
                                                {/* End Date */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid #e2e8f0' }}>
                                                    <input 
                                                        type="date"
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem' }}
                                                        value={formatDateForInput(task.due_date)}
                                                        onChange={(e) => handleUpdateTask(task.id, 'due_date', e.target.value)}
                                                    />
                                                </td>
                                                
                                                {/* Current Status */}
                                                <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid #e2e8f0', background: statusBg }}>
                                                    <select 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                                                        value={task.status || 'Not Started'}
                                                        onChange={(e) => handleUpdateTask(task.id, 'status', e.target.value)}
                                                    >
                                                        <option value="Not Started">Not Started</option>
                                                        <option value="Pending">Pending</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Complete">Complete</option>
                                                    </select>
                                                </td>
                                                
                                                {/* % Complete */}
                                                <td style={{ padding: '0', verticalAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                                                        <div style={{ width: '40px', background: '#e2e8f0', height: '10px', borderRadius: '2px', marginRight: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: \`\${task.completion_percent || 0}%\`, background: '#22c55e', height: '100%' }}></div>
                                                        </div>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            style={{ width: '45px', border: 'none', background: 'transparent', padding: '0.25rem 0', textAlign: 'right' }}
                                                            value={task.completion_percent || 0}
                                                            onChange={(e) => handleUpdateTask(task.id, 'completion_percent', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </td>
                                                
                                                {/* Notes */}
                                                <td style={{ padding: '0', verticalAlign: 'top' }}>
                                                    <textarea 
                                                        style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem', resize: 'vertical' }}
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
