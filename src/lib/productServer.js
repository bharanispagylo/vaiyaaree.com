import pool from '@/lib/mysql';
import { findProductBySlugOrId } from '@/lib/productUrl';

/**
 * Server-side helper to query product directly from MySQL pool
 */
export async function getProductServer(param) {
    if (!param) return null;
    try {
        const rawParam = decodeURIComponent(String(param)).trim().replace(/\/$/, '').toLowerCase();

        // 1. Direct Slug or ID query (active published products only)
        const [rows] = await pool.query(
            'SELECT * FROM `products` WHERE (`slug` = ? OR `id` = ? OR `product_no` = ? OR `sku` = ?) AND `is_active` = 1 LIMIT 1',
            [rawParam, rawParam, rawParam, rawParam]
        );
        if (rows && rows.length > 0) return rows[0];

        // 2. Fetch active products and match via findProductBySlugOrId
        const [allRows] = await pool.query('SELECT * FROM `products` WHERE `is_active` = 1');
        if (allRows && allRows.length > 0) {
            return findProductBySlugOrId(param, allRows);
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

