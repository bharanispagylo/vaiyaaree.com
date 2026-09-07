import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.svg']);
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/svg+xml',
    'application/octet-stream'
]);

const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/svg+xml': '.svg'
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for photos

async function ensureMediaTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`uploaded_media\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`filename\` VARCHAR(255) NOT NULL UNIQUE,
                \`url\` VARCHAR(500) NOT NULL,
                \`folder\` VARCHAR(100) DEFAULT 'refunds',
                \`mime_type\` VARCHAR(100) DEFAULT 'image/jpeg',
                \`size\` INT DEFAULT 0,
                \`data\` LONGBLOB NOT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_filename\` (\`filename\`),
                INDEX \`idx_url\` (\`url\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (e) {
        console.warn('[UPLOAD-IMAGE ensureMediaTable warning]:', e?.message);
    }
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate by extension. If no/unknown extension, fall back to MIME type (e.g. camera photos from mobile, screenshots)
        let ext = path.extname(file.name || '').toLowerCase();
        const mimeType = (file.type || '').toLowerCase();

        if (!ext || !ALLOWED_EXTS.has(ext)) {
            // Try to derive extension from MIME type
            if (ALLOWED_MIME_TYPES.has(mimeType) && MIME_TO_EXT[mimeType]) {
                ext = MIME_TO_EXT[mimeType];
            } else if (mimeType.startsWith('image/')) {
                ext = '.jpg';
            } else {
                return NextResponse.json({ error: 'Invalid file format. Only JPG, PNG, WEBP, and HEIC images are allowed.' }, { status: 400 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 10MB.' }, { status: 400 });
        }

        const timestamp = Date.now();
        const rawBase = file.name ? path.basename(file.name, path.extname(file.name)) : 'photo';
        const safeBase = rawBase.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'photo';
        const fileName = `damaged_${timestamp}_${safeBase}${ext}`;
        const relativeUrl = `/uploads/refunds/${fileName}`;
        const effectiveMime = mimeType || (
            ext === '.png' ? 'image/png' :
            ext === '.webp' ? 'image/webp' :
            ext === '.svg' ? 'image/svg+xml' :
            'image/jpeg'
        );

        let savedLocally = false;
        let savedToDb = false;

        // 1. Try local disk write (works on persistent servers / local dev, safely caught on serverless read-only filesystems)
        try {
            const targetDir = path.join(process.cwd(), 'public', 'uploads', 'refunds');
            await fs.mkdir(targetDir, { recursive: true });
            const filePath = path.join(targetDir, fileName);
            await fs.writeFile(filePath, buffer);
            savedLocally = true;
        } catch (diskErr) {
            console.warn('[REFUND-IMAGE Disk write skipped / read-only environment]:', diskErr?.message);
        }

        // 2. Persist in MySQL uploaded_media table (survives serverless & Vercel deployments and container restarts)
        try {
            await ensureMediaTable();
            await pool.query(
                `INSERT INTO \`uploaded_media\` (\`filename\`, \`url\`, \`folder\`, \`mime_type\`, \`size\`, \`data\`)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`), \`size\` = VALUES(\`size\`)`,
                [fileName, relativeUrl, 'refunds', effectiveMime, buffer.byteLength, buffer]
            );
            savedToDb = true;
        } catch (dbErr) {
            console.error('[REFUND-IMAGE DB uploaded_media Error]:', dbErr?.message);
        }

        if (!savedLocally && !savedToDb) {
            return NextResponse.json({
                error: 'Failed to save image to server storage or database. Please try again.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            url: relativeUrl,
            fileUrl: relativeUrl,
            message: 'Damaged product image uploaded successfully.'
        });
    } catch (err) {
        console.error('[REFUND-DAMAGED-IMAGE-UPLOAD-ERROR]', err);
        return NextResponse.json({ error: 'Upload failed: ' + (err.message || 'Unknown error') }, { status: 500 });
    }
}
