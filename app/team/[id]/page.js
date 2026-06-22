import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { updateTeamMember } from '@/app/actions/team';

export default async function EditTeamPage({ params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') redirect('/');

    let { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, role, email, phone, company, responsibility')
        .eq('id', id)
        .single();

    if (userError && userError.code === '42703') {
        const fallback = await supabase
            .from('users')
            .select('id, username, role, email, phone, company')
            .eq('id', id)
            .single();
        user = fallback.data;
        userError = fallback.error;
    }

    if (userError || !user) {
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
                        <label className="label">Company</label>
                        <input name="company" type="text" className="input" defaultValue={user.company || 'ENETK'} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Phone</label>
                        <input name="phone" type="tel" className="input" defaultValue={user.phone} placeholder="(555) 123-4567" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Responsibility / Role Definition</label>
                        <textarea name="responsibility" className="input" defaultValue={user.responsibility} placeholder="e.g. Estimating only, Floating tech, SCADA manager..." rows="3" />
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

