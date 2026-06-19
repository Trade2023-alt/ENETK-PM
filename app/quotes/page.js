import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import QuotesActionButtons from '@/components/QuotesActionButtons';

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

            <div className="page-header">
                <h2 className="page-title">ENETK Quote Management</h2>
                <Link href="/quotes/new" className="btn btn-primary">
                    + New Quote / Import EH
                </Link>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Quote #</th>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Customer</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map(quote => (
                            <tr key={quote.id}>
                                <td style={{ fontWeight: 600 }}>{quote.quote_number}</td>
                                <td className="text-muted">{new Date(quote.quote_date).toLocaleDateString()}</td>
                                <td>{quote.project_name || '-'}</td>
                                <td>{quote.customer_company || '-'}</td>
                                <td style={{ fontWeight: 700, textAlign: 'right' }}>${Number(quote.total).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <QuotesActionButtons quoteId={quote.id} />
                                </td>
                            </tr>
                        ))}
                        {quotes.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: 0 }}>
                                    <div className="empty-state">
                                        <div className="empty-icon">📄</div>
                                        <p>No quotes found. Start by creating a new one or importing from E+H.</p>
                                        <Link href="/quotes/new" className="text-primary" style={{ marginTop: '0.75rem', display: 'inline-block', fontWeight: 600 }}>Create your first quote →</Link>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
