import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { processOcr } from './ocrProcessor';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

/**
 * Robust Watermark Detection using Sharp (Vercel-compatible)
 */
export async function detectWatermark(buffer, fileName = '') {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        console.log(`[PROCESSOR] Analyzing ${fileName} (${width}x${height})`);

        // PIXEL ANALYSIS fallback: Sharp doesn't give raw pixels as easily as Canvas, 
        // but we can use stats() or just trigger OCR based on the fact that we WANT to check all images.
        // For efficiency, we only OCR images that look like they might have text in the bottom region.
        
        // 1. Try OCR on the full image first
        const fullResult = await callOcrApi(buffer, fileName);
        if (fullResult.hasWatermark) return fullResult;

        // 2. Try OCR on an ENHANCED crop of the bottom region
        // Watermarks usually live in the bottom 40%
        const cropHeight = Math.floor(height * 0.4);
        const cropTop = height - cropHeight;

        console.log(`[PROCESSOR] Generic OCR failed, trying enhanced bottom crop...`);
        
        const enhancedBuffer = await sharp(buffer)
            .extract({ left: 0, top: cropTop, width, height: cropHeight })
            .grayscale()
            .normalize() // Boost contrast
            .threshold(128) // Make it B&W for OCR engines
            .toBuffer();

        return await callOcrApi(enhancedBuffer, 'enhanced-' + fileName);

    } catch (err) {
        console.error('[PROCESSOR] Detection critical error:', err);
        return { hasWatermark: false };
    }
}

async function callOcrApi(buffer, fileName) {
    try {
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        return await processOcr(base64Image);
    } catch (err) {
        console.error('[PROCESSOR] OCR processing failed:', err);
        return { hasWatermark: false };
    }
}

/**
 * Apply Watermark to Image (Vercel-compatible)
 * This version uses @napi-rs/canvas if available, but falls back to SVG + Sharp
 * if the native bindings are missing (common in local Windows dev or sparse environments).
 */
export async function applyWatermark(buffer, code) {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        const text = (code || 'CAT-CODE').toUpperCase();
        
        // Scale font and dimensions based on image width
        const fontSize = Math.max(22, Math.round(width * 0.04));
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.4);
        
        const margin = 20;

        // Try using @napi-rs/canvas if native binding is available
        let badgeBuffer;
        let badgeW, badgeH;
        let x, y;

        try {
            const { createCanvas } = await import('@napi-rs/canvas');
            
            // Success: Use Canvas
            const canvas = createCanvas(1, 1);
            const ctx = canvas.getContext('2d');
            ctx.font = `bold ${fontSize}px DejaVu Sans, Arial, Helvetica, Liberation Sans, sans-serif, monospace`;
            const metrics = ctx.measureText(text);
            
            badgeW = Math.round(metrics.width + (paddingX * 2));
            badgeH = Math.round(fontSize + (paddingY * 2));
            
            x = width - badgeW - margin;
            y = height - badgeH - margin;

            const badgeCanvas = createCanvas(badgeW, badgeH);
            const bCtx = badgeCanvas.getContext('2d');

            bCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            const r = 12;
            bCtx.beginPath();
            bCtx.moveTo(r, 0); bCtx.lineTo(badgeW - r, 0); bCtx.quadraticCurveTo(badgeW, 0, badgeW, r);
            bCtx.lineTo(badgeW, badgeH - r); bCtx.quadraticCurveTo(badgeW, badgeH, badgeW - r, badgeH);
            bCtx.lineTo(r, badgeH); bCtx.quadraticCurveTo(0, badgeH, 0, badgeH - r);
            bCtx.lineTo(0, r); bCtx.quadraticCurveTo(0, 0, r, 0);
            bCtx.closePath();
            bCtx.fill();

            bCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            bCtx.lineWidth = 2;
            bCtx.stroke();

            bCtx.fillStyle = 'white';
            bCtx.font = `bold ${fontSize}px DejaVu Sans, Arial, Helvetica, Liberation Sans, sans-serif, monospace`;
            bCtx.textAlign = 'center';
            bCtx.textBaseline = 'middle';
            bCtx.fillText(text, badgeW / 2, badgeH / 2 + (fontSize * 0.05));

            badgeBuffer = await badgeCanvas.toBuffer('image/png');

        } catch (e) {
            console.warn('[PROCESSOR] @napi-rs/canvas failed (likely missing native binding), falling back to SVG');
            
            // Fallback: Use SVG
            // Estimate badge dimensions
            const estTextWidth = Math.round(text.length * fontSize * 0.65);
            badgeW = estTextWidth + (paddingX * 2);
            badgeH = fontSize + (paddingY * 2);
            
            x = width - badgeW - margin;
            y = height - badgeH - margin;

            const svgBadge = `
                <svg width="${badgeW}" height="${badgeH}" viewBox="0 0 ${badgeW} ${badgeH}">
                    <rect x="0" y="0" width="${badgeW}" height="${badgeH}" rx="12" 
                        fill="rgba(0, 0, 0, 0.75)" stroke="rgba(255, 255, 255, 0.3)" stroke-width="2" />
                    <text x="${badgeW / 2}" y="${badgeH / 2 + (fontSize * 0.35)}" 
                        text-anchor="middle" 
                        font-family="monospace, DejaVu Sans, Arial, sans-serif" 
                        font-size="${fontSize}" 
                        font-weight="bold" 
                        fill="white">${text}</text>
                </svg>
            `;
            badgeBuffer = Buffer.from(svgBadge);
        }

        return await image
            .composite([{
                input: badgeBuffer,
                top: Math.max(0, y),
                left: Math.max(0, x)
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

    } catch (err) {
        console.error('[PROCESSOR] Watermark application failed:', err);
        throw err;
    }
}
