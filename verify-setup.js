
require('@babel/register')({
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    plugins: [
        ['module-resolver', {
            alias: {
                '@': './'
            }
        }]
    ]
});

const db = require('./lib/db').default;
const { performBackup } = require('./lib/backup');

console.log('Database initialized.');
console.log('Manually triggering backup...');
performBackup();
console.log('Verification script completed.');
