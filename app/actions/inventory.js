'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getInventory() {
    try {
        const { data, error } = await supabase
            .from('material_inventory')
            .select('*')
            .order('checked_in_date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

export async function addMaterial(formData) {
    const data = {
        checked_in_date: formData.get('checked_in_date') || new Date().toISOString().split('T')[0],
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

    // Remove empty strings for optional fields to keep DB clean
    Object.keys(data).forEach(key => {
        if (data[key] === '') data[key] = null;
    });

    try {
        const { error } = await supabase
            .from('material_inventory')
            .insert([data]);

        if (error) throw error;

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error adding material:', error);
        return { error: 'Failed to add material: ' + error.message };
    }
}

export async function updateMaterial(id, formData) {
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
        vendor: formData.get('vendor'),
        updated_at: new Date().toISOString()
    };

    // Clean data
    Object.keys(data).forEach(key => {
        if (data[key] === '') data[key] = null;
    });

    try {
        const { error } = await supabase
            .from('material_inventory')
            .update(data)
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error updating material:', error);
        return { error: 'Failed to update material: ' + error.message };
    }
}

export async function deleteMaterial(id) {
    try {
        const { error } = await supabase
            .from('material_inventory')
            .delete()
            .eq('id', id);

        if (error) throw error;

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
        const { error } = await supabase
            .from('material_inventory')
            .update({ check_out_date: today, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error checking out material:', error);
        return { error: 'Failed to remove material' };
    }
}

export async function importMaterials(materials) {
    const cleanedMaterials = materials.map(item => {
        const cleaned = {
            checked_in_date: item.checked_in_date || new Date().toISOString().split('T')[0],
            mfg: item.mfg || null,
            pn: item.pn || null,
            sn: item.sn || null,
            job_number: item.job_number || null,
            po_number: item.po_number || null,
            customer: item.customer || null,
            description: item.description || null,
            check_out_date: item.check_out_date || null,
            transmittal_form: item.transmittal_form || 'no',
            type: item.type || 'misc',
            return_needed: item.return_needed || 'no',
            location: item.location || null,
            qty: parseInt(item.qty || '0', 10),
            vendor: item.vendor || null
        };
        return cleaned;
    });

    try {
        const { error } = await supabase
            .from('material_inventory')
            .insert(cleanedMaterials);

        if (error) throw error;

        revalidatePath('/inventory');
        return { success: true, count: materials.length };
    } catch (error) {
        console.error('Error importing materials:', error);
        return { error: 'Failed to import materials: ' + error.message };
    }
}

export async function bulkDeleteMaterials(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: true };

    try {
        const { error } = await supabase
            .from('material_inventory')
            .delete()
            .in('id', ids);

        if (error) throw error;

        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error bulk deleting materials:', error);
        return { error: 'Failed to delete selected materials' };
    }
}

