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
                    id: `wm-${f}`,
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
                    id: `nowm-${f}`,
                    name: f,
                    url: `/uploads/media/without-watermark/${f}`,
                    folder: 'without-watermark',
                    created_at: stat.birthtime || stat.mtime
                });
            }
        }

        // Deduplicate files by URL
        const uniqueFilesMap = new Map();
        for (const item of allFiles) {
            if (!uniqueFilesMap.has(item.url)) {
                uniqueFilesMap.set(item.url, item);
            }
        }
        const finalFilesList = Array.from(uniqueFilesMap.values());
        finalFilesList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({ files: finalFilesList });

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
            const cleanUrl = String(imageUrlParam).split('?')[0].trim();
            fileExt = cleanUrl.split('.').pop() || 'jpg';
            fileNameHint = cleanUrl.split('/').pop() || 'image.jpg';

            if (imageUrlParam.startsWith('data:image/')) {
                const base64Data = imageUrlParam.split(',')[1] || '';
                buffer = Buffer.from(base64Data, 'base64');
            } else if (imageUrlParam.startsWith('/') || !imageUrlParam.startsWith('http')) {
                // Local relative path (e.g. /uploads/media/without-watermark/CAT-123.jpg)
                const relPath = imageUrlParam.startsWith('/') ? imageUrlParam.slice(1) : imageUrlParam;
                const localFilePath = path.join(process.cwd(), 'public', relPath);

                if (existsSync(localFilePath)) {
                    buffer = await fs.readFile(localFilePath);
                } else {
                    // Try direct match in uploadBaseDir
                    const normalizedUploadRel = relPath.replace(/^uploads[\\\/]media[\\\/]?/, '');
                    const uploadSubPath = path.join(uploadBaseDir, normalizedUploadRel);
                    if (existsSync(uploadSubPath)) {
                        buffer = await fs.readFile(uploadSubPath);
                    } else {
                        // Fallback: construct absolute URL from request
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.url ? new URL(request.url).origin : 'http://localhost:3000');
                        const fetchUrl = `${baseUrl.replace(/\/$/, '')}/${relPath}`;
                        const imgRes = await fetch(fetchUrl);
                        if (!imgRes.ok) throw new Error(`Failed to fetch image from local URL: ${fetchUrl} (${imgRes.statusText})`);
                        const arrayBuffer = await imgRes.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                    }
                }
            } else {
                // Remote HTTP/HTTPS URL
                try {
                    const parsedUrl = new URL(imageUrlParam);
                    if (parsedUrl.pathname.startsWith('/uploads/')) {
                        const diskPath = path.join(process.cwd(), 'public', parsedUrl.pathname.slice(1));
                        if (existsSync(diskPath)) {
                            buffer = await fs.readFile(diskPath);
                        }
                    }
                } catch (e) {}

                if (!buffer) {
                    const imgRes = await fetch(imageUrlParam);
                    if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                }
            }
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

// DELETE - Remove local file(s) (Single or Multiple)
export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, fileNames, url, urls } = body;

        const rawList = [];
        if (Array.isArray(fileNames)) rawList.push(...fileNames);
        if (Array.isArray(urls)) rawList.push(...urls);
        if (fileName) rawList.push(fileName);
        if (url) rawList.push(url);

        const targets = [...new Set(rawList.filter(Boolean))];
        if (targets.length === 0) {
            return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 });
        }

        function resolveDiskPath(input) {
            if (!input || typeof input !== 'string') return null;
            let clean = input.trim().replace(/\\/g, '/');
            if (clean.startsWith('/')) clean = clean.substring(1);

            // 1. If it starts with uploads/media/
            if (clean.startsWith('uploads/media/')) {
                return path.join(process.cwd(), 'public', clean);
            }
            // 2. If it starts with uploads/
            if (clean.startsWith('uploads/')) {
                return path.join(process.cwd(), 'public', clean);
            }
            // 3. If it starts with with-watermark/ or without-watermark/
            if (clean.startsWith('with-watermark/') || clean.startsWith('without-watermark/')) {
                return path.join(uploadBaseDir, clean);
            }
            // 4. Try directly inside with-watermark and without-watermark
            const p1 = path.join(uploadBaseDir, 'with-watermark', clean);
            if (existsSync(p1)) return p1;
            const p2 = path.join(uploadBaseDir, 'without-watermark', clean);
            if (existsSync(p2)) return p2;

            return path.join(process.cwd(), 'public', clean);
        }

        let deletedCount = 0;
        const deletedUrls = [];
        const errors = [];

        for (const item of targets) {
            try {
                const diskPath = resolveDiskPath(item);
                if (diskPath && existsSync(diskPath)) {
                    await fs.unlink(diskPath);
                    deletedCount++;
                } else {
                    // Try alternative normalized variants
                    const basename = path.basename(item);
                    const p1 = path.join(uploadBaseDir, 'with-watermark', basename);
                    const p2 = path.join(uploadBaseDir, 'without-watermark', basename);
                    if (existsSync(p1)) {
                        await fs.unlink(p1);
                        deletedCount++;
                    } else if (existsSync(p2)) {
                        await fs.unlink(p2);
                        deletedCount++;
                    }
                }

                // Standardize url for app_settings cleanup
                let urlStr = item.startsWith('/') ? item : `/${item}`;
                if (!urlStr.startsWith('/uploads/')) {
                    if (urlStr.startsWith('/with-watermark/') || urlStr.startsWith('/without-watermark/')) {
                        urlStr = `/uploads/media${urlStr}`;
                    }
                }
                deletedUrls.push(urlStr);
                deletedUrls.push(item);
            } catch (err) {
                console.error(`[DELETE ERROR] ${item}:`, err);
                errors.push({ file: item, error: err.message });
            }
        }

        // Clean up from app_settings lists
        try {
            const keys = ['watermark_images', 'no_watermark_images', 'hero_slider_images', 'gallery_images'];
            for (const key of keys) {
                const { data: sData } = await mysqlAdmin.from('app_settings').select('value').eq('key', key).single();
                if (sData?.value) {
                    let list = [];
                    try { list = JSON.parse(sData.value); } catch(e) {}
                    if (Array.isArray(list)) {
                        const filtered = list.filter(u => !deletedUrls.some(del => u === del || u.endsWith(path.basename(del))));
                        if (filtered.length !== list.length) {
                            await mysqlAdmin.from('app_settings').upsert({ key, value: JSON.stringify(filtered), updated_at: new Date() });
                        }
                    }
                }
            }
        } catch (setErr) {
            console.warn('[DELETE] app_settings cleanup warning:', setErr);
        }

        return NextResponse.json({
            success: true,
            deletedCount,
            totalRequested: targets.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully deleted ${deletedCount} image(s).`
        });

    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
