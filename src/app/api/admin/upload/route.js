import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use SERVICE ROLE key - bypasses RLS entirely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

// GET - List all files in the media bucket including subfolders
export async function GET() {
    try {
        console.log('[GET] Starting to list media files...');
        
        // List files from root and subfolders with error handling
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
            const result = await supabaseAdmin.storage.from(BUCKET_NAME).list('with_watermark', {
                limit: 500,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            wmFiles = result.data || [];
        } catch (err) {
            console.log('[GET] with_watermark folder error:', err.message);
        }

        try {
            const result = await supabaseAdmin.storage.from(BUCKET_NAME).list('without_watermark', {
                limit: 500,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            noWmFiles = result.data || [];
        } catch (err) {
            console.log('[GET] without_watermark folder error:', err.message);
        }

        // Combine all files and add folder information
        const allFiles = [];
        
        // Process root files (filter out temp files)
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

        // Process with_watermark files
        wmFiles.filter(f => f.id !== null).forEach(file => {
            try {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(`with_watermark/${file.name}`);
                allFiles.push({ ...file, url: publicUrl, folder: 'with_watermark' });
            } catch (err) {
                console.log('[GET] Error getting URL for with_watermark file:', file.name);
            }
        });

        // Process without_watermark files
        noWmFiles.filter(f => f.id !== null && !f.name.startsWith('temp-check-')).forEach(file => {
            try {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(`without_watermark/${file.name}`);
                allFiles.push({ ...file, url: publicUrl, folder: 'without_watermark' });
            } catch (err) {
                console.log('[GET] Error getting URL for without_watermark file:', file.name);
            }
        });

        // Sort all files by created_at descending
        allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        console.log(`[GET] Successfully listed ${allFiles.length} files`);
        return NextResponse.json({ files: allFiles });
        
    } catch (err) {
        console.error('GET Error:', err);
        // Return empty files array instead of error to prevent frontend crashes
        return NextResponse.json({ files: [] }, { status: 200 });
    }
}

// POST - Upload a file and process according to requirements
export async function POST(request) {
    try {
        console.log('[UPLOAD] Starting high-performance upload process...');
        const { detectWatermark, applyWatermark } = await import('@/lib/imageProcessor');

        const formData = await request.formData();
        const file = formData.get('file');
        const catalogId = formData.get('catalogId') || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const skipDetection = formData.get('skipDetection') === 'true'; // Allow override for migrations
        const mode = formData.get('mode') || 'product'; // 'gallery' or 'product'

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileExt = file.name.split('.').pop() || 'jpg';

        // 0. Check Only Phase
        if (formData.get('checkOnly') === 'true') {
            console.log('[UPLOAD] Check-only mode requested');
            const detection = await detectWatermark(buffer, file.name);
            return NextResponse.json({ 
                hasWatermark: detection.hasWatermark, 
                catalogId: detection.catalogId 
            });
        }

        // 1. Detection Phase
        let detection = { hasWatermark: false };
        if (!skipDetection) {
            console.log('[UPLOAD] Running detection...');
            detection = await detectWatermark(buffer, file.name);
        }

        // 2. Requirement Handling
        const requireClean = formData.get('requireClean') === 'true';
        if (detection.hasWatermark && !skipDetection && requireClean) {
            console.warn(`[UPLOAD] Watermark already present in ${file.name} (Clean required)`);
            return NextResponse.json({ 
                error: 'Watermark already present', 
                catalogId: detection.catalogId,
                status: 'REJECTED'
            }, { status: 400 });
        }

        // 3. Execution Phase
        if (detection.hasWatermark && !skipDetection) {
            // Already has watermark - Use detected ID to keep metadata consistent
            const finalId = detection.catalogId || catalogId;
            const path = `with_watermark/${finalId}.${fileExt}`;
            console.log(`[UPLOAD] Saving existing watermarked image (${finalId}) up to: ${path}`);
            
            const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });
            if (uploadErr) throw uploadErr;

            const publicUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
            
            // SYNC: Categorize as watermarked
            try {
                const { data: wmSettings } = await supabaseAdmin
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'watermark_images')
                    .single();
                
                const currentWm = JSON.parse(wmSettings?.value || '[]');
                if (!currentWm.includes(publicUrl)) {
                    await supabaseAdmin.from('app_settings').upsert({
                        key: 'watermark_images',
                        value: JSON.stringify([...currentWm, publicUrl]),
                        updated_at: new Date()
                    });
                }
            } catch (err) { console.error('Existing WM sync error:', err); }

            return NextResponse.json({ 
                success: true,
                hasWatermark: true,
                folder: 'with_watermark',
                catalogId: finalId,
                url: publicUrl,
                watermarkedUrl: publicUrl
            });
        }

        // 3.5 GALLERY MODE HANDLING (No Watermark Generation)
        if (mode === 'gallery') {
            console.log('[UPLOAD] Gallery mode: Storing without watermarking');
            const path = `without_watermark/${catalogId}.${fileExt}`;
            const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });
            if (uploadErr) throw uploadErr;

            const publicUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
            
            // SYNC: Categorize as clean
            try {
                const { data: noWmSettings } = await supabaseAdmin
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'no_watermark_images')
                    .single();
                
                const currentNoWm = JSON.parse(noWmSettings?.value || '[]');
                if (!currentNoWm.includes(publicUrl)) {
                    await supabaseAdmin.from('app_settings').upsert({
                        key: 'no_watermark_images',
                        value: JSON.stringify([...currentNoWm, publicUrl]),
                        updated_at: new Date()
                    });
                }
            } catch (err) { console.error('Gallery sync error:', err); }

            return NextResponse.json({
                success: true,
                hasWatermark: false,
                folder: 'without_watermark',
                catalogId: catalogId,
                url: publicUrl,
                originalUrl: publicUrl
            });
        }

        // 4. Generation Phase: Create TWO versions (for new clean images)
        // A. Original (without_watermark)
        const originalPath = `without_watermark/${catalogId}.${fileExt}`;
        console.log(`[UPLOAD] Saving original: ${originalPath}`);
        
        const { error: originalErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(originalPath, buffer, {
            contentType: file.type,
            upsert: true
        });

        if (originalErr) throw originalErr;
        const originalUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(originalPath).data.publicUrl;

        // B. Watermarked (with_watermark)
        console.log(`[UPLOAD] Generating watermarked version for: ${catalogId}`);
        const watermarkedBuffer = await applyWatermark(buffer, catalogId);
        const watermarkedPath = `with_watermark/${catalogId}.${fileExt}`;
        
        const { error: wmErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(watermarkedPath, watermarkedBuffer, {
            contentType: 'image/jpeg',
            upsert: true
        });

        if (wmErr) throw wmErr;
        const watermarkedUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(watermarkedPath).data.publicUrl;

        // SYNC: Add to Media Library settings for tabs
        try {
            const { data: settings } = await supabaseAdmin
                .from('app_settings')
                .select('key, value')
                .in('key', ['watermark_images', 'no_watermark_images']);
            
            const currentWm = JSON.parse(settings?.find(s => s.key === 'watermark_images')?.value || '[]');
            const currentNoWm = JSON.parse(settings?.find(s => s.key === 'no_watermark_images')?.value || '[]');

            // 1. Handle watermarked image (always created in product mode, or detected)
            if (!currentWm.includes(watermarkedUrl)) {
                await supabaseAdmin.from('app_settings').upsert({
                    key: 'watermark_images',
                    value: JSON.stringify([...currentWm, watermarkedUrl]),
                    updated_at: new Date()
                });
            }

            // 2. Handle original image
            if (!currentNoWm.includes(originalUrl)) {
                await supabaseAdmin.from('app_settings').upsert({
                    key: 'no_watermark_images',
                    value: JSON.stringify([...currentNoWm, originalUrl]),
                    updated_at: new Date()
                });
            }
        } catch (syncErr) {
            console.error('[UPLOAD] App settings sync error:', syncErr);
        }

        return NextResponse.json({ 
            success: true,
            hasWatermark: true, // The returned URL is watermarked
            catalogId: catalogId,
            url: watermarkedUrl,
            originalUrl: originalUrl,
            watermarkedUrl: watermarkedUrl,
            folder: 'with_watermark'
        });

    } catch (err) {
        console.error('[UPLOAD] Core failure:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE - Remove a file
export async function DELETE(request) {
    try {
        const { fileName } = await request.json();
        if (!fileName) return NextResponse.json({ error: 'No filename' }, { status: 400 });

        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) throw error;

        // SYNC: Remove from Media Library settings
        try {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            const { data: settings } = await supabaseAdmin
                .from('app_settings')
                .select('key, value')
                .in('key', ['watermark_images', 'no_watermark_images']);
            
            for (const setting of (settings || [])) {
                let list = [];
                try { list = JSON.parse(setting.value); } catch(e) {}
                
                if (list.includes(publicUrl)) {
                    const newList = list.filter(u => u !== publicUrl);
                    await supabaseAdmin
                        .from('app_settings')
                        .upsert({ 
                            key: setting.key, 
                            value: JSON.stringify(newList),
                            updated_at: new Date()
                        });
                    console.log(`[SYNC] Removed ${publicUrl} from ${setting.key} settings`);
                }
            }
        } catch (syncErr) {
            console.error('Delete sync error:', syncErr);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

