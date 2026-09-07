import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.heic', '.heif']);
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'image/heic',
    'image/heif',
    'application/octet-stream'
]);

const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'image/heic': '.heic',
    'image/heif': '.heif'
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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
        console.warn('[UPLOAD-RECEIPT ensureMediaTable warning]:', e?.message);
    }
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate by extension. Fall back to MIME type if no/unknown extension
        let ext = path.extname(file.name || '').toLowerCase();
        const mimeType = (file.type || '').toLowerCase();

        if (!ext || !ALLOWED_EXTS.has(ext)) {
            if (ALLOWED_MIME_TYPES.has(mimeType) && MIME_TO_EXT[mimeType]) {
                ext = MIME_TO_EXT[mimeType];
            } else if (mimeType.startsWith('image/')) {
                ext = '.jpg';
            } else if (mimeType === 'application/pdf') {
                ext = '.pdf';
            } else {
                return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, and PDF allowed.' }, { status: 400 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
        }

        // Generate safe file name
        const timestamp = Date.now();
        const rawBase = file.name ? path.basename(file.name, path.extname(file.name)) : 'receipt';
        const safeBase = rawBase.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'receipt';
        const fileName = `receipt_${timestamp}_${safeBase}${ext}`;
        const relativeUrl = `/uploads/refunds/${fileName}`;
        const effectiveMime = mimeType || (
            ext === '.pdf' ? 'application/pdf' :
            ext === '.png' ? 'image/png' :
            ext === '.webp' ? 'image/webp' :
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
            console.warn('[REFUND-RECEIPT Disk write skipped / read-only environment]:', diskErr?.message);
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
            console.error('[REFUND-RECEIPT DB uploaded_media Error]:', dbErr?.message);
        }

        if (!savedLocally && !savedToDb) {
            return NextResponse.json({
                error: 'Failed to save receipt to server storage or database. Please try again.'
            }, { status: 500 });
        }

        // Return both `url` and `fileUrl` for backward compatibility with different frontend consumers
        return NextResponse.json({
            success: true,
            url: relativeUrl,
            fileUrl: relativeUrl,
            message: 'Shipping receipt uploaded successfully.'
        });
    } catch (err) {
        console.error('[REFUND-RECEIPT-UPLOAD]', err);
        return NextResponse.json({ error: 'Upload failed: ' + (err.message || 'Unknown error') }, { status: 500 });
    }
}
