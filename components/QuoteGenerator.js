'use client'

import { useState, useEffect } from 'react';
import { parseEHQuote, saveQuote } from '@/app/actions/quotes';
import { useRouter } from 'next/navigation';

export default function QuoteGenerator({ initialData = null }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(false);

    // Quote State
    const [quoteData, setQuoteData] = useState(initialData?.quote || {
        quote_number: `Q-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        quote_date: new Date().toISOString().split('T')[0],
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        project_name: '',
        customer_company: '',
        contact_person: '',
        phone: '',
        email: '',
        customer_ref: '',
        bill_to: '',
        ship_to: '',
        payment_terms: 'Net 30 Days',
        delivery_terms: 'FOB Origin',
        lead_time_value: 0,
        lead_time_unit: 'Weeks',
        markup_percentage: 20.0,
        tax_percentage: 8.0,
        total: 0.0
    });

    const [lineItems, setLineItems] = useState(initialData?.items || []);

    const calculateTotal = () => {
        let subtotal = 0;
        const markup = (quoteData.markup_percentage || 0) / 100;
        const tax = (quoteData.tax_percentage || 0) / 100;

        lineItems.forEach(item => {
            const basePrice = parseFloat(item.unit_price) || 0;
            const priceWithTax = basePrice * (1 + tax);
            const quotedPrice = priceWithTax * (1 + markup);
            subtotal += quotedPrice * (parseInt(item.quantity) || 1);
        });

        setQuoteData(prev => ({ ...prev, total: subtotal }));
    };

    useEffect(() => {
        calculateTotal();
    }, [lineItems, quoteData.markup_percentage, quoteData.tax_percentage]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const content = event.target.result;
            const extension = file.name.split('.').pop().toLowerCase();

            const result = await parseEHQuote(content, extension);
            if (result.success) {
                setLineItems(prev => [...prev, ...result.items]);
            } else {
                alert("Failed to parse file: " + result.error);
            }
            setLoading(false);
        };

        if (file.name.endsWith('.xlsx')) {
            // Excel requires binary reading or a different approach
            // For now we support text-based formats
            alert("Excel import coming soon. Please use RTF or XML for now.");
            setLoading(false);
        } else {
            reader.readAsText(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const result = await saveQuote(quoteData, lineItems);
        if (result.success) {
            router.push('/quotes');
        } else {
            alert("Failed to save: " + result.error);
            setLoading(false);
        }
    };

    const addItem = () => {
        setLineItems([...lineItems, {
            description: 'New Item',
            model: '',
            order_code: '',
            quantity: 1,
            unit: 'PC',
            unit_price: 0.0,
            config: ''
        }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...lineItems];
        newItems[index][field] = value;
        setLineItems(newItems);
    };

    const removeItem = (index) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('details')}
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'details' ? 600 : 400, cursor: 'pointer', padding: '0.5rem 1rem'
                    }}
                >
                    1. Quote Details
                </button>
                <button
                    onClick={() => setActiveTab('items')}
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'items' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'items' ? 600 : 400, cursor: 'pointer', padding: '0.5rem 1rem'
                    }}
                >
                    2. Line Items ({lineItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'preview' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'preview' ? 600 : 400, cursor: 'pointer', padding: '0.5rem 1rem'
                    }}
                >
                    3. Preview & Export
                </button>
            </div>

            {/* Tab Content */}
            <div className="card">
                {activeTab === 'details' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Project Info</h3>
                            <div className="form-group">
                                <label className="label">Quote Number</label>
                                <input className="input" value={quoteData.quote_number} onChange={e => setQuoteData({ ...quoteData, quote_number: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Project Name</label>
                                <input className="input" value={quoteData.project_name} onChange={e => setQuoteData({ ...quoteData, project_name: e.target.value })} placeholder="e.g. Kinder Morgan - Level Upgrade" />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Date</label>
                                    <input type="date" className="input" value={quoteData.quote_date} onChange={e => setQuoteData({ ...quoteData, quote_date: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Expires On</label>
                                    <input type="date" className="input" value={quoteData.expiration_date} onChange={e => setQuoteData({ ...quoteData, expiration_date: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Customer Info</h3>
                            <div className="form-group">
                                <label className="label">Company</label>
                                <input className="input" value={quoteData.customer_company} onChange={e => setQuoteData({ ...quoteData, customer_company: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Contact Person</label>
                                <input className="input" value={quoteData.contact_person} onChange={e => setQuoteData({ ...quoteData, contact_person: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Email</label>
                                    <input type="email" className="input" value={quoteData.email} onChange={e => setQuoteData({ ...quoteData, email: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Phone</label>
                                    <input className="input" value={quoteData.phone} onChange={e => setQuoteData({ ...quoteData, phone: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Bill To</label>
                                    <textarea className="input" rows="3" value={quoteData.bill_to} onChange={e => setQuoteData({ ...quoteData, bill_to: e.target.value })}></textarea>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Ship To</label>
                                    <textarea className="input" rows="3" value={quoteData.ship_to} onChange={e => setQuoteData({ ...quoteData, ship_to: e.target.value })}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Line Items</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Import a file from EH or add items manually.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input type="file" id="eh-import" style={{ display: 'none' }} onChange={handleFileUpload} accept=".rtf,.xml,.txt" />
                                <label htmlFor="eh-import" className="btn" style={{ background: 'var(--card-border)', cursor: 'pointer' }}>
                                    {loading ? 'Processing...' : '📁 Import EH File (RTF/XML)'}
                                </label>
                                <button onClick={() => {
                                    const text = prompt("Paste raw EH Quote text here:");
                                    if (text) {
                                        parseEHQuote(text, 'txt').then(res => {
                                            if (res.success) setLineItems([...lineItems, ...res.items]);
                                            else alert(res.error);
                                        });
                                    }
                                }} className="btn" style={{ background: 'var(--card-border)' }}>
                                    📋 Paste Quote Text
                                </button>
                                <button onClick={addItem} className="btn btn-primary">+ Add Item</button>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '0.5rem' }}>#</th>
                                    <th style={{ padding: '0.5rem', width: '40%' }}>Description / Model</th>
                                    <th style={{ padding: '0.5rem' }}>Qty</th>
                                    <th style={{ padding: '0.5rem' }}>Unit Price (Net)</th>
                                    <th style={{ padding: '0.5rem' }}>Total (Marked Up)</th>
                                    <th style={{ padding: '0.5rem' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => {
                                    const markup = (quoteData.markup_percentage || 0) / 100;
                                    const tax = (quoteData.tax_percentage || 0) / 100;
                                    const basePrice = parseFloat(item.unit_price) || 0;
                                    const priceWithTax = basePrice * (1 + tax);
                                    const quotedPrice = priceWithTax * (1 + markup);
                                    const itemTotal = quotedPrice * (parseInt(item.quantity) || 1);

                                    return (
                                        <tr key={index} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                            <td style={{ padding: '0.5rem' }}>{index + 1}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input className="input" style={{ marginBottom: '0.25rem', fontWeight: 600 }} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                                                <input className="input" style={{ fontSize: '0.8rem' }} value={item.model} onChange={e => updateItem(index, 'model', e.target.value)} placeholder="Model Number" />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input type="number" className="input" style={{ width: '60px' }} value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    $ <input type="number" className="input" style={{ width: '100px' }} value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                                ${itemTotal.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>×</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {lineItems.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No items added.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Pricing & Markup</h3>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="label">Markup %</label>
                                        <input type="number" className="input" value={quoteData.markup_percentage} onChange={e => setQuoteData({ ...quoteData, markup_percentage: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="label">Tax % (if applicable)</label>
                                        <input type="number" className="input" value={quoteData.tax_percentage} onChange={e => setQuoteData({ ...quoteData, tax_percentage: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Subtotal:</span>
                                        <span>${quoteData.total.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem' }}>
                                        <span>Total:</span>
                                        <span style={{ color: 'var(--primary)' }}>${quoteData.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Actions</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <button onClick={handleSave} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                        {loading ? 'Saving...' : '💾 Save Quote to Database'}
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white' }}>
                                        🖨️ Export to ENETK PDF
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '1rem', background: '#2563eb', color: 'white' }}>
                                        📊 Export to Excel (.xlsx)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                {activeTab !== 'details' && <button onClick={() => setActiveTab(activeTab === 'items' ? 'details' : 'items')} className="btn">Previous</button>}
                {activeTab !== 'preview' && <button onClick={() => setActiveTab(activeTab === 'details' ? 'items' : 'preview')} className="btn btn-primary">Next Step</button>}
            </div>
        </div>
    );
}
