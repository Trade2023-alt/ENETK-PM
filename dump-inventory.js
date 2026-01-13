const Database = require('better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'contractor.db');
const db = new Database(dbPath);

try {
    const rows = db.prepare("SELECT * FROM material_inventory").all();
    console.log(JSON.stringify(rows, null, 2));
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
