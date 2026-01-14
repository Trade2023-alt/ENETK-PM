'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function importProspects() {
    try {
        const filePath = path.join(process.cwd(), 'prospects.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() !== '');

        const prospects = lines.map(line => {
            const parts = line.split('\t');
            // Basic cleaning
            const clean = (val) => val ? val.trim().replace(/\u00A0/g, ' ') : '';

            // Contact parsing
            const contactInfo = clean(parts[5]);
            let email = '';
            let phone = '';

            if (contactInfo) {
                const emailMatch = contactInfo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) email = emailMatch[0];

                // Keep the rest as phone or descriptive info
                phone = contactInfo.replace(email, '').replace(/,$/, '').trim();
            }

            return {
                state: clean(parts[0]),
                name: clean(parts[1]),
                description: clean(parts[2]),
                location_name: clean(parts[3]),
                location_city: clean(parts[4]),
                phone: phone,
                email: email,
                website: clean(parts[6]),
                is_contacted: clean(parts[7]).toLowerCase() === 'true',
                priority: clean(parts[8]),
                comments: clean(parts[11]) || ''
            };
        });

        const { error } = await supabase.from('prospects').insert(prospects);
        if (error) throw error;

        revalidatePath('/pipeline');
        return { success: true, count: prospects.length };
    } catch (error) {
        console.error('Import Error:', error);
        return { error: error.message };
    }
}

export async function getProspects() {
    const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('priority', { ascending: false });
    if (error) return [];
    return data || [];
}

export async function updateProspect(id, updates) {
    const { error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', id);
    if (error) throw error;
    revalidatePath('/pipeline');
    return { success: true };
}
