import { runSummaryEmail } from '../lib/cron.js';

async function runTests() {
    console.log('--- STARTING DAILY EMAIL SUMMARY TEST ---');
    await runSummaryEmail('daily');
    console.log('--- FINISHED DAILY EMAIL SUMMARY TEST ---\n');

    console.log('--- STARTING WEEKLY EMAIL SUMMARY TEST ---');
    await runSummaryEmail('weekly');
    console.log('--- FINISHED WEEKLY EMAIL SUMMARY TEST ---\n');
    
    console.log('All tests completed. Check your email or console logs.');
    process.exit(0);
}

runTests().catch(e => {
    console.error('Test Failed:', e);
    process.exit(1);
});
