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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/logo.webp"
                        alt="ENETK Logo"
                        style={{ height: '40px', width: 'auto' }}
                    />
                </Link>
                <nav style={{ display: 'flex', gap: '1.25rem', fontSize: '0.9375rem', alignItems: 'center' }}>
                    <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>Dashboard</Link>
                    <Link href="/todo" style={{ color: 'var(--primary)', fontWeight: 600 }}>My To-Do</Link>
                    <Link href="/pipeline" style={{ color: 'var(--text-muted)' }}>ENETK Prospects</Link>
                    <Link href="/customers" style={{ color: 'var(--text-muted)' }}>Customers</Link>
                    <Link href="/schedule" style={{ color: 'var(--text-muted)' }}>Schedule</Link>
                    <Link href="/inventory" style={{ color: 'var(--text-muted)' }}>Inventory</Link>
                    <Link href="/reports" style={{ color: 'var(--text-muted)' }}>Reports</Link>
                    <Link href="/quotes" style={{ color: 'var(--text-muted)' }}>Quotes</Link>
                    <Link href="/ai-chat" style={{ color: 'var(--primary)', fontWeight: 600 }}>AI Agent</Link>
                    {userRole === 'admin' && (
                        <>
                            <Link href="/team" style={{ color: 'var(--text-muted)' }}>Team</Link>
                            <Link href="/attendance" style={{ color: 'var(--text-muted)' }}>Attendance</Link>
                            <Link href="/admin/chats" style={{ color: 'var(--text-muted)' }}>Audit Chats</Link>
                        </>
                    )}
                </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 700,
                    background: 'rgba(139, 0, 0, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
                }}>{userRole}</span>
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
