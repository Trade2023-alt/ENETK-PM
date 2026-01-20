'use client'

import { useState, useMemo } from 'react';

// Color palette for users
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9'
];

export default function AttendanceTrendChart({ chartData = [], users = [] }) {
    const [selectedUsers, setSelectedUsers] = useState(users.map(u => u.username));
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Assign colors to users
    const userColors = useMemo(() => {
        const colors = {};
        users.forEach((u, i) => {
            colors[u.username] = COLORS[i % COLORS.length];
        });
        return colors;
    }, [users]);

    // Toggle user selection
    const toggleUser = (username) => {
        setSelectedUsers(prev =>
            prev.includes(username)
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    const selectAll = () => setSelectedUsers(users.map(u => u.username));
    const selectNone = () => setSelectedUsers([]);

    // Calculate chart dimensions
    const maxHours = useMemo(() => {
        let max = 0;
        chartData.forEach(day => {
            selectedUsers.forEach(username => {
                if (day[username] > max) max = day[username];
            });
        });
        return Math.ceil(max) || 12;
    }, [chartData, selectedUsers]);

    const chartHeight = 300;
    const chartWidth = Math.max(chartData.length * 40, 600);
    const yAxisWidth = 50;
    const xAxisHeight = 60;

    return (
        <div className="card">
            {/* Filter Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>📊 Daily Hours Trend</h3>

                {/* User Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="btn"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        👥 Filter Users ({selectedUsers.length}/{users.length})
                        <span style={{ fontSize: '0.75rem' }}>{dropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {dropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            zIndex: 100,
                            minWidth: '200px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                                <button onClick={selectAll} style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px', color: 'var(--primary)', cursor: 'pointer' }}>
                                    Select All
                                </button>
                                <button onClick={selectNone} style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}>
                                    Clear All
                                </button>
                            </div>
                            {users.map(u => (
                                <label key={u.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(u.username)}
                                        onChange={() => toggleUser(u.username)}
                                    />
                                    <span style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '2px',
                                        background: userColors[u.username]
                                    }} />
                                    {u.username}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                {users.filter(u => selectedUsers.includes(u.username)).map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                        <span style={{ width: '12px', height: '3px', background: userColors[u.username], borderRadius: '2px' }} />
                        {u.username}
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <svg width={chartWidth + yAxisWidth + 20} height={chartHeight + xAxisHeight} style={{ display: 'block' }}>
                    {/* Y-axis labels */}
                    {[0, 2, 4, 6, 8, 10, 12].filter(h => h <= maxHours).map(hours => (
                        <g key={hours}>
                            <text
                                x={yAxisWidth - 10}
                                y={chartHeight - (hours / maxHours) * chartHeight + 4}
                                textAnchor="end"
                                fill="var(--text-muted)"
                                fontSize="10"
                            >
                                {hours}h
                            </text>
                            <line
                                x1={yAxisWidth}
                                y1={chartHeight - (hours / maxHours) * chartHeight}
                                x2={chartWidth + yAxisWidth}
                                y2={chartHeight - (hours / maxHours) * chartHeight}
                                stroke="rgba(255,255,255,0.05)"
                            />
                        </g>
                    ))}

                    {/* Data lines for each user */}
                    {users.filter(u => selectedUsers.includes(u.username)).map(user => {
                        const points = chartData.map((day, i) => {
                            const x = yAxisWidth + (i * (chartWidth / chartData.length)) + ((chartWidth / chartData.length) / 2);
                            const y = chartHeight - ((day[user.username] || 0) / maxHours) * chartHeight;
                            return `${x},${y}`;
                        }).join(' ');

                        return (
                            <g key={user.id}>
                                <polyline
                                    points={points}
                                    fill="none"
                                    stroke={userColors[user.username]}
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />
                                {/* Data points */}
                                {chartData.map((day, i) => {
                                    const x = yAxisWidth + (i * (chartWidth / chartData.length)) + ((chartWidth / chartData.length) / 2);
                                    const y = chartHeight - ((day[user.username] || 0) / maxHours) * chartHeight;
                                    const hours = day[user.username] || 0;

                                    if (hours === 0) return null;

                                    return (
                                        <circle
                                            key={i}
                                            cx={x}
                                            cy={y}
                                            r="4"
                                            fill={userColors[user.username]}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <title>{user.username}: {hours}h on {day.label}</title>
                                        </circle>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {chartData.map((day, i) => {
                        const x = yAxisWidth + (i * (chartWidth / chartData.length)) + ((chartWidth / chartData.length) / 2);
                        // Only show every 3rd label to avoid crowding
                        if (i % 3 !== 0 && chartData.length > 14) return null;
                        return (
                            <text
                                key={i}
                                x={x}
                                y={chartHeight + 20}
                                textAnchor="middle"
                                fill="var(--text-muted)"
                                fontSize="9"
                                transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                            >
                                {day.label}
                            </text>
                        );
                    })}
                </svg>
            </div>

            {/* Summary Stats */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>30-Day Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {users.filter(u => selectedUsers.includes(u.username)).map(user => {
                        const totalHours = chartData.reduce((sum, day) => sum + (day[user.username] || 0), 0);
                        const avgHours = totalHours / chartData.length;
                        const daysWorked = chartData.filter(day => day[user.username] > 0).length;

                        return (
                            <div key={user.id} style={{
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '6px',
                                borderLeft: `3px solid ${userColors[user.username]}`
                            }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{user.username}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {totalHours.toFixed(1)}h total • {daysWorked} days • {avgHours.toFixed(1)}h/day avg
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
