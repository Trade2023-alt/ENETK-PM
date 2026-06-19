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

            <div className="page-header">
                <h2 className="page-title">Material Inventory &amp; Management</h2>
            </div>

            <InventoryTable initialData={inventory} />
        </div>
    );
}
