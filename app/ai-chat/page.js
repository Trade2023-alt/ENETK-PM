'use client'

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import { chatWithAI, getConversations, createConversation, getChatHistory } from '@/app/actions/ai-chat';

export default function AIChatPage() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your AI Agent. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [lastCost, setLastCost] = useState(null);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        const data = await getConversations();
        setConversations(data);
    };

    const handleSelectConversation = async (conv) => {
        setActiveConversation(conv);
        setLoading(true);
        const history = await getChatHistory(conv.id);
        if (history.length > 0) {
            setMessages(history.map(h => ({ role: h.role, content: h.content })));
        } else {
            setMessages([{ role: 'assistant', content: 'Hello! This is a new conversation. How can I help?' }]);
        }
        setLoading(false);
    };

    const handleNewChat = async () => {
        const title = prompt('Enter chat title:') || 'New Chat';
        const data = await createConversation(title);
        if (data && !data.error) {
            setConversations([data, ...conversations]);
            setActiveConversation(data);
            setMessages([{ role: 'assistant', content: 'New chat started. I am ready to help!' }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setLastCost(null);

        const result = await chatWithAI([...messages, userMsg], activeConversation?.id);

        if (result.error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${result.error}` }]);
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: result.content }]);
            if (result.cost) setLastCost(result.cost);
        }
        setLoading(false);
    };

    return (
        <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <div style={{ flex: 1, display: 'flex', gap: '1rem', overflow: 'hidden', paddingBottom: '1rem' }}>

                {/* Sidebar */}
                <div className="card" style={{ width: '250px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                    <button onClick={handleNewChat} className="btn btn-primary" style={{ marginBottom: '1rem', width: '100%' }}>+ New Chat</button>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    background: activeConversation?.id === conv.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeConversation?.id === conv.id ? 'white' : 'inherit',
                                    fontSize: '0.875rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {conv.title}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', position: 'relative' }}>
                    <div style={{ borderBottom: '1px solid var(--card-border)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{activeConversation?.title || 'AI Assistant'}</h2>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claude 3.5 Sonnet</div>
                        </div>
                        {lastCost && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Last msg cost: ${lastCost}</div>}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                                    color: msg.role === 'user' ? 'white' : 'inherit',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ padding: '0.75rem 1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '0.75rem' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
