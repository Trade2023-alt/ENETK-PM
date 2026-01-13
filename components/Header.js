'use client'

import Link from 'next/link';
import { logout } from '@/app/actions/auth';

export default function Header({ userRole }) {
    return (
        <header className="card" style={{
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Contractor OS</h1>
                <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.9375rem' }}>
                    <Link href="/" style={{ color: 'var(--foreground)' }}>Dashboard</Link>
                    <Link href="/customers" style={{ color: 'var(--text-muted)' }}>Customers</Link>
                    <Link href="/schedule" style={{ color: 'var(--text-muted)' }}>Schedule</Link>
                    <Link href="/inventory" style={{ color: 'var(--primary)', fontWeight: 600 }}>Inventory</Link>
                    <Link href="/reports" style={{ color: 'var(--text-muted)' }}>Reports</Link>
                    {userRole === 'admin' && (
                        <Link href="/team" style={{ color: 'var(--text-muted)' }}>Team</Link>
                    )}
                </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{userRole}</span>
                <button onClick={() => logout()} className="btn" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem'
                }}>
                    Sign Out
                </button>
            </div>
        </header>
    );
}
