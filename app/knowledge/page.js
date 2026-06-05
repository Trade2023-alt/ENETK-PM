import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { searchLessonsLearned } from '@/app/actions/lessons';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage({ searchParams }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    const params = await searchParams;
    const query = params?.q || '';
    const lessons = await searchLessonsLearned(query);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🧠</span> Knowledge Base & Tips
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Search and review lessons learned and tips & tricks from past projects.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <form method="GET" action="/knowledge" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        name="q" 
                        className="input" 
                        placeholder="Search for tips, categories, or keywords..." 
                        defaultValue={query}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">Search</button>
                    {query && (
                        <Link href="/knowledge" className="btn" style={{ background: 'var(--card-border)' }}>Clear</Link>
                    )}
                </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lessons.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                        No lessons learned or tips found matching your search.
                    </div>
                ) : (
                    lessons.map(lesson => (
                        <div key={lesson.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{lesson.title}</h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {lesson.category}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(lesson.created_at).toLocaleDateString()}
                                    </div>
                                    {lesson.job && (
                                        <Link href={`/jobs/${lesson.job.id}`} style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'inline-block', marginTop: '0.25rem' }}>
                                            🔗 {lesson.job.title}
                                        </Link>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</div>
                                <div style={{ lineHeight: '1.5' }}>{lesson.description}</div>
                            </div>
                            
                            {lesson.impact && (
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Business Impact</div>
                                    <div style={{ lineHeight: '1.5', background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '4px' }}>
                                        {lesson.impact}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
