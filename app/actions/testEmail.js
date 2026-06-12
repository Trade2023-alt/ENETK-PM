'use server'

import { sendEmail } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function sendTestEmail(recipientEmail) {
    try {
        const cookieStore = await cookies();
        const userRole = cookieStore.get('user_role')?.value;
        if (userRole !== 'admin') {
            return { error: 'Unauthorized. Only admins can send test emails.' };
        }

        if (!recipientEmail || !recipientEmail.trim().includes('@')) {
            return { error: 'Invalid recipient email address.' };
        }

        const cleanRecipient = recipientEmail.trim();
        const subject = '🛠️ ENETK-PM: SMTP Test Email';
        const content = `
            <div style="font-family: sans-serif; padding: 2rem; max-width: 600px; border: 2px solid #10b981; border-radius: 12px; background-color: #f0fdf4; color: #14532d; margin: 0 auto;">
                <h2 style="color: #047857; margin-top: 0; font-size: 1.5rem; border-bottom: 1px solid #bbf7d0; padding-bottom: 0.5rem;">SMTP Configuration Test Successful</h2>
                <p>Hello,</p>
                <p>This is a test email sent from your <strong>ENETK Project Management Portal</strong> to verify that your SMTP / Gmail App Password configuration is working correctly.</p>
                <p>If you are reading this, your system is fully operational and ready to send daily summaries, weekly updates, and automated reminders!</p>
                <hr style="border: 0; border-top: 1px solid #bbf7d0; margin: 1.5rem 0;" />
                <p style="font-size: 0.85rem; color: #166534; margin: 0.25rem 0;"><strong>Sender Account:</strong> ${process.env.EMAIL_USER}</p>
                <p style="font-size: 0.85rem; color: #166534; margin: 0.25rem 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `;

        // We can use 1 as fallback userId since this is a test email
        const sent = await sendEmail(1, cleanRecipient, subject, content);

        if (sent) {
            // Log Success in Supabase email_logs
            await supabase.from('email_logs').insert({
                recipient_email: cleanRecipient,
                subject: subject,
                status: 'Success',
                error_message: null
            });
            return { success: true, message: `Test email sent successfully to ${cleanRecipient}!` };
        } else {
            return { error: 'Email sending failed without a specific error.' };
        }
    } catch (e) {
        console.error('Error sending test email:', e);
        
        // Log Error in Supabase email_logs
        try {
            await supabase.from('email_logs').insert({
                recipient_email: recipientEmail?.trim() || 'unknown',
                subject: '🛠️ ENETK-PM: SMTP Test Email (FAILED)',
                status: 'Error',
                error_message: e.message || e.toString()
            });
        } catch (dbErr) {
            console.error('Failed to log email error to database:', dbErr);
        }

        return { error: e.message || 'An unknown error occurred during testing.' };
    }
}
