import Header from '@/components/Header';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ScadaPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, padding: 0 }}>
            <Header userRole={userRole} />
            <div style={{ flex: 1, width: '100%' }}>
                <iframe 
                    src="https://enetkscada.com/" 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="ENETK SCADA App"
                />
            </div>
        </div>
    );
}
