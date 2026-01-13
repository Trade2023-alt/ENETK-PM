import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import Header from '@/components/Header';
import JobCard from '@/components/JobCard';
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

  // Fetch jobs with customer info
  // If admin, fetch all. If user, fetch assigned.
  let jobs = [];
  try {
    const query = userRole === 'admin'
      ? `
        SELECT jobs.*, 
               customers.name as customer_name, 
               customers.address as customer_address,
               GROUP_CONCAT(users.username, ', ') as assigned_users
        FROM jobs 
        JOIN customers ON jobs.customer_id = customers.id 
        LEFT JOIN job_assignments ON jobs.id = job_assignments.job_id
        LEFT JOIN users ON job_assignments.user_id = users.id
        GROUP BY jobs.id
        ORDER BY scheduled_date ASC
      `
      : `
        SELECT jobs.*, 
               customers.name as customer_name, 
               customers.address as customer_address,
               GROUP_CONCAT(users.username, ', ') as assigned_users
        FROM jobs 
        JOIN customers ON jobs.customer_id = customers.id 
        JOIN job_assignments ON jobs.id = job_assignments.job_id
        JOIN users ON job_assignments.user_id = users.id
        WHERE job_assignments.user_id = ? 
        GROUP BY jobs.id
        ORDER BY scheduled_date ASC
      `;

    jobs = userRole === 'admin'
      ? db.prepare(query).all()
      : db.prepare(query).all(userId);

  } catch (error) {
    console.error('Error fetching jobs:', error);
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <Header userRole={userRole} />

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
