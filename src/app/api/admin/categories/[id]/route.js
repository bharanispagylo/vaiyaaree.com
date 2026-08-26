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
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// GET /api/admin/categories/[id] - Fetch single category
export async function GET(request, { params }) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureCategoryTables();

        const { id } = await params;
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId) || categoryId <= 0) {
            return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
        }

        // Fetch category
        const [rows] = await pool.query(
            'SELECT id, name, slug, status, created_at, updated_at FROM categories WHERE id = ? LIMIT 1',
            [categoryId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const category = rows[0];

        // Fetch assigned product details by matching BOTH category_products and products.category
        const [assignedProducts] = await pool.query(
            `SELECT DISTINCT p.id, p.name, p.sku, p.price, p.image_url, p.is_active
             FROM products p
             LEFT JOIN category_products cp ON cp.product_id = p.id
             WHERE cp.category_id = ?
                OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
                OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
             ORDER BY p.name ASC`,
            [categoryId, category.name, category.slug]
        );

        const productIds = assignedProducts.map(p => p.id);

        return NextResponse.json({
            id: category.id,
            name: category.name,
            slug: category.slug,
            status: category.status,
            created_at: category.created_at,
            updated_at: category.updated_at,
            productIds,
            assignedProducts
        });
    } catch (err) {
        console.error('[ADMIN CATEGORY GET ID ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch category' }, { status: 500 });
    }
}

// PATCH /api/admin/categories/[id] - Update category & synchronize product assignments in transaction
export async function PATCH(request, { params }) {
    let connection;
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureCategoryTables();

        const { id } = await params;
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId) || categoryId <= 0) {
            return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
        }

        const body = await request.json();
        let { name, slug, status, productIds } = body;

        // Verify existing category
        const [existingCat] = await pool.query(
            'SELECT id, name, slug, status FROM categories WHERE id = ? LIMIT 1',
            [categoryId]
        );
        if (existingCat.length === 0) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Validate name if provided
        name = (name !== undefined && name !== null) ? name.trim() : existingCat[0].name;
        if (!name) {
            return NextResponse.json({ error: 'Category Name cannot be empty' }, { status: 400 });
        }

        // Validate slug if provided
        if (slug !== undefined && slug !== null && slug.trim()) {
            slug = slugify(slug);
        } else {
            slug = slugify(name);
        }

        status = (status === 'inactive') ? 'inactive' : (status === 'active' ? 'active' : existingCat[0].status);

        const validProductIds = Array.isArray(productIds)
            ? Array.from(new Set(productIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id))))
            : [];

        // Check duplicate name on other categories
        const [dupName] = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
            [name, categoryId]
        );
        if (dupName.length > 0) {
            return NextResponse.json({ error: 'Another category with this name already exists' }, { status: 400 });
        }

        // Check duplicate slug on other categories
        const [dupSlug] = await pool.query(
            'SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1',
            [slug, categoryId]
        );
        if (dupSlug.length > 0) {
            return NextResponse.json({ error: 'Another category with this slug already exists' }, { status: 400 });
        }

        // Prevent setting status to 'inactive' if category has assigned products
        if (status === 'inactive') {
            const [[{ assignedCount }]] = await pool.query(`
                SELECT COUNT(DISTINCT p.id) as assignedCount
                FROM products p
                LEFT JOIN category_products cp ON cp.product_id = p.id
                WHERE cp.category_id = ?
                   OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
                   OR LOWER(TRIM(p.category)) = LOWER(TRIM(?))
            `, [categoryId, existingCat[0].name, existingCat[0].slug]);

            if (assignedCount > 0) {
                return NextResponse.json({
                    error: `Cannot set category "${existingCat[0].name}" to Inactive. It has ${assignedCount} assigned ${assignedCount === 1 ? 'product' : 'products'}. Please reassign these products on the Product Add/Edit page first.`
                }, { status: 400 });
            }
        }

        // Transaction Execution
        connection = await getConnection();
        await connection.beginTransaction();

        // 1. Update categories table
        await connection.query(
            'UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [name, slug, status, categoryId]
        );

        // 2. Synchronize category_products ONLY if productIds is explicitly provided in request body
        if (Array.isArray(productIds)) {
            await connection.query(
                'DELETE FROM category_products WHERE category_id = ?',
                [categoryId]
            );

            const validProductIds = productIds.map(prodId => String(prodId).trim()).filter(Boolean);
            if (validProductIds.length > 0) {
                const values = validProductIds.map(prodId => [categoryId, prodId]);
                await connection.query(
                    'INSERT IGNORE INTO category_products (category_id, product_id) VALUES ?',
                    [values]
                );
            }
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
        console.error('[ADMIN CATEGORY PATCH ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to update category' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// DELETE /api/admin/categories/[id] - Delete category & clean relationships
export async function DELETE(request, { params }) {
    let connection;
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureCategoryTables();

        const { id } = await params;
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId) || categoryId <= 0) {
            return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        // Delete relationships & category (Foreign Key ON DELETE CASCADE handles category_products automatically, but explicit delete is safe)
        await connection.query('DELETE FROM category_products WHERE category_id = ?', [categoryId]);
        const [delResult] = await connection.query('DELETE FROM categories WHERE id = ?', [categoryId]);

        if (delResult.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        await connection.commit();

        return NextResponse.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        if (connection) {
            try { await connection.rollback(); } catch (rbErr) {}
        }
        console.error('[ADMIN CATEGORY DELETE ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
