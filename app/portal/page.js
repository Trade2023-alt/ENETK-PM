import db from '@/lib/db';
import { cookies } from 'next/headers';

export default async function CustomerPortalPage() {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('user_id')?.value;

    // Fetch jobs for this customer
    const jobs = db.prepare(`
        SELECT jobs.*, 
               GROUP_CONCAT(sub_tasks.title, '||') as sub_task_titles,
               GROUP_CONCAT(sub_tasks.status, '||') as sub_task_statuses
        FROM jobs 
        LEFT JOIN sub_tasks ON jobs.id = sub_tasks.job_id
        WHERE jobs.customer_id = ?
        GROUP BY jobs.id
        ORDER BY scheduled_date DESC
    `).all(customerId);

    return (
        <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>My Jobs</h2>

            {jobs.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No jobs found.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {jobs.map(job => (
                        <div key={job.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{job.title}</h3>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '1rem',
                                    background: job.status === 'Complete' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                    color: job.status === 'Complete' ? 'var(--success)' : 'var(--primary)'
                                }}>
                                    {job.status}
                                </span>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                                {job.description}
                            </p>

                            <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Scheduled Date</div>
                                <div>{new Date(job.scheduled_date).toLocaleDateString()}</div>
                            </div>

                            {job.sub_task_titles && (
                                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tasks</div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {job.sub_task_titles.split('||').map((title, idx) => {
                                            const statuses = job.sub_task_statuses ? job.sub_task_statuses.split('||') : [];
                                            const status = statuses[idx] || 'Pending';
                                            return (
                                                <li key={idx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.875rem',
                                                    marginBottom: '0.25rem',
                                                    color: status === 'Complete' ? 'var(--text-muted)' : 'var(--foreground)',
                                                    textDecoration: status === 'Complete' ? 'line-through' : 'none'
                                                }}>
                                                    <span>• {title}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
