import { NextResponse } from 'next/server';
import { runAlertAndSummaryChecks } from '@/lib/cron';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await runAlertAndSummaryChecks();
        return NextResponse.json({ success: true, message: 'Cron checks triggered successfully.' });
    } catch (error) {
        console.error('Manual cron trigger error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
