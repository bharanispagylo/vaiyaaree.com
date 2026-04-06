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

// Canvas-based text detection from image
async function detectWatermarkInBuffer(imageBuffer, fileName = '') {
    try {
        console.log(`[DETECTION] Reading text from image: ${fileName}`);
        
        // Use Canvas to read text from image
        const { createCanvas, loadImage } = await import('canvas');
        
        const image = await loadImage(imageBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0);
        
        // Focus on larger area including bottom-right where CAT codes usually are
        const checkWidth = Math.min(400, canvas.width * 0.6);
        const checkHeight = Math.min(200, canvas.height * 0.4);
        const startX = canvas.width - checkWidth;
        const startY = canvas.height - checkHeight;
        
        console.log(`[DETECTION] Checking area: x=${startX}-${startX + checkWidth}, y=${startY}-${startY + checkHeight}`);
        
        // Get image data from bottom-right area
        const imageData = ctx.getImageData(startX, startY, checkWidth, checkHeight);
        const data = imageData.data;
        
        // Look for bright pixels (text) with lower threshold to catch CAT codes
        let brightPixels = [];
        const step = 1; // Sample every pixel for better accuracy
        
        for (let y = 0; y < checkHeight; y += step) {
            for (let x = 0; x < checkWidth; x += step) {
                const idx = (y * checkWidth + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;
                
                // Look for bright pixels (white/light text) - lower threshold
                if (brightness > 160) {
                    brightPixels.push({ x, y, brightness });
                }
            }
        }
        
        console.log(`[DETECTION] Found ${brightPixels.length} bright pixels (brightness > 160)`);
        
        // Need fewer bright pixels to indicate text
        if (brightPixels.length > 20) {
            // Group bright pixels into potential text regions
            const textRegions = groupPixelsIntoRegions(brightPixels);
            console.log(`[DETECTION] Found ${textRegions.length} potential text regions`);
            
            // Check if regions look like text (linear patterns)
            let textLikeRegions = 0;
            for (const region of textRegions) {
                if (isTextLikeRegion(region)) {
                    textLikeRegions++;
                }
            }
            
            console.log(`[DETECTION] Found ${textLikeRegions} text-like regions`);
            
            // Need at least 1 text-like region to be CAT code
            if (textLikeRegions >= 1) {
                console.log(`[DETECTION] Text region detected - likely CAT code present`);
                return true;
            }
        }
        
        console.log(`[DETECTION] No text detected in image`);
        return false;
        
    } catch (error) {
        console.error('Canvas detection error:', error);
        // Fallback to OCR if Canvas fails
        console.log(`[DETECTION] Canvas failed, trying OCR fallback...`);
        return await detectWithOCR(imageBuffer);
    }
}

// Check if a region of pixels looks like text (linear patterns)
function isTextLikeRegion(region) {
    if (region.length < 5) return false;
    
    // Find bounding box
    const minX = Math.min(...region.map(p => p.x));
    const maxX = Math.max(...region.map(p => p.x));
    const minY = Math.min(...region.map(p => p.y));
    const maxY = Math.max(...region.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Text is usually wider than it is tall (horizontal) or taller than wide (vertical)
    const aspectRatio = width / height;
    
    // Check if region has text-like proportions
    const hasTextShape = (aspectRatio > 2 && aspectRatio < 10) || (aspectRatio > 0.1 && aspectRatio < 0.5);
    
    // Check if pixels are somewhat linear (not scattered)
    const density = region.length / (width * height);
    const hasLinearPattern = density > 0.1;
    
    console.log(`[TEXT CHECK] Region: ${region.length} pixels, size: ${width}x${height}, ratio: ${aspectRatio.toFixed(2)}, density: ${density.toFixed(3)} -> ${hasTextShape && hasLinearPattern ? 'TEXT-LIKE' : 'NOT TEXT'}`);
    
    return hasTextShape && hasLinearPattern;
}

// Group bright pixels into text regions
function groupPixelsIntoRegions(pixels) {
    if (pixels.length === 0) return [];
    
    const regions = [];
    const visited = new Set();
    
    for (const pixel of pixels) {
        const key = `${pixel.x},${pixel.y}`;
        if (visited.has(key)) continue;
        
        const region = [];
        const queue = [pixel];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            region.push(current);
            
            // Find nearby pixels (within 10 pixels)
            for (const other of pixels) {
                const otherKey = `${other.x},${other.y}`;
                if (visited.has(otherKey)) continue;
                
                const distance = Math.sqrt(
                    Math.pow(current.x - other.x, 2) + 
                    Math.pow(current.y - other.y, 2)
                );
                
                if (distance <= 10) {
                    queue.push(other);
                }
            }
        }
        
        if (region.length >= 3) { // At least 3 pixels to form text
            regions.push(region);
        }
    }
    
    return regions;
}

// OCR detection with better timeout handling
async function detectWithOCR(imageBuffer) {
    try {
        console.log('[OCR] Starting OCR detection...');
        
        // Upload temporarily for OCR
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

        // Call OCR API with shorter timeout (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: publicUrl }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (ocrResponse.ok) {
                const ocrData = await ocrResponse.json();
                
                // Clean up temp file
                await supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .remove([tempFileName]);

                const hasCatCode = ocrData.hasWatermark || ocrData.catalogId;
                
                console.log(`[OCR] Result: hasWatermark=${ocrData.hasWatermark}, catalogId=${ocrData.catalogId}, detected=${hasCatCode}`);
                
                return hasCatCode;
            } else {
                throw new Error('OCR request failed');
            }
        } catch (ocrError) {
            clearTimeout(timeoutId);
            console.log('[OCR] Failed or timed out, cleaning up...');
            
            // Clean up temp file even if OCR fails
            try {
                await supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .remove([tempFileName]);
            } catch (cleanupError) {
                console.log('Cleanup failed:', cleanupError.message);
            }
            
            // If OCR times out, assume it has CAT code (better to be safe)
            console.log('[OCR] Assuming CAT code present due to timeout');
            return true;
        }

    } catch (error) {
        console.error('OCR detection error:', error);
        return false;
    }
}

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

            return NextResponse.json({ 
                success: true,
                hasWatermark: true,
                folder: 'with_watermark',
                catalogId: finalId,
                url: publicUrl,
                watermarkedUrl: publicUrl
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

        // 5. Return both URLs and status as required
        console.log(`[UPLOAD] Process complete. URLs generated: ${originalUrl}, ${watermarkedUrl}`);

        // Sync Metadata to DB
        try {
            await supabaseAdmin.from('app_settings').upsert({
                key: `meta_${catalogId}`,
                value: JSON.stringify({
                    catalog_id: catalogId,
                    original_url: originalUrl,
                    watermarked_url: watermarkedUrl,
                    created_at: new Date()
                })
            });
        } catch (syncErr) {
            console.error('[UPLOAD] Metadata sync failed:', syncErr.message);
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

