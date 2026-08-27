import { NextResponse } from 'next/server';
import { mysqlAdmin } from '@/lib/mysqlClient';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const returnRequestId = formData.get('return_request_id') || null;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const ext = path.extname(file.name).toLowerCase();
        const mime = file.type || '';
        if (!ALLOWED_EXTS.has(ext) && !ALLOWED_MIME.has(mime)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, PDF allowed.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        // Save to local disk: public/uploads/returns/
        const timestamp = Date.now();
        const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const fileName = `ret_${timestamp}_${safeBase}${ext}`;
        const targetDir = path.join(process.cwd(), 'public', 'uploads', 'returns');

        await fs.mkdir(targetDir, { recursive: true });
        const filePath = path.join(targetDir, fileName);
        await fs.writeFile(filePath, buffer);

        const relativeUrl = `/uploads/returns/${fileName}`;

        // Record in return_images if return_request_id provided
        if (returnRequestId) {
            await mysqlAdmin.from('return_images').insert({
                return_request_id: returnRequestId,
                image_url: relativeUrl,
                image_type: 'customer_photo',
            });
        }

        return NextResponse.json({ success: true, url: relativeUrl });
    } catch (err) {
        console.error('[RETURN-UPLOAD]', err);
        return NextResponse.json({
            error: 'Upload failed: ' + err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
