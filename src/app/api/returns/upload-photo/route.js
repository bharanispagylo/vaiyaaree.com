import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { mysqlAdmin } from '@/lib/mysqlClient';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.svg', '.heic', '.heif']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

async function ensureTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`uploaded_media\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`filename\` VARCHAR(255) NOT NULL UNIQUE,
                \`url\` VARCHAR(500) NOT NULL,
                \`folder\` VARCHAR(100) DEFAULT 'returns',
                \`mime_type\` VARCHAR(100) DEFAULT 'image/jpeg',
                \`size\` INT DEFAULT 0,
                \`data\` LONGBLOB NOT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_filename\` (\`filename\`),
                INDEX \`idx_url\` (\`url\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (e) {
        console.warn('[UPLOAD-PHOTO ensureTable warning]:', e?.message);
    }
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const returnRequestId = formData.get('return_request_id') || null;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const rawExt = path.extname(file.name || '').toLowerCase();
        const ext = rawExt || (file.type?.includes('png') ? '.png' : file.type?.includes('webp') ? '.webp' : '.jpg');
        const mime = (file.type || '').toLowerCase();

        const isImageOrPdf = 
            ALLOWED_EXTS.has(ext) || 
            mime.startsWith('image/') || 
            mime === 'application/pdf' || 
            mime === 'application/octet-stream';

        if (!isImageOrPdf) {
            return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, SVG, HEIC and PDF are allowed.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
        }

        const timestamp = Date.now();
        const safeBase = path.basename(file.name || 'return_photo', rawExt)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 30);
        const fileName = `ret_${timestamp}_${safeBase}${ext}`;
        const relativeUrl = `/uploads/returns/${fileName}`;
        const effectiveMime = mime || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg');

        // 1. Try writing to local disk (public/uploads/returns/)
        try {
            const targetDir = path.join(process.cwd(), 'public', 'uploads', 'returns');
            await fs.mkdir(targetDir, { recursive: true });
            const filePath = path.join(targetDir, fileName);
            await fs.writeFile(filePath, buffer);
        } catch (diskErr) {
            console.warn('[RETURN-UPLOAD Disk write skipped / read-only environment]:', diskErr?.message);
        }

        // 2. Persist in MySQL uploaded_media table (survives serverless & Vercel)
        try {
            await ensureTable();
            await pool.query(
                `INSERT INTO \`uploaded_media\` (\`filename\`, \`url\`, \`folder\`, \`mime_type\`, \`size\`, \`data\`)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`), \`size\` = VALUES(\`size\`)`,
                [fileName, relativeUrl, 'returns', effectiveMime, buffer.byteLength, buffer]
            );
        } catch (dbErr) {
            console.warn('[RETURN-UPLOAD DB uploaded_media Warning]:', dbErr?.message);
        }

        // 3. Record in return_images if return_request_id provided
        if (returnRequestId) {
            try {
                await mysqlAdmin.from('return_images').insert({
                    return_request_id: returnRequestId,
                    image_url: relativeUrl,
                    image_type: 'customer_photo',
                });
            } catch (rImgErr) {
                console.warn('[RETURN-UPLOAD return_images Warning]:', rImgErr?.message);
            }
        }

        return NextResponse.json({ success: true, url: relativeUrl });
    } catch (err) {
        console.error('[RETURN-UPLOAD Critical Error]:', err);
        return NextResponse.json({
            error: 'Upload failed: ' + (err.message || 'Internal Server Error'),
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
