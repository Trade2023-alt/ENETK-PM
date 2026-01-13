// Remote import moved to dynamic import to fix build
export const dynamic = 'force-dynamic';

// Initialize MSAL lazily to prevent crash if env vars are missing
const getMsalConfig = () => ({
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common'
    }
});

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: 'UserId required' }, { status: 400 });
    }

    const authCodeUrlParameters = {
        scopes: ['Mail.Send', 'Calendars.ReadWrite', 'User.Read', 'offline_access'],
        redirectUri: process.env.MS_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback',
        state: userId // Passing userId in state to retrieve it in callback
    };

    try {
        const { ConfidentialClientApplication } = await import('@azure/msal-node');
        const msalConfig = getMsalConfig();
        if (!msalConfig.auth.clientId || !msalConfig.auth.clientSecret) {
            return Response.json({ error: 'Microsoft Auth not configured (Missing ID/Secret)' }, { status: 500 });
        }

        const cca = new ConfidentialClientApplication(msalConfig);
        const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);
        return Response.redirect(authUrl);
    } catch (error) {
        return Response.json({ error: error.toString() }, { status: 500 });
    }
}
