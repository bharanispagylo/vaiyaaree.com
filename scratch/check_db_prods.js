import pool from '../src/lib/mysql.js';

async function checkDb() {
    try {
        const [prodRows] = await pool.query('SELECT COUNT(*) as count, type FROM `products` GROUP BY type');
        console.log('Current DB products by type:', prodRows);
        const [varRows] = await pool.query('SELECT COUNT(*) as count FROM `product_variants`');
        console.log('Current DB product_variants count:', varRows[0]?.count || 0);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDb();
