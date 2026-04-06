/**
 * detectWatermark
 * 
 * Browser-compatible watermark detection using native Canvas.
 * Checks for text-like regions in the bottom-right of the image.
 * 
 * @param {string|File|Blob} imageSource - URL, File or Blob of the image
 * @returns {Promise<boolean>} - True if watermark detected
 */
export async function detectWatermark(imageSource) {
    try {
        let imageUrl;
        if (typeof imageSource === 'string') {
            imageUrl = imageSource;
        } else {
            imageUrl = URL.createObjectURL(imageSource);
        }

        // Safety timeout: Never take more than 2 seconds
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.log('[DETECTION] Timeout reached, allowing image');
                resolve(false);
            }, 2000);
        });

        const detectionPromise = new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Analyze at lower resolution for speed
                const maxDim = 800;
                const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Focus on bottom-right corner (standard placement for watermarks)
                const checkWidth = Math.min(300, canvas.width * 0.5);
                const checkHeight = Math.min(150, canvas.height * 0.3);
                const startX = canvas.width - checkWidth;
                const startY = canvas.height - checkHeight;

                const imageData = ctx.getImageData(startX, startY, checkWidth, checkHeight);
                const data = imageData.data;

                /**
                 * HIGH PERFORMANCE SCANLINE ANALYSIS
                 * instead of clustering, we scan for horizontal bands of brightness
                 * which is characteristic of text lines.
                 */
                const rowDensity = new Float32Array(checkHeight);
                const brightnessThres = 175; // Typical text brightness
                
                for (let y = 0; y < checkHeight; y++) {
                    let brightCount = 0;
                    for (let x = 0; x < checkWidth; x++) {
                        const idx = (y * checkWidth + x) * 4;
                        const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                        if (brightness > brightnessThres) {
                            brightCount++;
                        }
                    }
                    rowDensity[y] = brightCount / checkWidth;
                }

                // Look for a band of rows that have "text-like" density
                // Text rows usually have 5-30% bright pixel density depending on whitespace
                let textBands = 0;
                let currentBandHeight = 0;
                
                for (let y = 0; y < checkHeight; y++) {
                    const density = rowDensity[y];
                    // Row density for text is usually between 2% and 40%
                    if (density > 0.02 && density < 0.45) {
                        currentBandHeight++;
                    } else {
                        // Text height in analyzed canvas is usually 5-30 pixels
                        if (currentBandHeight >= 4 && currentBandHeight <= 40) {
                            textBands++;
                        }
                        currentBandHeight = 0;
                    }
                }

                console.log(`[DETECTION] Detected ${textBands} potential text horizontal bands`);
                
                // CAT code watermark usually forms 1 or 2 distinct text lines in the corner
                resolve(textBands >= 1 && textBands <= 3);
            };

            img.onerror = () => {
                console.error('[DETECTION] Failed to load image');
                resolve(false);
            };

            img.src = imageUrl;
        });

        const result = await Promise.race([detectionPromise, timeoutPromise]);

        if (typeof imageSource !== 'string') {
            URL.revokeObjectURL(imageUrl);
        }

        return result;

    } catch (error) {
        console.error('[DETECTION] Error:', error);
        return false;
    }
}
