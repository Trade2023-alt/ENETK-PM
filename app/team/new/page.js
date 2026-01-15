import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import TeamMemberForm from '@/components/TeamMemberForm';

export default async function NewTeamPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') redirect('/');

    return (
        <div className="container">
            <Header userRole={userRole} />

            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Add Team Member</h2>
                <TeamMemberForm />
            </div>
        </div>
    );
}
