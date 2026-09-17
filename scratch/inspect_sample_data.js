import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('Sample data.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`\n=== Sheet: ${sheetName} (Rows: ${rows.length}) ===`);
    if (rows.length > 0) {
        console.log('Columns:', Object.keys(rows[0]));
        console.log('\nFirst 5 rows:');
        console.log(JSON.stringify(rows.slice(0, 5), null, 2));
    }
});
