import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const attrColumns = new Set();
const allAttrNames = new Set();
let variableCount = 0;
let variationCount = 0;
let simpleCount = 0;
let otherCount = 0;

rows.forEach(r => {
    const t = String(r['Type'] || r['type'] || '').trim().toLowerCase();
    if (t === 'variable') variableCount++;
    else if (t === 'variation') variationCount++;
    else if (t === 'simple') simpleCount++;
    else otherCount++;

    Object.keys(r).forEach(k => {
        if (/^attribute \d+/i.test(k)) {
            attrColumns.add(k);
        }
        if (/^attribute \d+ name/i.test(k) && r[k]) {
            allAttrNames.add(String(r[k]).trim());
        }
    });
});

console.log('Product Counts:');
console.log('Simple:', simpleCount);
console.log('Variable (Parents):', variableCount);
console.log('Variation (Children):', variationCount);
console.log('Other:', otherCount);
console.log('\nAttribute Columns Found:', Array.from(attrColumns));
console.log('\nDistinct Attribute Names:', Array.from(allAttrNames));

// Let's inspect how parent-child links work:
const parentIds = new Set();
const childToParent = {};
rows.forEach(r => {
    const t = String(r['Type'] || '').trim().toLowerCase();
    const id = String(r['ID'] || r['id'] || r['__EMPTY'] || '').trim();
    if (t === 'variable') {
        parentIds.add(id);
    } else if (t === 'variation') {
        const parentField = String(r['Parent'] || r['parent'] || '').trim();
        // e.g. "id:31064" or "31064"
        const cleanParentId = parentField.replace(/^id:/i, '').trim();
        childToParent[id] = cleanParentId;
    }
});

console.log('\nTotal Variable Parent IDs:', parentIds.size);
console.log('Total Variations linked to parents:', Object.keys(childToParent).length);

// Check if all variation parents exist in the CSV
let missingParents = 0;
Object.entries(childToParent).forEach(([childId, pId]) => {
    if (!parentIds.has(pId)) {
        missingParents++;
    }
});
console.log('Variations with parent NOT in variable list:', missingParents);

