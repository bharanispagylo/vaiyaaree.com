import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import sharp from 'sharp';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { processOcr } from '@/lib/ocrProcessor';
import path from 'path';

// Load a fallback font to ensure text renders even in environments without system fonts
try {
    const fontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf');
    GlobalFonts.registerFromPath(fontPath, 'FallbackSans');
} catch (e) {
    console.log('[SERVICE] Could not load fallback font:', e.message);
}

// Using MySQL supabaseAdmin client from @/lib/supabaseClient

/**
 * Robust Watermark Detection using OCR + High Contrast Pre-processing
 */
export async function detectWatermark(buffer, fileName = '') {
    try {
        console.log(`[SERVICE] Optimized Analysis for ${fileName}...`);
        
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        // 1. FAST PATH: Scan the bottom 45% where watermarks usually live
        // We crop and resize to 1000px width for optimal speed/accuracy trade-off
        const cropHeight = Math.floor(height * 0.45);
        const cropTop = height - cropHeight;
        
        const bottomBuffer = await sharp(buffer)
            .extract({ left: 0, top: cropTop, width, height: cropHeight })
            .resize(1000, null, { withoutEnlargement: true }) // Faster processing
            .grayscale()
            .normalize()
            .sharpen()
            .toBuffer();

        const base64Bottom = `data:image/jpeg;base64,${bottomBuffer.toString('base64')}`;
        const bottomOcr = await processOcr(base64Bottom, null, '2'); // Try Engine 2 first
        
        if (bottomOcr.hasWatermark) {
            console.log(`[SERVICE] Found watermark in bottom region: ${bottomOcr.catalogId} (Engine ${bottomOcr.engineUsed})`);
            return bottomOcr;
        }

        // 2. FALLBACK PATH: If bottom scan failed, try Engine 1 on a fast full-image scan
        // Engine 1 is faster for simple text detection on larger areas
        console.log(`[SERVICE] Bottom scan failed, trying fast full scan...`);
        const fullFastBuffer = await sharp(buffer)
            .resize(1000, null, { withoutEnlargement: true })
            .grayscale()
            .toBuffer();

        const base64Full = `data:image/jpeg;base64,${fullFastBuffer.toString('base64')}`;
        const mainOcr = await processOcr(base64Full, null, '1'); // Use Engine 1 for speed
        
        if (mainOcr.hasWatermark) {
            console.log(`[SERVICE] Found watermark on full scan: ${mainOcr.catalogId}`);
            return mainOcr;
        }

        return { hasWatermark: false };

    } catch (err) {
        console.error('[SERVICE] Detection error:', err);
        return { hasWatermark: false };
    }
}

/**
 * Apply Watermark to Image (Highly Robust Version)
 * USES CANVAS (@napi-rs/canvas) FOR TEXT RENDERING - More reliable than Sharp's SVG.
 */
export async function applyWatermark(buffer, code) {
    try {
        const text = (code || 'CAT-CODE').toUpperCase();
        console.log(`[SERVICE] Applying watermark "${text}" using Canvas...`);

        const img = await loadImage(buffer);
        const { width, height } = img;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 1. Draw original image
        ctx.drawImage(img, 0, 0);

        // 2. Setup font
        const fontSize = Math.max(22, Math.round(width * 0.045));
        ctx.font = `bold ${fontSize}px "FallbackSans", Arial, sans-serif`;

        // 3. Measure pill
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.35);
        const margin = Math.round(width * 0.03);

        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width || (fontSize * 0.6 * text.length); // Fallback if font still fails to measure
        const badgeW = textWidth + (paddingX * 2);
        const badgeH = fontSize + (paddingY * 2);

        const x = width - badgeW - margin;
        const y = height - badgeH - margin;

        // 4. Draw White Rectangular Background (Optimized for OCR)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; // Almost solid white
        
        // Simple sharp rectangle avoids OCR confusing curved borders with letters like 'C' or 'O'
        ctx.fillRect(x, y, badgeW, badgeH);

        // Subtle dark border to ensure contrast on white sarees
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, badgeW, badgeH);

        // 5. Draw Text in stark Black for maximum OCR accuracy
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + (badgeW / 2), y + (badgeH / 2) + (fontSize * 0.05));

        return canvas.toBuffer('image/jpeg', 90);

    } catch (err) {
        console.error('[SERVICE] Watermark application (Canvas) failed:', err);
        // Fallback to Sharp if Canvas fails for any reason
        return buffer;
    }
}
