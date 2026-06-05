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

  let userProfile = null;

  try {
    if (userRole === 'customer') {
      const { data } = await supabase
        .from('customers')
        .select('name as username')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        userProfile = { username: data.username, company: data.username };
      }
    } else {
      // Fetch current user profile
      const { data, error } = await supabase
        .from('users')
        .select('username, company')
        .eq('id', userId)
        .maybeSingle();

      if (!error) userProfile = data;
      else {
        // Fallback if 'company' is missing
        const { data: fallbackData } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .maybeSingle();
        userProfile = fallbackData;
      }
    }
  } catch (err) {
    console.error('Safe dashboard fetch error:', err);
  }

  let jobs = [];
  try {
    let query = supabase
      .from('jobs')
      .select(`
                *,
                customer:customers(name, address),
                lead:users(username),
                assignments:job_assignments(
                    user:users(username)
                )
            `)
      .order('scheduled_date', { ascending: true });

    // Filter by Assignment/Lead status for non-admins & non-integrators
    if (userRole === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (userRole !== 'admin' && userRole !== 'system_integrator') {
      const { data: userAssignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', userId);

      const assignedJobIds = userAssignments?.map(a => a.job_id) || [];

      // Filter the main query to show assigned jobs OR jobs where the user is the lead
      if (assignedJobIds.length > 0) {
        query = query.or(`id.in.(${assignedJobIds.join(',')}),lead_id.eq.${userId}`);
      } else {
        query = query.eq('lead_id', userId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    jobs = data.map(job => ({
      ...job,
      customer_name: job.customer?.name,
      customer_address: job.customer?.address,
      lead_name: job.lead?.username,
      assigned_users: job.assignments?.map(a => a.user?.username).filter(Boolean).join(', ')
    }));
  } catch (error) {
    console.error('Error fetching jobs:', error);
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <Header userRole={userRole} />

      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Welcome, {userProfile?.username || 'User'}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>{userProfile?.company || 'ENETK'} Project Management Dashboard</p>
        </div>
      </div>

      {/* Main Actions Panel Grid */}
      {userRole !== 'customer' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        <Link href="/pipeline" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '1.5rem' }}>💰</div>
          <div>
            <div style={{ fontWeight: 600 }}>ENETK Prospects</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage Lead Pipeline</div>
          </div>
        </Link>
        <Link href="/quotes" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #ef4444' }}>
          <div style={{ fontSize: '1.5rem' }}>📄</div>
          <div>
            <div style={{ fontWeight: 600 }}>Quote Generator</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EH Import & Proposals</div>
          </div>
        </Link>
        <Link href="/todo" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '1.5rem' }}>✅</div>
          <div>
            <div style={{ fontWeight: 600 }}>My To-Do List</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View & manage your tasks</div>
          </div>
        </Link>
        <Link href="/estimate" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '1.5rem' }}>📏</div>
          <div>
            <div style={{ fontWeight: 600 }}>Estimation Pro</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MTO Forms & Blueprint OCR</div>
          </div>
        </Link>
      </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Upcoming Jobs</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {userRole !== 'customer' && (
          <Link href="/todo/bulk" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            📋 Bulk Add Tasks
          </Link>
          )}
          <Link href="/jobs/new" className="btn btn-primary">
            + New Job
          </Link>
        </div>
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
