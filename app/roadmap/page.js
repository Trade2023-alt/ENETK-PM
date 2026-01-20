import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getMilestones, getSubTasksForRoadmap, getManloadingData } from '@/app/actions/roadmap';
import { supabase } from '@/lib/supabase';
import RoadmapClient from '@/components/RoadmapClient';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    // Fetch all data in parallel
    const [milestones, subTasks, manloading, usersResult, jobsResult] = await Promise.all([
        getMilestones(),
        getSubTasksForRoadmap(),
        getManloadingData(),
        supabase.from('users').select('id, username').order('username'),
        supabase.from('jobs').select('id, title').order('title')
    ]);

    const users = usersResult.data || [];
    const jobs = jobsResult.data || [];

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />
            <RoadmapClient
                initialMilestones={milestones}
                initialSubTasks={subTasks}
                manloading={manloading}
                users={users}
                userRole={userRole}
                jobs={jobs}
            />
        </div>
    );
}
