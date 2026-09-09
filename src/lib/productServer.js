import pool from '@/lib/mysql';
import { findProductBySlugOrId } from '@/lib/productUrl';

/**
 * Server-side helper to query product directly from MySQL pool
 */
export async function getProductServer(param) {
    if (!param) return null;
    try {
        const rawParam = decodeURIComponent(String(param)).trim().replace(/\/$/, '').toLowerCase();

        // 1. Direct Slug, ID, product_no, or SKU query
        const [rows] = await pool.query(
            'SELECT * FROM `products` WHERE (`slug` = ? OR `id` = ? OR `product_no` = ? OR `sku` = ?) LIMIT 1',
            [rawParam, rawParam, rawParam, rawParam]
        );
        if (rows && rows.length > 0) {
            const product = rows[0];
            // If product exists but is disabled or draft, strictly return null
            if (product.is_active === 0 || product.is_active === false || String(product.is_active) === '0' || !product.is_active) {
                return null;
            }
            return product;
        }

        // 2. Fetch all products to match via findProductBySlugOrId
        const [allRows] = await pool.query('SELECT * FROM `products`');
        if (allRows && allRows.length > 0) {
            const matched = findProductBySlugOrId(param, allRows);
            if (matched) {
                // If matched product is disabled or draft, strictly return null
                if (matched.is_active === 0 || matched.is_active === false || String(matched.is_active) === '0' || !matched.is_active) {
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

