'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getMilestones } from '@/app/actions/roadmap';
import RoadmapClient from '@/components/RoadmapClient';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    const milestones = await getMilestones();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />
            <RoadmapClient initialMilestones={milestones} userRole={userRole} />
        </div>
    );
}
