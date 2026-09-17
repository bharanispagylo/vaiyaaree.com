import 'dotenv/config';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createAdminSessionToken } from '../src/lib/auth.js';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

// Take a subset containing variable and simple products
const sampleRows = rawRows.slice(0, 50);

const token = createAdminSessionToken({
    id: 'admin_test',
    username: 'admin',
    role: 'super_admin'
});

async function testApi() {
    try {
        console.log('Sending preview request for', sampleRows.length, 'sample rows with valid token...');
        const res = await fetch('http://localhost:3000/api/admin/products/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'preview',
                rawRows: sampleRows,
                options: { matchBy: ['catalog_id', 'sku', 'slug', 'name'] }
            })
        });

        const data = await res.json();
        console.log('Preview API Response Status:', res.status);
        console.log('Preview Data Summary:', {
            totalRawRows: data.totalRawRows,
            totalProducts: data.totalProducts,
            simpleCount: data.simpleCount,
            variableCount: data.variableCount,
            totalVariantsCount: data.totalVariantsCount,
            newCount: data.newCount,
            updateCount: data.updateCount
        });

        if (data.previewItems && data.previewItems.length > 0) {
            console.log('Sample Preview Item [0]:', {
                name: data.previewItems[0].incomingProduct?.name,
                type: data.previewItems[0].incomingProduct?.type,
                price: data.previewItems[0].incomingProduct?.price,
                stock: data.previewItems[0].incomingProduct?.stock,
                action: data.previewItems[0].action,
                variantsCount: data.previewItems[0].incomingProduct?.variants?.length
            });
        }

        process.exit(0);
    } catch (e) {
        console.error('API Test Error:', e);
        process.exit(1);
    }
}

testApi();
