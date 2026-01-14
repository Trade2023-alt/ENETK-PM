'use client'

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import { chatWithAI } from '@/app/actions/ai-chat';

export default function AIChatPage({ userRole }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your AI Agent. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        const result = await chatWithAI(newMessages);

        if (result.error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${result.error}` }]);
        } else {
            setMessages(prev => [...prev, result]);
        }
        setLoading(false);
    };

    return (
        <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
            <Header userRole={userRole} />

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>AI Agent</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Powered by Claude Sonnet 4</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '1rem',
                            borderRadius: '1rem',
                            background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: m.role === 'user' ? 'white' : 'var(--foreground)',
                            border: m.role === 'user' ? 'none' : '1px solid var(--card-border)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', padding: '1rem', color: 'var(--text-muted)' }}>
                            Claude is thinking...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        style={{ flex: 1 }}
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
