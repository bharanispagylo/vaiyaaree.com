import pool from '../lib/mysql.js';

async function testSearch1018() {
    console.log('--- TESTING SEARCH FOR PRODUCT NO 1018 ---');
    const [rows] = await pool.execute(
        `SELECT id, name, product_no, sku, product_catalog_image_id FROM products WHERE product_no = 1018 OR sku = '1018'`
    );
    console.log(rows);
    process.exit(0);
}

testSearch1018();
