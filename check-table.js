const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'contractor.db');
const db = new Database(dbPath);

try {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_inventory'").get();
    console.log('Table existence:', table);
    if (table) {
        const columns = db.prepare("PRAGMA table_info(material_inventory)").all();
        console.log('Columns:', columns);
    }
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
