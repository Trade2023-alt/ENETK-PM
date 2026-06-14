'use client'

import { useState } from 'react';
import { updateJobPhaseStatus } from '@/app/actions/phases';

export default function JobPhases({ jobId, initialPhases }) {
    const isMissingTable = initialPhases && initialPhases.error === 'missing_table';
    const [phases, setPhases] = useState(isMissingTable ? [] : (initialPhases || []));
    const [error, setError] = useState(isMissingTable ? initialPhases.message : null);
    const [updatingId, setUpdatingId] = useState(null);

    if (isMissingTable) {
        return (
            <div className="card" style={{ marginTop: '2rem', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ Database Setup Required
                </h3>
                <p style={{ fontSize: '0.9375rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    To use the <strong>Job Phases</strong> feature, please run the following SQL script in your <strong>Supabase SQL Editor</strong> to create the required database table:
                </p>
                <pre style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                    border: '1px solid var(--glass-border)',
                    marginBottom: '1rem',
                    color: '#34d399'
                }}>
{`CREATE TABLE job_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Not Started', 'In Progress', 'Complete')),
    sequence_order INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (job_id, sequence_order)
);

CREATE INDEX idx_job_phases_job_id ON job_phases(job_id);`}
                </pre>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    After running the script, refresh this page to begin using job phases.
                </p>
            </div>
        );
    }

    const handleStatusUpdate = async (phaseId, newStatus) => {
        setUpdatingId(phaseId);
        setError(null);
        
        try {
            const res = await updateJobPhaseStatus(jobId, phaseId, newStatus);
            if (res && res.error) {
                setError(res.error);
            } else {
                // Update local state:
                // Since updateJobPhaseStatus resets subsequent statuses to 'Not Started' if we demote,
                // we map it locally to ensure UI matches database instantly.
                const currentPhaseIndex = phases.findIndex(p => p.id === phaseId);
                const updatedPhases = phases.map((p, idx) => {
                    if (p.id === phaseId) {
                        return { ...p, status: newStatus };
                    }
                    if ((newStatus === 'Not Started' || newStatus === 'In Progress') && idx > currentPhaseIndex) {
                        return { ...p, status: 'Not Started' };
                    }
                    return p;
                });
                setPhases(updatedPhases);
            }
        } catch (err) {
            setError('Failed to update phase status.');
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="card" style={{ marginTop: '2rem', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏁 Job Phases
            </h3>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--danger)',
                    borderRadius: '0.5rem',
                    color: 'var(--danger)',
                    fontSize: '0.875rem',
                    marginBottom: '1.5rem'
                }}>
                    {error}
                </div>
            )}

            {/* Stepper Timeline container */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative'
            }}>
                {phases.map((phase, index) => {
                    const isUnlocked = index === 0 || phases[index - 1].status === 'Complete';
                    const isComplete = phase.status === 'Complete';
                    const isInProgress = phase.status === 'In Progress';
                    const isUpdating = updatingId === phase.id;

                    // Timeline line styling
                    const showLine = index < phases.length - 1;

                    let stepColor = 'var(--text-muted)';
                    let circleBg = 'rgba(255, 255, 255, 0.05)';
                    let circleBorder = '2px solid var(--glass-border)';

                    if (isComplete) {
                        stepColor = 'var(--success)';
                        circleBg = 'rgba(16, 185, 129, 0.2)';
                        circleBorder = '2px solid var(--success)';
                    } else if (isInProgress) {
                        stepColor = 'var(--warning)';
                        circleBg = 'rgba(245, 158, 11, 0.2)';
                        circleBorder = '2px solid var(--warning)';
                    } else if (!isUnlocked) {
                        stepColor = 'rgba(248, 250, 252, 0.3)';
                        circleBg = 'rgba(0, 0, 0, 0.2)';
                        circleBorder = '2px solid rgba(255, 255, 255, 0.05)';
                    }

                    return (
                        <div key={phase.id} style={{
                            display: 'flex',
                            gap: '1rem',
                            position: 'relative',
                            alignItems: 'flex-start',
                            opacity: isUnlocked ? 1 : 0.6
                        }}>
                            {/* Connector Line */}
                            {showLine && (
                                <div style={{
                                    position: 'absolute',
                                    left: '19px',
                                    top: '38px',
                                    bottom: '-22px',
                                    width: '2px',
                                    background: isComplete ? 'var(--success)' : 'var(--glass-border)',
                                    zIndex: 0
                                }} />
                            )}

                            {/* Circle badge */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: circleBg,
                                border: circleBorder,
                                color: stepColor,
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                zIndex: 1,
                                flexShrink: 0,
                                transition: 'all 0.3s ease',
                                boxShadow: isInProgress ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
                            }}>
                                {isComplete ? (
                                    <svg style={{ width: '20px', height: '20px', fill: 'currentColor' }} viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : !isUnlocked ? (
                                    <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    phase.sequence_order
                                )}
                            </div>

                            {/* Step Details & Action Panel */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flexGrow: 1,
                                paddingBottom: showLine ? '1rem' : '0'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                }}>
                                    <div>
                                        <h4 style={{
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: isUnlocked ? 'var(--foreground)' : 'var(--text-muted)'
                                        }}>
                                            {phase.phase_name}
                                        </h4>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: stepColor,
                                            fontWeight: 500
                                        }}>
                                            {phase.status}
                                        </span>
                                    </div>

                                    {/* Action Buttons for Unlocked phases */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {isUnlocked ? (
                                            <>
                                                {phase.status === 'Not Started' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(phase.id, 'In Progress')}
                                                        disabled={isUpdating}
                                                        className="btn"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.3rem 0.75rem',
                                                            background: 'rgba(255,255,255,0.08)'
                                                        }}
                                                    >
                                                        {isUpdating ? '...' : '▶ Start Work'}
                                                    </button>
                                                )}
                                                {phase.status === 'In Progress' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(phase.id, 'Complete')}
                                                            disabled={isUpdating}
                                                            className="btn btn-primary"
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '0.3rem 0.75rem',
                                                                background: 'rgba(16, 185, 129, 0.8)',
                                                                borderColor: 'rgba(16, 185, 129, 0.3)'
                                                            }}
                                                        >
                                                            {isUpdating ? '...' : '✓ Complete'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(phase.id, 'Not Started')}
                                                            disabled={isUpdating}
                                                            className="btn"
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '0.3rem 0.75rem',
                                                                background: 'rgba(255,255,255,0.05)'
                                                            }}
                                                        >
                                                            Reset
                                                        </button>
                                                    </>
                                                )}
                                                {phase.status === 'Complete' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(phase.id, 'In Progress')}
                                                        disabled={isUpdating}
                                                        className="btn"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.3rem 0.75rem',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            color: 'var(--warning)'
                                                        }}
                                                    >
                                                        {isUpdating ? '...' : '↩ Reopen Phase'}
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: 'rgba(248, 250, 252, 0.3)',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
