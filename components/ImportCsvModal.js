'use client'

import { useState } from 'react';
import Papa from 'papaparse';
import { importMaterials } from '@/app/actions/inventory';

export default function ImportCsvModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setPreview(results.data);
            },
            error: (err) => {
                setError('Failed to parse CSV file');
            }
        });
    };

    const handleImport = async () => {
        if (!preview || preview.length === 0) return;

        setLoading(true);
        setError('');

        // Map CSV headers to database columns if needed (assuming headers match for now)
        // You could add mapping logic here if the CSV headers are different
        const result = await importMaterials(preview);

        if (result.success) {
            alert(`Successfully imported ${result.count} items.`);
            onSuccess();
            onClose();
        } else {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                transition: 'none',
                transform: 'none'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Import Materials from CSV</h3>
                    <button onClick={onClose} className="btn" style={{ padding: '0.5rem' }}>✕</button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Upload a CSV file. The columns should ideally match:
                        <strong> checked_in_date, mfg, pn, sn, job_number, po_number, customer, description, type, location, qty</strong>, etc.
                    </p>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="input" />
                </div>

                {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

                {preview && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preview (First 5 items)</h4>
                        <div style={{ overflowX: 'auto', maxHeight: '200px', border: '1px solid #eee' }}>
                            <table className="table" style={{ fontSize: '0.75rem' }}>
                                <thead>
                                    <tr>
                                        {Object.keys(preview[0]).map(key => <th key={key}>{key}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => <td key={j}>{val}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Total items to import: {preview.length}</p>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={onClose} className="btn" style={{ flex: 1 }}>Cancel</button>
                    <button
                        onClick={handleImport}
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={loading || !preview}
                    >
                        {loading ? 'Importing...' : 'Start Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
