import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initInventoryTable } from './init-db.js';
import { initBackupSystem } from './backup.js';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'contractor.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
        console.warn('Could not create data directory, might be in a read-only environment:', e.message);
    }
}

let db = null;

try {
    db = new Database(dbPath);

    // Initialize tables and systems only if not in build phase or if we can write
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        initInventoryTable(db);
        initBackupSystem();
    }
} catch (error) {
    console.error('Database initialization failed:', error.message);
    // During build we might want to ignore this or provide a mock
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        throw error;
    }
    // Mock db for build phase if necessary
    db = {
        prepare: () => ({ all: () => [], run: () => ({}), get: () => ({}) }),
        exec: () => ({})
    };
}

export default db;
