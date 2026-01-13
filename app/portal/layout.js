import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CustomerPortalLayout({ children }) {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'customer') {
        redirect('/login');
    }

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <header className="card" style={{
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Customer Portal</h1>
                    <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.9375rem' }}>
                        <Link href="/portal" style={{ color: 'var(--foreground)', fontWeight: 600 }}>Dashboard</Link>
                    </nav>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <form action={logout}>
                        <button className="btn" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                        }}>
                            Sign Out
                        </button>
                    </form>
                </div>
            </header>
            {children}
        </div>
    );
}
