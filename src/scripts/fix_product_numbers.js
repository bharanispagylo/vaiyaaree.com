import pool from '../lib/mysql.js';

async function fixProductNumbers() {
    console.log('--- FIXING AND ALIGNING PRODUCT NUMBERS & SKUS IN MYSQL ---');

    try {
        // Fetch all products ordered chronologically
        const [products] = await pool.execute(
            `SELECT id, name, product_no, sku, created_at FROM products ORDER BY COALESCE(created_at, '2026-01-01') ASC`
        );

        console.log(`Found ${products.length} products to re-index starting at 1001.\n`);

        let currentNo = 1001;
        for (const p of products) {
            const newNo = currentNo;
            const newSku = String(newNo);

            await pool.execute(
                `UPDATE products SET product_no = ?, sku = ?, updated_at = NOW() WHERE id = ?`,
                [newNo, newSku, p.id]
            );

            console.log(`✓ Updated Product ID: ${p.id.slice(0, 8)} | Name: "${p.name.slice(0, 32)}" | Product No: #${newNo} | SKU: '${newSku}'`);
            currentNo++;
        }

        console.log('\n--- VERIFYING UPDATED PRODUCTS IN MYSQL ---');
        const [updatedRows] = await pool.execute(
            `SELECT id, name, product_no, sku, product_catalog_image_id FROM products ORDER BY product_no ASC`
        );
        console.table(updatedRows.map(r => ({
            id: r.id.slice(0, 8),
            product_no: `#${r.product_no}`,
            sku: r.sku,
            catalog_id: r.product_catalog_image_id,
            name: r.name.slice(0, 35)
        })));

        console.log('\n✅ ALL PRODUCT NUMBERS SUCCESSFULLY REALIGNED TO START AT 1001!');

    } catch (err) {
        console.error('❌ Product number fix failed:', err);
    } finally {
        process.exit(0);
    }
}

fixProductNumbers();
