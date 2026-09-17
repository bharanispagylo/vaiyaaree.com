import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('wc-product-export-15-9-2026-1789471690306.csv');
const workbook = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

function cleanTextEncoding(str) {
    if (!str || typeof str !== 'string') return str || '';
    return str
        .replace(/â€™|â€˜|â€/g, "'")
        .replace(/â€œ|â€ /g, '"')
        .replace(/â€“|â€”/g, '-')
        .replace(/â‚¹/g, '₹')
        .replace(/wonât/gi, "won't")
        .replace(/canât/gi, "can't")
        .replace(/donât/gi, "don't")
        .replace(/doesnât/gi, "doesn't")
        .replace(/didnât/gi, "didn't")
        .replace(/itâs/gi, "it's")
        .replace(/thatâs/gi, "that's")
        .replace(/youâre/gi, "you're")
        .replace(/theyâre/gi, "they're")
        .replace(/weâre/gi, "we're")
        .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
        .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

function normalizeRow(rawRow) {
    const row = {};
    for (const [k, v] of Object.entries(rawRow || {})) {
        const cleanKey = String(k || '').toLowerCase().trim().replace(/[\s_\-:]/g, '');
        row[cleanKey] = typeof v === 'string' ? cleanTextEncoding(v) : v;
    }
    return row;
}

function parseWooCommerceImages(imgRaw) {
    if (!imgRaw) return { primaryUrl: '', galleryUrls: [], catalogId: '' };
    const rawStr = String(imgRaw).trim();
    if (!rawStr) return { primaryUrl: '', galleryUrls: [], catalogId: '' };
    const rawSegments = rawStr.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const parsedUrls = [];
    let detectedCatalogId = '';
    for (const seg of rawSegments) {
        const urlMatch = seg.match(/(https?:\/\/[^\s!]+)/i);
        const url = urlMatch ? urlMatch[1] : seg.split('!')[0].trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
            parsedUrls.push(url);
        }
        if (!detectedCatalogId) {
            const titleMatch = seg.match(/title\s*:\s*([a-zA-Z0-9_\-]+)/i);
            if (titleMatch && titleMatch[1]) {
                detectedCatalogId = titleMatch[1].trim();
            } else if (url) {
                const filename = url.split('/').pop()?.split('?')[0]?.split('.')[0] || '';
                const codeMatch = filename.match(/^([a-zA-Z]{1,6}\d{1,5}(?:-\d+)?)/);
                if (codeMatch && codeMatch[1]) {
                    detectedCatalogId = codeMatch[1].trim();
                } else if (filename && !filename.includes('screenshot') && !filename.includes('scaled') && filename.length <= 15) {
                    detectedCatalogId = filename.trim();
                }
            }
        }
    }
    return { primaryUrl: parsedUrls[0] || '', galleryUrls: parsedUrls.slice(1), catalogId: detectedCatalogId };
}

function parseProductRow(rawRow, forcedType = 'simple') {
    const r = normalizeRow(rawRow);
    const rawName = rawRow['post_title'] || rawRow['Name'] || rawRow['Title'] || rawRow['Product Name'] || r['posttitle'] || r['name'] || r['title'] || r['productname'] || 'Untitled Saree';
    const name = cleanTextEncoding(rawName);
    const rawSlug = rawRow['post_name'] || rawRow['Slug'] || rawRow['Handle'] || r['postname'] || r['slug'] || r['handle'] || '';
    const defaultSlug = String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
    const slug = rawSlug ? String(rawSlug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : defaultSlug;
    const rawContent = rawRow['post_content'] || rawRow['Description'] || rawRow['Body (HTML)'] || r['postcontent'] || r['description'] || r['bodyhtml'] || r['details'] || '';
    const description = cleanTextEncoding(rawContent);
    const regPriceRaw = rawRow['regular_price'] || rawRow['Regular Price'] || rawRow['Compare Price'] || rawRow['MRP'] || r['regularprice'] || r['compareprice'] || r['mrp'] || '';
    const salePriceRaw = rawRow['sale_price'] || rawRow['Sale Price'] || rawRow['Price'] || rawRow['Selling Price'] || r['saleprice'] || r['price'] || r['sellingprice'] || '';
    const regPriceNum = parseFloat(String(regPriceRaw).replace(/[^0-9.]/g, ''));
    const salePriceNum = parseFloat(String(salePriceRaw).replace(/[^0-9.]/g, ''));
    const comparePrice = !isNaN(regPriceNum) && regPriceNum > 0 ? regPriceNum : null;
    const price = !isNaN(salePriceNum) && salePriceNum > 0 ? salePriceNum : (comparePrice || 0);
    const stockRaw = rawRow['stock'] || rawRow['Stock'] || rawRow['Quantity'] || rawRow['Inventory'] || r['stock'] || r['quantity'] || r['inventory'] || '';
    const stockStatus = String(rawRow['stock_status'] || rawRow['Stock Status'] || r['stockstatus'] || '').toLowerCase();
    let stock = 0;
    if (stockStatus === 'outofstock') {
        stock = 0;
    } else if (stockRaw !== '' && stockRaw !== null && stockRaw !== undefined) {
        const parsed = parseInt(String(stockRaw).replace(/[^0-9\-]/g, ''), 10);
        stock = !isNaN(parsed) && parsed >= 0 ? parsed : (stockStatus === 'instock' ? 5 : 0);
    } else {
        stock = stockStatus === 'outofstock' ? 0 : 5;
    }
    let category = rawRow['tax:product_cat'] || rawRow['Category'] || rawRow['Categories'] || rawRow['Product Category'] || rawRow['Type'] || r['taxproductcat'] || r['category'] || r['categories'] || r['productcategory'] || 'General';
    if (category.includes(',')) {
        const catParts = category.split(',').map(c => c.trim()).filter(Boolean);
        category = catParts[0] || 'General';
    }
    const rawImages = rawRow['images'] || rawRow['Images'] || rawRow['Image URL'] || rawRow['Image Src'] || r['images'] || r['imageurl'] || r['imagesrc'] || '';
    const { primaryUrl, galleryUrls, catalogId: extractedCatId } = parseWooCommerceImages(rawImages);
    const directCatId = rawRow['catalog_id'] || rawRow['Catalog ID'] || rawRow['Code'] || r['catalogid'] || r['code'] || '';
    const catalogId = directCatId || extractedCatId || '';
    const statusRaw = String(rawRow['post_status'] || rawRow['Status'] || r['poststatus'] || r['status'] || 'Published').toLowerCase();
    const isActive = statusRaw === 'published' || statusRaw === 'active' || statusRaw === 'publish' || statusRaw === '1' || statusRaw === 'true' ? 1 : 0;
    const wooId = rawRow['ID'] || rawRow['id'] || rawRow['__EMPTY'] || r['id'] || '';
    const sku = rawRow['sku'] || rawRow['SKU'] || r['sku'] || (catalogId ? String(catalogId) : (wooId ? String(wooId) : ''));

    return {
        name,
        slug,
        description,
        price,
        compare_price: comparePrice,
        stock,
        category,
        image_url: primaryUrl,
        gallery_image: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        product_catalog_image_id: catalogId || null,
        is_active: isActive,
        sku: sku || null,
        woo_id: wooId ? String(wooId) : null,
        tax_class: 'GST_5',
        type: forcedType
    };
}

function parseAndGroupProductRows(rows) {
    const variableParentsMap = new Map();
    const simpleProducts = [];
    const variationRows = [];

    rows.forEach((rawRow, idx) => {
        const r = normalizeRow(rawRow);
        const rawType = String(rawRow['Type'] || rawRow['type'] || r['type'] || '').trim().toLowerCase();
        const rawId = String(rawRow['ID'] || rawRow['id'] || rawRow['__EMPTY'] || r['id'] || '').trim();
        const rawParent = String(rawRow['Parent'] || rawRow['parent'] || r['parent'] || '').trim().replace(/^id:/i, '').trim();

        if (rawType === 'variable') {
            const parsedParent = parseProductRow(rawRow, 'variant');
            parsedParent.csv_id = rawId;
            parsedParent.attribute_name = cleanTextEncoding(rawRow['Attribute 1 name'] || r['attribute1name'] || 'Size');
            parsedParent.attribute_values = cleanTextEncoding(rawRow['Attribute 1 value(s)'] || r['attribute1values'] || '');
            parsedParent.variants = [];
            variableParentsMap.set(rawId, parsedParent);
        } else if (rawType === 'variation') {
            variationRows.push({ rawRow, r, rawId, rawParent, idx });
        } else {
            const parsedSimple = parseProductRow(rawRow, 'simple');
            parsedSimple.csv_id = rawId;
            parsedSimple.attribute_name = cleanTextEncoding(rawRow['Attribute 1 name'] || r['attribute1name'] || '');
            parsedSimple.attribute_values = cleanTextEncoding(rawRow['Attribute 1 value(s)'] || r['attribute1values'] || '');
            parsedSimple.variants = [];
            simpleProducts.push(parsedSimple);
        }
    });

    variationRows.forEach(({ rawRow, r, rawId, rawParent, idx }) => {
        let attrVal = cleanTextEncoding(rawRow['Attribute 1 value(s)'] || r['attribute1values'] || '');
        const rawVarName = cleanTextEncoding(rawRow['Name'] || rawRow['post_title'] || r['name'] || '');
        if (!attrVal && rawVarName) {
            const parts = rawVarName.split(' - ');
            if (parts.length > 1) {
                attrVal = parts[parts.length - 1].trim();
            }
        }
        const variantName = attrVal || rawVarName || `Variant ${idx + 1}`;

        const regPriceRaw = rawRow['regular_price'] || rawRow['Regular price'] || rawRow['Regular Price'] || r['regularprice'] || '';
        const salePriceRaw = rawRow['sale_price'] || rawRow['Sale price'] || rawRow['Sale Price'] || r['saleprice'] || '';
        const regPriceNum = parseFloat(String(regPriceRaw).replace(/[^0-9.]/g, ''));
        const salePriceNum = parseFloat(String(salePriceRaw).replace(/[^0-9.]/g, ''));

        const comparePrice = !isNaN(regPriceNum) && regPriceNum > 0 ? regPriceNum : null;
        const price = !isNaN(salePriceNum) && salePriceNum > 0 ? salePriceNum : (comparePrice || 0);

        const stockRaw = rawRow['stock'] || rawRow['Stock'] || r['stock'] || '';
        const inStockRaw = rawRow['In stock?'] ?? rawRow['in_stock'] ?? r['instock'];
        let stock = 0;
        if (inStockRaw === 0 || inStockRaw === '0' || inStockRaw === false) {
            stock = 0;
        } else if (stockRaw !== '' && stockRaw !== null && stockRaw !== undefined) {
            const parsedStock = parseInt(String(stockRaw).replace(/[^0-9\-]/g, ''), 10);
            stock = !isNaN(parsedStock) && parsedStock >= 0 ? parsedStock : 5;
        } else {
            stock = 5;
        }

        const rawImages = rawRow['images'] || rawRow['Images'] || rawRow['Image URL'] || r['images'] || '';
        const { primaryUrl: variantImgUrl } = parseWooCommerceImages(rawImages);
        const variantSku = cleanTextEncoding(rawRow['sku'] || rawRow['SKU'] || r['sku'] || '');
        const position = parseInt(String(rawRow['position'] || rawRow['Position'] || r['position'] || idx), 10) || idx;

        const variantObj = {
            name: variantName,
            sku: variantSku,
            price,
            compare_price: comparePrice,
            original_price: comparePrice || price,
            stock,
            image_url: variantImgUrl,
            position,
            csv_id: rawId,
            parent_id: rawParent
        };

        if (variableParentsMap.has(rawParent)) {
            variableParentsMap.get(rawParent).variants.push(variantObj);
        } else {
            const standalone = parseProductRow(rawRow, 'simple');
            standalone.name = rawVarName || `Variant ${variantName}`;
            standalone.csv_id = rawId;
            standalone.variants = [];
            simpleProducts.push(standalone);
        }
    });

    const finalizedVariableProducts = [];
    for (const parent of variableParentsMap.values()) {
        if (parent.variants.length > 0) {
            parent.variants.sort((a, b) => a.position - b.position);
            parent.stock = parent.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
            const validPrices = parent.variants.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
            const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : (parent.variants[0]?.price || 0);
            const matchingVar = parent.variants.find(v => Number(v.price) === lowestPrice) || parent.variants[0];

            parent.price = lowestPrice;
            parent.compare_price = matchingVar?.compare_price || parent.compare_price;
            parent.original_price = matchingVar?.original_price || parent.compare_price;

            if (!parent.image_url && parent.variants[0]?.image_url) {
                parent.image_url = parent.variants[0].image_url;
            }

            parent.variants.forEach((v, vIdx) => {
                if (!v.sku) {
                    v.sku = `${parent.sku || parent.product_catalog_image_id || 'SKU'}-${String(v.name).replace(/\s+/g, '').toUpperCase()}`;
                }
                if (!v.image_url) {
                    v.image_url = parent.image_url;
                }
            });
        }
        finalizedVariableProducts.push(parent);
    }

    return [...simpleProducts, ...finalizedVariableProducts];
}

const grouped = parseAndGroupProductRows(rawRows);
console.log('Total grouped catalog products:', grouped.length);
const simpleCount = grouped.filter(p => p.type === 'simple').length;
const variantCount = grouped.filter(p => p.type === 'variant').length;
const totalVariants = grouped.reduce((sum, p) => sum + (p.variants?.length || 0), 0);

console.log(`Summary: ${simpleCount} Simple Products, ${variantCount} Variable Products (${totalVariants} Total Variants)`);

const sampleVar = grouped.find(p => p.type === 'variant');
console.log('\nSample Variable Product:');
console.log(JSON.stringify(sampleVar, null, 2));
