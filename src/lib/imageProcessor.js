import { createClient } from '@supabase/supabase-js';

// Load canvas dynamically for server-side use
const getCanvas = async () => {
    try {
        // Switch to @napi-rs/canvas for Vercel/Lambda friendly native binaries
        return await import('@napi-rs/canvas');
    } catch (err) {
        console.error('[PROCESSOR] Failed to load napi-rs canvas:', err.message);
        return null;
    }
};

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

/**
 * Robust Watermark Detection
 * 1. Fast pixel search (linear patterns/brightness)
 * 2. Regular OCR fallback
 */
export async function detectWatermark(buffer, fileName = '') {
    const canvasLib = await getCanvas();
    if (!canvasLib) return { hasWatermark: false };

    const { createCanvas, loadImage } = canvasLib;

    try {
        const image = await loadImage(buffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // Keep high-contrast edges
        ctx.drawImage(image, 0, 0);

        // FOCUS AREA: Broad bottom half (where watermarks are usually placed)
        const checkWidth = canvas.width;
        const checkHeight = Math.floor(canvas.height * 0.5);
        const startX = 0;
        const startY = canvas.height - checkHeight;

        console.log(`[PROCESSOR] Scanning zone: ${startX},${startY} to ${checkWidth},${startY + checkHeight}`);

        const imageData = ctx.getImageData(startX, startY, checkWidth, checkHeight);
        const data = imageData.data;

        // Count bright white/light pixels - typical of CAT code text
        let brightPixels = 0;
        const totalPixels = checkWidth * checkHeight;
        const sampleStep = totalPixels > 1000000 ? 12 : 4; // Sample less for huge ones

        for (let i = 0; i < data.length; i += sampleStep) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Look for high-contrast white text (all components high)
            if (r > 185 && g > 185 && b > 185) {
                brightPixels++;
            }
        }

        const brightPercentage = (brightPixels / (totalPixels / (sampleStep/4))) * 100;
        console.log(`[PROCESSOR] Bright pixel detection: ${brightPixels} pixels (${brightPercentage.toFixed(3)}%)`);

        // Trigger OCR if ANY significant bright pixels exist
        if (brightPixels > 3 || brightPercentage > 0.005) {
            console.log(`[PROCESSOR] Potential watermark detected (pixel cluster: ${brightPixels}), creating high-contrast crop...`);
            
            // Generate a high-contrast crop of the bottom 40%
            const cropCanvas = createCanvas(canvas.width, Math.floor(canvas.height * 0.4));
            const cropCtx = cropCanvas.getContext('2d');
            
            // Draw ONLY the bottom 40%
            cropCtx.drawImage(image, 0, canvas.height - cropCanvas.height, canvas.width, cropCanvas.height, 0, 0, canvas.width, cropCanvas.height);
            
            // Apply Thresholding (make it B&W for OCR)
            const cropData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
            const d = cropData.data;
            for (let i = 0; i < d.length; i += 4) {
                const avg = (d[i] + d[i+1] + d[i+2]) / 3;
                const v = avg > 128 ? 255 : 0; // Thresholding at 128
                d[i] = d[i+1] = d[i+2] = v;
            }
            cropCtx.putImageData(cropData, 0, 0);
            
            const enhancedBuffer = cropCanvas.toBuffer('image/jpeg', { quality: 1.0 });
            
            // Try OCR on WHOLE image first (fallback to crop)
            const result = await callOcrApi(buffer, fileName);
            if (result.hasWatermark) return result;
            
            console.log(`[PROCESSOR] Generic OCR failed, trying ENHANCED CROP OCR...`);
            return await callOcrApi(enhancedBuffer, 'enhanced-' + fileName);
        }

        console.log(`[PROCESSOR] No pixel clusters found, assuming clean image.`);
        return { hasWatermark: false };

    } catch (err) {
        console.error('[PROCESSOR] Detection critical error:', err);
        return { hasWatermark: false };
    }
}

async function callOcrApi(buffer, fileName) {
    try {
        // Convert buffer to base64 to avoid temporary files in storage
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        
        const ocrRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image })
        });

        const result = await ocrRes.json();
        
        return { 
            hasWatermark: result.hasWatermark, 
            catalogId: result.catalogId, 
            text: result.detectedText 
        };
    } catch (err) {
        console.error('[PROCESSOR] OCR call failed:', err);
        return { hasWatermark: false };
    }
}

/**
 * Apply Watermark to Image
 */
export async function applyWatermark(buffer, code) {
    const canvasLib = await getCanvas();
    if (!canvasLib) throw new Error('Canvas not available');

    const { createCanvas, loadImage } = canvasLib;

    try {
        const image = await loadImage(buffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const fontSize = Math.max(22, Math.round(canvas.width * 0.04));
        const padding = Math.round(fontSize * 0.5);
        ctx.font = `bold ${fontSize}px sans-serif`;

        const text = code.toUpperCase();
        const textWidth = ctx.measureText(text).width;
        
        const badgeW = textWidth + padding * 2;
        const badgeH = fontSize + padding;
        const margin = 20;
        
        const x = canvas.width - badgeW - margin;
        const y = canvas.height - badgeH - margin;

        // Dark Background Overlay (Semi-transparent)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, badgeH, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // White Bold Text
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, x + padding, y + padding + (fontSize * 0.75));

        return canvas.toBuffer('image/jpeg', { quality: 0.9 });
    } catch (err) {
        console.error('[PROCESSOR] Watermark application failed:', err);
        throw err;
    }
}
