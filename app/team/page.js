import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import Link from 'next/link';
import DeleteUserButton from '@/components/DeleteUserButton';

export default async function TeamPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <Header userRole={userRole} />
                <div className="card" style={{ textAlign: 'center', color: 'var(--danger)' }}>
                    Access Denied. Admin privileges required.
                </div>
            </div>
        );
    }

    const users = db.prepare('SELECT id, username, role, email, phone FROM users ORDER BY username').all();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Team Management</h2>
                <Link href="/team/new" className="btn btn-primary">
                    + Add Member
                </Link>
            </div>

            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Username</th>
                            <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Role</th>
                            <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email</th>
                            <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phone</th>
                            <th style={{ padding: '0.75rem' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <td style={{ padding: '0.75rem' }}>{user.username}</td>
                                <td style={{ padding: '0.75rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.25rem',
                                        background: user.role === 'admin' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        color: user.role === 'admin' ? 'var(--success)' : 'var(--primary)',
                                        fontSize: '0.75rem'
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{user.email || '-'}</td>
                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                    <Link href={`/team/${user.id}`} style={{
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                        fontSize: '0.875rem'
                                    }}>
                                        Edit
                                    </Link>
                                    <DeleteUserButton userId={user.id} username={user.username} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
