import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { ensureCategoryTables } from '@/lib/dbInit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/categories - Public API for active categories for shop navigation & filters
export async function GET(request) {
    try {
        await ensureCategoryTables();

        // Query active categories
        const [categories] = await pool.query(`
            SELECT id, name, slug, status, created_at
            FROM categories
            WHERE status = 'active'
            ORDER BY name ASC
        `);

        // Query product counts per active category
        const activeCategories = await Promise.all(categories.map(async (cat) => {
            const [[{ total }]] = await pool.query(`
                SELECT COUNT(DISTINCT p.id) as total
                FROM products p
                LEFT JOIN category_products cp ON cp.product_id = p.id
                WHERE p.is_active = 1
                  AND (
                      cp.category_id = ?
                      OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
                      OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
                  )
            `, [cat.id, cat.name, cat.slug]);

            return {
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                status: cat.status,
                productCount: total || 0
            };
        }));

        return NextResponse.json({ success: true, categories: activeCategories });
    } catch (err) {
        console.error('[PUBLIC CATEGORIES GET ERROR]:', err);
        return NextResponse.json({ success: false, categories: [] }, { status: 500 });
    }
}
