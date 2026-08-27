import pool from '../src/lib/mysql.js';

async function checkStockStructure() {
    const [products] = await pool.query('SELECT id, name, type, stock FROM products LIMIT 10');
    console.log('Products sample:', products);

    const [variants] = await pool.query('SELECT id, product_id, name, stock, price FROM product_variants LIMIT 10');
    console.log('Variants sample:', variants);

    const [varProducts] = await pool.query('SELECT id, name, type, stock FROM products WHERE type = "variant" LIMIT 5');
    console.log('Variant products sample:', varProducts);

    process.exit(0);
}

checkStockStructure();
