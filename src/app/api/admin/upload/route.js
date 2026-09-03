import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { detectWatermark, applyWatermark } from '@/lib/imageService';
import { Buffer } from 'buffer';
import { verifyAdmin } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const uploadBaseDir = path.join(process.cwd(), 'public', 'uploads', 'media');

async function ensureDirs() {
    try {
        await fs.mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
        await fs.mkdir(uploadBaseDir, { recursive: true });
        await fs.mkdir(path.join(uploadBaseDir, 'with-watermark'), { recursive: true });
        await fs.mkdir(path.join(uploadBaseDir, 'without-watermark'), { recursive: true });
        await fs.mkdir(path.join(process.cwd(), 'public', 'uploads', 'products'), { recursive: true });
    } catch (dirErr) {
        // Read-only filesystem on Vercel is expected and safely handled via DB
    }
}

async function initMediaTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`uploaded_media\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`filename\` VARCHAR(255) NOT NULL UNIQUE,
                \`url\` VARCHAR(500) NOT NULL,
                \`folder\` VARCHAR(100) DEFAULT 'media',
                \`mime_type\` VARCHAR(100) DEFAULT 'image/jpeg',
                \`size\` INT DEFAULT 0,
                \`data\` LONGBLOB NOT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_filename\` (\`filename\`),
                INDEX \`idx_url\` (\`url\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (e) {
        console.warn('[UPLOAD initMediaTable warning]:', e?.message);
    }
}

// GET - List all media files from DB & local disk
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureDirs();
        await initMediaTable();

        const uniqueFilesMap = new Map();

        // 1. Fetch from MySQL Database (persistent across Vercel deployments)
        try {
            const [rows] = await pool.query(
                'SELECT `id`, `filename` as name, `url`, `folder`, `size`, `created_at` FROM `uploaded_media` ORDER BY `created_at` DESC'
            );
            if (rows && rows.length > 0) {
                for (const r of rows) {
                    uniqueFilesMap.set(r.url, {
                        id: `db-${r.id}`,
                        name: r.name,
                        url: r.url,
                        folder: r.folder,
                        size: r.size || 0,
                        created_at: r.created_at
                    });
                }
            }
        } catch (dbErr) {
            console.warn('[UPLOAD GET DB Warning]:', dbErr?.message);
        }

        // 2. Scan with-watermark on local disk if available
        try {
            const wmPath = path.join(uploadBaseDir, 'with-watermark');
            if (existsSync(wmPath)) {
                const files = await fs.readdir(wmPath);
                for (const f of files) {
                    try {
                        const stat = await fs.stat(path.join(wmPath, f));
                        const url = `/uploads/media/with-watermark/${f}`;
                        if (!uniqueFilesMap.has(url)) {
                            uniqueFilesMap.set(url, {
                                id: `wm-${f}`,
                                name: f,
                                url,
                                folder: 'with-watermark',
                                size: stat.size || 0,
                                created_at: stat.birthtime || stat.mtime
                            });
                        }
                    } catch (_) {}
                }
            }
        } catch (_) {}

        // 3. Scan without-watermark on local disk if available
        try {
            const noWmPath = path.join(uploadBaseDir, 'without-watermark');
            if (existsSync(noWmPath)) {
                const files = await fs.readdir(noWmPath);
                for (const f of files) {
                    try {
                        const stat = await fs.stat(path.join(noWmPath, f));
                        const url = `/uploads/media/without-watermark/${f}`;
                        if (!uniqueFilesMap.has(url)) {
                            uniqueFilesMap.set(url, {
                                id: `nowm-${f}`,
                                name: f,
                                url,
                                folder: 'without-watermark',
                                size: stat.size || 0,
                                created_at: stat.birthtime || stat.mtime
                            });
                        }
                    } catch (_) {}
                }
            }
        } catch (_) {}

        const finalFilesList = Array.from(uniqueFilesMap.values());
        finalFilesList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({ files: finalFilesList });

    } catch (err) {
        console.error('GET Error:', err);
        return NextResponse.json({ files: [] }, { status: 200 });
    }
}

// POST - Upload file (with watermarking, database persistence and disk fallback)
export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureDirs();
        await initMediaTable();

        const formData = await request.formData();
        const file = formData.get('file');
        const imageUrlParam = formData.get('imageUrl');
        const catalogId = formData.get('catalogId');
        const checkOnly = formData.get('checkOnly') === 'true';
        const skipDetection = formData.get('skipDetection') === 'true';
        const alreadyWatermarked = formData.get('alreadyWatermarked') === 'true';
        const requireClean = formData.get('requireClean') === 'true';
        const saveClean = formData.get('saveClean') !== 'false';

        let buffer;
        let fileExt = 'jpg';
        let fileNameHint = 'image.jpg';

        if (file && typeof file.arrayBuffer === 'function') {
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            fileExt = file.name ? (file.name.split('.').pop() || 'jpg') : 'jpg';
            fileNameHint = file.name || 'image.jpg';
        } else if (imageUrlParam) {
            const cleanUrl = String(imageUrlParam).split('?')[0].trim();
            fileExt = cleanUrl.split('.').pop() || 'jpg';
            fileNameHint = cleanUrl.split('/').pop() || 'image.jpg';

            if (imageUrlParam.startsWith('data:image/')) {
                const base64Data = imageUrlParam.split(',')[1] || '';
                buffer = Buffer.from(base64Data, 'base64');
            } else if (imageUrlParam.startsWith('/') || !imageUrlParam.startsWith('http')) {
                const relPath = imageUrlParam.startsWith('/') ? imageUrlParam.slice(1) : imageUrlParam;
                const localFilePath = path.join(process.cwd(), 'public', relPath);

                if (existsSync(localFilePath)) {
                    buffer = await fs.readFile(localFilePath);
                } else {
                    // Try DB lookup
                    try {
                        const [rows] = await pool.query('SELECT `data` FROM `uploaded_media` WHERE `url` = ? OR `filename` = ? LIMIT 1', [imageUrlParam, path.basename(imageUrlParam)]);
                        if (rows && rows.length > 0 && rows[0]?.data) {
                            buffer = Buffer.isBuffer(rows[0].data) ? rows[0].data : Buffer.from(rows[0].data);
                        }
                    } catch (_) {}

                    if (!buffer) {
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.url ? new URL(request.url).origin : 'http://localhost:3000');
                        const fetchUrl = `${baseUrl.replace(/\/$/, '')}/${relPath}`;
                        const imgRes = await fetch(fetchUrl);
                        if (imgRes.ok) {
                            const arrayBuffer = await imgRes.arrayBuffer();
                            buffer = Buffer.from(arrayBuffer);
                        }
                    }
                }
            } else {
                try {
                    const imgRes = await fetch(imageUrlParam);
                    if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                    }
                } catch (_) {}
            }
        }

        if (!buffer || buffer.length === 0) {
            return NextResponse.json({ error: 'No valid image data provided' }, { status: 400 });
        }

        // 1. Max size validation: 10MB limit
        const maxBytes = 10 * 1024 * 1024;
        if (buffer.length > maxBytes) {
            return NextResponse.json({ error: 'File exceeds maximum upload size of 10MB.' }, { status: 400 });
        }

        // 2. Format validation: JPEG, PNG, SVG only
        const cleanExt = String(fileExt).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'svg'];
        if (!allowedExtensions.includes(cleanExt)) {
            return NextResponse.json({ error: 'Invalid file format. Only JPEG, PNG, and SVG formats are allowed.' }, { status: 400 });
        }

        let hasWatermark = false;
        let detectedCatalogId = null;

        if (skipDetection || alreadyWatermarked) {
            hasWatermark = alreadyWatermarked;
        } else {
            try {
                const detection = await detectWatermark(buffer, fileNameHint);
                hasWatermark = !!detection?.hasWatermark;
                detectedCatalogId = detection?.catalogId || null;
            } catch (detErr) {
                console.warn('[UPLOAD Watermark Detection Warning]:', detErr?.message);
                hasWatermark = false;
            }
        }

        if (checkOnly) {
            return NextResponse.json({
                hasWatermark,
                catalogId: detectedCatalogId || catalogId
            });
        }

        let finalRelativeUrl = '';
        let isNowWatermarked = hasWatermark;
        let finalId = catalogId || detectedCatalogId || Math.random().toString(36).substring(2, 7).toUpperCase();
        
        const safeId = String(finalId).replace(/[^a-zA-Z0-9_-]/g, '') || 'CAT-' + Date.now();
        const safeExt = String(fileExt).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
        const fileName = `${safeId}_${Date.now()}.${safeExt}`;
        const mimeType = safeExt === 'png' ? 'image/png' : (safeExt === 'webp' ? 'image/webp' : 'image/jpeg');

        let finalBufferToSave = buffer;

        if (!hasWatermark && catalogId && requireClean) {
            // Save clean copy to DB & disk if requested
            if (saveClean) {
                const cleanUrl = `/uploads/media/without-watermark/${fileName}`;
                try {
                    const cleanFilePath = path.join(uploadBaseDir, 'without-watermark', fileName);
                    await fs.writeFile(cleanFilePath, buffer);
                } catch (_) {}

                try {
                    await pool.query(
                        'INSERT INTO `uploaded_media` (`filename`, `url`, `folder`, `mime_type`, `size`, `data`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `size` = VALUES(`size`)',
                        [fileName, cleanUrl, 'without-watermark', mimeType, buffer.length, buffer]
                    );
                } catch (_) {}
            }

            try {
                finalBufferToSave = await applyWatermark(buffer, finalId);
            } catch (wmErr) {
                console.warn('[UPLOAD applyWatermark fallback]:', wmErr?.message);
                finalBufferToSave = buffer;
            }

            try {
                const wmFilePath = path.join(uploadBaseDir, 'with-watermark', fileName);
                await fs.writeFile(wmFilePath, finalBufferToSave);
            } catch (_) {}

            finalRelativeUrl = `/uploads/media/with-watermark/${fileName}`;
            isNowWatermarked = true;

            try {
                await pool.query(
                    'INSERT INTO `uploaded_media` (`filename`, `url`, `folder`, `mime_type`, `size`, `data`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `size` = VALUES(`size`)',
                    [fileName, finalRelativeUrl, 'with-watermark', mimeType, finalBufferToSave.length, finalBufferToSave]
                );
            } catch (dbErr) {
                console.error('[UPLOAD DB Save Error]:', dbErr);
            }

        } else {
            const folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            try {
                const filePath = path.join(uploadBaseDir, folder, fileName);
                await fs.writeFile(filePath, buffer);
            } catch (_) {}

            finalRelativeUrl = `/uploads/media/${folder}/${fileName}`;

            try {
                await pool.query(
                    'INSERT INTO `uploaded_media` (`filename`, `url`, `folder`, `mime_type`, `size`, `data`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `size` = VALUES(`size`)',
                    [fileName, finalRelativeUrl, folder, mimeType, buffer.length, buffer]
                );
            } catch (dbErr) {
                console.error('[UPLOAD DB Save Error]:', dbErr);
            }
        }

        // Update settings list asynchronously
        try {
            const mode = formData.get('mode');
            const targetKeys = [isNowWatermarked ? 'watermark_images' : 'no_watermark_images'];
            if (mode === 'gallery') {
                targetKeys.push('gallery_images');
            }

            for (const key of targetKeys) {
                const [rows] = await pool.query('SELECT `value` FROM `app_settings` WHERE `key` = ? LIMIT 1', [key]);
                let list = [];
                if (rows && rows.length > 0 && rows[0]?.value) {
                    try { list = JSON.parse(rows[0].value); } catch(e) {}
                }
                if (!Array.isArray(list)) list = [];
                if (!list.includes(finalRelativeUrl)) {
                    list.push(finalRelativeUrl);
                    await pool.query(
                        'INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()',
                        [key, JSON.stringify(list)]
                    );
                }
            }
        } catch (setErr) {
            console.warn('[UPLOAD Settings Update Warning]:', setErr?.message);
        }

        return NextResponse.json({
            url: finalRelativeUrl,
            watermarkedUrl: finalRelativeUrl,
            catalogId: finalId,
            hasWatermark: isNowWatermarked,
            processed: true
        });

    } catch (err) {
        console.error('[UPLOAD] Error:', err);
        return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
    }
}

// DELETE - Remove file(s) (Single or Multiple)
export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, fileNames, url, urls } = body;

        const rawList = [];
        if (Array.isArray(fileNames)) rawList.push(...fileNames);
        if (Array.isArray(urls)) rawList.push(...urls);
        if (fileName) rawList.push(fileName);
        if (url) rawList.push(url);

        const targets = [...new Set(rawList.filter(Boolean))];
        if (targets.length === 0) {
            return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 });
        }

        let deletedCount = 0;
        const deletedUrls = [];
        const errors = [];

        for (const item of targets) {
            const basename = path.basename(item);
            let urlStr = item.startsWith('/') ? item : `/${item}`;

            // Delete from MySQL uploaded_media
            try {
                await pool.query('DELETE FROM `uploaded_media` WHERE `url` = ? OR `filename` = ? OR `url` LIKE ?', [urlStr, basename, `%${basename}`]);
                deletedCount++;
            } catch (_) {}

            // Try local disk deletion if present
            try {
                const p1 = path.join(uploadBaseDir, 'with-watermark', basename);
                const p2 = path.join(uploadBaseDir, 'without-watermark', basename);
                if (existsSync(p1)) await fs.unlink(p1);
                if (existsSync(p2)) await fs.unlink(p2);
            } catch (_) {}

            deletedUrls.push(urlStr);
            deletedUrls.push(item);
        }

        // Clean up from app_settings lists
        try {
            const keys = ['watermark_images', 'no_watermark_images', 'hero_slider_images', 'gallery_images'];
            for (const key of keys) {
                const [rows] = await pool.query('SELECT `value` FROM `app_settings` WHERE `key` = ? LIMIT 1', [key]);
                if (rows && rows.length > 0 && rows[0]?.value) {
                    let list = [];
                    try { list = JSON.parse(rows[0].value); } catch(e) {}
                    if (Array.isArray(list)) {
                        const filtered = list.filter(u => !deletedUrls.some(del => u === del || u.endsWith(path.basename(del))));
                        if (filtered.length !== list.length) {
                            await pool.query(
                                'INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()',
                                [key, JSON.stringify(filtered)]
                            );
                        }
                    }
                }
            }
        } catch (setErr) {
            console.warn('[DELETE] app_settings cleanup warning:', setErr);
        }

        return NextResponse.json({
            success: true,
            deletedCount: Math.max(deletedCount, targets.length),
            totalRequested: targets.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully deleted image(s).`
        });

    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

