import pool from '@/lib/mysql';

let tableInitialized = false;

/**
 * Ensure media_library table exists in MySQL database.
 */
export async function ensureMediaLibraryTable() {
    if (tableInitialized) return;
    try {
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
        await pool.query(createTableSql);
        tableInitialized = true;
    } catch (err) {
        console.error('[MEDIA-SERVICE] Error initializing media_library table:', err);
    }
}

/**
 * Insert or update a media record in media_library database table.
 */
export async function insertMediaRecord(mediaItem) {
    await ensureMediaLibraryTable();
    try {
        const id = mediaItem.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const name = mediaItem.name || mediaItem.filename || 'image.jpg';
        const filename = mediaItem.filename || name;
        const url = mediaItem.url;
        const folder = mediaItem.folder || 'uploads';
        const size = Number(mediaItem.size || 0);
        const mime_type = mediaItem.mime_type || 'image/jpeg';
        const has_watermark = mediaItem.has_watermark ? 1 : 0;
        const catalog_id = mediaItem.catalogId || mediaItem.catalog_id || null;
        const source = mediaItem.source || 'upload';
        const created_at = mediaItem.created_at ? new Date(mediaItem.created_at) : new Date();

        const sql = `
            INSERT INTO media_library 
            (id, name, filename, url, folder, size, mime_type, has_watermark, catalog_id, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            url = VALUES(url),
            folder = VALUES(folder),
            size = VALUES(size),
            has_watermark = VALUES(has_watermark),
            catalog_id = VALUES(catalog_id),
            updated_at = NOW()
        `;

        await pool.query(sql, [
            id, name, filename, url, folder, size, mime_type, has_watermark, catalog_id, source, created_at
        ]);

        return {
            id,
            name,
            filename,
            url,
            folder,
            size,
            mime_type,
            hasWatermark: Boolean(has_watermark),
            has_watermark: Boolean(has_watermark),
            catalogId: catalog_id,
            catalog_id,
            source,
            created_at: created_at.toISOString()
        };
    } catch (err) {
        console.error('[MEDIA-SERVICE] Error inserting media record:', err);
        return null;
    }
}

/**
 * Fetch all media items from media_library table.
 */
export async function fetchMediaRecords() {
    await ensureMediaLibraryTable();
    try {
        const [rows] = await pool.query(`SELECT * FROM media_library ORDER BY created_at DESC`);
        return (rows || []).map(r => ({
            id: r.id,
            name: r.name,
            filename: r.filename,
            url: r.url,
            folder: r.folder,
            size: Number(r.size || 0),
            mime_type: r.mime_type,
            hasWatermark: Boolean(r.has_watermark),
            has_watermark: Boolean(r.has_watermark),
            catalogId: r.catalog_id,
            catalog_id: r.catalog_id,
            source: r.source,
            created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        }));
    } catch (err) {
        console.error('[MEDIA-SERVICE] Error fetching media records:', err);
        return [];
    }
}

/**
 * Delete a media item from media_library table by filename or URL.
 */
export async function deleteMediaRecord(identifier) {
    await ensureMediaLibraryTable();
    try {
        if (!identifier) return false;
        const norm = String(identifier).trim();
        const sql = `DELETE FROM media_library WHERE id = ? OR filename = ? OR url = ? OR url LIKE ?`;
        const [result] = await pool.query(sql, [norm, norm, norm, `%${norm}`]);
        return result.affectedRows > 0;
    } catch (err) {
        console.error('[MEDIA-SERVICE] Error deleting media record:', err);
        return false;
    }
}
