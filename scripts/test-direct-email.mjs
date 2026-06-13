import nodemailer from 'nodemailer';

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log('EMAIL_USER:', JSON.stringify(user));
console.log('EMAIL_PASS:', JSON.stringify(pass));

if (!user || !pass) {
    console.error('Error: EMAIL_USER or EMAIL_PASS environment variables are missing.');
    process.exit(1);
}

const cleanUser = user.trim();
const cleanPass = pass.replace(/\s+/g, '');

console.log('Cleaned EMAIL_USER:', JSON.stringify(cleanUser));
console.log('Cleaned EMAIL_PASS:', JSON.stringify(cleanPass));

async function testGmailService() {
    console.log('\n--- Testing with Service: "gmail" ---');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: cleanUser,
            pass: cleanPass,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('Success! Connection verified.');
        return true;
    } catch (error) {
        console.error('Failed with service: "gmail". Error:', error.message);
        return false;
    }
}

async function testGmailSMTP() {
    console.log('\n--- Testing with Host: "smtp.gmail.com", Port: 587, Secure: false ---');
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: cleanUser,
            pass: cleanPass,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('Success! Connection verified.');
        return true;
    } catch (error) {
        console.error('Failed with host/port 587. Error:', error.message);
        return false;
    }
}

async function testGmailServiceRaw() {
    console.log('\n--- Testing with Service: "gmail" and Raw Password (with spaces) ---');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: cleanUser,
            pass: pass,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('Success! Connection verified.');
        return true;
    } catch (error) {
        console.error('Failed with service: "gmail" and spaces. Error:', error.message);
        return false;
    }
}

async function run() {
    const serviceOk = await testGmailService();
    if (!serviceOk) {
        const rawOk = await testGmailServiceRaw();
        if (!rawOk) {
            await testGmailSMTP();
        }
    }
}

run().catch(console.error);
