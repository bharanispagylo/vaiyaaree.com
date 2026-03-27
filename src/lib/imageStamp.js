/**
 * stampProductCode
 * 
 * Loads an image onto an HTML Canvas, stamps a short product code badge
 * in the bottom-right corner, and returns a Blob of the resulting PNG.
 *
 * @param {string} imageUrl  - Public image URL or base64 data URL
 * @param {string} code      - Short product code, e.g. "ASR-042"
 * @returns {Promise<Blob>}
 */
export async function stampProductCode(imageUrl, code) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Badge — clearly visible in bottom-right corner
            const padding = 14;
            const fontSize = Math.min(64, Math.max(24, Math.round(canvas.width * 0.045)));
            ctx.font = `bold ${fontSize}px 'Outfit', 'Inter', 'Segoe UI', system-ui, sans-serif`;

            const textWidth = ctx.measureText(code).width;
            const badgeW = textWidth + padding * 2;
            const badgeH = fontSize + padding * 1.5;

            // Glue to bottom-right corner with a decent margin
            const margin = 12;
            const x = canvas.width - badgeW - margin;
            const y = canvas.height - badgeH - margin;

            // Semi-transparent dark background pill
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            roundRect(ctx, x, y, badgeW, badgeH, 4);
            ctx.fill();

            // Subtle white border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 0.8;
            roundRect(ctx, x, y, badgeW, badgeH, 4);
            ctx.stroke();

            // White text
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px 'Outfit', 'Inter', 'Segoe UI', system-ui, sans-serif`;
            ctx.fillText(code, x + padding, y + fontSize + padding * 0.25);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/jpeg', 0.92);
        };

        img.onerror = () => reject(new Error('Failed to load image: ' + imageUrl));
        img.src = imageUrl;
    });
}

/**
 * Helper: draw a rounded rectangle path
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * uploadWatermarkedImage
 * 
 * Takes a raw blob (from stampProductCode) and uploads it via the server
 * API route, returning the public URL.
 *
 * @param {Blob} blob
 * @param {string} code  - Used to name the file
 * @returns {Promise<string>} publicUrl
 */
export async function uploadWatermarkedImage(blob, catalogId) {
    const formData = new FormData();
    formData.append('file', blob, `${catalogId}-watermarked.jpg`);
    formData.append('catalogId', catalogId); // Pass catalog ID to upload

    console.log('Uploading watermarked image with catalog ID:', catalogId);

    const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    console.log('Upload response:', data);

    if (!res.ok) {
        console.error('Upload failed:', data.error);
        throw new Error(data.error || 'Upload failed');
    }

    console.log('Upload successful, URL:', data.url);
    return data.url;
}

