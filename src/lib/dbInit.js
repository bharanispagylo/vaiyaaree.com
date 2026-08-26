import pool from './mysql.js';

let initialized = false;

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

/**
 * Ensures required database tables for Categories exist in MySQL and auto-syncs existing categories.
 */
export async function ensureCategoryTables() {
    if (initialized) return;

    try {
        // 1. categories table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                slug VARCHAR(180) NOT NULL UNIQUE,
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. category_products table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS category_products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                product_id VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_category_product (category_id, product_id),
                CONSTRAINT fk_category_products_category
                    FOREIGN KEY (category_id)
                    REFERENCES categories(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Auto-sync distinct categories from products table into categories table
        const [distinctProdCats] = await pool.query(`
            SELECT DISTINCT category
            FROM products
            WHERE category IS NOT NULL AND TRIM(category) != ''
        `);

        for (const row of distinctProdCats) {
            const catName = row.category.trim();
            if (!catName) continue;
            const catSlug = slugify(catName);

            // Check if exists
            const [existing] = await pool.query(
                `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) OR slug = ? LIMIT 1`,
                [catName, catSlug]
            );

            if (existing.length === 0) {
                try {
                    await pool.query(
                        `INSERT INTO categories (name, slug, status) VALUES (?, ?, 'active')`,
                        [catName, catSlug]
                    );
                } catch (e) {
                    // Ignore duplicate key race conditions
                }
            }
        }

        // 4. Auto-populate category_products relationship table for existing products
        await pool.query(`
            INSERT IGNORE INTO category_products (category_id, product_id)
            SELECT c.id, p.id
            FROM products p
            JOIN categories c ON (
                LOWER(TRIM(p.category)) = LOWER(TRIM(c.name))
                OR LOWER(TRIM(p.category)) = LOWER(TRIM(c.slug))
            )
            WHERE p.category IS NOT NULL AND TRIM(p.category) != '';
        `);

        initialized = true;
    } catch (err) {
        console.error('[DB INIT] Error creating and syncing category tables:', err);
    }
}
