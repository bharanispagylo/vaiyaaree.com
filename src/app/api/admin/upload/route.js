import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectWatermark, applyWatermark } from '@/lib/imageService';

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
        rootFiles.filter(f => f.id !== null && !f.name.startsWith('temp-check-') && !f.name.startsWith('ocr-temp-')).forEach(file => {
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
        noWmFiles.filter(f => f.id !== null && !f.name.startsWith('temp-check-') && !f.name.startsWith('ocr-temp-')).forEach(file => {
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
            // Already has watermark - RE-UPLOAD AS IS (but label as watermarked)
            const finalId = detection.catalogId || catalogId;
            const path = `with_watermark/${finalId}.${fileExt}`;
            
            console.warn(`[UPLOAD] Watermark detection for "${file.name}": FOUND ${finalId}. Re-saving as exists.`);
            
            const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });
            if (uploadErr) throw uploadErr;

            const publicUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
            
            return NextResponse.json({ 
                success: true,
                hasWatermark: true,
                folder: 'with_watermark',
                catalogId: finalId,
                url: publicUrl,
                watermarkedUrl: publicUrl
            });
        }

        // 3. Execution Phase: Standard Gallery/Product Management
        if (mode === 'gallery' || (detection.hasWatermark && !skipDetection)) {
            const isWatermarked = !!detection.hasWatermark;
            const folder = (mode === 'gallery' && !isWatermarked) ? 'without_watermark' : 'with_watermark';
            
            // Logic: Use detected CAT code if present, otherwise use original filename for gallery or gen random for product
            let finalId;
            if (isWatermarked) {
                finalId = detection.catalogId || catalogId;
            } else if (mode === 'gallery') {
                // Normalize and sanitize original filename
                const originalName = file.name.split('.')[0].replace(/[^a-zA-Z0-9-]/g, '_');
                finalId = `${originalName}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
            } else {
                finalId = catalogId;
            }

            const path = `${folder}/${finalId}.${fileExt}`;
            
            console.log(`[UPLOAD] Mode: ${mode}, Folder: ${folder}, ID: ${finalId}`);
            
            const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });
            if (uploadErr) throw uploadErr;

            const publicUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
            
            // Sync to settings
            try {
                const key = folder === 'with_watermark' ? 'watermark_images' : 'no_watermark_images';
                const { data: settings } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).single();
                const list = JSON.parse(settings?.value || '[]');
                if (!list.includes(publicUrl)) {
                    await supabaseAdmin.from('app_settings').upsert({
                        key, value: JSON.stringify([...list, publicUrl]), updated_at: new Date()
                    });
                }
            } catch (err) { console.error('Sync error:', err); }

            return NextResponse.json({ 
                success: true,
                hasWatermark: folder === 'with_watermark',
                folder: folder,
                catalogId: finalId,
                url: publicUrl,
                watermarkedUrl: folder === 'with_watermark' ? publicUrl : null,
                originalUrl: folder === 'without_watermark' ? publicUrl : null
            });
        }

        // 4. Generation Phase: Create TWO versions (for new clean images in product mode)
        const originalPath = `without_watermark/${catalogId}.${fileExt}`;
        console.log(`[UPLOAD] Generating clean and watermarked versions for: ${catalogId}`);
        
        await supabaseAdmin.storage.from(BUCKET_NAME).upload(originalPath, buffer, {
            contentType: file.type, upsert: true
        });
        const originalUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(originalPath).data.publicUrl;

        const watermarkedBuffer = await applyWatermark(buffer, catalogId);
        const watermarkedPath = `with_watermark/${catalogId}.${fileExt}`;
        
        await supabaseAdmin.storage.from(BUCKET_NAME).upload(watermarkedPath, watermarkedBuffer, {
            contentType: 'image/jpeg', upsert: true
        });
        const watermarkedUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(watermarkedPath).data.publicUrl;

        // SYNC: Add to Media Library settings
        try {
            const { data: settings } = await supabaseAdmin.from('app_settings').select('key, value').in('key', ['watermark_images', 'no_watermark_images']);
            const currentWm = JSON.parse(settings?.find(s => s.key === 'watermark_images')?.value || '[]');
            const currentNoWm = JSON.parse(settings?.find(s => s.key === 'no_watermark_images')?.value || '[]');

            if (!currentWm.includes(watermarkedUrl)) await supabaseAdmin.from('app_settings').upsert({ key: 'watermark_images', value: JSON.stringify([...currentWm, watermarkedUrl]), updated_at: new Date() });
            if (!currentNoWm.includes(originalUrl)) await supabaseAdmin.from('app_settings').upsert({ key: 'no_watermark_images', value: JSON.stringify([...currentNoWm, originalUrl]), updated_at: new Date() });
        } catch (syncErr) { console.error('[UPLOAD] App settings sync error:', syncErr); }

        return NextResponse.json({ 
            success: true,
            hasWatermark: true,
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

