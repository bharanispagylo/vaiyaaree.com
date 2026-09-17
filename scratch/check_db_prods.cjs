const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db'
    });

    const [prods] = await conn.query('SELECT id, product_no, name, type, price, stock, is_active FROM `products` ORDER BY created_at DESC LIMIT 15');
    console.log('--- Recent Products in DB ---');
    console.table(prods);

    const [vars] = await conn.query('SELECT id, product_id, name, sku, price, stock FROM `product_variants` ORDER BY id DESC LIMIT 25');
    console.log('--- Recent Variants in DB ---');
    console.table(vars);

    await conn.end();
}

check().catch(console.error);
