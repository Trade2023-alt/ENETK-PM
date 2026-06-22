import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

    let { data: users, error } = await supabase
        .from('users')
        .select('id, username, role, email, phone, company, responsibility')
        .order('username', { ascending: true });

    let needsMigration = false;
    if (error && error.code === '42703') {
        // Fallback if responsibility column doesn't exist
        needsMigration = true;
        const fallback = await supabase
            .from('users')
            .select('id, username, role, email, phone, company')
            .order('username', { ascending: true });
        users = fallback.data;
        error = fallback.error;
    }


    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div className="page-header">
                <h2 className="page-title">Team Management</h2>
                <Link href="/team/new" className="btn btn-primary">
                    + Add Member
                </Link>
            </div>

            {needsMigration && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: 'var(--danger)', marginTop: 0 }}>Database Update Required</h3>
                    <p style={{ margin: '0.5rem 0' }}>The "Responsibility" column is missing from the <code>users</code> table. Please run the following SQL in your Supabase dashboard to enable roles and load balancing:</p>
                    <code style={{ background: 'var(--background)', padding: '0.5rem', display: 'block', borderRadius: '4px' }}>ALTER TABLE users ADD COLUMN responsibility TEXT;</code>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Company</th>
                            <th>Role / Responsibility</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td style={{ fontWeight: 500 }}>{user.username}</td>
                                <td>
                                    <span className={`badge ${user.role === 'admin' ? 'badge-success' : 'badge-primary'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="text-muted">{user.company || 'ENETK'}</td>
                                <td className="text-muted">
                                    <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxWidth: '300px' }}>
                                        {user.responsibility || <span style={{ opacity: 0.5 }}><em>Not specified</em></span>}
                                    </div>
                                </td>
                                <td className="text-muted">{user.email || '-'}</td>
                                <td className="text-muted">{user.phone || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <Link href={`/team/${user.id}`} className="btn btn-secondary btn-sm">
                                            Edit
                                        </Link>
                                        <DeleteUserButton userId={user.id} username={user.username} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
