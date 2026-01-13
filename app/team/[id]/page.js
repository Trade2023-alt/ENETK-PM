import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import db from '@/lib/db';
import { updateTeamMember } from '@/app/actions/team';

export default async function EditTeamPage({ params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') redirect('/');

    const user = db.prepare('SELECT id, username, role, email, phone FROM users WHERE id = ?').get(id);

    if (!user) {
        return (
            <div className="container">
                <Header userRole={userRole} />
                <div className="card" style={{ textAlign: 'center' }}>
                    User not found
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Edit Team Member</h2>

                <form action={updateTeamMember}>
                    <input type="hidden" name="id" value={user.id} />

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Username</label>
                        <input
                            name="username"
                            type="text"
                            className="input"
                            defaultValue={user.username}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">New Password (leave blank to keep current)</label>
                        <input name="password" type="password" className="input" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Email</label>
                        <input name="email" type="email" className="input" defaultValue={user.email} placeholder="user@example.com" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Phone</label>
                        <input name="phone" type="tel" className="input" defaultValue={user.phone} placeholder="(555) 123-4567" />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Role</label>
                        <select name="role" className="input" defaultValue={user.role}>
                            <option value="user">Tech / User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                        <a href="/team" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', flex: 1, textAlign: 'center' }}>Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
