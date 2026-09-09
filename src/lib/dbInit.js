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

let shippingInitialized = false;

/**
 * Ensures required database tables for Shipping exist in MySQL and guarantees that both
 * a default Domestic Group and International Standard zone exist with valid rates.
 */
export async function ensureShippingTablesAndZones(poolInstance = pool) {
    if (shippingInitialized) return;

    try {
        await poolInstance.query(`
            CREATE TABLE IF NOT EXISTS shipping_zones (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NULL,
                rate BIGINT(20) DEFAULT 0,
                free_threshold BIGINT(20) DEFAULT 0,
                is_international TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                cod_charge BIGINT(20) DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await poolInstance.query(`
            CREATE TABLE IF NOT EXISTS shipping_zone_states (
                id VARCHAR(100) PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                zone_id VARCHAR(100) NULL,
                state_name VARCHAR(255) NULL,
                district_name VARCHAR(255) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Check if an international zone exists
        const [intlRows] = await poolInstance.query(
            "SELECT id, rate FROM shipping_zones WHERE is_international = 1 OR is_international = '1' LIMIT 1"
        );

        if (!intlRows || intlRows.length === 0) {
            const { randomUUID } = await import('crypto');
            await poolInstance.query(
                "INSERT INTO shipping_zones (id, name, rate, free_threshold, is_international, cod_charge) VALUES (?, ?, ?, ?, 1, 0)",
                [randomUUID(), 'International Standard', 100, 10000]
            );
        }

        // Check if a domestic zone exists
        const [domRows] = await poolInstance.query(
            "SELECT id, rate FROM shipping_zones WHERE is_international = 0 OR is_international = '0' OR is_international IS NULL LIMIT 1"
        );

        if (!domRows || domRows.length === 0) {
            const { randomUUID } = await import('crypto');
            await poolInstance.query(
                "INSERT INTO shipping_zones (id, name, rate, free_threshold, is_international, cod_charge) VALUES (?, ?, ?, ?, 0, 0)",
                [randomUUID(), 'Domestic Group', 50, 2005]
            );
        }

        shippingInitialized = true;
    } catch (err) {
        console.error('[DB INIT] Error ensuring shipping tables and zones:', err);
    }
}

let productPriceDecimalEnsured = false;

/**
 * Ensures products and product_variants price columns in MySQL are DECIMAL(12,2)
 * so that decimal prices like 99.99 are accurately stored without integer truncation.
 */
export async function ensureProductPriceDecimal(poolInstance = pool) {
    if (productPriceDecimalEnsured) return;

    try {
        await poolInstance.query(`ALTER TABLE products MODIFY COLUMN price DECIMAL(12,2) DEFAULT 0.00`);
        await poolInstance.query(`ALTER TABLE product_variants MODIFY COLUMN price DECIMAL(12,2) DEFAULT 0.00`);
        productPriceDecimalEnsured = true;
    } catch (err) {
        // Suppress if columns already updated or tables not present yet
        productPriceDecimalEnsured = true;
    }
}


