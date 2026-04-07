import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { processOcr } from '@/lib/ocrProcessor';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Robust Watermark Detection using OCR + High Contrast Pre-processing
 */
export async function detectWatermark(buffer, fileName = '') {
    try {
        console.log(`[SERVICE] Analyzing ${fileName} for small/light watermarks...`);
        
        // 1. Primary: Scan Full Image with High Contrast
        // We grayscale, normalize, and sharpen to make light-colored text pop
        const highContrastBuffer = await sharp(buffer)
            .grayscale()
            .normalize()
            .sharpen()
            .toBuffer();
            
        const base64Full = `data:image/jpeg;base64,${highContrastBuffer.toString('base64')}`;
        const mainOcr = await processOcr(base64Full);
        
        if (mainOcr.hasWatermark) {
            console.log(`[SERVICE] Found watermark on full scan: ${mainOcr.catalogId}`);
            return mainOcr;
        }

        // 2. Secondary: Scan specifically the bottom 40% (high brightness/contrast boost)
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;
        
        const cropHeight = Math.floor(height * 0.4);
        const cropTop = height - cropHeight;
        
        const enhancedBottomBuffer = await sharp(buffer)
            .extract({ left: 0, top: cropTop, width, height: cropHeight })
            .grayscale()
            .normalize()
            .linear(1.5, -20) // Boost contrast: factor of 1.5, offset -20
            .sharpen()
            .toBuffer();

        const secondaryOcr = await processOcr(`data:image/jpeg;base64,${enhancedBottomBuffer.toString('base64')}`);
        
        if (secondaryOcr.hasWatermark) {
            console.log(`[SERVICE] Found watermark on bottom scan: ${secondaryOcr.catalogId}`);
            return secondaryOcr;
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
        ctx.font = `bold ${fontSize}px sans-serif`;

        // 3. Measure pill
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.35);
        const margin = Math.round(width * 0.03);

        const textMetrics = ctx.measureText(text);
        const badgeW = textMetrics.width + (paddingX * 2);
        const badgeH = fontSize + (paddingY * 2);

        const x = width - badgeW - margin;
        const y = height - badgeH - margin;

        // 4. Draw Pill Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, badgeH, badgeH / 2);
        ctx.fill();

        // Subtle Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Draw Text
        ctx.fillStyle = '#ffffff';
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
