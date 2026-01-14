'use client'

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#8b0000', '#4a5568', '#10b981', '#f59e0b', '#3b82f6'];

export default function AnalyticsDashboard({ jobs, aiUsage }) {
    // Prepare data for Hours Comparison (Winning/Losing)
    const hoursData = jobs.map(j => ({
        name: j.title.length > 15 ? j.title.substring(0, 15) + '...' : j.title,
        budgeted: j.estimated_hours || 0,
        actual: j.actual_hours || 0
    })).sort((a, b) => b.budgeted - a.budgeted).slice(0, 10);

    // AI Cost Tracking
    const aiCostData = aiUsage ? aiUsage.map(u => ({
        date: new Date(u.created_at).toLocaleDateString(),
        cost: parseFloat(u.cost_usd || 0)
    })).reduce((acc, curr) => {
        const last = acc[acc.length - 1];
        if (last && last.date === curr.date) {
            last.cost += curr.cost;
        } else {
            acc.push(curr);
        }
        return acc;
    }, []) : [];

    const totalAiCost = aiUsage ? aiUsage.reduce((acc, u) => acc + parseFloat(u.cost_usd || 0), 0) : 0;

    // Filter "Losing" projects (actual > budgeted)
    const losingProjects = jobs.filter(j => (j.actual_hours || 0) > (j.estimated_hours || 0));
    const winningProjects = jobs.filter(j => (j.actual_hours || 0) <= (j.estimated_hours || 0) && (j.status === 'Completed' || j.status === 'Complete'));

    return (
        <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>

            {/* Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #10b981' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>"Winning" Bids</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{winningProjects.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>"Losing" Bids</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{losingProjects.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>AI Usage Cost</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${totalAiCost.toFixed(4)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(45%, 1fr))', gap: '1.5rem' }}>

                {/* Hours Comparison Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Winning/Losing: Budget vs. Actual</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hoursData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tick={{ fill: '#888' }} />
                                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                                <Legend />
                                <Bar dataKey="budgeted" name="Budgeted" fill="#4a5568" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Actual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Cost Area Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>AI Spending Trend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={aiCostData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b0000" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b0000" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tick={{ fill: '#888' }} />
                                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                                <Area type="monotone" dataKey="cost" name="USD Cost" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
