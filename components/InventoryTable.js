'use client'

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddMaterialModal from './AddMaterialModal';
import EditMaterialModal from './EditMaterialModal';
import ImportCsvModal from './ImportCsvModal';
import { deleteMaterial, bulkDeleteMaterials, checkoutMaterial } from '@/app/actions/inventory';

export default function InventoryTable({ initialData }) {
    const [data, setData] = useState(initialData);
    const [isMounted, setIsMounted] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({
        checked_in_date: '',
        mfg: '',
        pn: '',
        sn: '',
        job_number: '',
        po_number: '',
        customer: '',
        description: '',
        type: '',
        vendor: '',
        location: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: 'checked_in_date', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('active'); // active, history, all
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync data if initialData changes from server
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }));
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            // View Mode Filter
            const isRemoved = !!item.check_out_date;
            if (viewMode === 'active' && isRemoved) return false;
            if (viewMode === 'history' && !isRemoved) return false;

            // Global filter
            const searchStr = globalFilter.toLowerCase();
            const matchesGlobal = !globalFilter || [
                item.description, item.mfg, item.pn, item.sn,
                item.job_number, item.customer, item.location, item.type, item.vendor, item.po_number
            ].some(val => (val?.toString().toLowerCase() || '').includes(searchStr));

            if (!matchesGlobal) return false;

            // Column filters
            for (const key in columnFilters) {
                if (columnFilters[key]) {
                    const val = item[key]?.toString().toLowerCase() || '';
                    if (!val.includes(columnFilters[key].toLowerCase())) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [data, globalFilter, columnFilters]);

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            if (!a[sortConfig.key]) return 1;
            if (!b[sortConfig.key]) return -1;

            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredData, sortConfig]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(sortedData.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this item?')) {
            const result = await deleteMaterial(id);
            if (result.success) {
                setData(prev => prev.filter(item => item.id !== id));
                setSelectedIds(prev => prev.filter(i => i !== id));
            } else {
                alert('Error deleting item');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) {
            setLoading(true);
            const result = await bulkDeleteMaterials(selectedIds);
            if (result.success) {
                setData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                setSelectedIds([]);
            } else {
                alert('Error deleting items');
            }
            setLoading(false);
        }
    };

    const handleCheckout = async (id) => {
        if (confirm('Mark this item as removed (Checked Out) from inventory?')) {
            const result = await checkoutMaterial(id);
            if (result.success) {
                // Update local state to reflect removal
                const today = new Date().toISOString().split('T')[0];
                setData(prev => prev.map(item =>
                    item.id === id ? { ...item, check_out_date: today } : item
                ));
            } else {
                alert('Error removing item');
            }
        }
    };

    if (!isMounted) {
        return <div className="card">Loading Inventory...</div>;
    }

    return (
        <div className="card" style={{ transition: 'none', transform: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search all columns..."
                        className="form-control"
                        style={{ maxWidth: '300px' }}
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                    {selectedIds.length > 0 && (
                        <button
                            className="btn"
                            style={{ background: 'var(--danger)', color: 'white' }}
                            onClick={handleBulkDelete}
                            disabled={loading}
                        >
                            Delete Selected ({selectedIds.length})
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    <button
                        className="btn"
                        style={{ background: viewMode === 'active' ? 'var(--primary)' : 'transparent', color: viewMode === 'active' ? 'white' : 'inherit', fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => setViewMode('active')}
                    >
                        Active
                    </button>
                    <button
                        className="btn"
                        style={{ background: viewMode === 'history' ? 'var(--primary)' : 'transparent', color: viewMode === 'history' ? 'white' : 'inherit', fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => setViewMode('history')}
                    >
                        Removed
                    </button>
                    <button
                        className="btn"
                        style={{ background: viewMode === 'all' ? 'var(--primary)' : 'transparent', color: viewMode === 'all' ? 'white' : 'inherit', fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => setViewMode('all')}
                    >
                        All
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => setIsImportModalOpen(true)} style={{ background: 'var(--card-bg)', border: '1px solid #ddd' }}>
                        Import CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        + Add Material
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '1200px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={sortedData.length > 0 && selectedIds.length === sortedData.length}
                                />
                            </th>
                            <th onClick={() => handleSort('checked_in_date')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date In {sortConfig.key === 'checked_in_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('mfg')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>MFG {sortConfig.key === 'mfg' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('pn')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>P/N {sortConfig.key === 'pn' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('sn')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>S/N {sortConfig.key === 'sn' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('job_number')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Job # {sortConfig.key === 'job_number' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('po_number')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>PO #</th>
                            <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Customer</th>
                            <th style={{ minWidth: '150px' }}>Description</th>
                            <th style={{ minWidth: '120px' }}>Type</th>
                            <th style={{ minWidth: '120px' }}>Vendor</th>
                            <th style={{ minWidth: '120px' }}>Location</th>
                            <th style={{ minWidth: '60px' }}>QTY</th>
                            <th style={{ minWidth: '100px' }}>Out Date</th>
                            <th>Actions</th>
                        </tr>
                        <tr className="filter-row">
                            <th></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.checked_in_date} onChange={e => handleColumnFilterChange('checked_in_date', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.mfg} onChange={e => handleColumnFilterChange('mfg', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.pn} onChange={e => handleColumnFilterChange('pn', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.sn} onChange={e => handleColumnFilterChange('sn', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.job_number} onChange={e => handleColumnFilterChange('job_number', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.po_number} onChange={e => handleColumnFilterChange('po_number', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.customer} onChange={e => handleColumnFilterChange('customer', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.description} onChange={e => handleColumnFilterChange('description', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.type} onChange={e => handleColumnFilterChange('type', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.vendor} onChange={e => handleColumnFilterChange('vendor', e.target.value)} /></th>
                            <th><input type="text" className="form-control-sm" placeholder="Search..." value={columnFilters.location} onChange={e => handleColumnFilterChange('location', e.target.value)} /></th>
                            <th></th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(item => (
                            <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? 'rgba(59, 130, 246, 0.05)' : undefined }}>
                                <td>
                                    <input
                                        type="checkbox"
                                        onChange={() => handleSelectOne(item.id)}
                                        checked={selectedIds.includes(item.id)}
                                    />
                                </td>
                                <td>{item.checked_in_date}</td>
                                <td>{item.mfg}</td>
                                <td>{item.pn}</td>
                                <td>{item.sn}</td>
                                <td>{item.job_number}</td>
                                <td>{item.po_number}</td>
                                <td>{item.customer}</td>
                                <td>{item.description}</td>
                                <td style={{ textTransform: 'capitalize' }}>{item.type}</td>
                                <td>{item.vendor}</td>
                                <td>{item.location}</td>
                                <td>{item.qty || 0}</td>
                                <td>{item.check_out_date || '-'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap' }}>
                                        <button
                                            className="btn"
                                            style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => {
                                                setEditingItem(item);
                                                setIsEditModalOpen(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        {!item.check_out_date && (
                                            <button
                                                className="btn"
                                                style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                onClick={() => handleCheckout(item.id)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .form-control-sm {
                    width: 100%;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    border: 1px solid var(--card-border);
                    border-radius: 0.25rem;
                    background: var(--card-bg);
                    color: var(--foreground);
                }
                .filter-row th {
                    padding: 4px 8px !important;
                }
            `}</style>

            {isModalOpen && (
                <AddMaterialModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        router.refresh();
                    }}
                />
            )}
            {isEditModalOpen && (
                <EditMaterialModal
                    material={editingItem}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingItem(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setEditingItem(null);
                        router.refresh();
                    }}
                />
            )}
            {isImportModalOpen && (
                <ImportCsvModal
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        setIsImportModalOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
