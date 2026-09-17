import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('Sample data.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`\n=== Sheet: ${sheetName} (Rows: ${rows.length}) ===`);
    
    const types = {};
    rows.forEach(r => {
        const t = String(r['Type'] || '').trim().toLowerCase();
        types[t] = (types[t] || 0) + 1;
    });
    console.log('Type breakdown:', types);

    // Check all rows with non-empty Attribute 1 name or Attribute 1 value(s)
    const withAttrs = rows.filter(r => r['Attribute 1 name'] || r['Attribute 1 value(s)']);
    console.log('Rows with Attribute 1 name or values count:', withAttrs.length);
    console.log('Sample rows with Attribute:');
    withAttrs.forEach((r, idx) => {
        console.log(`[#${idx+1}] ID: ${r['ID']} | Type: ${r['Type']} | Name: ${r['Name']} | Attr1 Name: "${r['Attribute 1 name']}" | Attr1 Values: "${r['Attribute 1 value(s)']}" | Parent: "${r['Parent']}" | Regular Price: ${r['Regular price']} | Sale Price: ${r['Sale price']}`);
    });
});
