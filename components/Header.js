'use client'

import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import ViewSwitcher from '@/components/ViewSwitcher';

export default function Header({ userRole }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

    const navLinkClass = (href, extra = '') =>
        `enetk-nav-link ${isActive(href) ? 'enetk-nav-link-active' : ''} ${extra}`.trim();

    const close = () => setMenuOpen(false);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '40px' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/logo.webp"
                        alt="ENETK Logo"
                        style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(159, 18, 57, 0.4))' }}
                    />
                </Link>

                {/* View Switcher Buttons (Centered) */}
                <Suspense fallback={<div style={{ width: '200px' }} />}>
                    <ViewSwitcher />
                </Suspense>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`badge ${userRole === 'admin' ? 'badge-danger' : 'badge-primary'}`}>
                        {userRole}
                    </span>

                    <button onClick={() => logout()} className="btn btn-secondary btn-sm">
                        Sign Out
                    </button>

                    {/* Hamburger Menu Button */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="btn btn-sm"
                        style={{
                            background: menuOpen ? 'rgba(159, 18, 57, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: menuOpen ? 'rgba(159, 18, 57, 0.4)' : 'var(--card-border)',
                            color: menuOpen ? 'var(--primary)' : 'var(--foreground)',
                            fontSize: '1.25rem',
                            lineHeight: 1
                        }}
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
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
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div className="enetk-nav-section-label">Main</div>
                    <div className="enetk-nav-grid">
                        <Link href="/" className={navLinkClass('/')} onClick={close}>🏠 Dashboard</Link>
                        {userRole !== 'customer' && <Link href="/todo" className={navLinkClass('/todo')} onClick={close}>✅ To-Do</Link>}
                    </div>

                    <div className="enetk-nav-section-label">Operations</div>
                    <div className="enetk-nav-grid">
                        {userRole !== 'customer' && <Link href="/pipeline" className={navLinkClass('/pipeline')} onClick={close}>📊 Pipeline</Link>}
                        {userRole !== 'customer' && <Link href="/customers" className={navLinkClass('/customers')} onClick={close}>👥 Clients</Link>}
                        {userRole !== 'customer' && <Link href="/inventory" className={navLinkClass('/inventory')} onClick={close}>📦 Stock</Link>}
                        {userRole !== 'customer' && <Link href="/quotes" className={navLinkClass('/quotes')} onClick={close}>💰 Quotes</Link>}
                        <Link href="/reports" className={navLinkClass('/reports')} onClick={close}>📈 Reports</Link>
                        {userRole !== 'customer' && <Link href="/knowledge" className={navLinkClass('/knowledge')} onClick={close}>🧠 Tips & Tricks</Link>}
                        <Link href="/scada" className={navLinkClass('/scada', 'enetk-nav-link-scada')} onClick={close}>🌐 SCADA App</Link>
                    </div>

                    {/* AI Section */}
                    <div style={{ marginBottom: '1rem' }}>
                        <Link href="/ai-chat" className={navLinkClass('/ai-chat', 'enetk-nav-link-ai')} onClick={close}>🤖 AI Agent</Link>
                    </div>

                    {/* Admin Section */}
                    {userRole === 'admin' && (
                        <>
                            <div className="enetk-nav-section-label">Admin / Integrations</div>
                            <div className="enetk-nav-grid">
                                <Link href="/team" className={navLinkClass('/team')} onClick={close}>👥 Team</Link>
                                <Link href="/admin/chats" className={navLinkClass('/admin/chats')} onClick={close}>📋 Audit</Link>
                                <Link href="/admin/email-logs" className={navLinkClass('/admin/email-logs')} onClick={close}>📧 Email Logs</Link>
                            </div>
                        </>
                    )}
                </nav>
            )}

            <style jsx>{`
                .enetk-nav-section-label {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    margin-bottom: 0.6rem;
                    opacity: 0.7;
                    padding-left: 0.25rem;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-weight: 700;
                }
                .enetk-nav-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.5rem;
                    margin-bottom: 1.25rem;
                }
                @media (min-width: 768px) {
                    .enetk-nav-grid { grid-template-columns: repeat(4, 1fr); }
                }
                :global(.enetk-nav-link) {
                    display: block;
                    color: var(--text-muted) !important;
                    padding: 0.65rem 0.9rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(255, 255, 255, 0.02);
                    font-size: 0.85rem;
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
                }
                :global(.enetk-nav-link:hover) {
                    color: var(--foreground) !important;
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba(255, 255, 255, 0.18);
                }
                :global(.enetk-nav-link-active) {
                    color: var(--primary) !important;
                    border-color: rgba(159, 18, 57, 0.4);
                    background: rgba(159, 18, 57, 0.12);
                }
                :global(.enetk-nav-link-scada) {
                    color: var(--success) !important;
                    border-color: rgba(16, 185, 129, 0.25);
                }
                :global(.enetk-nav-link-ai) {
                    color: var(--primary) !important;
                    border-color: rgba(159, 18, 57, 0.45);
                    background: linear-gradient(135deg, rgba(159, 18, 57, 0.18), rgba(190, 18, 60, 0.12));
                    font-weight: 800;
                }
            `}</style>
        </header>
    );
}
