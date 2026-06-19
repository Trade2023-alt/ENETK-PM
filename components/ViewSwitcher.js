'use client'

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ViewSwitcher() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Determine the active view if on the dashboard
    const viewMode = pathname === '/' ? (searchParams.get('view') || 'grid') : null;

    const viewButton = (view) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '8px',
        background: viewMode === view ? 'rgba(159, 18, 57, 0.8)' : 'transparent',
        border: 'none',
        color: viewMode === view ? '#ffffff' : 'var(--text-muted)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.85rem',
        textDecoration: 'none'
    });

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            gap: '0.25rem', 
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.25rem',
            borderRadius: '12px'
        }}>
            <Link href="/?view=grid" style={viewButton('grid')}><span style={{ fontSize: '1rem' }}>田</span> Grid</Link>
            <Link href="/?view=cards" style={viewButton('cards')}><span style={{ fontSize: '1rem' }}>📋</span> Cards</Link>
            <Link href="/?view=gantt" style={viewButton('gantt')}><span style={{ fontSize: '1rem' }}>📊</span> Gantt</Link>
            <Link href="/?view=calendar" style={viewButton('calendar')}><span style={{ fontSize: '1rem' }}>🗓️</span> Calendar</Link>
            <Link href="/?view=spreadsheet" style={viewButton('spreadsheet')}><span style={{ fontSize: '1rem' }}>🗃️</span> Spreadsheet</Link>
        </div>
    );
}
