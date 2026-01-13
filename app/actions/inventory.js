'use server'

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getInventory() {
    try {
        return db.prepare('SELECT * FROM material_inventory ORDER BY checked_in_date DESC').all();
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

export async function addMaterial(formData) {
    const data = {
        checked_in_date: formData.get('checked_in_date'),
        mfg: formData.get('mfg'),
        pn: formData.get('pn'),
        sn: formData.get('sn'),
        job_number: formData.get('job_number'),
        po_number: formData.get('po_number'),
        customer: formData.get('customer'),
        description: formData.get('description'),
        check_out_date: formData.get('check_out_date'),
        transmittal_form: formData.get('transmittal_form'),
        type: formData.get('type'),
        return_needed: formData.get('return_needed'),
        location: formData.get('location'),
        qty: parseInt(formData.get('qty') || '0', 10),
        vendor: formData.get('vendor')
    };

    try {
        const stmt = db.prepare(`
            INSERT INTO material_inventory (
                checked_in_date, mfg, pn, sn, job_number, po_number, customer, 
                description, check_out_date, transmittal_form, type, return_needed, location, qty, vendor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            data.checked_in_date, data.mfg, data.pn, data.sn, data.job_number,
            data.po_number, data.customer, data.description, data.check_out_date,
            data.transmittal_form, data.type, data.return_needed, data.location, data.qty, data.vendor
        );

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error adding material:', error);
        return { error: 'Failed to add material' };
    }
}

export async function updateMaterial(id, formData) {
    // Similar to addMaterial but with UPDATE
    const data = {
        checked_in_date: formData.get('checked_in_date'),
        mfg: formData.get('mfg'),
        pn: formData.get('pn'),
        sn: formData.get('sn'),
        job_number: formData.get('job_number'),
        po_number: formData.get('po_number'),
        customer: formData.get('customer'),
        description: formData.get('description'),
        check_out_date: formData.get('check_out_date'),
        transmittal_form: formData.get('transmittal_form'),
        type: formData.get('type'),
        return_needed: formData.get('return_needed'),
        location: formData.get('location'),
        qty: parseInt(formData.get('qty') || '0', 10),
        vendor: formData.get('vendor')
    };

    try {
        const stmt = db.prepare(`
            UPDATE material_inventory SET 
                checked_in_date = ?, mfg = ?, pn = ?, sn = ?, job_number = ?, 
                po_number = ?, customer = ?, description = ?, check_out_date = ?, 
                transmittal_form = ?, type = ?, return_needed = ?, location = ?, qty = ?, vendor = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            data.checked_in_date, data.mfg, data.pn, data.sn, data.job_number,
            data.po_number, data.customer, data.description, data.check_out_date,
            data.transmittal_form, data.type, data.return_needed, data.location, data.qty, data.vendor,
            id
        );

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error updating material:', error);
        return { error: 'Failed to update material' };
    }
}

export async function deleteMaterial(id) {
    try {
        db.prepare('DELETE FROM material_inventory WHERE id = ?').run(id);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error deleting material:', error);
        return { error: 'Failed to delete material' };
    }
}

export async function checkoutMaterial(id) {
    try {
        const today = new Date().toISOString().split('T')[0];
        db.prepare('UPDATE material_inventory SET check_out_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(today, id);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error checking out material:', error);
        return { error: 'Failed to remove material' };
    }
}

export async function importMaterials(materials) {
    const insertStmt = db.prepare(`
        INSERT INTO material_inventory (
            checked_in_date, mfg, pn, sn, job_number, po_number, customer, 
            description, check_out_date, transmittal_form, type, return_needed, location, qty, vendor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const transaction = db.transaction((items) => {
            for (const item of items) {
                insertStmt.run(
                    item.checked_in_date || new Date().toISOString().split('T')[0],
                    item.mfg || '',
                    item.pn || '',
                    item.sn || '',
                    item.job_number || '',
                    item.po_number || '',
                    item.customer || '',
                    item.description || '',
                    item.check_out_date || '',
                    item.transmittal_form || 'no',
                    item.type || 'misc',
                    item.return_needed || 'no',
                    item.location || '',
                    parseInt(item.qty || '0', 10),
                    item.vendor || ''
                );
            }
        });

        transaction(materials);
        revalidatePath('/inventory');
        return { success: true, count: materials.length };
    } catch (error) {
        console.error('Error importing materials:', error);
        return { error: 'Failed to import materials' };
    }
}

export async function bulkDeleteMaterials(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: true };

    try {
        const stmt = db.prepare('DELETE FROM material_inventory WHERE id = ?');
        const transaction = db.transaction((idList) => {
            for (const id of idList) {
                stmt.run(id);
            }
        });

        transaction(ids);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error bulk deleting materials:', error);
        return { error: 'Failed to delete selected materials' };
    }
}
