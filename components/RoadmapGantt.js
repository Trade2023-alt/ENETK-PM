'use client'

import React, { useMemo } from 'react';

export default function RoadmapGantt({ items = [], milestones = [], showJobLabels = false }) {
    // Support both new 'items' prop and legacy 'milestones' prop
    const data = items.length > 0 ? items : milestones;

    const { minDate, maxDate, totalDays, months, days } = useMemo(() => {
        if (!data.length) return {};

        let start = new Date(Math.min(...data.map(m => new Date(m.start_date))));
        let end = new Date(Math.max(...data.map(m => new Date(m.end_date))));

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

        // Generate day markers (for vertical lines)
        const dayMarkers = [];
        let dayCurr = new Date(start);
        while (dayCurr <= end) {
            const dayOfWeek = dayCurr.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isMonday = dayOfWeek === 1;
            dayMarkers.push({
                date: new Date(dayCurr),
                left: ((dayCurr - start) / (1000 * 60 * 60 * 24) / diff) * 100,
                isWeekend,
                isMonday
            });
            dayCurr.setDate(dayCurr.getDate() + 1);
        }

        return { minDate: start, maxDate: end, totalDays: diff, months: monthMarkers, days: dayMarkers };
    }, [data]);

    if (!data.length) return null;

    const getPosition = (dateStr) => {
        const date = new Date(dateStr);
        return ((date - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    };

    const getWidth = (startStr, endStr) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        return (days / totalDays) * 100;
    };

    const getStatusColor = (item) => {
        // Different colors for subtasks vs milestones
        if (item.type === 'subtask') {
            switch (item.status) {
                case 'Achieved': return '#10b981';
                case 'In Progress': return '#8b5cf6';
                default: return '#a78bfa'; // Lighter purple for planned subtasks
            }
        }
        switch (item.status) {
            case 'Achieved': return '#10b981';
            case 'In Progress': return 'var(--primary)';
            case 'Delayed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    // Today marker position
    const today = new Date();
    const todayPosition = ((today - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    const showToday = todayPosition >= 0 && todayPosition <= 100;

    return (
        <div style={{ minWidth: '800px', position: 'relative', paddingBottom: '1rem' }}>
            {/* Timeline Header */}
            <div style={{ height: '30px', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                {months.map((m, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${m.left}%`,
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.6)',
                        borderLeft: '1px solid rgba(255,255,255,0.15)',
                        height: `${Math.min(data.length * 32 + 50, 400)}px`,
                        zIndex: 0,
                        paddingLeft: '4px',
                        pointerEvents: 'none'
                    }}>
                        {m.name}
                    </div>
                ))}
            </div>

            {/* Day vertical dashed lines */}
            <div style={{ position: 'absolute', top: '30px', left: 0, right: 0, bottom: '80px', pointerEvents: 'none', zIndex: 0 }}>
                {days?.map((day, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${day.left}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            borderLeft: day.isMonday
                                ? '1px dashed rgba(255,255,255,0.2)'
                                : day.isWeekend
                                    ? '1px dotted rgba(255,255,255,0.05)'
                                    : '1px dashed rgba(255,255,255,0.08)',
                            pointerEvents: 'none'
                        }}
                    />
                ))}

                {/* Today marker */}
                {showToday && (
                    <div style={{
                        position: 'absolute',
                        left: `${todayPosition}%`,
                        top: '-30px',
                        bottom: 0,
                        width: '2px',
                        background: 'linear-gradient(to bottom, #ef4444, transparent)',
                        zIndex: 5
                    }}>
                        <span style={{
                            position: 'absolute',
                            top: '-18px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '8px',
                            color: '#ef4444',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                        }}>
                            TODAY
                        </span>
                    </div>
                )}
            </div>

            {/* Rows */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: showJobLabels ? '180px' : '150px',
                            flexShrink: 0,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.7)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span style={{
                                fontSize: '0.6rem',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                background: item.type === 'subtask' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 0, 0, 0.3)',
                                color: item.type === 'subtask' ? '#c4b5fd' : '#fca5a5'
                            }}>
                                {item.type === 'subtask' ? 'T' : 'M'}
                            </span>
                            {showJobLabels && item.job ? (
                                <span title={`${item.job.title}: ${item.title}`}>
                                    <span style={{ color: '#fca5a5', fontSize: '0.6rem' }}>{item.job.title.substring(0, 10)}:</span> {item.title}
                                </span>
                            ) : item.title}
                        </div>
                        <div style={{ flex: 1, height: '22px', position: 'relative', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${getPosition(item.start_date)}%`,
                                    width: `${Math.max(getWidth(item.start_date, item.end_date), 0.5)}%`,
                                    height: '100%',
                                    background: getStatusColor(item),
                                    borderRadius: item.type === 'subtask' ? '100px' : '4px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minWidth: item.type === 'subtask' ? '8px' : '5px'
                                }}
                                title={`${item.title} (${item.status})${item.assigned_users?.length ? ' - ' + item.assigned_users.map(u => u.username).join(', ') : ''}`}
                            >
                                <span style={{ fontSize: '9px', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    {getWidth(item.start_date, item.end_date) > 8 ? item.status : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }}>
                    <span style={{ fontWeight: 600 }}>Milestones:</span>
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem' }}>
                    <span style={{ fontWeight: 600 }}>Sub-Tasks:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '100px' }} />
                    <span>Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#a78bfa', borderRadius: '100px' }} />
                    <span>Pending</span>
                </div>
            </div>
        </div>
    );
}
