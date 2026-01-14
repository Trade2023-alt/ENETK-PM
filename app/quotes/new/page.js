import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import QuoteGenerator from '@/components/QuoteGenerator';

export default async function NewQuotePage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Create New Quote</h2>
                <p style={{ color: 'var(--text-muted)' }}>Follow the steps to generate a professional ENETK quote.</p>
            </div>

            <QuoteGenerator />
        </div>
    );
}
