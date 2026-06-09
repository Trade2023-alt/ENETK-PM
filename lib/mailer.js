import nodemailer from 'nodemailer';

// Initialize the Nodemailer transport
// This uses Gmail as the default service. For standard Gmail or Google Workspace accounts,
// you must use an App Password instead of your regular password.
const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('EMAIL_USER and EMAIL_PASS environment variables are missing.');
    }

    return nodemailer.createTransport({
        service: 'gmail', // You can change this to 'smtp.sendgrid.net' or others if using a different provider
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Send an email using Nodemailer
 * @param {string[]} to - Array of recipient email addresses
 * @param {string} subject - Email subject line
 * @param {string} html - HTML body of the email
 */
export async function sendEmail(toOrUserId, toEmailOrSubject, subjectOrHtml, htmlOrNothing) {
    try {
        // Handle backward compatibility from outlook.js which used: sendEmail(userId, to, subject, html)
        let to, subject, html;
        if (htmlOrNothing !== undefined) {
            to = toEmailOrSubject;
            subject = subjectOrHtml;
            html = htmlOrNothing;
        } else {
            to = toOrUserId;
            subject = toEmailOrSubject;
            html = subjectOrHtml;
        }

        const transporter = getTransporter();

        // Ensure 'to' is a comma-separated string
        const toAddresses = Array.isArray(to) ? to.join(', ') : to;

        const mailOptions = {
            from: `"ENETK Task Reminders" <${process.env.EMAIL_USER}>`, // Sender address
            to: toAddresses, // List of receivers
            subject: subject, // Subject line
            html: html, // HTML body
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Mailer] Message sent successfully to ${toAddresses} (Message ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error('[Mailer] Error sending email:', error);
        throw error;
    }
}
