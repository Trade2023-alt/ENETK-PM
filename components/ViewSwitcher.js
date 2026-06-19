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
        padding: '0.35rem 1rem',
        borderRadius: '0.5rem',
        background: viewMode === view ? 'rgba(159, 18, 57, 0.25)' : 'transparent',
        border: viewMode === view ? '1px solid rgba(159, 18, 57, 0.5)' : '1px solid transparent',
        color: viewMode === view ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.85rem',
        textDecoration: 'none'
    });

    return (
        <div className="hidden md:flex" style={{ gap: '0.25rem', alignItems: 'center' }}>
            <Link href="/?view=grid" style={viewButton('grid')}><span style={{ fontSize: '1rem' }}>田</span> Grid</Link>
            <Link href="/?view=cards" style={viewButton('cards')}><span style={{ fontSize: '1rem' }}>📋</span> Cards</Link>
            <Link href="/?view=gantt" style={viewButton('gantt')}><span style={{ fontSize: '1rem' }}>📊</span> Gantt</Link>
            <Link href="/?view=calendar" style={viewButton('calendar')}><span style={{ fontSize: '1rem' }}>🗓️</span> Calendar</Link>
            <Link href="/?view=spreadsheet" style={viewButton('spreadsheet')}><span style={{ fontSize: '1rem' }}>🗃️</span> Spreadsheet</Link>
        </div>
    );
}
