import 'dotenv/config';
import fs from 'fs';
import * as XLSX from 'xlsx';
import pool from '../src/lib/mysql.js';
import { createAdminSessionToken } from '../src/lib/auth.js';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

// Find the 16 variable rows
const variableRows = rawRows.filter(r => {
    const id = String(r['ID'] || r['__EMPTY'] || '');
    const parent = String(r['Parent'] || '').replace(/^id:/i, '');
    return id === '31064' || parent === '31064' || id === '31073' || parent === '31073';
});

const token = createAdminSessionToken({
    id: 'admin_test',
    username: 'admin',
    role: 'super_admin'
});

async function testExecution() {
    try {
        console.log('1. Fetching preview items...');
        const prevRes = await fetch('http://localhost:3000/api/admin/products/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'preview',
                rawRows: variableRows,
                options: { matchBy: ['catalog_id', 'sku', 'slug', 'name'] }
            })
        });

        const prevData = await prevRes.json();
        console.log('Preview items count:', prevData.previewItems?.length);

        console.log('\n2. Executing migration for preview items (without image download for fast test)...');
        const execRes = await fetch('http://localhost:3000/api/admin/products/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'execute',
                itemsToExecute: prevData.previewItems,
                options: {
                    conflictStrategy: 'upsert',
                    downloadImages: false,
                    autoCreateCategories: true
                }
            })
        });

        const execData = await execRes.json();
        console.log('Execution Response:', execData);

        console.log('\n3. Verifying database records in `products` and `product_variants`...');
        const [prodRows] = await pool.query('SELECT id, name, slug, price, stock, type, category FROM `products` WHERE `type` = "variant"');
        console.log('Products in DB with type "variant":', prodRows.length);
        console.table(prodRows);

        const [varRows] = await pool.query('SELECT id, product_id, name, sku, price, stock, image_url FROM `product_variants`');
        console.log('Product variants in DB:', varRows.length);
        console.table(varRows);

        process.exit(0);
    } catch (e) {
        console.error('Execution test error:', e);
        process.exit(1);
    }
}

testExecution();
