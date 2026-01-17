'use client'

import { useState } from 'react';
import { getChatHistory } from '@/app/actions/ai-chat';

export default function AdminChatList({ initialConversations }) {
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSelect = async (conv) => {
        setSelectedConv(conv);
        setLoading(true);
        const history = await getChatHistory(conv.id);
        setMessages(history);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', height: '600px', overflow: 'hidden' }}>
            {/* List */}
            <div className="card" style={{ width: '350px', padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', fontWeight: 600 }}>
                    Conversations ({initialConversations.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {initialConversations.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            No conversations found in database.<br />
                            <small>(Verify 'chat_conversations' table)</small>
                        </div>
                    {initialConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelect(conv)}
                                style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--card-border)',
                                    cursor: 'pointer',
                                    background: selectedConv?.id === conv.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    borderLeft: selectedConv?.id === conv.id ? '4px solid var(--primary)' : '4px solid transparent'
                                }}
                            >
                                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{conv.title}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>@{conv.user?.username}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(conv.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Viewer */}
            <div className="card" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column' }}>
                {!selectedConv ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Select a conversation to view transcript
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>{selectedConv.title}</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User: {selectedConv.user?.username}</div>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loading ? <div style={{ textAlign: 'center' }}>Loading...</div> : messages.map((msg, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.75rem',
                                        background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        border: msg.role === 'user' ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem', color: msg.role === 'user' ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {msg.role}
                                        </div>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
