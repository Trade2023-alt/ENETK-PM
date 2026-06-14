'use client'

import { useState, useEffect, Fragment } from 'react';
import Header from '@/components/Header';
import { getReportCustomers, getCustomerReportData, updateReportSubTask, getGlobalReportData } from '@/app/actions/reports';
import { chatWithAI } from '@/app/actions/ai-chat';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend, 
    LineChart, 
    Line, 
    CartesianGrid 
} from 'recharts';
import { MessageSquare, X, Send, Bot, BarChart3, TrendingUp, Users, Clock } from 'lucide-react';

export default function ReportsPage() {
    const [isClient, setIsClient] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [globalJobs, setGlobalJobs] = useState([]);
    const [jobsData, setJobsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // AI Chat State
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Hello! I am Claude, your Reports AI Assistant. Ask me anything about estimated vs used hours, job completion rates, or customer summaries!' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        setIsClient(true);
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            loadReportData(selectedCustomerId);
        } else {
            setJobsData(globalJobs);
        }
    }, [selectedCustomerId, globalJobs]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const custs = await getReportCustomers();
            setCustomers(custs);
            
            const globalRes = await getGlobalReportData();
            if (globalRes && !globalRes.error) {
                setGlobalJobs(globalRes.jobs);
                setJobsData(globalRes.jobs);
            }
        } catch (e) {
            console.error("Error loading initial reports data:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadReportData = async (customerId) => {
        setLoading(true);
        try {
            const { jobs } = await getCustomerReportData(customerId);
            setJobsData(jobs || []);
        } catch (e) {
            console.error("Error loading report data:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTask = async (taskId, field, value) => {
        // Optimistic UI update
        const updatedJobs = jobsData.map(job => ({
            ...job,
            sub_tasks: job.sub_tasks.map(task => {
                if (task.id === taskId) {
                    const updatedTask = { ...task, [field]: value };
                    // Synchronize checkbox with percent complete if status is updated
                    if (field === 'status') {
                        updatedTask.completion_percent = value === 'Complete' ? 100 : (task.completion_percent === 100 ? 0 : task.completion_percent);
                    }
                    // Synchronize percent with status if completion_percent is updated
                    if (field === 'completion_percent') {
                        const pct = parseInt(value, 10) || 0;
                        updatedTask.status = pct === 100 ? 'Complete' : (pct > 0 ? 'In Progress' : 'Pending');
                    }
                    return updatedTask;
                }
                return task;
            })
        }));
        setJobsData(updatedJobs);

        // Update globalJobs local reference too
        setGlobalJobs(prev => prev.map(job => ({
            ...job,
            sub_tasks: job.sub_tasks.map(task => {
                if (task.id === taskId) {
                    const updatedTask = { ...task, [field]: value };
                    if (field === 'status') {
                        updatedTask.completion_percent = value === 'Complete' ? 100 : (task.completion_percent === 100 ? 0 : task.completion_percent);
                    }
                    if (field === 'completion_percent') {
                        const pct = parseInt(value, 10) || 0;
                        updatedTask.status = pct === 100 ? 'Complete' : (pct > 0 ? 'In Progress' : 'Pending');
                    }
                    return updatedTask;
                }
                return task;
            })
        })));

        // Server update
        setSaving(true);
        const updatePayload = { [field]: value };
        if (field === 'status') {
            updatePayload.completion_percent = value === 'Complete' ? 100 : 0;
        }
        if (field === 'completion_percent') {
            const pct = parseInt(value, 10) || 0;
            updatePayload.status = pct === 100 ? 'Complete' : (pct > 0 ? 'In Progress' : 'Pending');
        }
        await updateReportSubTask(taskId, updatePayload);
        setSaving(false);
    };

    // Calculate Completion Percentages
    const calculateJobCompletion = (job) => {
        if (!job.sub_tasks || job.sub_tasks.length === 0) {
            return job.status === 'Complete' ? 100 : (job.status === 'In Progress' ? 50 : 0);
        }
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

    // Prepare Charts Data
    const getCustomerChartData = () => {
        const counts = {};
        globalJobs.forEach(job => {
            const cName = job.customer?.name || 'Unassigned';
            if (!counts[cName]) {
                counts[cName] = { name: cName, Active: 0, Complete: 0 };
            }
            if (job.status === 'Complete') {
                counts[cName].Complete += 1;
            } else {
                counts[cName].Active += 1;
            }
        });
        return Object.values(counts);
    };

    const getHoursChartData = () => {
        return jobsData.slice(0, 10).map(job => {
            const subTasksActual = (job.sub_tasks || []).reduce((sum, st) => sum + (st.used_hours || 0), 0);
            const subTasksEst = (job.sub_tasks || []).reduce((sum, st) => sum + (st.estimated_hours || 0), 0);
            const actual = (job.actual_hours || 0) + subTasksActual;
            const est = (job.estimated_hours || 0) + subTasksEst;
            const comp = calculateJobCompletion(job);
            
            return {
                name: job.title.length > 15 ? job.title.substring(0, 12) + '...' : job.title,
                Estimated: est,
                Used: actual,
                Completion: comp
            };
        });
    };

    const totalEstHours = jobsData.reduce((sum, job) => {
        const subTasksEst = (job.sub_tasks || []).reduce((s, st) => s + (st.estimated_hours || 0), 0);
        return sum + (job.estimated_hours || 0) + subTasksEst;
    }, 0);

    const totalUsedHours = jobsData.reduce((sum, job) => {
        const subTasksActual = (job.sub_tasks || []).reduce((s, st) => s + (st.used_hours || 0), 0);
        return sum + (job.actual_hours || 0) + subTasksActual;
    }, 0);

    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        const userText = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
        setChatLoading(true);

        try {
            // Build the reports data context dynamically to feed Claude
            const reportsContextData = jobsData.map(j => {
                const subTasksActual = (j.sub_tasks || []).reduce((sum, st) => sum + (st.used_hours || 0), 0);
                const subTasksEst = (j.sub_tasks || []).reduce((sum, st) => sum + (st.estimated_hours || 0), 0);
                const actual = (j.actual_hours || 0) + subTasksActual;
                const est = (j.estimated_hours || 0) + subTasksEst;
                const pct = calculateJobCompletion(j);
                return {
                    job_title: j.title,
                    customer: j.customer?.name || 'Unassigned',
                    status: j.status,
                    estimated_hours: est,
                    used_hours: actual,
                    completion_percent: pct,
                    tasks: (j.sub_tasks || []).map(s => ({
                        title: s.title,
                        status: s.status,
                        completion_percent: s.completion_percent,
                        estimated_hours: s.estimated_hours,
                        used_hours: s.used_hours
                    }))
                };
            });

            const promptContext = `You are the ENETK Reports AI Assistant.
Here is the current live reports data on the screen:
${JSON.stringify(reportsContextData, null, 2)}

Total Estimated Hours: ${totalEstHours} hrs
Total Used Hours: ${totalUsedHours} hrs
Average Completion: ${overallProjectCompletion}%

Please analyze this data and answer the user's question. Provide summaries, list over-budget tasks, or suggest allocations:
User Question: ${userText}`;

            const res = await chatWithAI([{ role: 'user', content: promptContext }]);
            if (res.error) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${res.error}` }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
            }
        } catch (err) {
            console.error("Chat reports assistant error:", err);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I failed to get a response from the AI server.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '100%', padding: '1rem', paddingBottom: '5rem', position: 'relative' }}>
            <Header />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📊 Project Reports & Analytics
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Aggregate project tracking, estimating metrics, and completion rates.</p>
                </div>
                <div style={{ width: '300px' }}>
                    <label className="label">Filter by Customer</label>
                    <select 
                        className="input" 
                        value={selectedCustomerId} 
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">-- All Customers (Global View) --</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="card text-center" style={{ padding: '3rem' }}>Loading report metrics...</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeftColor: 'var(--primary)' }}>
                            <div style={{ fontSize: '2rem', color: 'var(--primary)' }}><BarChart3 /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Projects</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{jobsData.length}</div>
                            </div>
                        </div>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeftColor: 'var(--success)' }}>
                            <div style={{ fontSize: '2rem', color: 'var(--success)' }}><TrendingUp /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg. Completion</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{overallProjectCompletion}%</div>
                            </div>
                        </div>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeftColor: 'var(--warning)' }}>
                            <div style={{ fontSize: '2rem', color: 'var(--warning)' }}><Clock /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. vs Used Hours</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{totalEstHours}h / {totalUsedHours}h</div>
                            </div>
                        </div>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeftColor: 'deepskyblue' }}>
                            <div style={{ fontSize: '2rem', color: 'deepskyblue' }}><Users /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customers</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{customers.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recharts Graphical Dashboard */}
                    {isClient && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            {/* Chart 1: Jobs by Customer (Global View only) */}
                            {!selectedCustomerId && (
                                <div className="card" style={{ padding: '1.5rem', minHeight: '350px' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        👥 Projects by Customer
                                    </h3>
                                    <div style={{ width: '100%', height: '280px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getCustomerChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                                                <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                <Tooltip contentStyle={{ background: 'var(--background)', borderColor: 'var(--glass-border)', color: 'var(--foreground)' }} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar dataKey="Active" fill="var(--warning)" stackId="a" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="Complete" fill="var(--success)" stackId="a" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Chart 2: Hours & Completion comparison */}
                            <div className="card" style={{ padding: '1.5rem', minHeight: '350px', gridColumn: selectedCustomerId ? '1 / -1' : 'auto' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    ⏱️ Hours & Progress Analysis (Est vs Used vs %)
                                </h3>
                                <div style={{ width: '100%', height: '280px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getHoursChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                                            <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="var(--success)" fontSize={11} domain={[0, 100]} label={{ value: '% Complete', angle: 90, position: 'insideRight', fill: 'var(--success)', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ background: 'var(--background)', borderColor: 'var(--glass-border)', color: 'var(--foreground)' }} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar yAxisId="left" dataKey="Estimated" fill="rgba(255,255,255,0.15)" stroke="var(--glass-border)" name="Est. Hours" />
                                            <Bar yAxisId="left" dataKey="Used" fill="var(--primary)" name="Used Hours" />
                                            <Line yAxisId="right" type="monotone" dataKey="Completion" stroke="var(--success)" strokeWidth={2} name="% Complete" dot={{ r: 4 }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table View */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                        
                        {/* Summary Bar */}
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '250px 250px 1fr 60px', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontWeight: 'bold' }}>All Projects Scope</div>
                                <div style={{ fontWeight: 'bold' }}>Overall Progression</div>
                                <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
                                    <div style={{ width: `${overallProjectCompletion}%`, background: 'var(--success)', height: '100%', transition: 'width 0.5s ease' }}></div>
                                </div>
                                <div style={{ fontWeight: 'bold', textAlign: 'right', color: 'var(--success)' }}>{overallProjectCompletion}%</div>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Project / Job</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sub-Task</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Scope of Work</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '120px' }}>Start</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '120px' }}>End Date</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '140px' }}>Current Status</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '90px', textAlign: 'right' }}>Est. Hours</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '90px', textAlign: 'right' }}>Used Hours</th>
                                        <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '120px' }}>% Complete</th>
                                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobsData.map(job => {
                                        const subTasksActual = (job.sub_tasks || []).reduce((sum, st) => sum + (st.used_hours || 0), 0);
                                        const subTasksEst = (job.sub_tasks || []).reduce((sum, st) => sum + (st.estimated_hours || 0), 0);
                                        const totalActualHours = (job.actual_hours || 0) + subTasksActual;
                                        const totalEstimatedHours = (job.estimated_hours || 0) + subTasksEst;
                                        const jobComp = calculateJobCompletion(job);

                                        return (
                                            <Fragment key={job.id}>
                                                {/* Job Header Row */}
                                                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.06)', fontWeight: 'bold' }}>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--foreground)' }}>
                                                        📁 {job.title}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        [Overall Project]
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                                        {job.description || 'No description'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--text-muted)' }}>-</td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--text-muted)' }}>
                                                        {job.due_date ? new Date(job.due_date).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', color: 'var(--primary)' }}>
                                                        {job.status}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', textAlign: 'right' }}>
                                                        {totalEstimatedHours}h
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle', textAlign: 'right', color: totalActualHours > totalEstimatedHours ? 'var(--danger)' : 'var(--success)' }}>
                                                        {totalActualHours}h
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <div style={{ width: '40px', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${jobComp}%`, background: 'var(--success)', height: '100%' }}></div>
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.8rem' }}>{jobComp}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: 'var(--text-muted)' }}>-</td>
                                                </tr>

                                                {/* Subtasks Rows */}
                                                {(job.sub_tasks || []).map((task) => {
                                                    const isComplete = task.status === 'Complete';
                                                    const isProgress = task.status === 'In Progress' || (task.completion_percent > 0 && task.completion_percent < 100);
                                                    
                                                    const statusBg = isComplete ? 'rgba(16, 185, 129, 0.1)' : isProgress ? 'rgba(245, 158, 11, 0.1)' : 'transparent';
                                                    const statusColor = isComplete ? 'var(--success)' : isProgress ? 'var(--warning)' : 'var(--text-muted)';
                                                    
                                                    return (
                                                        <tr key={task.id} style={{ borderBottom: '1px solid var(--card-border)', background: 'transparent' }}>
                                                            <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--card-border)', verticalAlign: 'top', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                                ↳ {job.title}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', borderRight: '1px solid var(--card-border)', fontWeight: 500 }}>
                                                                {task.title}
                                                            </td>
                                                            <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                                <textarea 
                                                                    style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', padding: '0.75rem 1rem', resize: 'vertical', color: 'var(--foreground)' }}
                                                                    value={task.description || ''}
                                                                    onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                                                                    placeholder="Enter scope..."
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                                <input 
                                                                    type="date"
                                                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)' }}
                                                                    value={formatDateForInput(task.start_date)}
                                                                    onChange={(e) => handleUpdateTask(task.id, 'start_date', e.target.value)}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                                <input 
                                                                    type="date"
                                                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)' }}
                                                                    value={formatDateForInput(task.due_date)}
                                                                    onChange={(e) => handleUpdateTask(task.id, 'due_date', e.target.value)}
                                                                />
                                                            </td>
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
                                                            <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                                <input 
                                                                    type="number"
                                                                    step="0.5"
                                                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)', textAlign: 'right' }}
                                                                    value={task.estimated_hours || 0}
                                                                    onChange={(e) => handleUpdateTask(task.id, 'estimated_hours', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0', verticalAlign: 'top', borderRight: '1px solid var(--card-border)' }}>
                                                                <input 
                                                                    type="number"
                                                                    step="0.5"
                                                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.75rem 1rem', color: 'var(--foreground)', textAlign: 'right' }}
                                                                    value={task.used_hours || 0}
                                                                    onChange={(e) => handleUpdateTask(task.id, 'used_hours', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0', verticalAlign: 'middle', borderRight: '1px solid var(--card-border)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem' }}>
                                                                    <div style={{ width: '40px', background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '4px', marginRight: '4px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${task.completion_percent || 0}%`, background: 'var(--success)', height: '100%', transition: 'width 0.3s ease' }}></div>
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
                                                })}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* AI Reports Assistant Floating Button */}
            <button
                onClick={() => setChatOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    padding: '1rem',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-glass)',
                    cursor: 'pointer',
                    zIndex: 99,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}
                title="Ask Reports AI"
            >
                <MessageSquare size={24} />
            </button>

            {/* AI Reports Assistant Sidebar Drawer */}
            {chatOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '380px',
                    maxWidth: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(30px)',
                    borderLeft: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-glass)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem',
                        borderBottom: '1px solid var(--card-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                            <Bot size={20} style={{ color: 'var(--primary)' }} />
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Claude Reports AI</h3>
                        </div>
                        <button
                            onClick={() => setChatOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {chatMessages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                                    color: 'var(--foreground)',
                                    fontSize: '0.85rem',
                                    whiteSpace: 'pre-wrap',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem'
                                }}>
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input box */}
                    <form onSubmit={handleSendChatMessage} style={{
                        padding: '1.25rem',
                        borderTop: '1px solid var(--card-border)',
                        background: 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <input
                            type="text"
                            className="input"
                            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                            placeholder="Ask Claude to analyze hours..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={chatLoading}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            disabled={chatLoading || !chatInput.trim()}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
