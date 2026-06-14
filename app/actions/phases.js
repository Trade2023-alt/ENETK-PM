'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const DEFAULT_PHASES = [
    { phase_name: 'Opportunity', sequence_order: 1 },
    { phase_name: 'Estimating', sequence_order: 2 },
    { phase_name: 'Planning', sequence_order: 3 },
    { phase_name: 'Procurement', sequence_order: 4 },
    { phase_name: 'Installation', sequence_order: 5 },
    { phase_name: 'Finish', sequence_order: 6 },
    { phase_name: 'Customer Follow UP / Turnover', sequence_order: 7 }
];

export async function getJobPhases(jobId) {
    try {
        const { data, error } = await supabase
            .from('job_phases')
            .select('*')
            .eq('job_id', jobId)
            .order('sequence_order', { ascending: true });

        if (error) {
            // Check if the table does not exist
            if (error.message && error.message.includes('relation "job_phases" does not exist')) {
                console.error('DATABASE ERROR: job_phases table does not exist. Please run the SQL DDL in Supabase.');
                return { 
                    error: 'missing_table', 
                    message: 'The "job_phases" table does not exist in Supabase database yet. Please run the DDL in the SQL editor.' 
                };
            }
            throw error;
        }

        if (!data || data.length === 0) {
            // Initialize default phases
            const phasesToInsert = DEFAULT_PHASES.map(p => ({
                job_id: jobId,
                phase_name: p.phase_name,
                status: 'Not Started',
                sequence_order: p.sequence_order
            }));

            const { data: insertedData, error: insertError } = await supabase
                .from('job_phases')
                .insert(phasesToInsert)
                .select()
                .order('sequence_order', { ascending: true });

            if (insertError) throw insertError;
            return insertedData || [];
        }

        return data;
    } catch (error) {
        console.error('Error fetching job phases:', error);
        return [];
    }
}

export async function updateJobPhaseStatus(jobId, phaseId, newStatus) {
    if (!['Not Started', 'In Progress', 'Complete'].includes(newStatus)) {
        return { error: 'Invalid status value' };
    }

    try {
        // Fetch all phases for this job to check ordering
        const { data: phases, error: fetchError } = await supabase
            .from('job_phases')
            .select('*')
            .eq('job_id', jobId)
            .order('sequence_order', { ascending: true });

        if (fetchError) throw fetchError;

        const currentPhase = phases.find(p => p.id === phaseId);
        if (!currentPhase) {
            return { error: 'Phase not found' };
        }

        // Sequential rule: cannot mark Complete or In Progress unless all previous phases are Complete
        if (newStatus === 'In Progress' || newStatus === 'Complete') {
            const previousIncomplete = phases.filter(p => 
                p.sequence_order < currentPhase.sequence_order && 
                p.status !== 'Complete'
            );

            if (previousIncomplete.length > 0) {
                const names = previousIncomplete.map(p => `"${p.phase_name}"`).join(', ');
                return { 
                    error: `You must complete the previous phase(s) first: ${names}` 
                };
            }
        }

        // If demoting to Not Started or In Progress, automatically reset all subsequent phases to Not Started
        if (newStatus === 'Not Started' || newStatus === 'In Progress') {
            // Update current phase
            const { error: updateCurrentError } = await supabase
                .from('job_phases')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', phaseId);

            if (updateCurrentError) throw updateCurrentError;

            // Reset subsequent phases
            const subsequentPhases = phases.filter(p => p.sequence_order > currentPhase.sequence_order);
            if (subsequentPhases.length > 0) {
                const subsequentIds = subsequentPhases.map(p => p.id);
                const { error: resetError } = await supabase
                    .from('job_phases')
                    .update({ status: 'Not Started', updated_at: new Date().toISOString() })
                    .in('id', subsequentIds);

                if (resetError) throw resetError;
            }
        } else {
            // Promoting or keeping Complete: just update this phase
            const { error: updateError } = await supabase
                .from('job_phases')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', phaseId);

            if (updateError) throw updateError;
        }

        revalidatePath(`/jobs/${jobId}`);
        return { success: true };
    } catch (error) {
        console.error('Error updating job phase status:', error);
        return { error: 'Failed to update phase: ' + error.message };
    }
}
