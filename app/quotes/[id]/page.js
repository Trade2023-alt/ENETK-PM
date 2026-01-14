import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import QuoteGenerator from '@/components/QuoteGenerator';

export default async function EditQuotePage({ params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (!userRole) redirect('/login');

    // Fetch quote and items
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

    if (quoteError || !quote) {
        redirect('/quotes');
    }

    const { data: items } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id)
        .order('item_number', { ascending: true });

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Edit Quote: {quote.quote_number}</h2>
            </div>

            <QuoteGenerator initialData={{ quote, items }} />
        </div>
    );
}
