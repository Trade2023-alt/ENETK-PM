'use client'

import { useState } from 'react';
import { updateMaterial } from '@/app/actions/inventory';

export default function EditMaterialModal({ material, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.target);
        const result = await updateMaterial(material.id, formData);

        if (result.success) {
            onSuccess();
            onClose();
        } else {
            setError(result.error || 'Failed to update material');
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
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                transition: 'none',
                transform: 'none'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Edit Material</h3>
                    <button onClick={onClose} className="btn" style={{ padding: '0.5rem' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label">Checked In Date</label>
                            <input type="date" name="checked_in_date" className="input" required defaultValue={material.checked_in_date} />
                        </div>
                        <div className="form-group">
                            <label className="label">Type</label>
                            <select name="type" className="input" required defaultValue={material.type}>
                                <option value="instrument">Instrument</option>
                                <option value="panelbuild">Panel Build</option>
                                <option value="field">Field</option>
                                <option value="misc">Misc</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Manufacturer (MFG)</label>
                            <input type="text" name="mfg" className="input" defaultValue={material.mfg} placeholder="e.g. Allen Bradley" />
                        </div>
                        <div className="form-group">
                            <label className="label">Part Number (P/N)</label>
                            <input type="text" name="pn" className="input" defaultValue={material.pn} placeholder="P/N" />
                        </div>
                        <div className="form-group">
                            <label className="label">Serial Number (S/N)</label>
                            <input type="text" name="sn" className="input" defaultValue={material.sn} placeholder="S/N" />
                        </div>
                        <div className="form-group">
                            <label className="label">Job Number</label>
                            <input type="text" name="job_number" className="input" defaultValue={material.job_number} placeholder="Job #" />
                        </div>
                        <div className="form-group">
                            <label className="label">PO Number</label>
                            <input type="text" name="po_number" className="input" defaultValue={material.po_number} placeholder="PO #" />
                        </div>
                        <div className="form-group">
                            <label className="label">Customer</label>
                            <input type="text" name="customer" className="input" defaultValue={material.customer} placeholder="Customer Name" />
                        </div>
                        <div className="form-group">
                            <label className="label">Quantity (QTY)</label>
                            <input type="number" name="qty" className="input" defaultValue={material.qty} placeholder="0" min="0" />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="label">Description</label>
                        <textarea name="description" className="input" rows="2" defaultValue={material.description} placeholder="Item description..."></textarea>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="label">Vendor</label>
                            <input type="text" name="vendor" className="input" defaultValue={material.vendor} placeholder="Vendor Name" />
                        </div>
                        <div className="form-group">
                            <label className="label">Location</label>
                            <input type="text" name="location" className="input" defaultValue={material.location} placeholder="Shelf A1, Bin 4, etc." />
                        </div>
                        <div className="form-group">
                            <label className="label">Check Out Date</label>
                            <input type="date" name="check_out_date" className="input" defaultValue={material.check_out_date} />
                        </div>
                        <div className="form-group">
                            <label className="label">Transmittal Form</label>
                            <select name="transmittal_form" className="input" defaultValue={material.transmittal_form || 'no'}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Return Needed</label>
                            <select name="return_needed" className="input" defaultValue={material.return_needed || 'no'}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                            {loading ? 'Saving...' : 'Update Material'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
