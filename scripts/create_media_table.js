import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function main() {
    console.log('Connecting to MySQL database:', process.env.DB_NAME || 'vaiyaaree_db');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db',
    });

    console.log('Connected to MySQL successfully!');

    // 1. Create media_library table
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS media_library (
            id VARCHAR(191) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            url VARCHAR(500) NOT NULL,
            folder VARCHAR(100) DEFAULT 'uploads',
            size BIGINT DEFAULT 0,
            mime_type VARCHAR(100) DEFAULT 'image/jpeg',
            has_watermark TINYINT(1) DEFAULT 0,
            catalog_id VARCHAR(100) DEFAULT NULL,
            source VARCHAR(100) DEFAULT 'media_library',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_url (url(255)),
            INDEX idx_has_watermark (has_watermark)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await connection.query(createTableSql);
    console.log('✓ Table `media_library` created or verified successfully in MySQL database!');

    // 2. Scan and populate images from disk and products
    const seenUrls = new Set();
    const mediaRows = [];

    // Helper to scan disk directories
    function scanDir(dirPath, urlPrefix, folderTag) {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                scanDir(fullPath, `${urlPrefix}/${entry.name}`, entry.name);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif'].includes(ext)) {
                    const url = `${urlPrefix}/${entry.name}`;
                    if (!seenUrls.has(url)) {
                        seenUrls.add(url);
                        const stats = fs.statSync(fullPath);
                        const hasWm = folderTag === 'with-watermark' || entry.name.includes('CAT-') ? 1 : 0;
                        let catId = null;
                        const match = entry.name.match(/(CAT-[A-Z0-9]+)/i);
                        if (match) catId = match[1];

                        mediaRows.push([
                            `file-${entry.name}-${stats.mtimeMs}`,
                            entry.name,
                            entry.name,
                            url,
                            folderTag || 'uploads',
                            stats.size,
                            `image/${ext.replace('.', '')}`,
                            hasWm,
                            catId,
                            'disk_scan',
                            new Date(stats.mtime)
                        ]);
                    }
                }
            }
        }
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    scanDir(uploadsDir, '/uploads', 'uploads');
    scanDir(imagesDir, '/images', 'images');

    // Also fetch product images from products table
    try {
        const [products] = await connection.query(`SELECT id, name, sku, image_url, gallery_image, product_no, product_catalog_image_id, created_at FROM products`);
        for (const prod of products) {
            if (prod.image_url) {
                const url = String(prod.image_url).trim();
                if (url && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    const fname = url.split('/').pop() || `${prod.sku || prod.id}.jpg`;
                    mediaRows.push([
                        `prod-${prod.id}`,
                        prod.name || fname,
                        fname,
                        url,
                        'products',
                        0,
                        'image/jpeg',
                        url.includes('with-watermark') ? 1 : 0,
                        prod.product_catalog_image_id || prod.sku || null,
                        'product_catalog',
                        prod.created_at ? new Date(prod.created_at) : new Date()
                    ]);
                }
            }
        }
    } catch (e) {
        console.log('Product images scan note:', e.message);
    }

    console.log(`Found ${mediaRows.length} images to populate into \`media_library\` table.`);

    // Insert media records into database table
    let insertedCount = 0;
    const insertSql = `
        INSERT INTO media_library 
        (id, name, filename, url, folder, size, mime_type, has_watermark, catalog_id, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        url = VALUES(url),
        folder = VALUES(folder),
        has_watermark = VALUES(has_watermark),
        catalog_id = VALUES(catalog_id)
    `;

    for (const row of mediaRows) {
        await connection.query(insertSql, row);
        insertedCount++;
    }

    console.log(`✓ Populated/synced ${insertedCount} rows into \`media_library\` database table!`);

    await connection.end();
    console.log('Done!');
}

main().catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});
