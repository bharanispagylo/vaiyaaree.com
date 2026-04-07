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
 * Apply Watermark to Image (Vercel & Turbopack compatible)
 * This version uses SVG + Sharp for maximum portability and to avoid native module build errors.
 * It uses a monospace font stack to ensure predictable character rendering on Vercel/Linux.
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

        /**
         * FONT STABILITY ON VERCEL:
         * Monospace fonts (Courier, Liberation Mono, etc.) are the most reliably present 
         * fonts across Linux distributions. They also have a predictable width (approx 0.6 * fontSize),
         * allowing us to calculate the badge width accurately without local font metrics.
         */
        const charWidthFactor = 0.6;
        const badgeW = Math.round((text.length * fontSize * charWidthFactor) + (paddingX * 2));
        const badgeH = Math.round(fontSize + (paddingY * 2));

        const x = width - badgeW - margin;
        const y = height - badgeH - margin;

        // Create a robust SVG overlay
        const svgBadge = `
            <svg width="${badgeW}" height="${badgeH}" viewBox="0 0 ${badgeW} ${badgeH}">
                <rect x="1" y="1" width="${badgeW - 2}" height="${badgeH - 2}" rx="12" 
                    fill="rgba(0, 0, 0, 0.75)" 
                    stroke="rgba(255, 255, 255, 0.3)" 
                    stroke-width="2" />
                <text x="${badgeW / 2}" y="${badgeH / 2 + (fontSize * 0.35)}" 
                    text-anchor="middle" 
                    font-family="monospace, DejaVu Sans Mono, Liberation Mono, Courier New, Courier" 
                    font-size="${fontSize}" 
                    font-weight="bold" 
                    fill="white">${text}</text>
            </svg>
        `;

        return await image
            .composite([{
                input: Buffer.from(svgBadge),
                top: Math.max(0, Math.floor(y)),
                left: Math.max(0, Math.floor(x))
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

    } catch (err) {
        console.error('[PROCESSOR] Watermark application failed:', err);
        throw err;
    }
}
