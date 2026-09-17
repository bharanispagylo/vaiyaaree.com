import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('Sample data.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Sheet1'], { defval: '' });

rows.forEach((r, idx) => {
    console.log(`\n--- ROW ${idx + 1} (${r['ID']} - ${r['Name']}) ---`);
    console.log('Description Raw Type:', typeof r['Description']);
    console.log('Description JSON Representation:', JSON.stringify(r['Description']));
    console.log('Description Rendered:\n' + r['Description']);
});
