import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import DashboardClient from '@/components/DashboardClient';
import AttendanceModule from '@/components/AttendanceModule';
import { getAttendanceStatus } from './actions/attendance';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId) {
    redirect('/login');
  }

  const attendanceStatus = await getAttendanceStatus();

  let userProfile = null;
  let uniqueClockedIn = [];

  try {
    // 1. Fetch current user profile - resilient to missing 'company' column
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

    // 2. Fetch who else is clocked in - resilient join
    const { data: clockedData, error: clockedError } = await supabase
      .from('attendance')
      .select(`
          user_id,
          user:users(username, company)
      `)
      .is('check_out', null)
      .order('check_in', { ascending: false });

    if (!clockedError && clockedData) {
      uniqueClockedIn = Array.from(new Set(clockedData.map(u => u.user_id)))
        .map(id => clockedData.find(u => u.user_id === id));
    } else if (clockedError) {
      // Fallback query if the join with 'company' fails
      const { data: fallbackClocked } = await supabase
        .from('attendance')
        .select(`
            user_id,
            user:users(username)
        `)
        .is('check_out', null);

      if (fallbackClocked) {
        uniqueClockedIn = Array.from(new Set(fallbackClocked.map(u => u.user_id)))
          .map(id => fallbackClocked.find(u => u.user_id === id));
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
                assignments:job_assignments(
                    user:users(username)
                )
            `)
      .order('scheduled_date', { ascending: true });

    if (userRole !== 'admin') {
      const { data: userAssignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', userId);

      const jobIds = userAssignments?.map(a => a.job_id) || [];
      query = query.in('id', jobIds);
    }

    const { data, error } = await query;
    if (error) throw error;

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

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Welcome, {userProfile?.username || 'User'}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>{userProfile?.company || 'ENETK'} Project Management Dashboard</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</div>
          <div style={{ color: attendanceStatus ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {attendanceStatus ? '● On Shift' : '○ Off Clock'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <AttendanceModule initialStatus={attendanceStatus} />

        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Live Team Status</h3>
          {uniqueClockedIn.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uniqueClockedIn.map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span><strong>{log.user?.username}</strong></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({log.user?.company || 'ENETK'})</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No one else is currently clocked in.</p>
          )}
        </div>

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
