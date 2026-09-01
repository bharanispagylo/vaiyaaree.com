import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

const MIME_TYPES = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon'
};

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const pathSegments = resolvedParams?.path || [];
        if (!pathSegments || pathSegments.length === 0) {
            return new NextResponse('File not specified', { status: 400 });
        }

        const relativePath = pathSegments.join('/');
        const filename = pathSegments[pathSegments.length - 1];
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = MIME_TYPES[ext] || 'image/jpeg';

        // 1. Try serving from local disk first if exists
        try {
            const diskPath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);
            if (existsSync(diskPath)) {
                const fileBuffer = await fs.readFile(diskPath);
                return new NextResponse(fileBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': mimeType,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'Content-Length': String(fileBuffer.length)
                    }
                });
            }
        } catch (_) {}

        // 2. Query MySQL database (for Vercel / serverless deployments)
        try {
            const fullUrl = `/uploads/${relativePath}`;
            const [rows] = await pool.query(
                'SELECT `data`, `mime_type`, `size` FROM `uploaded_media` WHERE `filename` = ? OR `url` = ? OR `url` LIKE ? LIMIT 1',
                [filename, fullUrl, `%${filename}%`]
            );

            if (rows && rows.length > 0 && rows[0]?.data) {
                const dbData = rows[0].data;
                const buffer = Buffer.isBuffer(dbData)
                    ? dbData
                    : (typeof dbData === 'string' && dbData.startsWith('data:')
                        ? Buffer.from(dbData.split(',')[1], 'base64')
                        : Buffer.from(dbData));

                const finalMime = rows[0].mime_type || mimeType;

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': finalMime,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'Content-Length': String(buffer.length)
                    }
                });
            }
        } catch (dbErr) {
            console.error('[Uploads Serve DB Error]:', dbErr);
        }

        return new NextResponse('File not found', { status: 404 });

    } catch (err) {
        console.error('[Uploads Serve Route Error]:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
