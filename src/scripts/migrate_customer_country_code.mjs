import pool from '../lib/mysql.js';

async function migrate() {
    try {
        console.log('[MIGRATION] Checking columns in customers table...');
        const [existingCols] = await pool.query('DESCRIBE customers');
        const colNames = existingCols.map(c => c.Field);

        if (!colNames.includes('country_code')) {
            console.log('[MIGRATION] Adding country_code column to customers table...');
            await pool.query("ALTER TABLE customers ADD COLUMN country_code VARCHAR(10) DEFAULT '+91' AFTER phone");
            console.log('[MIGRATION] Successfully added country_code column to customers.');
        } else {
            console.log('[MIGRATION] country_code column already exists in customers.');
        }

        const [addrCols] = await pool.query('DESCRIBE customer_addresses');
        const addrColNames = addrCols.map(c => c.Field);
        if (!addrColNames.includes('country_code')) {
            console.log('[MIGRATION] Adding country_code column to customer_addresses table...');
            await pool.query("ALTER TABLE customer_addresses ADD COLUMN country_code VARCHAR(10) DEFAULT '+91' AFTER phone");
            console.log('[MIGRATION] Successfully added country_code column to customer_addresses.');
        }

        // Clean up combined phone numbers in customers table (e.g. 918754633465 -> phone: 8754633465, country_code: +91)
        const [updateRes] = await pool.query(`
            UPDATE customers 
            SET country_code = '+91', phone = SUBSTRING(phone, 3) 
            WHERE phone LIKE '91%' AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '')) = 12
        `);
        console.log(`[MIGRATION] Migrated ${updateRes.affectedRows} customer records with 12-digit 91 prefix.`);

        // Clean any leading + or spaces in phone
        await pool.query(`UPDATE customers SET phone = REGEXP_REPLACE(phone, '[^0-9]', '') WHERE phone IS NOT NULL`);
        await pool.query(`UPDATE customers SET country_code = '+91' WHERE country_code IS NULL OR country_code = ''`);

        const [sampleRows] = await pool.query('SELECT id, name, country_code, phone, email FROM customers LIMIT 10');
        console.log('[MIGRATION] Sample customers after migration:', sampleRows);

        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION ERROR]', err);
        process.exit(1);
    }
}

migrate();
