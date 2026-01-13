import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const DB_PATH = path.join(process.cwd(), 'data', 'contractor.db');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

let isInitialized = false;

export function initBackupSystem() {
    if (isInitialized) return;

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR);
    }

    // Schedule weekly backup (Sunday at midnight)
    // 0 0 * * 0
    cron.schedule('0 0 * * 0', () => {
        performBackup();
    });

    isInitialized = true;
    console.log('Backup system initialized. Weekly backups scheduled for Sunday at 00:00.');
}

export function performBackup() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            console.error('Database file not found for backup:', DB_PATH);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `contractor-backup-${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`Backup created successfully: ${backupPath}`);

        // Optional: Keep only last 4 backups
        cleanupOldBackups();
    } catch (error) {
        console.error('Error during database backup:', error);
    }
}

function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('contractor-backup-') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 4) {
            files.slice(4).forEach(file => {
                fs.unlinkSync(path.join(BACKUP_DIR, file.name));
                console.log(`Deleted old backup: ${file.name}`);
            });
        }
    } catch (error) {
        console.error('Error cleaning up old backups:', error);
    }
}
