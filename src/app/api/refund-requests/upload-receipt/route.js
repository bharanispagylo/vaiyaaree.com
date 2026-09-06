import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const MIME_TO_EXT = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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
            if (ALLOWED_MIME_TYPES.has(mimeType)) {
                ext = MIME_TO_EXT[mimeType];
            } else {
                return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, and PDF allowed.' }, { status: 400 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        // Save to local disk: public/uploads/refunds/
        const timestamp = Date.now();
        const rawBase = file.name ? path.basename(file.name, path.extname(file.name)) : 'receipt';
        const safeBase = rawBase.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'receipt';
        const fileName = `receipt_${timestamp}_${safeBase}${ext}`;
        const targetDir = path.join(process.cwd(), 'public', 'uploads', 'refunds');

        await fs.mkdir(targetDir, { recursive: true });
        const filePath = path.join(targetDir, fileName);
        await fs.writeFile(filePath, buffer);

        const relativeUrl = `/uploads/refunds/${fileName}`;

        // Return both `url` and `fileUrl` for backward compatibility with different frontend consumers
        return NextResponse.json({ success: true, url: relativeUrl, fileUrl: relativeUrl });
    } catch (err) {
        console.error('[REFUND-RECEIPT-UPLOAD]', err);
        return NextResponse.json({ error: 'Upload failed: ' + err.message }, { status: 500 });
    }
}
