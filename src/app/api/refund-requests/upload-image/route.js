import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MIME_TO_EXT = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for photos

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
            if (ALLOWED_MIME_TYPES.has(mimeType)) {
                ext = MIME_TO_EXT[mimeType];
            } else {
                return NextResponse.json({ error: 'Invalid file format. Only JPG, PNG, and WEBP images are allowed.' }, { status: 400 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 10MB.' }, { status: 400 });
        }

        // Save locally to public/uploads/refunds/
        const timestamp = Date.now();
        const rawBase = file.name ? path.basename(file.name, path.extname(file.name)) : 'photo';
        const safeBase = rawBase.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'photo';
        const fileName = `damaged_${timestamp}_${safeBase}${ext}`;
        const targetDir = path.join(process.cwd(), 'public', 'uploads', 'refunds');

        await fs.mkdir(targetDir, { recursive: true });
        const filePath = path.join(targetDir, fileName);
        await fs.writeFile(filePath, buffer);

        const relativeUrl = `/uploads/refunds/${fileName}`;

        return NextResponse.json({
            success: true,
            url: relativeUrl,
            message: 'Damaged product image uploaded successfully.'
        });
    } catch (err) {
        console.error('[REFUND-DAMAGED-IMAGE-UPLOAD-ERROR]', err);
        return NextResponse.json({ error: 'Upload failed: ' + (err.message || 'Unknown error') }, { status: 500 });
    }
}
