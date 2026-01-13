import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getInventory } from '@/app/actions/inventory';
import InventoryTable from '@/components/InventoryTable';

export default async function InventoryPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    const inventory = await getInventory();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Material Inventory & Management</h2>
            </div>

            <InventoryTable initialData={inventory} />
        </div>
    );
}
