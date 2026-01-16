import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { getTodoItems, getAllUsersForSelect } from '@/app/actions/todo';
import TodoListClient from '@/components/TodoListClient';

export const dynamic = 'force-dynamic';

export default async function TodoPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId) {
        redirect('/login');
    }

    const { tasks, error } = await getTodoItems(userId);
    const users = userRole === 'admin' ? await getAllUsersForSelect() : [];

    if (error) {
        return (
            <div className="container">
                <Header userRole={userRole} />
                <div className="card">Error loading tasks: {error}</div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>My To-Do List</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Track all your assigned jobs and sub-tasks in one place.
                    </p>
                </div>
                <Link href="/todo/bulk" className="btn btn-primary">
                    📋 Bulk Add Tasks
                </Link>
            </div>

            <TodoListClient
                initialTasks={tasks}
                users={users}
                currentUserId={parseInt(userId)}
                userRole={userRole}
            />
        </div>
    );
}
