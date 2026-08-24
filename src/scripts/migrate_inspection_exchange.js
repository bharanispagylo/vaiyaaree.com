import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function migrateInspectionExchange() {
  console.log('=== Starting Database Migration: Inspection & Exchange Columns ===');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vaiyaaree_db',
  });

  try {
    const columns = [
      { name: 'inspection_status', type: 'VARCHAR(50) DEFAULT "PENDING"' },
      { name: 'inspection_notes', type: 'TEXT' },
      { name: 'inspected_at', type: 'DATETIME' },
      { name: 'inspected_by', type: 'VARCHAR(100)' },
      { name: 'exchange_courier_name', type: 'VARCHAR(100)' },
      { name: 'exchange_tracking_number', type: 'VARCHAR(100)' },
      { name: 'exchange_shipped_at', type: 'DATETIME' },
      { name: 'last_notified_status', type: 'VARCHAR(50)' },
    ];

    const [existingCols] = await conn.query('SHOW COLUMNS FROM `return_requests`');
    const existingColNames = existingCols.map(c => c.Field);

    for (const col of columns) {
      if (!existingColNames.includes(col.name)) {
        console.log(`Adding column \`${col.name}\` to return_requests...`);
        await conn.query(`ALTER TABLE \`return_requests\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`✓ Added \`${col.name}\``);
      } else {
        console.log(`- Column \`${col.name}\` already exists.`);
      }
    }

    console.log('=== Migration Completed Successfully ===');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await conn.end();
  }
}

migrateInspectionExchange();
