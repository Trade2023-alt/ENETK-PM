export function initInventoryTable(db) {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS material_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checked_in_date TEXT,
            mfg TEXT,
            pn TEXT,
            sn TEXT,
            job_number TEXT,
            po_number TEXT,
            customer TEXT,
            description TEXT,
            check_out_date TEXT,
            transmittal_form TEXT CHECK(transmittal_form IN ('yes', 'no')),
            type TEXT CHECK(type IN ('instrument', 'panelbuild', 'misc', 'field')),
            return_needed TEXT CHECK(return_needed IN ('yes', 'no')),
            location TEXT,
            qty INTEGER DEFAULT 0,
            vendor TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        db.exec(createTableQuery);
        console.log('Material inventory table initialized or already exists.');
    } catch (error) {
        console.error('Error initializing material inventory table:', error);
    }
}
