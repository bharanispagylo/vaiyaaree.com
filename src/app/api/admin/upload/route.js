import { NextResponse } from 'next/server';
import { mysqlAdmin } from '@/lib/mysqlClient';
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
    await fs.mkdir(path.join(uploadBaseDir, 'with-watermark'), { recursive: true });
    await fs.mkdir(path.join(uploadBaseDir, 'without-watermark'), { recursive: true });
}

// GET - List all local media files
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        await ensureDirs();

        const allFiles = [];

        // Scan with-watermark
        const wmPath = path.join(uploadBaseDir, 'with-watermark');
        if (existsSync(wmPath)) {
            const files = await fs.readdir(wmPath);
            for (const f of files) {
                const stat = await fs.stat(path.join(wmPath, f));
                allFiles.push({
                    name: f,
                    url: `/uploads/media/with-watermark/${f}`,
                    folder: 'with-watermark',
                    created_at: stat.birthtime || stat.mtime
                });
            }
        }

        // Scan without-watermark
        const noWmPath = path.join(uploadBaseDir, 'without-watermark');
        if (existsSync(noWmPath)) {
            const files = await fs.readdir(noWmPath);
            for (const f of files) {
                const stat = await fs.stat(path.join(noWmPath, f));
                allFiles.push({
                    name: f,
                    url: `/uploads/media/without-watermark/${f}`,
                    folder: 'without-watermark',
                    created_at: stat.birthtime || stat.mtime
                });
            }
        }

        allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json({ files: allFiles });

    } catch (err) {
        console.error('GET Error:', err);
        return NextResponse.json({ files: [] }, { status: 200 });
    }
}

// POST - Upload file to local disk (with watermarking)
export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        await ensureDirs();

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
            const imgRes = await fetch(imageUrlParam);
            if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
            const arrayBuffer = await imgRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            const cleanUrl = imageUrlParam.split('?')[0];
            fileExt = cleanUrl.split('.').pop() || 'jpg';
            fileNameHint = cleanUrl.split('/').pop() || 'image.jpg';
        } else {
            return NextResponse.json({ error: 'No file or imageUrl provided' }, { status: 400 });
        }

        let hasWatermark = false;
        let detectedCatalogId = null;

        if (skipDetection || alreadyWatermarked) {
            hasWatermark = alreadyWatermarked;
        } else {
            const detection = await detectWatermark(buffer, fileNameHint);
            hasWatermark = detection.hasWatermark;
            detectedCatalogId = detection.catalogId;
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
        const fileName = `${finalId}_${Date.now()}.${fileExt}`;

        if (!hasWatermark && catalogId && requireClean) {
            if (saveClean) {
                const cleanFilePath = path.join(uploadBaseDir, 'without-watermark', fileName);
                await fs.writeFile(cleanFilePath, buffer);
            }

            const watermarkedBuffer = await applyWatermark(buffer, finalId);
            const wmFilePath = path.join(uploadBaseDir, 'with-watermark', fileName);
            await fs.writeFile(wmFilePath, watermarkedBuffer);

            finalRelativeUrl = `/uploads/media/with-watermark/${fileName}`;
            isNowWatermarked = true;

        } else {
            const folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            const filePath = path.join(uploadBaseDir, folder, fileName);
            await fs.writeFile(filePath, buffer);

            finalRelativeUrl = `/uploads/media/${folder}/${fileName}`;
        }

        // Update settings list
        try {
            const key = isNowWatermarked ? 'watermark_images' : 'no_watermark_images';
            const { data: settingData } = await mysqlAdmin.from('app_settings').select('value').eq('key', key).single();
            let list = [];
            if (settingData?.value) try { list = JSON.parse(settingData.value); } catch(e) {}
            if (!Array.isArray(list)) list = [];
            if (!list.includes(finalRelativeUrl)) {
                list.push(finalRelativeUrl);
                await mysqlAdmin.from('app_settings').upsert({ key, value: JSON.stringify(list), updated_at: new Date() });
            }
        } catch (e) {}

        return NextResponse.json({
            url: finalRelativeUrl,
            watermarkedUrl: finalRelativeUrl,
            catalogId: finalId,
            hasWatermark: isNowWatermarked,
            processed: true
        });

    } catch (err) {
        console.error('[UPLOAD] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE - Remove local file
export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        const { fileName } = await request.json();
        if (!fileName) return NextResponse.json({ error: 'No filename' }, { status: 400 });

        const relPath = fileName.startsWith('/') ? fileName.substring(1) : fileName;
        const fullPath = path.join(process.cwd(), 'public', relPath);

        if (existsSync(fullPath)) {
            await fs.unlink(fullPath);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
