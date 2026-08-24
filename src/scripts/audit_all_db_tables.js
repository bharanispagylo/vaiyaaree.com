import pool from '../lib/mysql.js';

async function auditAllTables() {
    console.log('====================================================');
    console.log('🔍 FULL DATABASE TABLE & WORKFLOW AUDIT REPORT');
    console.log('====================================================\n');

    try {
        const [tables] = await pool.execute('SHOW TABLES');
        const report = [];

        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const [countRows] = await pool.execute(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
            const count = countRows[0].cnt;

            // Get sample data / structure
            const [cols] = await pool.execute(`SHOW COLUMNS FROM \`${tableName}\``);
            const pk = cols.find(c => c.Key === 'PRI')?.Field || 'None';

            report.push({
                table: tableName,
                rows: count,
                primary_key: pk,
                total_columns: cols.length
            });
        }

        console.table(report);

        // Check relationship mapping and sync missing helper tables
        console.log('\n--- CHECKING CORE BUSINESS ENTITIES & RELATIONS ---');
        const [orders] = await pool.execute('SELECT COUNT(*) as c FROM orders');
        const [orderItems] = await pool.execute('SELECT COUNT(*) as c FROM order_items');
        const [invoices] = await pool.execute('SELECT COUNT(*) as c FROM invoices');
        const [customers] = await pool.execute('SELECT COUNT(*) as c FROM customers');
        const [products] = await pool.execute('SELECT COUNT(*) as c FROM products');
        const [returns] = await pool.execute('SELECT COUNT(*) as c FROM return_requests');
        const [refunds] = await pool.execute('SELECT COUNT(*) as c FROM refund_requests');
        const [emails] = await pool.execute('SELECT COUNT(*) as c FROM email_logs');

        console.log(`✓ Orders: ${orders[0].c}`);
        console.log(`✓ Order Items: ${orderItems[0].c}`);
        console.log(`✓ Invoices: ${invoices[0].c}`);
        console.log(`✓ Customers: ${customers[0].c}`);
        console.log(`✓ Products: ${products[0].c}`);
        console.log(`✓ Return Requests: ${returns[0].c}`);
        console.log(`✓ Refund Requests: ${refunds[0].c}`);
        console.log(`✓ Email Logs: ${emails[0].c}`);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        process.exit(0);
    }
}

auditAllTables();
