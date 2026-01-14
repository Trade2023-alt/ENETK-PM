import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import ReportView from '@/components/ReportView';

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) redirect('/login');

    const [
        { data: jobs },
        { data: subTasks },
        { data: users }
    ] = await Promise.all([
        supabase.from('jobs').select('*'),
        supabase.from('sub_tasks').select('*'),
        supabase.from('users').select('id, username'),
    ]);

    return (
        <div className="container">
            <Header userRole={userRole} />
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reports</h1>
                <p style={{ color: 'var(--text-muted)' }}>Weekly summary and alerts.</p>
            </div>
            <ReportView jobs={jobs || []} subTasks={subTasks || []} users={users || []} />
        </div>
    );
}

