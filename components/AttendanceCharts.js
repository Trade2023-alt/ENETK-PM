import NoSSR from './NoSSR';
import AttendanceChartsClient from './AttendanceChartsClient';

export default function AttendanceCharts(props) {
    return (
        <NoSSR fallback={<div style={{ height: 300, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '1rem' }} />}>
            <AttendanceChartsClient {...props} />
        </NoSSR>
    );
}
