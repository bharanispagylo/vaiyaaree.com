import fs from 'fs';
import * as XLSX from 'xlsx';
import pool from '../src/lib/mysql.js';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total Raw Rows in CSV:', rawRows.length);

// Let's import the route handler or test direct logic
async function runTest() {
    try {
        // Let's test a sample slice containing variable parent 31064 and its variations 31065..31072
        const sampleRows = rawRows.filter(r => {
            const id = String(r['ID'] || r['id'] || r['__EMPTY'] || '');
            const parent = String(r['Parent'] || r['parent'] || '').replace(/^id:/i, '');
            return id === '31064' || parent === '31064' || id === '16475';
        });

        console.log('Found sample test rows:', sampleRows.length);
        console.log('Sample row types:', sampleRows.map(r => ({ id: r['ID'] || r['__EMPTY'], type: r['Type'], parent: r['Parent'], name: r['Name'] })));

        process.exit(0);
    } catch (e) {
        console.error('Test error:', e);
        process.exit(1);
    }
}

runTest();
