import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const ext = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXTS.has(ext)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, and PDF allowed.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        // Save to public/uploads/refunds/
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'refunds');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `receipt_${timestamp}_${safeBase}${ext}`;
        const savePath = path.join(uploadDir, filename);

        await fs.promises.writeFile(savePath, buffer);
        const publicUrl = `/uploads/refunds/${filename}`;

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('[REFUND-RECEIPT-UPLOAD]', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
