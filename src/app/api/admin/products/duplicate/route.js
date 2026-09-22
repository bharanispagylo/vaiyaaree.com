import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/mysql';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export async function POST(request) {
    try {
        // 1. Authenticate admin
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId } = body || {};

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required for duplication' }, { status: 400 });
        }

        // 2. Fetch original product
        const [prodRows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [productId]);
        if (!prodRows || prodRows.length === 0) {
            return NextResponse.json({ error: 'Source product not found' }, { status: 404 });
        }

        const original = prodRows[0];

        // 3. Determine next sequential product_no and sku
        const [maxRows] = await pool.query('SELECT COALESCE(MAX(product_no), 999) AS max_no FROM products');
        let maxNo = Number(maxRows[0]?.max_no) || 999;

        const [skuRows] = await pool.query("SELECT sku FROM products WHERE sku IS NOT NULL AND sku != ''");
        for (const row of skuRows) {
            const num = parseInt(row.sku, 10);
            if (!isNaN(num) && num > maxNo) {
                maxNo = num;
            }
        }
        const nextProductNo = maxNo + 1;
        const nextSku = String(nextProductNo);

        // 4. Generate unique slug and name
        const originalName = String(original.name || 'Product').trim();
        const newProductName = `${originalName} (Copy)`;
        let baseSlug = slugify(original.slug ? `${original.slug}-copy` : `${originalName}-copy`);
        if (!baseSlug) baseSlug = `product-${nextProductNo}`;

        let uniqueSlug = baseSlug;
        let counter = 1;
        while (true) {
            const [slugMatches] = await pool.query('SELECT id FROM products WHERE slug = ? LIMIT 1', [uniqueSlug]);
            if (slugMatches.length === 0) break;
            counter++;
            uniqueSlug = `${baseSlug}-${counter}`;
            if (counter > 50) {
                uniqueSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
                break;
            }
        }

        // 5. Discover valid columns for products table
        const [productColRows] = await pool.query('SHOW COLUMNS FROM products');
        const validProductCols = new Set(productColRows.map(c => c.Field));

        const newProductId = crypto.randomUUID();

        // Prepare product record
        const rawProductData = {
            ...original,
            id: newProductId,
            name: newProductName,
            slug: uniqueSlug,
            product_no: nextProductNo,
            sku: nextSku,
            stock: original.stock ?? 0,
            total_added: original.stock ?? 0,
            total_sold: 0,
            is_active: 0, // Safe draft mode so admin can inspect before publishing
            is_featured: 0,
            created_at: new Date(),
            updated_at: new Date()
        };

        const safeProductData = {};
        for (const key of Object.keys(rawProductData)) {
            if (validProductCols.has(key)) {
                let val = rawProductData[key];
                if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                    val = JSON.stringify(val);
                }
                safeProductData[key] = val;
            }
        }

        const productCols = Object.keys(safeProductData);
        const productPlaceholders = productCols.map(() => '?').join(', ');
        const productValues = productCols.map(k => safeProductData[k]);

        await pool.query(
            `INSERT INTO products (${productCols.map(c => `\`${c}\``).join(', ')}) VALUES (${productPlaceholders})`,
            productValues
        );

        // 6. Duplicate variants if applicable
        let clonedVariantsCount = 0;
        if (original.type === 'variant') {
            const [origVariants] = await pool.query(
                'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC',
                [original.id]
            );

            if (origVariants && origVariants.length > 0) {
                const [varColRows] = await pool.query('SHOW COLUMNS FROM product_variants');
                const validVarCols = new Set(varColRows.map(c => c.Field));
                const idCol = varColRows.find(c => c.Field === 'id');
                const isAutoIncrement = idCol?.Extra?.includes('auto_increment');

                for (let idx = 0; idx < origVariants.length; idx++) {
                    const v = origVariants[idx];
                    const vName = v.name || `Variant #${idx + 1}`;
                    const vSkuSuffix = vName.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase() || `VAR${idx + 1}`;
                    const vSku = `${nextSku}-${vSkuSuffix}`;

                    const rawVarData = {
                        ...v,
                        product_id: newProductId,
                        name: vName,
                        sku: vSku,
                        price: v.price ?? original.price,
                        compare_price: v.compare_price ?? original.compare_price ?? null,
                        original_price: v.original_price ?? original.original_price ?? null,
                        stock: v.stock ?? 0,
                        image_url: v.image_url || original.image_url || ''
                    };

                    if (!isAutoIncrement && validVarCols.has('id')) {
                        rawVarData.id = crypto.randomUUID();
                    } else if (isAutoIncrement) {
                        delete rawVarData.id;
                    }

                    const safeVarData = {};
                    for (const key of Object.keys(rawVarData)) {
                        if (validVarCols.has(key)) {
                            let val = rawVarData[key];
                            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                                val = JSON.stringify(val);
                            }
                            safeVarData[key] = val;
                        }
                    }

                    const varCols = Object.keys(safeVarData);
                    const varPlaceholders = varCols.map(() => '?').join(', ');
                    const varValues = varCols.map(k => safeVarData[k]);

                    await pool.query(
                        `INSERT INTO product_variants (${varCols.map(c => `\`${c}\``).join(', ')}) VALUES (${varPlaceholders})`,
                        varValues
                    );
                    clonedVariantsCount++;
                }
            }
        }

        // 7. Clone category mapping in category_products
        try {
            const [catRows] = await pool.query(
                'SELECT category_id FROM category_products WHERE product_id = ?',
                [original.id]
            );
            for (const cr of catRows) {
                await pool.query(
                    'INSERT IGNORE INTO category_products (category_id, product_id) VALUES (?, ?)',
                    [cr.category_id, newProductId]
                );
            }
        } catch (catErr) {
            console.warn('[DUPLICATE PRODUCT CATEGORY SYNC WARNING]:', catErr.message);
        }

        // 8. Record stock entry in product_history
        try {
            const [historyColRows] = await pool.query('SHOW COLUMNS FROM product_history');
            const historyCols = new Set(historyColRows.map(c => c.Field));
            if (historyCols.has('product_id')) {
                const stockQty = Number(safeProductData.stock) || 0;
                await pool.query(
                    `INSERT INTO product_history (product_id, change_type, quantity_change, new_stock, reason, created_at)
                     VALUES (?, 'ADD', ?, ?, ?, NOW())`,
                    [
                        newProductId,
                        stockQty,
                        stockQty,
                        `Duplicated from Product #${original.product_no || original.sku || original.id}`
                    ]
                );
            }
        } catch (histErr) {
            console.warn('[DUPLICATE PRODUCT HISTORY WARNING]:', histErr.message);
        }

        // 9. Fetch and return complete duplicated product
        const [clonedRows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [newProductId]);
        const duplicatedProduct = clonedRows?.[0] || {
            id: newProductId,
            product_no: nextProductNo,
            sku: nextSku,
            name: newProductName,
            slug: uniqueSlug,
            type: original.type,
            is_active: 0
        };

        return NextResponse.json({
            success: true,
            message: `Product duplicated successfully as #${nextProductNo}`,
            duplicatedProduct,
            clonedVariantsCount
        });
    } catch (err) {
        console.error('[ADMIN PRODUCT DUPLICATE ERROR]:', err);
        return NextResponse.json({
            error: err.message || 'Failed to duplicate product'
        }, { status: 500 });
    }
}
