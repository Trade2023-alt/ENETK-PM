import Database from 'better-sqlite3';
import path from 'path';
import { initInventoryTable } from './init-db.js';
import { initBackupSystem } from './backup.js';

const dbPath = path.join(process.cwd(), 'data', 'contractor.db');
const db = new Database(dbPath);

// Initialize tables and systems
initInventoryTable(db);
initBackupSystem();

export default db;
