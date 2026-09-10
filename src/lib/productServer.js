import pool from '@/lib/mysql';
import { findProductBySlugOrId } from '@/lib/productUrl';

/**
 * Server-side helper to query product directly from MySQL pool
 */
export async function getProductServer(param) {
    if (!param) return null;
    try {
        const rawParam = decodeURIComponent(String(param)).trim().replace(/\/$/, '').toLowerCase();

        const isExplicitlyInactive = p => p && (p.is_active === 0 || p.is_active === false || String(p.is_active) === '0');

        // 1. Direct Slug, ID, product_no, or SKU query
        const [rows] = await pool.query(
            'SELECT * FROM `products` WHERE (`slug` = ? OR `id` = ? OR `product_no` = ? OR `sku` = ?) LIMIT 1',
            [rawParam, rawParam, rawParam, rawParam]
        );
        if (rows && rows.length > 0) {
            const product = rows[0];
            if (isExplicitlyInactive(product)) {
                return null;
            }
            return product;
        }

        // 2. Direct trailing identifier query (Product No / SKU / ID extracted after last hyphen)
        const lastHyphen = rawParam.lastIndexOf('-');
        if (lastHyphen !== -1) {
            const identifier = rawParam.substring(lastHyphen + 1);
            if (identifier) {
                const [idRows] = await pool.query(
                    'SELECT * FROM `products` WHERE (`product_no` = ? OR `sku` = ? OR `id` = ?) LIMIT 1',
                    [identifier, identifier, identifier]
                );
                if (idRows && idRows.length > 0) {
                    const product = idRows[0];
                    if (!isExplicitlyInactive(product)) {
                        return product;
                    }
                }
            }
        }

        // 3. Fetch active products to match via findProductBySlugOrId fallback
        const [allRows] = await pool.query('SELECT * FROM `products` WHERE `is_active` != 0 AND `is_active` IS NOT FALSE');
        if (allRows && allRows.length > 0) {
            const matched = findProductBySlugOrId(param, allRows);
            if (matched) {
                if (isExplicitlyInactive(matched)) {
                    return null;
                }
                return matched;
            }
        }
    } catch (e) {
        console.error('[GET-PRODUCT-SERVER-ERROR]:', e);
    }
    return null;
}

/**
 * Server-side helper to query product variants from MySQL pool
 */
export async function getProductVariantsServer(productId) {
    if (!productId) return [];
    try {
        const [rows] = await pool.query(
            'SELECT * FROM `product_variants` WHERE `product_id` = ? ORDER BY `created_at` ASC',
            [productId]
        );
        return rows || [];
    } catch (e) {
        console.error('[GET-PRODUCT-VARIANTS-SERVER-ERROR]:', e);
        return [];
    }
}

