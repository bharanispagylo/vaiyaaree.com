import { createCanvas, loadImage } from '@napi-rs/canvas';
import { processOcr } from '@/lib/ocrProcessor';

/**
 * Robust Watermark Detection using Canvas + OCR.space
 */
export async function detectWatermark(buffer, fileName = '') {
    if (!buffer || buffer.length === 0) {
        return { hasWatermark: false };
    }

    try {
        console.log(`[SERVICE] Analyzing watermark for ${fileName || 'image'}...`);
        
        let img;
        try {
            img = await loadImage(buffer);
        } catch (imgErr) {
            console.warn('[SERVICE] loadImage failed during detection:', imgErr?.message);
            const base64Raw = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            const directOcr = await processOcr(base64Raw, null, '2');
            return directOcr || { hasWatermark: false };
        }

        const { width, height } = img;
        if (!width || !height) {
            return { hasWatermark: false };
        }

        // 1. Scan the bottom 45% where watermarks usually reside
        const cropHeight = Math.max(20, Math.floor(height * 0.45));
        const cropTop = height - cropHeight;
        const targetWidth = Math.min(width, 1000);
        const targetHeight = Math.max(20, Math.round(cropHeight * (targetWidth / width)));

        const canvas = createCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, cropTop, width, cropHeight, 0, 0, targetWidth, targetHeight);

        const bottomBuffer = canvas.toBuffer('image/jpeg', 85);
        const base64Bottom = `data:image/jpeg;base64,${bottomBuffer.toString('base64')}`;
        const bottomOcr = await processOcr(base64Bottom, null, '2');

        if (bottomOcr?.hasWatermark) {
            console.log(`[SERVICE] Found watermark: ${bottomOcr.catalogId}`);
            return bottomOcr;
        }

        return { hasWatermark: false };

    } catch (err) {
        console.error('[SERVICE] Detection error:', err?.message);
        return { hasWatermark: false };
    }
}

/**
 * Apply Watermark to Image using Canvas
 */
export async function applyWatermark(buffer, code) {
    if (!buffer || buffer.length === 0) {
        return buffer;
    }

    try {
        const text = (code || 'CAT-CODE').toUpperCase();
        console.log(`[SERVICE] Applying watermark "${text}" using Canvas...`);

        const img = await loadImage(buffer);
        const { width, height } = img;

        if (!width || !height) {
            return buffer;
        }

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 1. Draw original image
        ctx.drawImage(img, 0, 0);

        // 2. Setup font
        const fontSize = Math.max(22, Math.round(width * 0.045));
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        // 3. Measure pill
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.35);
        const margin = Math.round(width * 0.03);

        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width || (fontSize * 0.6 * text.length);
        const badgeW = textWidth + (paddingX * 2);
        const badgeH = fontSize + (paddingY * 2);

        const x = width - badgeW - margin;
        const y = height - badgeH - margin;

        // 4. Draw White Rectangular Background (Optimized for OCR)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(x, y, badgeW, badgeH);

        // Subtle dark border to ensure contrast on white fabrics
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
        console.error('[SERVICE] Watermark application failed:', err?.message);
        return buffer;
    }
}
