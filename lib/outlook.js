import { Client } from '@microsoft/microsoft-graph-client';
// Node 18+ has native fetch
// Note: Next.js 13+ polyfills fetch, but for the scheduler script (Node.js) we might need it 
// or verify Node version. We'll rely on global fetch if available or polyfill.
// However, 'microsoft-graph-client' usually works with a custom fetch implementation if provided.

import db from './db.js';
import * as msal from '@azure/msal-node';

// Configuration (Should be in process.env)
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const REDIRECT_URI = process.env.MS_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback';

const getMsalConfig = () => ({
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
    }
});

export async function getAuthenticatedClient(userId) {
    // 1. Get user's tokens from DB
    const user = db.prepare('SELECT ms_refresh_token FROM users WHERE id = ?').get(userId);

    if (!user || !user.ms_refresh_token) {
        throw new Error('User not connected to Microsoft');
    }

    // 2. Refresh Token using MSAL
    try {
        const msalConfig = getMsalConfig();
        if (!msalConfig.auth.clientId || !msalConfig.auth.clientSecret) {
            throw new Error('Microsoft ID/Secret not configured in .env');
        }
        const cca = new msal.ConfidentialClientApplication(msalConfig);

        const response = await cca.acquireTokenByRefreshToken({
            refreshToken: user.ms_refresh_token,
            scopes: ['Mail.Send', 'Calendars.ReadWrite', 'User.Read', 'offline_access'],
        });

        if (!response || !response.accessToken) {
            throw new Error('Failed to refresh token');
        }

        // 3. Update DB with new tokens (optional but good for caching, though we just need access token here)
        // If MSAL returns a new refresh token, should update it.
        // For simplicity, we just use the access token.

        const client = Client.init({
            authProvider: (done) => {
                done(null, response.accessToken);
            }
        });

        return client;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}

export async function sendEmail(userId, toEmail, subject, content) {
    try {
        const client = await getAuthenticatedClient(userId);

        const message = {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: content
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: toEmail
                    }
                }
            ]
        };

        await client.api('/me/sendMail')
            .post({ message: message });

        console.log(`Email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

export async function createCalendarEvent(userId, job) {
    try {
        const client = await getAuthenticatedClient(userId);

        const event = {
            subject: job.title,
            body: {
                contentType: 'HTML',
                content: job.description
            },
            start: {
                dateTime: job.scheduled_date, // Ensure this is ISO format
                timeZone: 'UTC' // Or user's time zone
            },
            end: {
                dateTime: new Date(new Date(job.scheduled_date).getTime() + (job.estimated_hours || 1) * 60 * 60 * 1000).toISOString(),
                timeZone: 'UTC'
            }
        };

        await client.api('/me/events')
            .post(event);

        console.log(`Event created for job: ${job.title}`);
        return true;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        return false;
    }
}
