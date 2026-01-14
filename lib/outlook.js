import { Client } from '@microsoft/microsoft-graph-client';
import { supabase } from './supabase.js';
import * as msal from '@azure/msal-node';

// Configuration (Should be in process.env)
const getMsalConfig = () => ({
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
    }
});

export async function getAuthenticatedClient(userId) {
    // 1. Get user's tokens from Supabase
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('ms_refresh_token')
        .eq('id', userId)
        .single();

    if (userError || !user || !user.ms_refresh_token) {
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

