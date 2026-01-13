'use client'

import { deleteTeamMember } from '@/app/actions/team';
import { useState } from 'react';

export default function DeleteUserButton({ userId, username }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
            setLoading(true);
            const result = await deleteTeamMember(userId);
            if (result && result.error) {
                alert(result.error);
                setLoading(false);
            }
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginLeft: '1rem',
                padding: 0
            }}
        >
            {loading ? 'Deleting...' : 'Delete'}
        </button>
    );
}
