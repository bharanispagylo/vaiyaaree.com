import pool from '@/lib/mysql';
import { findProductBySlugOrId, slugify } from '@/lib/productUrl';

const isExplicitlyInactive = p => !p || p.is_active === 0 || p.is_active === false || String(p.is_active) === '0';

async function executeQueryWithRetry(sql, params = []) {
    try {
        return await pool.query(sql, params);
    } catch (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            console.warn('[getProductServer] Retrying query after connection reset:', err.code);
            return await pool.query(sql, params);
        }
        throw err;
    }
}

/**
 * Server-side helper to query product directly from MySQL pool
 */
export async function getProductServer(param) {
    if (!param) return null;
    try {
        const rawParam = decodeURIComponent(String(param)).trim().replace(/\/$/, '');
        const rawLower = rawParam.toLowerCase();
        const slugParam = slugify(rawParam);

        // 1. Direct ID, product_no, SKU, or custom slug match in SQL
        const [directRows] = await executeQueryWithRetry(
            'SELECT * FROM `products` WHERE (`id` = ? OR `id` = ? OR `product_no` = ? OR `product_no` = ? OR `sku` = ? OR `sku` = ? OR `slug` = ? OR `slug` = ?) LIMIT 1',
            [rawParam, rawLower, rawParam, rawLower, rawParam, rawLower, rawParam, slugParam]
        );
        if (directRows && directRows.length > 0) {
            const product = directRows[0];
            if (isExplicitlyInactive(product)) {
                return null;
            }
            return product;
        }

        // 2. Extract trailing identifiers (e.g. from "saree-name-1015" or "saree-name-vs-1015")
        const hyphenParts = slugParam.split('-').filter(Boolean);
        if (hyphenParts.length > 1) {
            const lastPart = hyphenParts[hyphenParts.length - 1];
            const lastTwoParts = hyphenParts.length >= 2 ? `${hyphenParts[hyphenParts.length - 2]}-${lastPart}` : '';

            const candidates = [lastPart, lastTwoParts].filter(Boolean);
            for (const cand of candidates) {
                const [candRows] = await executeQueryWithRetry(
                    'SELECT * FROM `products` WHERE (`product_no` = ? OR `sku` = ? OR `id` = ? OR `slug` = ?) LIMIT 1',
                    [cand, cand, cand, cand]
                );
                if (candRows && candRows.length > 0) {
                    const product = candRows[0];
                    if (!isExplicitlyInactive(product)) {
                        return product;
                    }
                }
            }
        }

        // 3. Direct match on slugified name or slug in DB
        const [slugRows] = await executeQueryWithRetry(
            'SELECT * FROM `products` WHERE (`slug` = ? OR REPLACE(LOWER(`name`), " ", "-") = ?) AND (`is_active` = 1 OR `is_active` IS NULL OR `is_active` != 0) LIMIT 1',
            [slugParam, slugParam]
        );
        if (slugRows && slugRows.length > 0) {
            const product = slugRows[0];
            if (!isExplicitlyInactive(product)) {
                return product;
            }
        }

        // 4. Fetch active products to match via comprehensive findProductBySlugOrId fallback
        const [allRows] = await executeQueryWithRetry(
            'SELECT * FROM `products` WHERE (`is_active` = 1 OR `is_active` IS NULL OR `is_active` != 0)'
        );
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
        const [rows] = await executeQueryWithRetry(
            'SELECT * FROM `product_variants` WHERE `product_id` = ? ORDER BY `created_at` ASC',
            [productId]
        );
        return rows || [];
    } catch (e) {
        console.error('[GET-PRODUCT-VARIANTS-SERVER-ERROR]:', e);
        return [];
    }
}

