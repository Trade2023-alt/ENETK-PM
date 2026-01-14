import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId) {
    redirect('/login');
  }

  let jobs = [];
  try {
    let query = supabase
      .from('jobs')
      .select(`
                *,
                customer:customers(name, address),
                assignments:job_assignments(
                    user:users(username)
                )
            `)
      .order('scheduled_date', { ascending: true });

    if (userRole !== 'admin') {
      // Filter to only jobs assigned to this user
      // In Supabase we might need to filter by child relation or use a separate join table query
      // Simplest for now: Fetch assignments first or use a join-like filter
      // Improved way: 
      const { data: userAssignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', userId);

      const jobIds = userAssignments?.map(a => a.job_id) || [];
      query = query.in('id', jobIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match existing UI structure
    jobs = data.map(job => ({
      ...job,
      customer_name: job.customer?.name,
      customer_address: job.customer?.address,
      assigned_users: job.assignments?.map(a => a.user?.username).filter(Boolean).join(', ')
    }));

  } catch (error) {
    console.error('Error fetching jobs:', error);
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <Header userRole={userRole} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <Link href="/pipeline" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '1.5rem' }}>💰</div>
          <div>
            <div style={{ fontWeight: 600 }}>Sales Pipeline</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage Prospects</div>
          </div>
        </Link>
        <Link href="/reports" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '1.5rem' }}>📊</div>
          <div>
            <div style={{ fontWeight: 600 }}>Analytics</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Winning/Losing Bids</div>
          </div>
        </Link>
        <Link href="/ai-chat" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #8b0000' }}>
          <div style={{ fontSize: '1.5rem' }}>🤖</div>
          <div>
            <div style={{ fontWeight: 600 }}>AI Assistant</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ask Anything</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Upcoming Jobs</h2>
        <Link href="/jobs/new" className="btn btn-primary">
          + New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No upcoming jobs scheduled.</p>
          <Link href="/jobs/new" style={{ color: 'var(--primary)' }}>Create your first job</Link>
        </div>
      ) : (
        <DashboardClient initialJobs={jobs} />
      )}
    </div>
  );
}
