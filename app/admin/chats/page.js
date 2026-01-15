import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getAllConversations, getChatHistory } from '@/app/actions/ai-chat';
import AdminChatList from '@/components/AdminChatList';

export const dynamic = 'force-dynamic';

export default async function AdminChatsPage() {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;

    if (userRole !== 'admin') {
        redirect('/');
    }

    const conversations = await getAllConversations();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Header userRole={userRole} />

            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Agent Conversations</h2>
                <p style={{ color: 'var(--text-muted)' }}>Monitor assistant usage and chat history across all team members.</p>
            </div>

            <AdminChatList initialConversations={conversations} />
        </div>
    );
}
