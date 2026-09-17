import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { verifyAdmin } from '@/lib/auth';
import { insertMediaRecord } from '@/services/mediaLibraryService';
import { applyWatermark } from '@/lib/imageService';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s for batch processing

const uploadBaseDir = path.join(process.cwd(), 'public', 'uploads', 'media');

async function ensureDirs() {
    try {
        await fs.mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
        await fs.mkdir(uploadBaseDir, { recursive: true });
        await fs.mkdir(path.join(uploadBaseDir, 'with-watermark'), { recursive: true });
        await fs.mkdir(path.join(uploadBaseDir, 'without-watermark'), { recursive: true });
    } catch (_) {}
}

/**
 * Downloads a remote image URL and saves it into MySQL `uploaded_media` & `media_library` tables.
 * Returns the local URL e.g. `/uploads/media/with-watermark/PCDB016.jpg`
 */
async function downloadAndPersistImage(remoteUrl, catalogId, options = {}) {
    if (!remoteUrl || typeof remoteUrl !== 'string') return '';
    const cleanUrl = remoteUrl.trim();
    if (!cleanUrl) return '';

    // If it's already a local uploaded URL, return as is
    if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('/images/')) {
        return cleanUrl;
    }

    try {
        await ensureDirs();

        // 1. Derive clean filename
        const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
        const originalName = path.basename(urlObj.pathname) || 'image.jpg';
        const ext = (path.extname(originalName).toLowerCase() || '.jpg').split('?')[0];
        const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');

        const cleanFilename = catalogId
            ? `${catalogId.replace(/[^a-zA-Z0-9_\-]/g, '_')}${ext}`
            : `${baseName}${ext}`;

        const localUrl = `/uploads/media/with-watermark/${cleanFilename}`;
        const rawLocalUrl = `/uploads/media/without-watermark/${cleanFilename}`;

        // 2. Check if already stored in uploaded_media database table
        const [existingRows] = await pool.query(
            'SELECT `id`, `url` FROM `uploaded_media` WHERE `filename` = ? OR `url` = ? LIMIT 1',
            [cleanFilename, localUrl]
        );
        if (existingRows && existingRows.length > 0) {
            return localUrl;
        }

        // 3. Download image buffer
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const res = await fetch(cleanUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`[MIGRATE-IMG] Failed to download image from ${cleanUrl} (Status: ${res.status}). Keeping original URL.`);
            return cleanUrl;
        }

        const arrayBuffer = await res.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        const mimeType = res.headers.get('content-type') || (ext === '.png' ? 'image/png' : 'image/jpeg');

        // 4. Optionally apply visual watermark if requested and catalog ID is present
        let watermarkedBuffer = buffer;
        if (options.applyVisualWatermark && catalogId) {
            try {
                watermarkedBuffer = await applyWatermark(buffer, catalogId);
            } catch (wmErr) {
                console.warn('[MIGRATE-IMG] Watermark apply failed, saving original:', wmErr?.message);
                watermarkedBuffer = buffer;
            }
        }

        // 5. Save to local disk first (high priority for immediate serving)
        try {
            const diskPath = path.join(uploadBaseDir, 'with-watermark', cleanFilename);
            const rawDiskPath = path.join(uploadBaseDir, 'without-watermark', cleanFilename);
            await fs.writeFile(diskPath, watermarkedBuffer);
            await fs.writeFile(rawDiskPath, buffer);
        } catch (diskErr) {
            console.warn('[MIGRATE-IMG] Disk write warning:', diskErr?.message);
        }

        // 6. Save metadata record in uploaded_media database table
        try {
            const mediaId = crypto.randomUUID();
            // Store smaller images in DB blob, skip large blobs > 4MB to prevent max_allowed_packet errors
            const shouldStoreBlob = watermarkedBuffer.length <= 4 * 1024 * 1024;
            const blobData = shouldStoreBlob ? watermarkedBuffer : null;

            await pool.query(
                `INSERT INTO \`uploaded_media\` (
                    \`id\`, \`filename\`, \`url\`, \`data\`, \`mime_type\`, \`size\`, \`has_watermark\`, \`catalog_id\`, \`created_at\`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    \`url\` = VALUES(\`url\`),
                    \`mime_type\` = VALUES(\`mime_type\`),
                    \`size\` = VALUES(\`size\`),
                    \`has_watermark\` = VALUES(\`has_watermark\`),
                    \`catalog_id\` = VALUES(\`catalog_id\`)`,
                [
                    mediaId,
                    cleanFilename,
                    localUrl,
                    blobData,
                    mimeType,
                    watermarkedBuffer.length,
                    Boolean(options.applyVisualWatermark && catalogId) ? 1 : 0,
                    catalogId || null
                ]
            );
        } catch (dbErr) {
            console.warn('[MIGRATE-IMG] uploaded_media DB insert warning (disk file still saved):', dbErr?.message);
        }

        // 7. Register in media_library metadata catalog
        try {
            await insertMediaRecord({
                name: cleanFilename,
                filename: cleanFilename,
                url: localUrl,
                folder: 'with-watermark',
                size: watermarkedBuffer.length,
                mime_type: mimeType,
                has_watermark: Boolean(options.applyVisualWatermark && catalogId),
                catalog_id: catalogId || null,
                source: 'csv_migration'
            });
        } catch (_) {}

        return localUrl;

    } catch (err) {
        console.warn(`[MIGRATE-IMG] Error processing image from ${cleanUrl}:`, err?.message);
        return cleanUrl; // Fallback gracefully to remote URL
    }
}

/**
 * Helper to extract clean image URL and Catalog ID from WooCommerce image string
 * Format example: "https://mahaa.in/wp-content/uploads/2024/01/PCDB016.jpg ! alt :  ! title : PCDB016 ! desc :  ! caption : "
 */
function parseWooCommerceImages(imgRaw) {
    if (!imgRaw) return { primaryUrl: '', galleryUrls: [], catalogId: '' };

    const rawStr = String(imgRaw).trim();
    if (!rawStr) return { primaryUrl: '', galleryUrls: [], catalogId: '' };

    // Split by comma or multiple lines if multiple images exist
    const rawSegments = rawStr.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const parsedUrls = [];
    let detectedCatalogId = '';

    for (const seg of rawSegments) {
        // Extract URL portion before '!' or metadata
        const urlMatch = seg.match(/(https?:\/\/[^\s!]+)/i);
        const url = urlMatch ? urlMatch[1] : seg.split('!')[0].trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
            parsedUrls.push(url);
        }

        // Try to extract Catalog ID from title tag e.g. "! title : PCDB016 !"
        if (!detectedCatalogId) {
            const titleMatch = seg.match(/title\s*:\s*([a-zA-Z0-9_\-]+)/i);
            if (titleMatch && titleMatch[1]) {
                detectedCatalogId = titleMatch[1].trim();
            } else if (url) {
                // Try from filename e.g. PCDB016.jpg -> PCDB016, MM01.jpg -> MM01
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

    const primaryUrl = parsedUrls[0] || '';
    const galleryUrls = parsedUrls.slice(1);

    return { primaryUrl, galleryUrls, catalogId: detectedCatalogId };
}

/**
 * Normalizes and repairs encoding/mojibake issues and strips literal \n / \\n from descriptions
 */
function cleanTextEncoding(str) {
    if (str === null || str === undefined) return '';
    const s = typeof str === 'string' ? str : String(str);
    return s
        // 1. Replace literal string "\n", "\\n", "\r\n", "\\r\\n" with actual newlines
        .replace(/\\r\\n|\\n|\\r/g, '\n')
        .replace(/\r\n|\r/g, '\n')
        // 2. Clean multiple redundant newlines into clean paragraph breaks
        .replace(/\n{3,}/g, '\n\n')
        // 3. Clean HTML entity encoding
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        // 4. Fix UTF-8 / Windows-1252 double-encoded mojibake
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
        // 5. Standardize curly/typographic unicode punctuation to clean web-safe characters
        .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
        .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

/**
 * Normalizes keys to match incoming CSV columns flexibly
 */
function normalizeRow(rawRow) {
    const row = {};
    for (const [k, v] of Object.entries(rawRow || {})) {
        const cleanKey = String(k || '').toLowerCase().trim().replace(/[\s_\-:]/g, '');
        row[cleanKey] = typeof v === 'string' ? cleanTextEncoding(v) : v;
    }
    return row;
}

/**
 * Extracts a standardized product object from a single CSV row
 */
function parseProductRow(rawRow, forcedType = 'simple') {
    const r = normalizeRow(rawRow);

    // 1. Title / Name
    const rawName = rawRow['post_title'] || rawRow['Name'] || rawRow['Title'] || rawRow['Product Name'] || r['posttitle'] || r['name'] || r['title'] || r['productname'] || 'Untitled Saree';
    const name = cleanTextEncoding(rawName);

    // 2. Slug
    const rawSlug = rawRow['post_name'] || rawRow['Slug'] || rawRow['Handle'] || r['postname'] || r['slug'] || r['handle'] || '';
    const defaultSlug = String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
    const slug = rawSlug ? String(rawSlug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : defaultSlug;

    // 3. Description (fully cleaned of \n and mojibake)
    const rawContent = rawRow['post_content'] || rawRow['Description'] || rawRow['Body (HTML)'] || r['postcontent'] || r['description'] || r['bodyhtml'] || r['details'] || '';
    const description = cleanTextEncoding(rawContent);

    // 4. Pricing
    const regPriceRaw = rawRow['regular_price'] || rawRow['Regular price'] || rawRow['Regular Price'] || rawRow['Compare Price'] || rawRow['MRP'] || r['regularprice'] || r['compareprice'] || r['mrp'] || '';
    const salePriceRaw = rawRow['sale_price'] || rawRow['Sale price'] || rawRow['Sale Price'] || rawRow['Price'] || rawRow['Selling Price'] || r['saleprice'] || r['price'] || r['sellingprice'] || '';

    const regPriceNum = parseFloat(String(regPriceRaw).replace(/[^0-9.]/g, ''));
    const salePriceNum = parseFloat(String(salePriceRaw).replace(/[^0-9.]/g, ''));

    const comparePrice = !isNaN(regPriceNum) && regPriceNum > 0 ? regPriceNum : null;
    const price = !isNaN(salePriceNum) && salePriceNum > 0
        ? salePriceNum
        : (comparePrice || 0);

    // 5. Stock & Inventory
    const stockRaw = rawRow['stock'] || rawRow['Stock'] || rawRow['Quantity'] || rawRow['Inventory'] || r['stock'] || r['quantity'] || r['inventory'] || '';
    const stockStatus = String(rawRow['stock_status'] || rawRow['Stock Status'] || r['stockstatus'] || '').toLowerCase();
    const inStockRaw = rawRow['In stock?'] ?? rawRow['in_stock'] ?? r['instock'];

    let stock = 0;
    if (stockStatus === 'outofstock' || inStockRaw === 0 || inStockRaw === '0' || inStockRaw === false) {
        stock = 0;
    } else if (stockRaw !== '' && stockRaw !== null && stockRaw !== undefined) {
        const parsed = parseInt(String(stockRaw).replace(/[^0-9\-]/g, ''), 10);
        stock = !isNaN(parsed) && parsed >= 0 ? parsed : (stockStatus === 'instock' ? 5 : 0);
    } else {
        stock = stockStatus === 'outofstock' ? 0 : 5;
    }

    // 6. Category / Taxonomy
    let category = rawRow['tax:product_cat'] || rawRow['Category'] || rawRow['Categories'] || rawRow['Product Category'] || rawRow['Type'] || r['taxproductcat'] || r['category'] || r['categories'] || r['productcategory'] || 'General';
    if (category.includes(',')) {
        const catParts = category.split(',').map(c => c.trim()).filter(Boolean);
        category = catParts[0] || 'General';
    }

    // 7. Images & Catalog ID extraction
    const rawImages = rawRow['images'] || rawRow['Images'] || rawRow['Image URL'] || rawRow['Image Src'] || r['images'] || r['imageurl'] || r['imagesrc'] || '';
    const { primaryUrl, galleryUrls, catalogId: extractedCatId } = parseWooCommerceImages(rawImages);

    // Direct Catalog ID column if specified
    const directCatId = rawRow['catalog_id'] || rawRow['Catalog ID'] || rawRow['Code'] || r['catalogid'] || r['code'] || '';
    const catalogId = directCatId || extractedCatId || '';

    // 8. Status
    const statusRaw = String(rawRow['post_status'] || rawRow['Status'] || r['poststatus'] || r['status'] || 'Published').toLowerCase();
    const isActive = statusRaw === 'published' || statusRaw === 'active' || statusRaw === 'publish' || statusRaw === '1' || statusRaw === 'true' ? 1 : 0;

    // 9. IDs & SKUs
    const wooId = rawRow['ID'] || rawRow['id'] || rawRow['__EMPTY'] || r['id'] || '';
    const sku = rawRow['sku'] || rawRow['SKU'] || r['sku'] || (catalogId ? String(catalogId) : (wooId ? String(wooId) : ''));

    // 10. Attributes extraction
    const attrName = cleanTextEncoding(rawRow['Attribute 1 name'] || r['attribute1name'] || rawRow['Attribute 2 name'] || r['attribute2name'] || 'Size');
    const attrValuesRaw = cleanTextEncoding(rawRow['Attribute 1 value(s)'] || r['attribute1values'] || rawRow['Attribute 2 value(s)'] || r['attribute2values'] || '');

    return {
        name,
        slug,
        description,
        price,
        compare_price: comparePrice,
        original_price: comparePrice || price,
        stock,
        category,
        image_url: primaryUrl,
        gallery_image: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        product_catalog_image_id: catalogId || null,
        is_active: isActive,
        sku: sku || null,
        woo_id: wooId ? String(wooId) : null,
        tax_class: 'GST_5',
        type: forcedType,
        attribute_name: attrName || 'Size',
        attribute_values: attrValuesRaw,
        variants: []
    };
}

/**
 * Parses raw CSV rows and groups WooCommerce variable parents & variations into structured products with attributes
 */
function parseAndGroupProductRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const variableParentsMap = new Map();
    const simpleProducts = [];
    const variationRows = [];
    const knownVariantPriceMap = new Map(); // e.g. "32" -> { price: 1850, compare_price: 1850, stock: 11 }

    // Pass 1: Classify rows
    rows.forEach((rawRow, idx) => {
        const r = normalizeRow(rawRow);
        const rawType = String(rawRow['Type'] || rawRow['type'] || r['type'] || '').trim().toLowerCase();
        const rawId = String(rawRow['ID'] || rawRow['id'] || rawRow['__EMPTY'] || r['id'] || '').trim();
        const rawParent = String(rawRow['Parent'] || rawRow['parent'] || r['parent'] || '').trim().replace(/^id:/i, '').trim();

        // Check if row has attributes defined
        const attrValuesRaw = cleanTextEncoding(rawRow['Attribute 1 value(s)'] || r['attribute1values'] || rawRow['Attribute 2 value(s)'] || r['attribute2values'] || '');
        const isVariable = rawType === 'variable' || rawType === 'variant' || (attrValuesRaw && (attrValuesRaw.includes(',') || attrValuesRaw.includes('|')));

        if (isVariable) {
            const parsedParent = parseProductRow(rawRow, 'variant');
            parsedParent.csv_id = rawId;
            parsedParent.variants = [];
            variableParentsMap.set(rawId || `var_parent_${idx}`, parsedParent);
        } else if (rawType === 'variation') {
            variationRows.push({ rawRow, r, rawId, rawParent, idx });
        } else {
            const parsedSimple = parseProductRow(rawRow, 'simple');
            parsedSimple.csv_id = rawId;
            parsedSimple.variants = [];
            simpleProducts.push(parsedSimple);
        }
    });

    // Pass 2: Attach explicit variation rows to variable parents & record variant price map
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
            name: String(variantName),
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

        // Cache variant price into dictionary
        if (price > 0) {
            knownVariantPriceMap.set(String(variantName).trim().toLowerCase(), {
                price,
                compare_price: comparePrice,
                original_price: comparePrice || price,
                stock
            });
        }

        // Match parent by ID, name, or slug
        let targetParent = null;
        if (rawParent && variableParentsMap.has(rawParent)) {
            targetParent = variableParentsMap.get(rawParent);
        } else if (rawParent) {
            for (const p of variableParentsMap.values()) {
                if (p.csv_id === rawParent || String(p.csv_id) === String(rawParent).replace(/^id:/i, '')) {
                    targetParent = p;
                    break;
                }
            }
        }

        if (!targetParent && rawVarName && rawVarName.includes(' - ')) {
            const baseName = rawVarName.split(' - ')[0].trim().toLowerCase();
            for (const p of variableParentsMap.values()) {
                if (p.name.toLowerCase() === baseName) {
                    targetParent = p;
                    break;
                }
            }
        }

        if (targetParent) {
            targetParent.variants.push(variantObj);
        } else {
            const standalone = parseProductRow(rawRow, 'simple');
            standalone.name = rawVarName || `Variant ${variantName}`;
            standalone.csv_id = rawId;
            standalone.variants = [];
            simpleProducts.push(standalone);
        }
    });

    // Pass 3: For variable parents WITHOUT child variation rows in the sheet (e.g. Sample data.xlsx),
    // automatically generate variants from the comma-separated `Attribute 1 value(s)` using the learned price dictionary!
    for (const parent of variableParentsMap.values()) {
        if (parent.variants.length === 0 && parent.attribute_values) {
            const rawVals = parent.attribute_values.split(/[,|]+/).map(v => v.trim()).filter(Boolean);
            if (rawVals.length > 0) {
                const defaultBasePrice = parent.price || 975;
                const defaultBaseCompare = parent.compare_price || defaultBasePrice;
                const defaultBaseStock = parent.stock > 0 ? parent.stock : 5;

                parent.variants = rawVals.map((val, vIdx) => {
                    const normVal = String(val).trim().toLowerCase();
                    const knownPriceInfo = knownVariantPriceMap.get(normVal);

                    const vPrice = knownPriceInfo?.price || defaultBasePrice;
                    const vCompare = knownPriceInfo?.compare_price || defaultBaseCompare;
                    const vStock = knownPriceInfo?.stock !== undefined ? knownPriceInfo.stock : defaultBaseStock;

                    return {
                        name: val,
                        sku: `${parent.sku || parent.product_catalog_image_id || 'SKU'}-${String(val).replace(/\s+/g, '').toUpperCase()}`,
                        price: vPrice,
                        compare_price: vCompare,
                        original_price: vCompare || vPrice,
                        stock: vStock,
                        image_url: parent.image_url,
                        position: vIdx + 1,
                        parent_id: parent.csv_id
                    };
                });
            }
        }
    }

    // Pass 4: Finalize variable parent pricing, aggregated stock, and sort variants
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

            parent.variants.forEach((v) => {
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

// ── GET: Metadata & Overview ──────────────────────────────────────────────────
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const [prodCountRows] = await pool.query('SELECT COUNT(*) as count, MAX(product_no) as max_product_no FROM `products`');
        const [categories] = await pool.query('SELECT id, name, slug FROM `categories` ORDER BY name ASC');
        const [variantCountRows] = await pool.query('SELECT COUNT(*) as count FROM `product_variants`');

        return NextResponse.json({
            totalProducts: prodCountRows[0]?.count || 0,
            totalVariants: variantCountRows[0]?.count || 0,
            maxProductNo: prodCountRows[0]?.max_product_no || 1000,
            categories: categories || []
        });
    } catch (err) {
        console.error('[MIGRATE GET Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── POST: Preview or Execute Migration ───────────────────────────────────────
export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, rawRows, options, itemsToExecute } = body;

        // ─────────────────────────────────────────────────────────────────────
        // ACTION: PREVIEW & MATCH WITH CURRENT PRODUCTS
        // ─────────────────────────────────────────────────────────────────────
        if (action === 'preview') {
            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                return NextResponse.json({ error: 'No product rows provided for preview' }, { status: 400 });
            }

            // 1. Group raw rows into Simple products and Variable parents with their variations
            const groupedProducts = parseAndGroupProductRows(rawRows);

            // 2. Fetch all existing products & variants from MySQL for fast in-memory matching
            const [existingProducts] = await pool.query(`
                SELECT 
                    id, product_no, sku, name, slug, price, compare_price, 
                    stock, category, product_catalog_image_id, image_url, is_active, type
                FROM \`products\`
            `);

            const [existingVariants] = await pool.query(`
                SELECT id, product_id, name, sku, price, compare_price, stock, image_url
                FROM \`product_variants\`
            `);

            const variantsByProductId = new Map();
            for (const v of existingVariants) {
                if (!variantsByProductId.has(v.product_id)) {
                    variantsByProductId.set(v.product_id, []);
                }
                variantsByProductId.get(v.product_id).push(v);
            }

            // Fast lookup maps
            const byCatalogId = new Map();
            const bySku = new Map();
            const bySlug = new Map();
            const byName = new Map();

            for (const p of existingProducts) {
                if (p.product_catalog_image_id) {
                    byCatalogId.set(String(p.product_catalog_image_id).toLowerCase().trim(), p);
                }
                if (p.sku) {
                    bySku.set(String(p.sku).toLowerCase().trim(), p);
                }
                if (p.slug) {
                    bySlug.set(String(p.slug).toLowerCase().trim(), p);
                }
                if (p.name) {
                    byName.set(String(p.name).toLowerCase().trim(), p);
                }
            }

            const previewItems = [];
            let newCount = 0;
            let updateCount = 0;
            let skipCount = 0;
            let simpleCount = 0;
            let variableCount = 0;
            let totalVariantsCount = 0;

            const matchStrategy = options?.matchBy || ['catalog_id', 'sku', 'slug', 'name'];

            for (let idx = 0; idx < groupedProducts.length; idx++) {
                const parsed = groupedProducts[idx];
                if (parsed.type === 'variant') {
                    variableCount++;
                    totalVariantsCount += (parsed.variants?.length || 0);
                } else {
                    simpleCount++;
                }

                let matchedExisting = null;
                let matchReason = '';

                // Match by Catalog ID (e.g. PCDB016, MM01)
                if (matchStrategy.includes('catalog_id') && parsed.product_catalog_image_id) {
                    const found = byCatalogId.get(String(parsed.product_catalog_image_id).toLowerCase().trim());
                    if (found) {
                        matchedExisting = found;
                        matchReason = `Matched by Catalog ID (${parsed.product_catalog_image_id})`;
                    }
                }

                // Match by SKU
                if (!matchedExisting && matchStrategy.includes('sku') && parsed.sku) {
                    const found = bySku.get(String(parsed.sku).toLowerCase().trim());
                    if (found) {
                        matchedExisting = found;
                        matchReason = `Matched by SKU (${parsed.sku})`;
                    }
                }

                // Match by Slug
                if (!matchedExisting && matchStrategy.includes('slug') && parsed.slug) {
                    const found = bySlug.get(String(parsed.slug).toLowerCase().trim());
                    if (found) {
                        matchedExisting = found;
                        matchReason = `Matched by Slug (${parsed.slug})`;
                    }
                }

                // Match by Name
                if (!matchedExisting && matchStrategy.includes('name') && parsed.name) {
                    const found = byName.get(String(parsed.name).toLowerCase().trim());
                    if (found) {
                        matchedExisting = found;
                        matchReason = `Matched by Exact Product Name`;
                    }
                }

                const actionType = matchedExisting ? 'UPDATE' : 'NEW';
                if (actionType === 'NEW') newCount++;
                if (actionType === 'UPDATE') updateCount++;

                // If matched existing product has variants in DB and incoming generated variants lack custom prices,
                // sync with existing DB variant prices/stocks for matching variant names
                if (matchedExisting && parsed.type === 'variant' && parsed.variants?.length > 0) {
                    const exVars = variantsByProductId.get(matchedExisting.id) || [];
                    if (exVars.length > 0) {
                        const exVarMap = new Map();
                        exVars.forEach(ev => exVarMap.set(String(ev.name).trim().toLowerCase(), ev));

                        parsed.variants.forEach(v => {
                            const matchedExVar = exVarMap.get(String(v.name).trim().toLowerCase());
                            if (matchedExVar) {
                                if (Number(matchedExVar.price) > 0) {
                                    v.price = Number(matchedExVar.price);
                                }
                                if (matchedExVar.compare_price) {
                                    v.compare_price = Number(matchedExVar.compare_price);
                                    v.original_price = Number(matchedExVar.compare_price);
                                }
                                if (matchedExVar.stock !== undefined && matchedExVar.stock !== null) {
                                    v.stock = Number(matchedExVar.stock);
                                }
                                if (matchedExVar.image_url) {
                                    v.image_url = matchedExVar.image_url;
                                }
                            }
                        });

                        // Recompute lowest price and stock
                        const validPrices = parsed.variants.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
                        if (validPrices.length > 0) {
                            parsed.price = Math.min(...validPrices);
                        }
                        parsed.stock = parsed.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
                    }
                }

                // Calculate Field-Level Diffs
                const diff = {};
                if (matchedExisting) {
                    const exVars = variantsByProductId.get(matchedExisting.id) || [];
                    matchedExisting.variants = exVars;

                    if (Number(matchedExisting.price) !== Number(parsed.price)) {
                        diff.price = { old: Number(matchedExisting.price), new: Number(parsed.price) };
                    }
                    if (Number(matchedExisting.stock) !== Number(parsed.stock)) {
                        diff.stock = { old: Number(matchedExisting.stock), new: Number(parsed.stock) };
                    }
                    if (matchedExisting.category !== parsed.category) {
                        diff.category = { old: matchedExisting.category, new: parsed.category };
                    }
                    if (matchedExisting.name !== parsed.name) {
                        diff.name = { old: matchedExisting.name, new: parsed.name };
                    }
                    if ((matchedExisting.type || 'simple') !== parsed.type) {
                        diff.type = { old: matchedExisting.type || 'simple', new: parsed.type };
                    }
                    if (parsed.type === 'variant') {
                        diff.variants_count = { old: exVars.length, new: parsed.variants.length };
                    }
                }

                previewItems.push({
                    index: idx + 1,
                    action: actionType,
                    matchReason,
                    existingProduct: matchedExisting ? {
                        id: matchedExisting.id,
                        product_no: matchedExisting.product_no,
                        sku: matchedExisting.sku,
                        name: matchedExisting.name,
                        slug: matchedExisting.slug,
                        price: matchedExisting.price,
                        compare_price: matchedExisting.compare_price,
                        stock: matchedExisting.stock,
                        category: matchedExisting.category,
                        image_url: matchedExisting.image_url,
                        catalog_id: matchedExisting.product_catalog_image_id,
                        type: matchedExisting.type || 'simple',
                        variants: matchedExisting.variants || []
                    } : null,
                    incomingProduct: parsed,
                    diff,
                    selected: true
                });
            }

            return NextResponse.json({
                success: true,
                totalRawRows: rawRows.length,
                totalProducts: groupedProducts.length,
                simpleCount,
                variableCount,
                totalVariantsCount,
                newCount,
                updateCount,
                skipCount,
                previewItems
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // ACTION: EXECUTE BATCH MIGRATION
        // ─────────────────────────────────────────────────────────────────────
        if (action === 'execute') {
            const items = Array.isArray(itemsToExecute) ? itemsToExecute : [];
            if (items.length === 0) {
                return NextResponse.json({ error: 'No items provided for migration execution' }, { status: 400 });
            }

            const migrationOptions = options || {
                conflictStrategy: 'upsert', // 'upsert' | 'insert_only' | 'update_only'
                updateFields: {
                    price: true,
                    compare_price: true,
                    stock: true,
                    images: true,
                    category: true,
                    description: true,
                    name: false,
                    is_active: true
                },
                autoCreateCategories: true,
                downloadImages: true
            };

            // 1. Get highest Product Number for sequential assignment of new products
            const [maxRows] = await pool.query('SELECT MAX(product_no) as max_no FROM `products`');
            let nextProductNo = Math.max(1000, Number(maxRows[0]?.max_no || 1000)) + 1;

            let inserted = 0;
            let updated = 0;
            let skipped = 0;
            let totalVariantsSaved = 0;
            const errors = [];
            const results = [];

            // Category cache to minimize queries
            const categoryCache = new Map();
            const [catRows] = await pool.query('SELECT id, name FROM `categories`');
            for (const c of catRows) {
                categoryCache.set(String(c.name).toLowerCase().trim(), c.id);
            }

            for (const item of items) {
                try {
                    const incoming = item.incomingProduct;
                    const existing = item.existingProduct;
                    const isUpdate = Boolean(existing?.id);

                    // Apply Conflict Resolution Strategy
                    if (isUpdate && migrationOptions.conflictStrategy === 'insert_only') {
                        skipped++;
                        results.push({ name: incoming.name, status: 'SKIPPED', reason: 'Conflict strategy: Insert New Only' });
                        continue;
                    }
                    if (!isUpdate && migrationOptions.conflictStrategy === 'update_only') {
                        skipped++;
                        results.push({ name: incoming.name, status: 'SKIPPED', reason: 'Conflict strategy: Update Existing Only' });
                        continue;
                    }

                    // Ensure Category Exists
                    let categoryId = null;
                    const catName = String(incoming.category || 'General').trim();
                    const catKey = catName.toLowerCase();

                    if (categoryCache.has(catKey)) {
                        categoryId = categoryCache.get(catKey);
                    } else if (migrationOptions.autoCreateCategories && catName) {
                        try {
                            const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                            const [newCat] = await pool.query(
                                'INSERT INTO `categories` (`name`, `slug`, `status`) VALUES (?, ?, ?)',
                                [catName, catSlug, 'active']
                            );
                            if (newCat?.insertId) {
                                categoryId = newCat.insertId;
                                categoryCache.set(catKey, categoryId);
                            }
                        } catch (catErr) {
                            console.warn('Category creation warning:', catErr?.message);
                        }
                    }

                    // Download and persist images to database & local media storage
                    let finalImageUrl = incoming.image_url;
                    let finalGalleryImage = incoming.gallery_image;

                    const shouldDownloadImages = migrationOptions.downloadImages !== false;

                    if (shouldDownloadImages && incoming.image_url) {
                        try {
                            finalImageUrl = await downloadAndPersistImage(
                                incoming.image_url,
                                incoming.product_catalog_image_id,
                                { applyVisualWatermark: Boolean(migrationOptions.applyVisualWatermark) }
                            );
                        } catch (imgErr) {
                            console.warn(`[MIGRATE-IMG] Primary image download warning:`, imgErr?.message);
                        }
                    }

                    if (shouldDownloadImages && incoming.gallery_image) {
                        try {
                            const galleryUrls = JSON.parse(incoming.gallery_image);
                            if (Array.isArray(galleryUrls) && galleryUrls.length > 0) {
                                const downloadedGallery = [];
                                for (let gIdx = 0; gIdx < galleryUrls.length; gIdx++) {
                                    const gUrl = galleryUrls[gIdx];
                                    const gCatId = incoming.product_catalog_image_id ? `${incoming.product_catalog_image_id}_g${gIdx + 1}` : null;
                                    const localGUrl = await downloadAndPersistImage(
                                        gUrl,
                                        gCatId,
                                        { applyVisualWatermark: Boolean(migrationOptions.applyVisualWatermark) }
                                    );
                                    downloadedGallery.push(localGUrl);
                                }
                                finalGalleryImage = JSON.stringify(downloadedGallery);
                            }
                        } catch (_) {}
                    }

                    let targetProductId = existing?.id;

                    if (isUpdate) {
                        // ── UPDATE EXISTING PRODUCT ──
                        targetProductId = existing.id;
                        const uFields = migrationOptions.updateFields || {};
                        const updates = [];
                        const params = [];

                        if (uFields.name && incoming.name) {
                            updates.push('`name` = ?');
                            params.push(incoming.name);
                        }
                        if (uFields.price && incoming.price !== undefined) {
                            updates.push('`price` = ?');
                            params.push(incoming.price);
                        }
                        if (uFields.compare_price && incoming.compare_price !== undefined) {
                            updates.push('`compare_price` = ?');
                            params.push(incoming.compare_price);
                        }
                        if (uFields.stock && incoming.stock !== undefined) {
                            updates.push('`stock` = ?');
                            params.push(incoming.stock);
                        }
                        if (uFields.category && incoming.category) {
                            updates.push('`category` = ?');
                            params.push(incoming.category);
                        }
                        if (uFields.description && incoming.description) {
                            updates.push('`description` = ?');
                            params.push(incoming.description);
                        }
                        if (uFields.images) {
                            if (finalImageUrl) {
                                updates.push('`image_url` = ?');
                                params.push(finalImageUrl);
                            }
                            if (finalGalleryImage) {
                                updates.push('`gallery_image` = ?');
                                params.push(finalGalleryImage);
                            }
                        }
                        if (incoming.product_catalog_image_id) {
                            updates.push('`product_catalog_image_id` = ?');
                            params.push(incoming.product_catalog_image_id);
                        }
                        if (uFields.is_active && incoming.is_active !== undefined) {
                            updates.push('`is_active` = ?');
                            params.push(incoming.is_active);
                        }
                        if (incoming.type) {
                            updates.push('`type` = ?');
                            params.push(incoming.type);
                        }

                        if (updates.length > 0) {
                            updates.push('`updated_at` = NOW()');
                            params.push(existing.id);

                            await pool.query(
                                `UPDATE \`products\` SET ${updates.join(', ')} WHERE \`id\` = ?`,
                                params
                            );

                            // Record stock history if stock changed
                            if (uFields.stock && existing.stock !== incoming.stock) {
                                const diff = incoming.stock - (existing.stock || 0);
                                try {
                                    await pool.query(
                                        'INSERT INTO `product_history` (`product_id`, `change_type`, `quantity_change`, `new_stock`, `reason`) VALUES (?, ?, ?, ?, ?)',
                                        [existing.id, diff >= 0 ? 'ADD' : 'ADJUSTMENT', diff, incoming.stock, 'CSV Migration Update']
                                    );
                                } catch (_) {}
                            }

                            // Sync category_products link
                            if (categoryId && existing.id) {
                                try {
                                    await pool.query('DELETE FROM `category_products` WHERE `product_id` = ?', [existing.id]);
                                    await pool.query('INSERT IGNORE INTO `category_products` (`category_id`, `product_id`) VALUES (?, ?)', [categoryId, existing.id]);
                                } catch (_) {}
                            }

                            updated++;
                            results.push({ name: incoming.name, id: existing.id, status: 'UPDATED' });
                        } else {
                            skipped++;
                        }

                    } else {
                        // ── INSERT NEW PRODUCT ──
                        const prodId = crypto.randomUUID();
                        targetProductId = prodId;
                        const prodNo = nextProductNo++;
                        const prodSku = incoming.sku || String(prodNo);

                        // Ensure unique slug
                        let finalSlug = incoming.slug || String(incoming.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        const [slugExists] = await pool.query('SELECT `id` FROM `products` WHERE `slug` = ? LIMIT 1', [finalSlug]);
                        if (slugExists && slugExists.length > 0) {
                            finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
                        }

                        await pool.query(
                            `INSERT INTO \`products\` (
                                \`id\`, \`product_no\`, \`sku\`, \`name\`, \`slug\`, \`description\`, 
                                \`price\`, \`compare_price\`, \`original_price\`, \`stock\`, \`category\`, \`image_url\`, 
                                \`gallery_image\`, \`product_catalog_image_id\`, \`is_active\`, 
                                \`type\`, \`tax_class\`, \`total_added\`, \`total_sold\`, \`created_at\`, \`updated_at\`
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [
                                prodId,
                                prodNo,
                                prodSku,
                                incoming.name,
                                finalSlug,
                                incoming.description || '',
                                incoming.price || 0,
                                incoming.compare_price || null,
                                incoming.original_price || incoming.compare_price || incoming.price || 0,
                                incoming.stock || 0,
                                incoming.category || 'General',
                                finalImageUrl || '',
                                finalGalleryImage || null,
                                incoming.product_catalog_image_id || null,
                                incoming.is_active !== undefined ? incoming.is_active : 1,
                                incoming.type || 'simple',
                                incoming.tax_class || 'GST_5',
                                incoming.stock || 0,
                                0
                            ]
                        );

                        // Record initial stock history
                        if (incoming.stock > 0) {
                            try {
                                await pool.query(
                                    'INSERT INTO `product_history` (`product_id`, `change_type`, `quantity_change`, `new_stock`, `reason`) VALUES (?, ?, ?, ?, ?)',
                                    [prodId, 'ADD', incoming.stock, incoming.stock, 'CSV Migration Import']
                                );
                            } catch (_) {}
                        }

                        // Link category
                        if (categoryId) {
                            try {
                                await pool.query('INSERT IGNORE INTO `category_products` (`category_id`, `product_id`) VALUES (?, ?)', [categoryId, prodId]);
                            } catch (_) {}
                        }

                        inserted++;
                        results.push({ name: incoming.name, id: prodId, product_no: prodNo, status: 'INSERTED' });
                    }

                    // ── SAVE/UPDATE PRODUCT VARIANTS ──
                    if (targetProductId) {
                        if (incoming.type === 'variant' && Array.isArray(incoming.variants) && incoming.variants.length > 0) {
                            // Delete old variants for this product
                            await pool.query('DELETE FROM `product_variants` WHERE `product_id` = ?', [targetProductId]);

                            for (let vIdx = 0; vIdx < incoming.variants.length; vIdx++) {
                                const v = incoming.variants[vIdx];
                                let vImgUrl = v.image_url || finalImageUrl || '';

                                if (shouldDownloadImages && v.image_url && v.image_url !== incoming.image_url) {
                                    try {
                                        vImgUrl = await downloadAndPersistImage(
                                            v.image_url,
                                            incoming.product_catalog_image_id ? `${incoming.product_catalog_image_id}_v${vIdx + 1}` : null,
                                            { applyVisualWatermark: Boolean(migrationOptions.applyVisualWatermark) }
                                        );
                                    } catch (_) {}
                                }

                                const vId = crypto.randomUUID();
                                const vName = String(v.name || `Variant #${vIdx + 1}`);
                                const vSku = v.sku || `${incoming.sku || 'SKU'}-${vName.replace(/\s+/g, '').toUpperCase()}`;
                                const vPrice = parseFloat(v.price) || 0;
                                const vComparePrice = v.compare_price ? parseFloat(v.compare_price) : null;
                                const vOrigPrice = v.original_price ? parseFloat(v.original_price) : vComparePrice;
                                const vStock = Math.max(0, parseInt(v.stock || '0', 10));

                                await pool.query(
                                    `INSERT INTO \`product_variants\` (
                                        \`id\`, \`product_id\`, \`name\`, \`sku\`, \`price\`, \`compare_price\`, \`original_price\`, \`stock\`, \`image_url\`, \`created_at\`
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                                    [
                                        vId,
                                        targetProductId,
                                        vName,
                                        vSku,
                                        vPrice,
                                        vComparePrice,
                                        vOrigPrice,
                                        vStock,
                                        vImgUrl
                                    ]
                                );
                                totalVariantsSaved++;
                            }
                        } else if (incoming.type === 'simple') {
                            // If switched or simple, ensure no stale variants exist
                            await pool.query('DELETE FROM `product_variants` WHERE `product_id` = ?', [targetProductId]);
                        }
                    }

                } catch (itemErr) {
                    console.error('Item Migration Error:', itemErr);
                    errors.push({ name: item?.incomingProduct?.name || 'Unknown', error: itemErr.message });
                }
            }

            return NextResponse.json({
                success: true,
                processedCount: items.length,
                insertedCount: inserted,
                updatedCount: updated,
                skippedCount: skipped,
                totalVariantsSaved,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined,
                results
            });
        }

        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });

    } catch (err) {
        console.error('[MIGRATE API Route Error]:', err);
        return NextResponse.json({ error: err.message || 'Server error during migration' }, { status: 500 });
    }
}
