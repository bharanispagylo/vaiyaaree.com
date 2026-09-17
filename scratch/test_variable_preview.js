import 'dotenv/config';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createAdminSessionToken } from '../src/lib/auth.js';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

// Find the section of rows with variable parents
const variableRows = rawRows.filter(r => {
    const t = String(r['Type'] || '').trim().toLowerCase();
    const id = String(r['ID'] || r['__EMPTY'] || '');
    const parent = String(r['Parent'] || '').replace(/^id:/i, '');
    return id === '31064' || parent === '31064' || id === '31073' || parent === '31073';
});

console.log('Selected variable test rows:', variableRows.length);

const token = createAdminSessionToken({
    id: 'admin_test',
    username: 'admin',
    role: 'super_admin'
});

async function testVariableApi() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/products/migrate', {
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

        const data = await res.json();
        console.log('Variable Preview Status:', res.status);
        console.log('Preview Summary:', {
            totalRawRows: data.totalRawRows,
            totalProducts: data.totalProducts,
            simpleCount: data.simpleCount,
            variableCount: data.variableCount,
            totalVariantsCount: data.totalVariantsCount,
            newCount: data.newCount,
            updateCount: data.updateCount
        });

        console.log('\nPreview Items Details:');
        data.previewItems.forEach((item, idx) => {
            const p = item.incomingProduct;
            console.log(`[#${idx + 1}] ${p.name} | Type: ${p.type} | Attribute: ${p.attribute_name} (${p.attribute_values}) | Price: ₹${p.price} | Stock: ${p.stock} | Variants: ${p.variants?.length}`);
            if (p.variants?.length > 0) {
                console.log('   Variants Matrix:', p.variants.map(v => `${v.name} (₹${v.price}, stock: ${v.stock})`).join(', '));
            }
        });

        process.exit(0);
    } catch (e) {
        console.error('Test error:', e);
        process.exit(1);
    }
}

testVariableApi();
