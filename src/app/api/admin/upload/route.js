import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { detectWatermark, applyWatermark } from '@/lib/imageService';
import { Buffer } from 'buffer';
import { verifyAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico', '.avif']);

// Helper to scan a directory recursively
async function scanDirectory(dirPath, urlPrefix, folderTag) {
    const results = [];
    try {
        if (!fs.existsSync(dirPath)) return results;
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const subResults = await scanDirectory(fullPath, `${urlPrefix}/${entry.name}`, entry.name);
                results.push(...subResults);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (ALLOWED_IMAGE_EXTS.has(ext)) {
                    try {
                        const stats = await fs.promises.stat(fullPath);
                        results.push({
                            id: `file-${entry.name}-${stats.mtimeMs}`,
                            name: entry.name,
                            url: `${urlPrefix}/${entry.name}`,
                            folder: folderTag || 'root',
                            size: stats.size,
                            created_at: stats.birthtime ? stats.birthtime.toISOString() : stats.mtime.toISOString(),
                            updated_at: stats.mtime.toISOString(),
                            isLocalFile: true
                        });
                    } catch (e) {}
                }
            }
        }
    } catch (err) {
        console.error(`[SCAN] Error scanning ${dirPath}:`, err);
    }
    return results;
}

// GET - List all media files from local disk, products database, and app settings
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        console.log('[GET] Starting to list all media and product images...');

        const allFiles = [];
        const seenUrls = new Set();

        const addFile = (fileItem) => {
            if (!fileItem || !fileItem.url) return;
            const normUrl = String(fileItem.url).trim();
            if (!normUrl || seenUrls.has(normUrl)) return;
            seenUrls.add(normUrl);
            allFiles.push({
                ...fileItem,
                url: normUrl
            });
        };

        // 1. Scan public/uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const uploadFiles = await scanDirectory(uploadsDir, '/uploads', 'uploads');
        uploadFiles.forEach(addFile);

        // 2. Scan public/images directory
        const imagesDir = path.join(process.cwd(), 'public', 'images');
        const publicImages = await scanDirectory(imagesDir, '/images', 'images');
        publicImages.forEach(addFile);

        // 3. Fetch product images from MySQL products table
        try {
            const { data: products } = await supabase
                .from('products')
                .select('id, name, sku, image_url, gallery_image, product_no, product_catalog_image_id, created_at')
                .order('created_at', { ascending: false });

            if (products && Array.isArray(products)) {
                products.forEach((prod) => {
                    const prodName = prod.name || `Product #${prod.product_no || prod.sku || prod.id}`;

                    // Main product image
                    if (prod.image_url) {
                        const imgUrl = String(prod.image_url).trim();
                        const fileName = imgUrl.split('/').pop()?.split('?')[0] || `${prod.sku || prod.id}.jpg`;
                        addFile({
                            id: `prod-${prod.id}`,
                            name: `${prodName}`,
                            url: imgUrl,
                            folder: 'products',
                            size: 0,
                            created_at: prod.created_at || new Date().toISOString(),
                            catalogId: prod.product_catalog_image_id || prod.sku || String(prod.product_no || ''),
                            source: 'product_catalog'
                        });
                    }

                    // Gallery images (stored in gallery_image)
                    let galleryImages = prod.gallery_image || prod.gallery_urls;
                    if (typeof galleryImages === 'string') {
                        try {
                            galleryImages = JSON.parse(galleryImages);
                        } catch (e) {
                            galleryImages = galleryImages.split(',').map(s => s.trim()).filter(Boolean);
                        }
                    }

                    if (Array.isArray(galleryImages)) {
                        galleryImages.forEach((galUrl, idx) => {
                            if (!galUrl) return;
                            const galUrlStr = String(galUrl).trim();
                            addFile({
                                id: `prod-gal-${prod.id}-${idx}`,
                                name: `${prodName} (Gallery ${idx + 1})`,
                                url: galUrlStr,
                                folder: 'products',
                                size: 0,
                                created_at: prod.created_at || new Date().toISOString(),
                                catalogId: prod.product_catalog_image_id || prod.sku || String(prod.product_no || ''),
                                source: 'product_gallery'
                            });
                        });
                    }
                });
            }
        } catch (dbErr) {
            console.error('[GET] Failed to fetch product images from DB:', dbErr);
        }

        // 4. Also fetch any images in app_settings (hero slider, gallery, watermark settings)
        try {
            const { data: settings } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['watermark_images', 'no_watermark_images', 'hero_slider_images', 'gallery_images']);

            if (settings && Array.isArray(settings)) {
                settings.forEach(setting => {
                    let urls = setting.value;
                    if (typeof urls === 'string') {
                        try {
                            urls = JSON.parse(urls);
                        } catch (e) {
                            urls = [urls];
                        }
                    }
                    if (Array.isArray(urls)) {
                        urls.forEach((url, i) => {
                            if (url && typeof url === 'string' && url.trim()) {
                                const cleanUrl = url.trim();
                                const fileName = cleanUrl.split('/').pop()?.split('?')[0] || `setting-image-${i}.jpg`;
                                addFile({
                                    id: `setting-${setting.key}-${i}`,
                                    name: fileName,
                                    url: cleanUrl,
                                    folder: setting.key.includes('watermark') ? 'watermark' : 'settings',
                                    size: 0,
                                    created_at: new Date().toISOString(),
                                    source: 'app_settings'
                                });
                            }
                        });
                    }
                });
            }
        } catch (settingsErr) {
            console.error('[GET] Failed to fetch settings images:', settingsErr);
        }

        // Sort by created_at descending
        allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({ files: allFiles });

    } catch (err) {
        console.error('GET Error:', err);
        return NextResponse.json({ files: [] }, { status: 200 });
    }
}

// POST - Upload a file (with local disk storage and optional watermarking)
export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        console.log('[UPLOAD] Starting upload process...');

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
            console.log(`[UPLOAD] Fetching image from URL server-side: ${imageUrlParam}`);
            if (imageUrlParam.startsWith('/') || !imageUrlParam.startsWith('http')) {
                const relPath = imageUrlParam.startsWith('/') ? imageUrlParam.slice(1) : imageUrlParam;
                const localFilePath = path.join(process.cwd(), 'public', relPath);
                buffer = await fs.promises.readFile(localFilePath);
                fileExt = relPath.split('.').pop() || 'jpg';
                fileNameHint = relPath.split('/').pop() || 'image.jpg';
            } else {
                const imgRes = await fetch(imageUrlParam);
                if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
                const arrayBuffer = await imgRes.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                const cleanUrl = imageUrlParam.split('?')[0];
                fileExt = cleanUrl.split('.').pop() || 'jpg';
                fileNameHint = cleanUrl.split('/').pop() || 'image.jpg';
            }
        } else {
            return NextResponse.json({ error: 'No file or imageUrl provided' }, { status: 400 });
        }

        // 1. Watermark Detection / Skip logic
        let hasWatermark = false;
        let detectedCatalogId = null;

        if (skipDetection || alreadyWatermarked) {
            hasWatermark = alreadyWatermarked;
            console.log(`[UPLOAD] Skipping detection, hasWatermark: ${hasWatermark}`);
        } else {
            console.log(`[UPLOAD] Running detection for ${fileNameHint}...`);
            const detection = await detectWatermark(buffer, fileNameHint);
            hasWatermark = detection.hasWatermark;
            detectedCatalogId = detection.catalogId;
        }

        // 2. CHECK ONLY mode - for UI confirmation
        if (checkOnly) {
            return NextResponse.json({ 
                hasWatermark, 
                catalogId: detectedCatalogId || catalogId 
            });
        }

        // 3. STORAGE & APPLICATION LOGIC (Save directly to public/uploads disk)
        let finalPublicUrl = '';
        let isNowWatermarked = hasWatermark;
        let finalId = catalogId || detectedCatalogId || Math.random().toString(36).substring(2, 7).toUpperCase();
        
        const fileName = `${finalId}_${Date.now()}.${fileExt}`;
        const baseUploadDir = path.join(process.cwd(), 'public', 'uploads');

        if (!hasWatermark && catalogId && requireClean) {
            // CASE 1: No watermark detected -> Store Clean AND Generate Watermark
            
            // A. Save ORIGINAL (Clean) version
            if (saveClean) {
                const cleanDir = path.join(baseUploadDir, 'without-watermark');
                await fs.promises.mkdir(cleanDir, { recursive: true });
                const cleanFilePath = path.join(cleanDir, fileName);
                await fs.promises.writeFile(cleanFilePath, buffer);
                console.log(`[STORAGE] Saved clean image to: ${cleanFilePath}`);
            }

            // B. Generate Watermarked version
            console.log(`[PROCESS] Applying NEW watermark: ${finalId}`);
            const watermarkedBuffer = await applyWatermark(buffer, finalId);

            // C. Save WATERMARKED version
            const wmDir = path.join(baseUploadDir, 'with-watermark');
            await fs.promises.mkdir(wmDir, { recursive: true });
            const wmFilePath = path.join(wmDir, fileName);
            await fs.promises.writeFile(wmFilePath, watermarkedBuffer);
            console.log(`[STORAGE] Saved watermarked image to: ${wmFilePath}`);

            finalPublicUrl = `/uploads/with-watermark/${fileName}`;
            isNowWatermarked = true;

        } else {
            // CASE 2: Already has watermark OR just a normal upload
            const folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            const targetDir = path.join(baseUploadDir, folder);
            await fs.promises.mkdir(targetDir, { recursive: true });
            const targetFilePath = path.join(targetDir, fileName);
            await fs.promises.writeFile(targetFilePath, buffer);
            console.log(`[STORAGE] Saved image to: ${targetFilePath}`);

            finalPublicUrl = `/uploads/${folder}/${fileName}`;
        }

        // 4. UPDATE SETTINGS (For media library groups)
        try {
            const key = isNowWatermarked ? 'watermark_images' : 'no_watermark_images';
            const { data: settingData } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).single();
            let list = [];
            if (settingData?.value) {
                try {
                    list = Array.isArray(settingData.value) ? settingData.value : JSON.parse(settingData.value);
                } catch(e) {
                    list = [settingData.value];
                }
            }
            if (!Array.isArray(list)) list = [];
            if (!list.includes(finalPublicUrl)) {
                list.push(finalPublicUrl);
                await supabaseAdmin.from('app_settings').upsert({ key, value: JSON.stringify(list), updated_at: new Date() });
            }
        } catch (e) {
            console.error('[UPLOAD] Settings update error:', e);
        }

        return NextResponse.json({ 
            url: finalPublicUrl,
            watermarkedUrl: finalPublicUrl,
            catalogId: finalId,
            hasWatermark: isNowWatermarked,
            processed: true
        });

    } catch (err) {
        console.error('[UPLOAD] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE - Remove a file from disk
export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        const { fileName, url } = await request.json();
        const target = fileName || url;
        if (!target) return NextResponse.json({ error: 'No filename or url provided' }, { status: 400 });

        // If it's a local upload path, delete from disk
        let relPath = target;
        if (relPath.startsWith('/uploads/')) {
            relPath = relPath.replace('/uploads/', '');
        } else if (relPath.startsWith('/')) {
            relPath = relPath.slice(1);
        }

        const possiblePaths = [
            path.join(process.cwd(), 'public', 'uploads', relPath),
            path.join(process.cwd(), 'public', relPath)
        ];

        for (const p of possiblePaths) {
            try {
                if (fs.existsSync(p)) {
                    await fs.promises.unlink(p);
                    console.log(`[DELETE] Deleted local file: ${p}`);
                }
            } catch (e) {
                console.error(`[DELETE] Error unlinking ${p}:`, e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
