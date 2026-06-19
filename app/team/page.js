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

    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, role, email, phone, company')
        .order('username', { ascending: true });


    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div className="page-header">
                <h2 className="page-title">Team Management</h2>
                <Link href="/team/new" className="btn btn-primary">
                    + Add Member
                </Link>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Company</th>
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
