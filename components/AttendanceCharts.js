'use client'

import dynamic from 'next/dynamic';

const AttendanceChartsClient = dynamic(() => import('./AttendanceChartsClient'), {
    ssr: false,
    loading: () => <div style={{ height: 300, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '1rem' }} />
});

export default function AttendanceCharts(props) {
    return <AttendanceChartsClient {...props} />;
}
