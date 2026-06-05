import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/outlook';

export function getAppUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
}

/**
 * Helper to send an email to a list of user IDs using the system admin's Microsoft Graph connection.
 */
export async function sendNotificationToUsers(userIds, subject, content) {
    if (!userIds || userIds.length === 0) return { success: false, message: 'No users to notify' };

    try {
        // Fetch sender (admin/system user)
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id')
            .not('ms_refresh_token', 'is', null)
            .limit(1)
            .maybeSingle();

        const senderId = sender?.id || 1;

        // Fetch emails for the provided userIds
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('email')
            .in('id', userIds)
            .not('email', 'is', null);
        
        if (usersError || !users || users.length === 0) {
            return { success: false, message: 'No valid emails found for users' };
        }

        let sentCount = 0;
        for (const user of users) {
            if (user.email) {
                const sent = await sendEmail(senderId, user.email, subject, content);
                if (sent) sentCount++;
            }
        }

        return { success: true, message: `Sent ${sentCount} email(s).` };
    } catch (e) {
        console.error('Error in sendNotificationToUsers:', e);
        return { success: false, message: e.message };
    }
}
