'use client'

import React, { useMemo } from 'react';

export default function RoadmapGantt({ milestones }) {
    const { minDate, maxDate, totalDays, months } = useMemo(() => {
        if (!milestones.length) return {};

        let start = new Date(Math.min(...milestones.map(m => new Date(m.start_date))));
        let end = new Date(Math.max(...milestones.map(m => new Date(m.end_date))));

        // Add padding (2 weeks)
        start.setDate(start.getDate() - 14);
        end.setDate(end.getDate() + 14);

        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        // Generate month markers
        const monthMarkers = [];
        let curr = new Date(start);
        curr.setDate(1); // Start at beginning of month
        while (curr <= end) {
            monthMarkers.push({
                name: curr.toLocaleString('default', { month: 'short', year: '2-digit' }),
                left: ((curr - start) / (1000 * 60 * 60 * 24) / diff) * 100
            });
            curr.setMonth(curr.getMonth() + 1);
        }

        return { minDate: start, maxDate: end, totalDays: diff, months: monthMarkers };
    }, [milestones]);

    if (!milestones.length) return null;

    const getPosition = (dateStr) => {
        const date = new Date(dateStr);
        return ((date - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    };

    const getWidth = (startStr, endStr) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        return ((end - start) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Achieved': return '#10b981';
            case 'In Progress': return 'var(--primary)';
            case 'Delayed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ minWidth: '800px', position: 'relative', paddingBottom: '1rem' }}>
            {/* Timeline Header */}
            <div style={{ height: '30px', position: 'relative', borderBottom: '1px solid #333', marginBottom: '1rem' }}>
                {months.map((m, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${m.left}%`,
                        fontSize: '10px',
                        color: '#888',
                        borderLeft: '1px solid rgba(255,255,255,0.05)',
                        height: '250px', // Extend grid lines
                        zIndex: 0,
                        paddingLeft: '4px',
                        pointerEvents: 'none'
                    }}>
                        {m.name}
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {milestones.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '150px', flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.title}
                        </div>
                        <div style={{ flex: 1, height: '24px', position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${getPosition(m.start_date)}%`,
                                    width: `${getWidth(m.start_date, m.end_date)}%`,
                                    height: '100%',
                                    background: getStatusColor(m.status),
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minWidth: '5px'
                                }}
                                title={`${m.title} (${m.status})`}
                            >
                                <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    {getWidth(m.start_date, m.end_date) > 10 ? m.status : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
                    <span>In Progress</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
                    <span>Achieved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#6b7280', borderRadius: '2px' }} />
                    <span>Planned</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
                    <span>Delayed</span>
                </div>
            </div>
        </div>
    );
}
