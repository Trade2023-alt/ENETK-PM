'use client'

import Link from 'next/link';
import { logout } from '@/app/actions/auth';

export default function Header({ userRole }) {
    return (
        <header style={{
            marginBottom: '2rem',
            background: 'rgba(24, 24, 27, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/logo.webp"
                        alt="ENETK Logo"
                        style={{ height: '36px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(139, 0, 0, 0.3))' }}
                    />
                </Link>

                <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                    <div style={{ display: 'flex', gap: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
                        <Link href="/" style={{ color: 'var(--primary)' }}>Dashboard</Link>
                        <Link href="/todo" style={{ color: 'var(--text-muted)' }}>To-Do</Link>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <Link href="/pipeline" style={{ color: 'var(--text-muted)' }}>Pipeline</Link>
                        <Link href="/customers" style={{ color: 'var(--text-muted)' }}>Clients</Link>
                        <Link href="/schedule" style={{ color: 'var(--text-muted)' }}>Schedule</Link>
                        <Link href="/inventory" style={{ color: 'var(--text-muted)' }}>Stock</Link>
                        <Link href="/quotes" style={{ color: 'var(--text-muted)' }}>Quotes</Link>
                        <Link href="/ai-chat" style={{ color: 'var(--primary)', fontWeight: 800 }}>AI Agent</Link>
                    </div>

                    {userRole === 'admin' && (
                        <div style={{ display: 'flex', gap: '1.25rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                            <Link href="/team" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>Team</Link>
                            <Link href="/attendance" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>Attendance</Link>
                            <Link href="/admin/chats" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>Audit</Link>
                        </div>
                    )}
                </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{
                        fontSize: '0.65rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '100px',
                        background: userRole === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: userRole === 'admin' ? '#ef4444' : 'var(--primary)',
                        border: `1px solid ${userRole === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                        fontWeight: 800,
                        marginBottom: '2px'
                    }}>
                        {userRole}
                    </span>
                </div>
                <button onClick={() => logout()} className="btn" style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
