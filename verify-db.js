const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'contractor.db');
const db = new Database(dbPath);

console.log('Checking for material_inventory table...');
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_inventory'").get();

if (tableCheck) {
    console.log('SUCCESS: material_inventory table exists.');
} else {
    console.log('FAILURE: material_inventory table does NOT exist.');
}

console.log('Checking for backups directory...');
const backupDir = path.join(__dirname, 'backups');
if (fs.existsSync(backupDir)) {
    console.log('SUCCESS: backups directory exists.');
} else {
    console.log('FAILURE: backups directory does NOT exist.');
}

db.close();
