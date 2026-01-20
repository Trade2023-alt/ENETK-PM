'use client'

import { useMemo } from 'react';

// Color palettes
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];

export default function AttendancePieCharts({ metrics }) {
    if (!metrics || metrics.error) return null;

    const { totals, lateByUser, partialByUser, missedByUser, weekdayCount, users } = metrics;

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📈 Attendance Metrics (Last 30 Days - Weekdays Only)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {weekdayCount} weekdays analyzed • {users?.length || 0} team members
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Late Arrivals Pie */}
                <PieChart
                    title="⏰ Late Arrivals"
                    subtitle="Clock-in after 6:10 AM"
                    data={lateByUser}
                    total={totals.late + totals.onTime}
                    badValue={totals.late}
                    goodValue={totals.onTime}
                    badLabel="Late"
                    goodLabel="On Time"
                    badColor="#ef4444"
                    goodColor="#10b981"
                />

                {/* Partial Days Pie */}
                <PieChart
                    title="📅 Partial Days"
                    subtitle="Less than 8 hours"
                    data={partialByUser}
                    total={totals.partial + totals.full}
                    badValue={totals.partial}
                    goodValue={totals.full}
                    badLabel="Partial"
                    goodLabel="Full Day"
                    badColor="#f59e0b"
                    goodColor="#10b981"
                />

                {/* Missed Days Pie */}
                <PieChart
                    title="❌ Missed Days"
                    subtitle="No attendance on weekday"
                    data={missedByUser}
                    total={totals.missed + totals.worked}
                    badValue={totals.missed}
                    goodValue={totals.worked}
                    badLabel="Missed"
                    goodLabel="Worked"
                    badColor="#ef4444"
                    goodColor="#3b82f6"
                />
            </div>
        </div>
    );
}

function PieChart({ title, subtitle, data, total, badValue, goodValue, badLabel, goodLabel, badColor, goodColor }) {
    const size = 160;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const badPercent = total > 0 ? (badValue / total) * 100 : 0;
    const goodPercent = total > 0 ? (goodValue / total) * 100 : 0;

    const badDash = (badPercent / 100) * circumference;
    const goodDash = (goodPercent / 100) * circumference;

    return (
        <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{title}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{subtitle}</p>

            {/* SVG Pie */}
            <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Good segment */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={goodColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${goodDash} ${circumference}`}
                        strokeDashoffset={0}
                        style={{ transition: 'stroke-dasharray 0.5s' }}
                    />
                    {/* Bad segment */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={badColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${badDash} ${circumference}`}
                        strokeDashoffset={-goodDash}
                        style={{ transition: 'stroke-dasharray 0.5s, stroke-dashoffset 0.5s' }}
                    />
                </svg>
                {/* Center text */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: badValue > 0 ? badColor : goodColor }}>
                        {badPercent.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {badLabel}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: badColor }} />
                    {badLabel}: {badValue}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: goodColor }} />
                    {goodLabel}: {goodValue}
                </div>
            </div>

            {/* Top offenders */}
            {data && data.length > 0 && (
                <div style={{ marginTop: '1rem', textAlign: 'left', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>By Team Member:</div>
                    {data.slice(0, 5).map((item, i) => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.2rem 0' }}>
                            <span style={{ color: COLORS[i % COLORS.length] }}>{item.name}</span>
                            <span style={{ fontWeight: 600 }}>{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
