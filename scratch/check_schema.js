import pool from '../src/lib/mysql.js';

async function checkSchema() {
    try {
        const [prodCols] = await pool.query('DESCRIBE `products`');
        console.log('--- PRODUCTS TABLE COLUMNS ---');
        console.table(prodCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

        const [varCols] = await pool.query('DESCRIBE `product_variants`');
        console.log('\n--- PRODUCT_VARIANTS TABLE COLUMNS ---');
        console.table(varCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
