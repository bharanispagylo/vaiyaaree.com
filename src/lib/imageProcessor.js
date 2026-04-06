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
 * Apply Watermark to Image using Sharp (Vercel-compatible)
 */
export async function applyWatermark(buffer, code) {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        const text = code.toUpperCase();
        
        // Scale font and dimensions based on image width
        const fontSize = Math.max(22, Math.round(width * 0.04));
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.4);
        
        // Estimate badge dimensions (SVG text doesn't give us measurements server-side easily)
        // Average char width factor for sans-serif bold is ~0.65
        const estTextWidth = Math.round(text.length * fontSize * 0.65);
        const badgeW = estTextWidth + (paddingX * 2);
        const badgeH = fontSize + (paddingY * 2);
        const margin = 20;

        const x = width - badgeW - margin;
        const y = height - badgeH - margin;

        // Create an SVG overlay for the watermark badge
        const svgBadge = `
            <svg width="${badgeW}" height="${badgeH}" viewBox="0 0 ${badgeW} ${badgeH}">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="0" dy="2" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.5" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect x="2" y="2" width="${badgeW - 4}" height="${badgeH - 4}" rx="10" 
                    fill="rgba(0, 0, 0, 0.7)" 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    stroke-width="2" 
                    filter="url(#shadow)" />
                <text x="50%" y="54%" 
                    dominant-baseline="middle" 
                    text-anchor="middle" 
                    font-family="sans-serif" 
                    font-size="${fontSize}" 
                    font-weight="bold" 
                    fill="white">${text}</text>
            </svg>
        `;

        return await image
            .composite([{
                input: Buffer.from(svgBadge),
                top: y,
                left: x
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

    } catch (err) {
        console.error('[PROCESSOR] Watermark application failed:', err);
        throw err;
    }
}
