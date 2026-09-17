import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const firstSheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total rows parsed:', rows.length);

const types = {};
const attributesSet = new Set();
const parents = [];
const sampleTypes = {};

rows.forEach((r, idx) => {
    const t = String(r['Type'] || r['type'] || '').trim().toLowerCase();
    types[t] = (types[t] || 0) + 1;
    if (!sampleTypes[t]) sampleTypes[t] = r;

    // Check all keys starting with Attribute
    Object.keys(r).forEach(k => {
        if (k.toLowerCase().startsWith('attribute') && r[k]) {
            attributesSet.add(k + ' -> ' + String(r[k]).slice(0, 50));
        }
    });

    const parent = r['Parent'] || r['parent'] || '';
    if (parent) {
        parents.push({ idx, id: r['ID'] || r['id'], type: t, parent, name: r['Name'] || r['name'] });
    }
});

console.log('Type breakdown:', types);
console.log('Attributes found (sample 20):', Array.from(attributesSet).slice(0, 20));
console.log('Sample parents found (sample 10):', parents.slice(0, 10));

// Find some samples of non-simple or rows with attributes
const withAttrs = rows.filter(r => Object.keys(r).some(k => k.toLowerCase().startsWith('attribute 1 value') && r[k]));
console.log('Rows with Attribute 1 value count:', withAttrs.length);
if (withAttrs.length > 0) {
    console.log('Sample with attributes:', JSON.stringify(withAttrs.slice(0, 3), null, 2));
}

// Find rows where Type is variable or variation
const vars = rows.filter(r => {
    const t = String(r['Type'] || '').toLowerCase();
    return t === 'variable' || t === 'variation';
});
console.log('Variable/Variation rows count:', vars.length);
if (vars.length > 0) {
    console.log('Sample variable/variation:', JSON.stringify(vars.slice(0, 2), null, 2));
}
