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
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    heic: 'image/heic',
    heif: 'image/heif'
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

        // 0. Check if file has been marked as deleted
        try {
            const fullUrl = `/uploads/${relativePath}`;
            const [delRows] = await pool.query(
                'SELECT `id` FROM `deleted_media` WHERE `filename` = ? OR `url` = ? OR `url` LIKE ? LIMIT 1',
                [filename, fullUrl, `%${filename}`]
            );
            if (delRows && delRows.length > 0) {
                return new NextResponse('File deleted', {
                    status: 404,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
            }
        } catch (_) {}

        // 1. Try serving from exact local disk path or candidate alternative upload directories
        try {
            const candidatePaths = [
                path.join(process.cwd(), 'public', 'uploads', ...pathSegments),
                path.join(process.cwd(), 'public', 'uploads', 'media', 'without-watermark', filename),
                path.join(process.cwd(), 'public', 'uploads', 'media', 'with-watermark', filename),
                path.join(process.cwd(), 'public', 'uploads', 'media', filename),
                path.join(process.cwd(), 'public', 'uploads', 'products', filename),
                path.join(process.cwd(), 'public', 'uploads', filename),
                path.join(process.cwd(), 'public', 'images', filename)
            ];

            for (const diskPath of candidatePaths) {
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

        // 3. Graceful fallback for images to permanently prevent broken UI and 404 console errors
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
        if (isImage) {
            try {
                const fallbackImgPath = path.join(process.cwd(), 'public', 'images', 'about-us-saree.jpg');
                if (existsSync(fallbackImgPath)) {
                    const fallbackBuffer = await fs.readFile(fallbackImgPath);
                    return new NextResponse(fallbackBuffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'image/jpeg',
                            'Cache-Control': 'public, max-age=300',
                            'X-Fallback-Image': 'default-saree-placeholder'
                        }
                    });
                }
            } catch (_) {}

            const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
                <rect width="100%" height="100%" fill="#fdfbf7"/>
                <rect x="20" y="20" width="560" height="560" rx="16" fill="#f8f4ee" stroke="#ebdcd0" stroke-width="2"/>
                <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="'Cabrito Flare', sans-serif" font-size="28" font-weight="700" fill="#a06650" letter-spacing="4">VAIYAAREE</text>
                <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Cabrito Flare', sans-serif" font-size="13" font-weight="500" fill="#6e645e" letter-spacing="1">AUTHENTIC HANDLOOM SAREES</text>
            </svg>`;
            return new NextResponse(Buffer.from(placeholderSvg), {
                status: 200,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=300',
                    'X-Fallback-Image': 'true'
                }
            });
        }

        return new NextResponse('File not found', {
            status: 404,
            headers: {
                'Cache-Control': 'public, max-age=60'
            }
        });

    } catch (err) {
        console.error('[Uploads Serve Route Error]:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
