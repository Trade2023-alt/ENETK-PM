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
            className="btn btn-sm"
            style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)'
            }}
        >
            {loading ? 'Deleting...' : 'Delete'}
        </button>
    );
}
