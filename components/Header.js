'use client'

import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { useState } from 'react';

export default function Header({ userRole }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const linkStyle = { color: 'var(--text-muted)', padding: '0.5rem 0' };
    const activeLinkStyle = { color: 'var(--primary)', padding: '0.5rem 0' };
    const adminLinkStyle = { color: 'rgba(59, 130, 246, 0.8)', padding: '0.5rem 0' };

    return (
        <header style={{
            marginBottom: '2rem',
            background: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.75rem 1rem',
            position: 'sticky',
            top: 0,
            zIndex: 1000
        }}>
            {/* Top Bar: Logo + Hamburger + Sign Out */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/logo.webp"
                        alt="ENETK Logo"
                        style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(139, 0, 0, 0.3))' }}
                    />
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                        fontSize: '0.6rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '100px',
                        background: userRole === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: userRole === 'admin' ? '#ef4444' : 'var(--primary)',
                        border: `1px solid ${userRole === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                        fontWeight: 800,
                        textTransform: 'uppercase'
                    }}>
                        {userRole}
                    </span>

                    <button onClick={() => logout()} className="btn" style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.7rem',
                        borderRadius: '6px'
                    }}>
                        Sign Out
                    </button>

                    {/* Hamburger Menu Button */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--foreground)',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            lineHeight: 1
                        }}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>

            {/* Collapsible Navigation */}
            {menuOpen && (
                <nav style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    fontWeight: 600
                }}>
                    {/* Primary Section */}
                    <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>Main</div>
                        <Link href="/" style={activeLinkStyle} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                        <Link href="/todo" style={linkStyle} onClick={() => setMenuOpen(false)}>To-Do</Link>
                    </div>

                    {/* Operations Section */}
                    <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>Operations</div>
                        <Link href="/pipeline" style={linkStyle} onClick={() => setMenuOpen(false)}>Pipeline</Link>
                        <Link href="/customers" style={linkStyle} onClick={() => setMenuOpen(false)}>Clients</Link>
                        <Link href="/schedule" style={linkStyle} onClick={() => setMenuOpen(false)}>Schedule</Link>
                        <Link href="/inventory" style={linkStyle} onClick={() => setMenuOpen(false)}>Stock</Link>
                        <Link href="/quotes" style={linkStyle} onClick={() => setMenuOpen(false)}>Quotes</Link>
                        <Link href="/roadmap" style={linkStyle} onClick={() => setMenuOpen(false)}>Road Map</Link>
                    </div>

                    {/* AI Section */}
                    <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>Intelligence</div>
                        <Link href="/ai-chat" style={{ color: 'var(--primary)', fontWeight: 800, padding: '0.5rem 0' }} onClick={() => setMenuOpen(false)}>AI Agent</Link>
                    </div>

                    {/* Admin Section */}
                    {userRole === 'admin' && (
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(59, 130, 246, 0.8)', marginBottom: '0.5rem', opacity: 0.8 }}>Admin</div>
                            <Link href="/team" style={adminLinkStyle} onClick={() => setMenuOpen(false)}>Team</Link>
                            <Link href="/attendance" style={adminLinkStyle} onClick={() => setMenuOpen(false)}>Attendance</Link>
                            <Link href="/admin/chats" style={adminLinkStyle} onClick={() => setMenuOpen(false)}>Audit</Link>
                        </div>
                    )}
                </nav>
            )}
        </header>
    );
}
