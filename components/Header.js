'use client'

import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { useState } from 'react';

export default function Header({ userRole }) {
    const [menuOpen, setMenuOpen] = useState(false);

    // Button-style for nav links
    const navButtonStyle = {
        display: 'block',
        color: 'var(--text-muted)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.02)',
        marginBottom: '0.5rem',
        transition: 'all 0.15s'
    };

    const activeButtonStyle = {
        ...navButtonStyle,
        color: 'var(--primary)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.1)'
    };

    const adminButtonStyle = {
        ...navButtonStyle,
        color: 'rgba(59, 130, 246, 0.9)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        background: 'rgba(59, 130, 246, 0.05)'
    };

    const aiButtonStyle = {
        ...navButtonStyle,
        color: 'var(--primary)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
        fontWeight: 800
    };

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                            background: menuOpen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            border: `1px solid ${menuOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            color: menuOpen ? '#ef4444' : 'var(--primary)',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
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
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    fontWeight: 600
                }}>
                    {/* Section Label */}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.6, paddingLeft: '0.25rem' }}>Main</div>

                    {/* Main Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Link href="/" style={activeButtonStyle} onClick={() => setMenuOpen(false)}>🏠 Dashboard</Link>
                        {userRole !== 'customer' && <Link href="/todo" style={navButtonStyle} onClick={() => setMenuOpen(false)}>✅ To-Do</Link>}
                    </div>

                    {/* Section Label */}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.6, paddingLeft: '0.25rem' }}>Operations</div>

                    {/* Operations Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                        {userRole !== 'customer' && <Link href="/pipeline" style={navButtonStyle} onClick={() => setMenuOpen(false)}>📊 Pipeline</Link>}
                        {userRole !== 'customer' && <Link href="/customers" style={navButtonStyle} onClick={() => setMenuOpen(false)}>👥 Clients</Link>}
                        {userRole !== 'customer' && <Link href="/schedule" style={navButtonStyle} onClick={() => setMenuOpen(false)}>📅 Schedule</Link>}
                        {userRole !== 'customer' && <Link href="/inventory" style={navButtonStyle} onClick={() => setMenuOpen(false)}>📦 Stock</Link>}
                        {userRole !== 'customer' && <Link href="/quotes" style={navButtonStyle} onClick={() => setMenuOpen(false)}>💰 Quotes</Link>}
                        {userRole !== 'customer' && <Link href="/estimate" style={navButtonStyle} onClick={() => setMenuOpen(false)}>📏 Estimating</Link>}
                        {userRole !== 'customer' && <Link href="/roadmap" style={navButtonStyle} onClick={() => setMenuOpen(false)}>🗺️ Road Map</Link>}
                        {userRole !== 'customer' && <Link href="/reports" style={navButtonStyle} onClick={() => setMenuOpen(false)}>📈 Reports</Link>}
                        {userRole !== 'customer' && <Link href="/knowledge" style={navButtonStyle} onClick={() => setMenuOpen(false)}>🧠 Tips & Tricks</Link>}
                        <Link href="/scada" style={{...navButtonStyle, color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)'}} onClick={() => setMenuOpen(false)}>🌐 SCADA App</Link>
                    </div>

                    {/* AI Section */}
                    {userRole !== 'customer' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <Link href="/ai-chat" style={aiButtonStyle} onClick={() => setMenuOpen(false)}>🤖 AI Agent</Link>
                        </div>
                    )}

                    {/* Admin Section */}
                    {userRole === 'admin' && (
                        <>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(59, 130, 246, 0.8)', marginBottom: '0.75rem', opacity: 0.8, paddingLeft: '0.25rem' }}>Admin</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                <Link href="/team" style={adminButtonStyle} onClick={() => setMenuOpen(false)}>👤 Team</Link>
                                <Link href="/admin/chats" style={adminButtonStyle} onClick={() => setMenuOpen(false)}>📋 Audit</Link>
                            </div>
                        </>
                    )}
                </nav>
            )}
        </header>
    );
}
