import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    // Fetch quotes from Supabase
    // Note: If the table doesn't exist yet, we'll handle it gracefully
    let quotes = [];
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) quotes = data;
    } catch (e) {
        console.error("Quotes table might not exist yet:", e);
    }

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>ENETK Quote Management</h2>
                <Link href="/quotes/new" className="btn btn-primary">
                    + New Quote / Import EH
                </Link>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Quote #</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Project</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Customer</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Total</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map(quote => (
                            <tr key={quote.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{quote.quote_number}</td>
                                <td style={{ padding: '1rem' }}>{new Date(quote.quote_date).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>{quote.project_name || '-'}</td>
                                <td style={{ padding: '1rem' }}>{quote.customer_company || '-'}</td>
                                <td style={{ padding: '1rem', fontWeight: 700 }}>${Number(quote.total).toFixed(2)}</td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <Link href={`/quotes/${quote.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', marginRight: '1rem' }}>Edit</Link>
                                    <button className="btn-text" style={{ color: 'var(--danger)' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                        {quotes.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                    <p>No quotes found. Start by creating a new one or importing from E+H.</p>
                                    <Link href="/quotes/new" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>Create your first quote</Link>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
