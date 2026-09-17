import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total raw rows:', rawRows.length);

// Let's test grouping variable products and variations
const variableParentsMap = new Map(); // parentId -> product object with variants array
const simpleProducts = [];
const orphanedVariations = [];

rawRows.forEach((r, idx) => {
    const rawType = String(r['Type'] || r['type'] || '').trim().toLowerCase();
    const rawId = String(r['ID'] || r['id'] || r['__EMPTY'] || '').trim();
    const rawParent = String(r['Parent'] || r['parent'] || '').trim().replace(/^id:/i, '').trim();

    if (rawType === 'variable') {
        const parentObj = {
            csv_id: rawId,
            type: 'variant',
            name: r['Name'] || '',
            description: r['Description'] || '',
            category: r['Categories'] || '',
            images: r['Images'] || '',
            attribute_name: r['Attribute 1 name'] || 'Size',
            attribute_values: r['Attribute 1 value(s)'] || '',
            sku: r['SKU'] || '',
            variants: []
        };
        variableParentsMap.set(rawId, parentObj);
    } else if (rawType === 'variation') {
        // Find which attribute is defined
        let attrName = r['Attribute 1 name'] || '';
        let attrVal = r['Attribute 1 value(s)'] || '';
        
        // If attribute 1 is empty, check other attributes or extract from Name
        if (!attrVal && r['Name']) {
            const parts = String(r['Name']).split(' - ');
            if (parts.length > 1) {
                attrVal = parts[parts.length - 1].trim();
            }
        }

        const variantObj = {
            csv_id: rawId,
            parent_id: rawParent,
            name: String(attrVal || r['Name'] || `Variant ${idx}`).trim(),
            sku: r['SKU'] || '',
            regular_price: r['Regular price'] || r['Regular Price'] || '',
            sale_price: r['Sale price'] || r['Sale Price'] || '',
            stock: r['Stock'] || 0,
            in_stock: r['In stock?'] !== 0 && r['In stock?'] !== '0',
            image: r['Images'] || '',
            position: parseInt(r['Position'] || '0', 10)
        };

        if (variableParentsMap.has(rawParent)) {
            variableParentsMap.get(rawParent).variants.push(variantObj);
        } else {
            orphanedVariations.push(variantObj);
        }
    } else {
        // Simple product
        simpleProducts.push({
            csv_id: rawId,
            type: 'simple',
            name: r['Name'] || '',
            description: r['Description'] || '',
            category: r['Categories'] || '',
            images: r['Images'] || '',
            sku: r['SKU'] || '',
            regular_price: r['Regular price'] || '',
            sale_price: r['Sale price'] || '',
            stock: r['Stock'] || 0,
            attribute_name: r['Attribute 1 name'] || '',
            attribute_values: r['Attribute 1 value(s)'] || '',
            variants: []
        });
    }
});

console.log('Simple products count:', simpleProducts.length);
console.log('Variable parents count:', variableParentsMap.size);
console.log('Orphaned variations count:', orphanedVariations.length);

let totalVariantsAttached = 0;
for (const p of variableParentsMap.values()) {
    totalVariantsAttached += p.variants.length;
}
console.log('Total variants attached to parents:', totalVariantsAttached);

// Inspect first 2 variable parents with variants
const sampleParents = Array.from(variableParentsMap.values()).slice(0, 2);
console.log('\nSample Variable Parent with Variants:');
console.log(JSON.stringify(sampleParents, null, 2));
