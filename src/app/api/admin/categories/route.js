import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import pool, { getConnection } from '@/lib/mysql';
import { ensureCategoryTables } from '@/lib/dbInit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// GET - List all categories with product counts and product IDs
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureCategoryTables();

        // 1. Fetch categories
        const [categories] = await pool.query(`
            SELECT id, name, slug, status, created_at, updated_at
            FROM categories
            ORDER BY created_at DESC
        `);

        // 2. Fetch product counts and product IDs per category by matching BOTH category_products and products.category
        const formattedCategories = await Promise.all(categories.map(async (cat) => {
            const [rows] = await pool.query(`
                SELECT DISTINCT p.id
                FROM products p
                LEFT JOIN category_products cp ON cp.product_id = p.id
                WHERE cp.category_id = ?
                   OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
                   OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
            `, [cat.id, cat.name, cat.slug]);

            const productIds = rows.map(r => r.id);
            return {
                ...cat,
                productCount: productIds.length,
                productIds
            };
        }));

        return NextResponse.json({ success: true, categories: formattedCategories });
    } catch (err) {
        console.error('[ADMIN CATEGORIES GET ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
    }
}

// POST - Create a new category with product assignments inside a transaction
export async function POST(request) {
    let connection;
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureCategoryTables();

        const body = await request.json();
        let { name, slug, status, productIds } = body;

        // 1. Validate Category Name
        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Category Name is required' }, { status: 400 });
        }
        name = name.trim();

        // 2. Auto-generate or validate Slug
        if (!slug || typeof slug !== 'string' || !slug.trim()) {
            slug = slugify(name);
        } else {
            slug = slugify(slug);
        }

        if (!slug) {
            return NextResponse.json({ error: 'Valid Category Slug is required' }, { status: 400 });
        }

        // 3. Normalize Status
        status = (status === 'inactive') ? 'inactive' : 'active';

        // 4. Validate Product IDs array
        const validProductIds = Array.isArray(productIds)
            ? Array.from(new Set(productIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id))))
            : [];

        // 5. Check duplicate name
        const [existingName] = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
            [name]
        );
        if (existingName.length > 0) {
            return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
        }

        // 6. Check duplicate slug
        const [existingSlug] = await pool.query(
            'SELECT id FROM categories WHERE slug = ? LIMIT 1',
            [slug]
        );
        if (existingSlug.length > 0) {
            return NextResponse.json({ error: 'Category slug already exists' }, { status: 400 });
        }

        // 7. Transaction Execution
        connection = await getConnection();
        await connection.beginTransaction();

        // A. Insert into categories table
        const [insertResult] = await connection.query(
            'INSERT INTO categories (name, slug, status) VALUES (?, ?, ?)',
            [name, slug, status]
        );
        const categoryId = insertResult.insertId;

        // B. Insert product relationships if selected
        if (validProductIds.length > 0) {
            const values = validProductIds.map(prodId => [categoryId, prodId]);
            await connection.query(
                'INSERT IGNORE INTO category_products (category_id, product_id) VALUES ?',
                [values]
            );
        }

        await connection.commit();

        return NextResponse.json({
            success: true,
            category: {
                id: categoryId,
                name,
                slug,
                status,
                productIds: validProductIds,
                productCount: validProductIds.length
            }
        });

    } catch (err) {
        if (connection) {
            try { await connection.rollback(); } catch (rbErr) {}
        }
        console.error('[ADMIN CATEGORIES POST ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to create category' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
