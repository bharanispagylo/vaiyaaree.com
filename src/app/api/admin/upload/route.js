import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE key - bypasses RLS entirely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

// Helper function to detect CAT code watermark using OCR
async function detectWatermarkInBuffer(imageBuffer) {
    try {
        // First upload the image temporarily to get a URL
        const tempFileName = `temp-check-${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(tempFileName, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error('Temp upload error:', uploadError);
            return false;
        }

        // Get public URL for OCR
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(tempFileName);

        // Call OCR API to detect text
        const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: publicUrl })
        });

        const ocrData = await ocrResponse.json();
        
        // Clean up temp file
        await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([tempFileName]);

        // Check if OCR found a CAT code
        const hasCatCode = ocrData.catalogId && ocrData.catalogId.match(/^CAT-[A-Z0-9]+$/i);
        
        if (hasCatCode) {
            console.log(`[WATERMARK] CAT code detected: ${ocrData.catalogId}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Watermark detection error:', error);
        return false;
    }
}

// GET - List all files in the media bucket including subfolders
export async function GET() {
    try {
        // List files from root and subfolders
        const { data: rootFiles, error: rootError } = await supabaseAdmin.storage.from(BUCKET_NAME).list('', {
            limit: 500,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        const { data: withWatermarkFiles, error: wmError } = await supabaseAdmin.storage.from(BUCKET_NAME).list('with-watermark', {
            limit: 500,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        const { data: withoutWatermarkFiles, error: noWmError } = await supabaseAdmin.storage.from(BUCKET_NAME).list('without-watermark', {
            limit: 500,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        if (rootError || wmError || noWmError) throw rootError || wmError || noWmError;

        // Combine all files and add folder information
        const allFiles = [];
        
        // Process root files (filter out temp files)
        (rootFiles || []).filter(f => f.id !== null && !f.name.startsWith('temp-check-')).forEach(file => {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(file.name);
            allFiles.push({ ...file, url: publicUrl, folder: 'root' });
        });

        // Process with-watermark files
        (withWatermarkFiles || []).filter(f => f.id !== null).forEach(file => {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(`with-watermark/${file.name}`);
            allFiles.push({ ...file, url: publicUrl, folder: 'with-watermark' });
        });

        // Process without-watermark files (filter out any stray temp files)
        (withoutWatermarkFiles || []).filter(f => f.id !== null && !f.name.startsWith('temp-check-')).forEach(file => {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(`without-watermark/${file.name}`);
            allFiles.push({ ...file, url: publicUrl, folder: 'without-watermark' });
        });

        // Sort all files by created_at descending
        allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({ files: allFiles });
    } catch (err) {
        console.error('List error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST - Upload a file
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const catalogId = formData.get('catalogId'); // Get catalog ID if provided
        const alreadyWatermarked = formData.get('alreadyWatermarked') === 'true'; // Check if already watermarked
        const skipDetection = formData.get('skipDetection') === 'true'; // New: skip OCR if we know the status

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine watermark status
        let hasWatermark = false;
        let folder = 'without-watermark';
        
        if (skipDetection) {
            hasWatermark = alreadyWatermarked;
            folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            console.log(`[UPLOAD] Skipping detection for ${file.name} - using hasWatermark: ${hasWatermark}`);
        } else if (alreadyWatermarked) {
            // Image is already watermarked (e.g., from product upload)
            hasWatermark = true;
            folder = 'with-watermark';
            console.log(`[UPLOAD] Image ${file.name} is already watermarked (catalogId: ${catalogId})`);
        } else {
            // Detect watermark in the uploaded image
            hasWatermark = await detectWatermarkInBuffer(buffer);
            folder = hasWatermark ? 'with-watermark' : 'without-watermark';
            console.log(`[UPLOAD] Image ${file.name} - Watermark detected: ${hasWatermark}`);
        }
        
        // Use catalog ID as filename if provided, otherwise use random name
        let fileName = catalogId ? `${catalogId}.${fileExt}` : `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        // Add folder prefix
        const fullFileName = `${folder}/${fileName}`;
        
        // Handle duplicate filenames by checking if file exists
        try {
            const fileDir = folder;
            const plainFileName = fileName;
            
            const { data: existingFiles } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .list(fileDir, { search: plainFileName });
            
            const fileExists = (existingFiles || []).some(f => f.name === plainFileName);
            
            if (fileExists) {
                fileName = catalogId ? `${catalogId}-${Date.now()}.${fileExt}` : `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            }
        } catch (err) {
            console.warn('Existence check failed, proceeding anyway:', err);
        }

        const finalFileName = `${folder}/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(finalFileName, buffer, {
                contentType: file.type,
                upsert: false,
                metadata: { 
                    catalogId: catalogId || null,
                    hasWatermark: hasWatermark,
                    originalName: file.name,
                    alreadyWatermarked: alreadyWatermarked || false
                }
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(finalFileName);

        // SYNC: Update Media Library settings if watermarked
        try {
            if (hasWatermark) {
                const { data: settingData } = await supabaseAdmin
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'watermark_images')
                    .single();
                
                let watermarkList = [];
                if (settingData?.value) {
                    try { watermarkList = JSON.parse(settingData.value); } catch(e) {}
                }
                
                if (!watermarkList.includes(publicUrl)) {
                    watermarkList.push(publicUrl);
                    await supabaseAdmin
                        .from('app_settings')
                        .upsert({ 
                            key: 'watermark_images', 
                            value: JSON.stringify(watermarkList),
                            updated_at: new Date()
                        });
                    console.log(`[SYNC] Added ${publicUrl} to watermark_images settings`);
                }
            } else {
                // Also add to no_watermark_images if preferred
                const { data: settingData } = await supabaseAdmin
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'no_watermark_images')
                    .single();
                
                let noWatermarkList = [];
                if (settingData?.value) {
                    try { noWatermarkList = JSON.parse(settingData.value); } catch(e) {}
                }
                
                if (!noWatermarkList.includes(publicUrl)) {
                    noWatermarkList.push(publicUrl);
                    await supabaseAdmin
                        .from('app_settings')
                        .upsert({ 
                            key: 'no_watermark_images', 
                            value: JSON.stringify(noWatermarkList),
                            updated_at: new Date()
                        });
                }
            }
        } catch (syncErr) {
            console.error('Settings sync error:', syncErr);
        }

        return NextResponse.json({ 
            url: publicUrl, 
            name: finalFileName,
            catalogId: catalogId,
            hasWatermark: hasWatermark,
            folder: folder
        });
    } catch (err) {
        console.error('Upload error:', err);
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
