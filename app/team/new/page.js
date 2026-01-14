import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { createTeamMember } from '@/app/actions/team';

export default async function NewTeamPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') redirect('/');

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Add Team Member</h2>

                <form action={createTeamMember}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Username</label>
                        <input name="username" type="text" className="input" required />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Password</label>
                        <input name="password" type="password" className="input" required />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Email</label>
                        <input name="email" type="email" className="input" placeholder="user@example.com" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Company</label>
                        <input name="company" type="text" className="input" defaultValue="ENETK" placeholder="e.g. ENETK" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Phone</label>
                        <input name="phone" type="tel" className="input" placeholder="(555) 123-4567" />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Role</label>
                        <select name="role" className="input">
                            <option value="user">Tech / User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create User</button>
                </form>
            </div>
        </div>
    );
}
