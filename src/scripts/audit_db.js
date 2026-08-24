import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function runAudit() {
  console.log('=== STARTING DATABASE & WORKFLOW AUDIT ===');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vaiyaaree_db'
    });
    console.log('✔ MySQL Connection: REACHABLE & CONNECTED');
  } catch (err) {
    console.error('❌ MySQL Connection FAILED:', err.message);
    process.exit(1);
  }

  try {
    await conn.query('ALTER TABLE `refund_requests` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    await conn.query('ALTER TABLE `refund_requests` MODIFY `id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL');
    await conn.query('ALTER TABLE `refund_requests` MODIFY `refund_id` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL');
    await conn.query('ALTER TABLE `refund_requests` MODIFY `order_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL');
    await conn.query('ALTER TABLE `refund_requests` MODIFY `customer_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL');
    await conn.query('ALTER TABLE `refund_shipments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    await conn.query('ALTER TABLE `refund_shipments` MODIFY `refund_request_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL');
    console.log('✔ Standardized table collation for refund_requests & refund_shipments to utf8mb4_general_ci');
  } catch (e) {
    console.warn('Collation standardize warning:', e.message);
  }

  try {
    const [tables] = await conn.query('SHOW TABLES');
    const tableList = tables.map(t => Object.values(t)[0]);
    console.log('\n--- Existing Database Tables (' + tableList.length + ') ---');
    console.log(tableList.join(', '));

    const auditTables = [
      'customers', 'products', 'orders', 'order_items',
      'payments', 'return_requests', 'return_shipping', 'return_images',
      'refund_requests', 'refund_shipments', 'admin_users'
    ];

    console.log('\n--- Table Column Verification ---');
    for (const tbl of auditTables) {
      if (tableList.includes(tbl)) {
        const [cols] = await conn.query(`DESCRIBE \`${tbl}\``);
        console.log(`\nTable [${tbl}] Columns (${cols.length}):`);
        cols.forEach(c => {
          console.log(`  - ${c.Field.padEnd(25)} : ${c.Type.padEnd(20)} | Null: ${c.Null.padEnd(4)} | Key: ${c.Key}`);
        });
      } else {
        console.log(`\n❌ Table [${tbl}] is MISSING from database!`);
      }
    }

    console.log('\n--- Foreign Key & Orphan Records Audit ---');
    // Check return_requests -> orders
    if (tableList.includes('return_requests')) {
      const [orphans] = await conn.query('SELECT r.id, r.order_id FROM return_requests r LEFT JOIN orders o ON r.order_id = o.id WHERE o.id IS NULL AND r.order_id IS NOT NULL');
      console.log(`- Return Requests without matching Order: ${orphans.length}`);
    }

    // Check refund_requests -> orders
    if (tableList.includes('refund_requests')) {
      const [orphans] = await conn.query('SELECT r.id, r.order_id FROM refund_requests r LEFT JOIN orders o ON r.order_id COLLATE utf8mb4_general_ci = o.id COLLATE utf8mb4_general_ci WHERE o.id IS NULL AND r.order_id IS NOT NULL');
      console.log(`- Refund Requests without matching Order: ${orphans.length}`);
    }

    // Check refund_shipments -> refund_requests
    if (tableList.includes('refund_shipments')) {
      const [orphans] = await conn.query('SELECT s.id, s.refund_request_id FROM refund_shipments s LEFT JOIN refund_requests r ON s.refund_request_id COLLATE utf8mb4_general_ci = r.id COLLATE utf8mb4_general_ci WHERE r.id IS NULL AND s.refund_request_id IS NOT NULL');
      console.log(`- Refund Shipments without matching Refund Request: ${orphans.length}`);
    }

    console.log('\n--- Specific Return Request RET-20260824-I0EY Audit ---');
    const [returns] = await conn.query('SELECT id, return_id, order_id, reason, status FROM return_requests WHERE return_id = "RET-20260824-I0EY" OR id = "RET-20260824-I0EY"');
    console.log('Return Record:', returns);

    if (returns.length > 0) {
      const ret = returns[0];
      const [imgs] = await conn.query('SELECT * FROM return_images WHERE return_request_id = ? OR return_request_id = ?', [ret.id, ret.return_id]);
      console.log('Images for this return:', imgs);
    }

    const [allImgs] = await conn.query('SELECT * FROM return_images ORDER BY id DESC LIMIT 10');
    console.log('Latest 10 return_images in DB:', allImgs);

    console.log('\n=== AUDIT COMPLETE ===');
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    if (conn) await conn.end();
  }
}

runAudit();
