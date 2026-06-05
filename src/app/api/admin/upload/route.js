import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectWatermark, applyWatermark } from '@/lib/imageService';
import { Buffer } from 'buffer';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use SERVICE ROLE key - bypasses RLS entirely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

// GET - List all files in the media bucket including subfolders
export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        console.log('[GET] Starting to list media files...');
        
        let rootFiles = [];
        let wmFiles = [];
        let noWmFiles = [];
        
        try {
            const result = await supabaseAdmin.storage.from(BUCKET_NAME).list('', {
                limit: 500,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            rootFiles = result.data || [];
        } catch (err) {
            console.log('[GET] Root folder error:', err.message);
        }

        try {
            const result = await supabaseAdmin.storage.from(BUCKET_NAME).list('with-watermark', {
                limit: 500,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            wmFiles = result.data || [];
        } catch (err) {
            console.log('[GET] With-watermark folder error:', err.message);
        }

        try {
            const result = await supabaseAdmin.storage.from(BUCKET_NAME).list('without-watermark', {
                limit: 500,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            noWmFiles = result.data || [];
        } catch (err) {
            console.log('[GET] Without-watermark folder error:', err.message);
        }

        const allFiles = [];
        
        rootFiles.filter(f => f.id !== null && !f.name.startsWith('temp-check-')).forEach(file => {
            try {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(file.name);
                allFiles.push({ ...file, url: publicUrl, folder: 'root' });
            } catch (err) {
                console.log('[GET] Error getting URL for root file:', file.name);
            }
        });

        wmFiles.filter(f => f.id !== null).forEach(file => {
            try {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(`with-watermark/${file.name}`);
                allFiles.push({ ...file, url: publicUrl, folder: 'with-watermark' });
            } catch (err) {
                console.log('[GET] Error getting URL for with-watermark file:', file.name);
            }
        });

        noWmFiles.filter(f => f.id !== null && !f.name.startsWith('temp-check-')).forEach(file => {
            try {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(`without-watermark/${file.name}`);
                allFiles.push({ ...file, url: publicUrl, folder: 'without-watermark' });
            } catch (err) {
                console.log('[GET] Error getting URL for without-watermark file:', file.name);
            }
        });

        allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json({ files: allFiles });
        
    } catch (err) {
        console.error('GET Error:', err);
        return NextResponse.json({ files: [] }, { status: 200 });
    }
}

// POST - Upload a file (with optional watermarking)
export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        console.log('[UPLOAD] Starting upload process...');
        
        const formData = await request.formData();
        const file = formData.get('file');
        const catalogId = formData.get('catalogId');
        const checkOnly = formData.get('checkOnly') === 'true';
        const skipDetection = formData.get('skipDetection') === 'true';
        const alreadyWatermarked = formData.get('alreadyWatermarked') === 'true';
        const requireClean = formData.get('requireClean') === 'true';
        const saveClean = formData.get('saveClean') !== 'false';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        const fileExt = file.name.split('.').pop() || 'jpg';

        // 1. Watermark Detection / Skip logic
        let hasWatermark = false;
        let detectedCatalogId = null;

        if (skipDetection || alreadyWatermarked) {
            hasWatermark = alreadyWatermarked;
            console.log(`[UPLOAD] Skipping detection, hasWatermark: ${hasWatermark}`);
        } else {
            console.log(`[UPLOAD] Running detection for ${file.name}...`);
            const detection = await detectWatermark(buffer, file.name);
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

        // 3. STORAGE & APPLICATION LOGIC
        let finalPublicUrl = '';
        let isNowWatermarked = hasWatermark;
        let finalId = catalogId || detectedCatalogId || Math.random().toString(36).substring(2, 7).toUpperCase();
        
        // Use a unique filename even if the catalogId is the same, to prevent overwriting
        // when multiple images are uploaded for the same product catalog code.
        const fileName = `${finalId}_${Date.now()}.${fileExt}`;

        if (!hasWatermark && catalogId && requireClean) {
            // CASE 1: No watermark detected -> Store Clean AND Generate Watermark
            
            // A. Save ORIGINAL (Clean) version (only if saveClean is true)
            if (saveClean) {
                const cleanPath = `without-watermark/${fileName}`;
                console.log(`[STORAGE] Saving CLEAN image to: ${cleanPath}`);
                const { error: cleanErr } = await supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .upload(cleanPath, buffer, {
                        contentType: file.type || 'image/jpeg',
                        upsert: true
                    });
                if (cleanErr) throw cleanErr;
            } else {
                console.log(`[STORAGE] Skipping saving clean version because saveClean is false`);
            }

            // B. Generate Watermarked version
            console.log(`[PROCESS] Applying NEW watermark: ${finalId}`);
            const watermarkedBuffer = await applyWatermark(buffer, finalId);

            // C. Save WATERMARKED version
            const wmPath = `with-watermark/${fileName}`;
            console.log(`[STORAGE] Saving WATERMARKED image to: ${wmPath}`);
            const { error: wmErr } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .upload(wmPath, watermarkedBuffer, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                });
            if (wmErr) throw wmErr;

            const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(wmPath);
            finalPublicUrl = publicUrl;
            isNowWatermarked = true;

        } else {
            // CASE 2: Already has watermark OR just a normal upload
            // Store ONLY in the appropriate folder
            const folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            const finalPath = `${folder}/${fileName}`;
            
            console.log(`[STORAGE] Saving image to ${folder.toUpperCase()}: ${finalPath}`);
            const { error: uploadError } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .upload(finalPath, buffer, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(finalPath);
            finalPublicUrl = publicUrl;
        }

        // 4. UPDATE SETTINGS (For media library groups)
        try {
            const key = isNowWatermarked ? 'watermark_images' : 'no_watermark_images';
            const { data: settingData } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).single();
            let list = [];
            if (settingData?.value) try { list = JSON.parse(settingData.value); } catch(e) {}
            if (!list.includes(finalPublicUrl)) {
                list.push(finalPublicUrl);
                await supabaseAdmin.from('app_settings').upsert({ key, value: JSON.stringify(list), updated_at: new Date() });
            }
        } catch (e) {}

        return NextResponse.json({ 
            url: finalPublicUrl,
            watermarkedUrl: finalPublicUrl, // backward compatibility
            catalogId: finalId,
            hasWatermark: isNowWatermarked,
            processed: true
        });


    } catch (err) {
        console.error('[UPLOAD] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE - Remove a file
export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }
        const { fileName } = await request.json();
        if (!fileName) return NextResponse.json({ error: 'No filename' }, { status: 400 });

        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
