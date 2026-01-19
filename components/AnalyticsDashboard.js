'use client'
import dynamic from 'next/dynamic';

const AnalyticsDashboardClient = dynamic(() => import('./AnalyticsDashboardClient'), {
    ssr: false,
    loading: () => <div style={{ height: 500, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '1rem' }} />
});

export default function AnalyticsDashboard(props) {
    return <AnalyticsDashboardClient {...props} />;
}
