'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { generateRegistrationOptions, verifyRegistration } from '@/app/actions/webauthn';

export default function PasskeyRegistration() {
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        try {
            setLoading(true);
            const options = await generateRegistrationOptions();
            if (options.error) throw new Error(options.error);

            const regResp = await startRegistration(options);
            const verification = await verifyRegistration(regResp);

            if (verification.success) {
                alert('Face ID / Passkey registered successfully! You can now use it to log in on this device.');
            } else {
                alert(verification.error || 'Registration failed');
            }
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                alert('Passkey registration error: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRegister}
            disabled={loading}
            className="btn"
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                fontSize: '0.85rem',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.3)'
            }}
            title="Enable Face ID / Touch ID Login for this device"
        >
            <span style={{ fontSize: '1rem' }}>📱</span>
            <span>{loading ? 'Setting up...' : 'Enable Face ID'}</span>
        </button>
    );
}
