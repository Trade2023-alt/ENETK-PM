'use client'

import { deleteQuote } from '@/app/actions/quotes';
import Link from 'next/link';

export default function QuotesActionButtons({ quoteId }) {
    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this quote?')) {
            const res = await deleteQuote(quoteId);
            if (!res.success) {
                alert('Error deleting quote: ' + res.error);
            } else {
                window.location.reload();
            }
        }
    };

    return (
        <>
            <Link href={`/quotes/${quoteId}`} style={{ color: 'var(--primary)', textDecoration: 'none', marginRight: '1rem' }}>Edit</Link>
            <button
                onClick={handleDelete}
                className="btn-text"
                style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
                Delete
            </button>
        </>
    );
}
