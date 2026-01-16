import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getAllUsersForSelect } from '@/app/actions/todo';
import { getAllJobs } from '@/app/actions/jobs';
import BulkSubTaskForm from '@/components/BulkSubTaskForm';

export default async function BulkTaskPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    const users = await getAllUsersForSelect();
    const jobs = await getAllJobs();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bulk Task Deployment</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Fill out the table below to assign multiple sub-tasks across different projects at once.
                    </p>
                </div>
                <a href="/todo" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    ← Back to List
                </a>
            </div>

            <BulkSubTaskForm jobs={jobs} users={users} />
        </div>
    );
}
