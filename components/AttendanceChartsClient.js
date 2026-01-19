'use client'
import React, { useState, useEffect } from 'react';

export default function AttendanceChartsMock({ data }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div style={{ height: 300, background: 'rgba(255,255,255,0.02)' }} />;

    const maxVal = Math.max(...data.map(d => d.present + d.late), 1);

    return (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '200px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', height: '100%' }}>
                            <div style={{
                                height: `${(d.present / maxVal) * 100}%`,
                                width: '100%',
                                background: 'var(--primary)',
                                borderRadius: '4px 4px 0 0',
                                position: 'relative'
                            }}>
                                {d.late > 0 && (
                                    <div style={{
                                        height: `${(d.late / d.present) * 100}%`,
                                        width: '100%',
                                        background: '#ef4444',
                                        borderRadius: '4px 4px 0 0',
                                        position: 'absolute',
                                        bottom: 0
                                    }} />
                                )}
                            </div>
                        </div>
                        <span style={{ fontSize: '10px', color: '#888' }}>{d.name}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
                    <span>Present</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
                    <span>Late</span>
                </div>
            </div>
        </div>
    );
}
