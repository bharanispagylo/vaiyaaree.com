import { stampProductCode, uploadWatermarkedImage } from './imageStamp';

// Generate a new CAT code
export function generateCatCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CAT-${timestamp.toString().slice(-4)}${random}`;
}

// Process product image: validate, watermark, and upload
export async function processProductImage(imageFile, existingUrl = null) {
    try {
        // Step 1: Check if image has CAT code
        const hasCatCode = await checkForCatCode(imageFile, existingUrl);
        
        if (hasCatCode.detected) {
            return {
                success: false,
                error: 'CAT_CODE_DETECTED',
                catalogId: hasCatCode.catalogId,
                message: 'CAT code already present in image'
            };
        }

        // Step 2: Generate new CAT code
        const newCatCode = generateCatCode();
        console.log(`[CAT CODE] Generated new code: ${newCatCode}`);

        // Step 3: Get image URL (from file or existing URL)
        let imageUrl;
        if (existingUrl) {
            imageUrl = existingUrl;
        } else {
            // Upload original image to without-watermark folder first
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('skipDetection', 'true');
            formData.append('alreadyWatermarked', 'false');

            const uploadResponse = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload original image');
            }

            const uploadData = await uploadResponse.json();
            imageUrl = uploadData.url;
        }

        // Step 4: Add watermark to image
        const watermarkedBlob = await stampProductCode(imageUrl, newCatCode);
        
        // Step 5: Upload watermarked image
        const watermarkedUrl = await uploadWatermarkedImage(watermarkedBlob, newCatCode);

        return {
            success: true,
            catalogId: newCatCode,
            originalImageUrl: imageUrl,
            watermarkedImageUrl: watermarkedUrl,
            message: 'Image processed successfully with new CAT code'
        };

    } catch (error) {
        console.error('Error processing product image:', error);
        return {
            success: false,
            error: 'PROCESSING_ERROR',
            message: error.message || 'Failed to process image'
        };
    }
}

// Check if image has CAT code (fast Canvas-based version)
export async function checkForCatCode(imageFile, imageUrl = null) {
    try {
        // If we have a file, use fast Canvas detection
        if (imageFile) {
            const buffer = await imageFile.arrayBuffer();
            const imageBuffer = Buffer.from(buffer);
            
            // Use Canvas for fast pixel analysis
            const { createCanvas, loadImage } = await import('canvas');
            
            const image = await loadImage(imageBuffer);
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Focus on bottom-right corner where CAT codes are typically placed
            const checkWidth = Math.min(250, canvas.width * 0.4);
            const checkHeight = Math.min(120, canvas.height * 0.25);
            const startX = canvas.width - checkWidth;
            const startY = canvas.height - checkHeight;
            
            let textPixels = 0;
            let highContrastRegions = 0;
            let mediumBrightnessPixels = 0; // For semi-transparent backgrounds
            const step = 2; // Sample every 2nd pixel for better accuracy
            
            for (let y = startY; y < canvas.height - 10; y += step) {
                for (let x = startX; x < canvas.width - 10; x += step) {
                    const idx = (y * canvas.width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const brightness = (r + g + b) / 3;
                    
                    // CAT codes can use:
                    // - Very white text (brightness > 200)
                    // - Light text (brightness > 160)
                    // - Medium text on dark (brightness > 120 with dark surroundings)
                    if (brightness > 120) {
                        if (brightness > 200) {
                            textPixels++;
                        } else if (brightness > 160) {
                            textPixels += 0.8; // Weight light text less
                            mediumBrightnessPixels++;
                        } else {
                            textPixels += 0.5; // Weight medium text even less
                            mediumBrightnessPixels++;
                        }
                        
                        // Check surrounding pixels for contrast (text on background)
                        let darkPixels = 0;
                        let mediumPixels = 0;
                        for (let dy = -4; dy <= 4; dy++) {
                            for (let dx = -4; dx <= 4; dx++) {
                                const checkY = y + dy;
                                const checkX = x + dx;
                                if (checkY >= startY && checkY < canvas.height && 
                                    checkX >= startX && checkX < canvas.width) {
                                    const checkIdx = (checkY * canvas.width + checkX) * 4;
                                    const checkBrightness = (data[checkIdx] + data[checkIdx + 1] + data[checkIdx + 2]) / 3;
                                    if (checkBrightness < 80) { // Dark background
                                        darkPixels++;
                                    } else if (checkBrightness < brightness - 40) { // Medium contrast
                                        mediumPixels++;
                                    }
                                }
                            }
                        }
                        
                        // More lenient contrast requirements
                        const totalContrast = darkPixels + (mediumPixels * 0.5);
                        if (totalContrast >= 6) { // Reduced from 8
                            highContrastRegions++;
                        }
                    }
                }
            }
            
            const totalChecked = ((checkWidth * checkHeight) / (step * step));
            const textDensity = textPixels / totalChecked;
            const contrastDensity = highContrastRegions / totalChecked;
            
            // More lenient thresholds for CAT code detection
            // Also consider if we have medium brightness pixels (semi-transparent overlays)
            const hasMediumText = mediumBrightnessPixels > totalChecked * 0.005; // 0.5% medium text
            const hasCatCode = (
                (textDensity > 0.01 && textDensity < 0.3) || // More lenient text density
                hasMediumText
            ) && contrastDensity > 0.005; // More lenient contrast
            
            console.log(`[FAST CHECK] Text density: ${textDensity.toFixed(3)}, Contrast: ${contrastDensity.toFixed(3)}, Medium text: ${hasMediumText}, CAT code: ${hasCatCode}`);
            
            return { 
                detected: hasCatCode, 
                catalogId: hasCatCode ? 'CAT-DETECTED' : null 
            };
        }
        
        // If we only have a URL, use OCR for reliable detection
        if (imageUrl) {
            try {
                console.log(`[FAST CHECK] Using OCR for URL: ${imageUrl}`);
                
                // Use OCR directly for URLs - more reliable than downloading
                const response = await fetch('/api/admin/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imageUrl })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const hasCatCode = result.hasWatermark || result.catalogId;
                    
                    console.log(`[FAST CHECK] OCR result - Has CAT code: ${hasCatCode}, Catalog ID: ${result.catalogId}`);
                    
                    return { 
                        detected: hasCatCode, 
                        catalogId: result.catalogId || (hasCatCode ? 'CAT-DETECTED' : null)
                    };
                } else {
                    throw new Error('OCR request failed');
                }
                
            } catch (error) {
                console.log('[FAST CHECK] OCR detection failed:', error.message);
                return { detected: false, catalogId: null };
            }
        }
        
        return { detected: false, catalogId: null };
        
    } catch (error) {
        console.error('Error checking for CAT code:', error);
        return { detected: false, catalogId: null };
    }
}

// Validate media library image before using for product
export async function validateMediaImageForProduct(imageUrl) {
    try {
        console.log(`[PRODUCT] Validating image for CAT code: ${imageUrl}`);
        
        // Download the image with timeout and better error handling
        const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
                'Accept': 'image/*',
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            console.error(`[PRODUCT] HTTP error: ${response.status} ${response.statusText}`);
            return {
                valid: true,
                message: 'Failed to fetch image, allowing by default'
            };
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.error(`[PRODUCT] Invalid content type: ${contentType}`);
            return {
                valid: true,
                message: 'Invalid content type, allowing by default'
            };
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Check if we got valid data
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            console.error('[PRODUCT] Empty image data received');
            return {
                valid: true,
                message: 'Empty image data, allowing by default'
            };
        }
        
        // Check for common image signatures
        const view = new Uint8Array(arrayBuffer);
        const isJpeg = view[0] === 0xFF && view[1] === 0xD8;
        const isPng = view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47;
        const isWebp = view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50;
        
        if (!isJpeg && !isPng && !isWebp) {
            console.error('[PRODUCT] Invalid image format');
            return {
                valid: true,
                message: 'Invalid image format, allowing by default'
            };
        }
        
        const imageBuffer = Buffer.from(arrayBuffer);
        
        // Use the same Canvas detection as media library
        const hasCatCode = await detectWatermarkInBuffer(imageBuffer, 'product-image');
        
        console.log(`[PRODUCT] CAT code validation result: ${hasCatCode}`);
        
        if (hasCatCode) {
            return {
                valid: false,
                error: 'CAT_CODE_DETECTED',
                catalogId: 'CAT-DETECTED',
                message: 'This image already has a CAT code and cannot be used for products'
            };
        }
        
        return {
            valid: true,
            message: 'Image is valid for product use'
        };
        
    } catch (error) {
        console.error('[PRODUCT] CAT code validation error:', error);
        return {
            valid: true,
            message: 'Image validation failed, allowing by default'
        };
    }
}

// Canvas-based text detection from image (same as media library)
async function detectWatermarkInBuffer(imageBuffer, fileName = '') {
    try {
        console.log(`[PRODUCT] Reading text from image: ${fileName}`);
        
        // Validate buffer before processing
        if (!imageBuffer || imageBuffer.length === 0) {
            console.error('[PRODUCT] Empty image buffer provided');
            return false;
        }
        
        // Check for common image signatures to detect corruption
        const view = new Uint8Array(imageBuffer);
        const isJpeg = view[0] === 0xFF && view[1] === 0xD8;
        const isPng = view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47;
        const isWebp = view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50;
        
        if (!isJpeg && !isPng && !isWebp) {
            console.error('[PRODUCT] Invalid image format - may be corrupted');
            return false;
        }
        
        // Use Canvas to read text from image
        const { createCanvas, loadImage } = await import('canvas');
        
        let image;
        try {
            image = await loadImage(imageBuffer);
        } catch (loadError) {
            console.error('[PRODUCT] Failed to load image:', loadError.message);
            // If Canvas fails, image is likely corrupted - allow by default
            console.log('[PRODUCT] Allowing image due to Canvas loading failure');
            return false;
        }
        
        // Validate image dimensions
        if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
            console.error('[PRODUCT] Invalid image dimensions');
            return false;
        }
        
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        try {
            ctx.drawImage(image, 0, 0);
        } catch (drawError) {
            console.error('[PRODUCT] Failed to draw image to canvas:', drawError.message);
            return false;
        }
        
        // Focus on larger area including bottom-right where CAT codes usually are
        const checkWidth = Math.min(400, canvas.width * 0.6);
        const checkHeight = Math.min(200, canvas.height * 0.4);
        const startX = canvas.width - checkWidth;
        const startY = canvas.height - checkHeight;
        
        console.log(`[PRODUCT] Checking area: x=${startX}-${startX + checkWidth}, y=${startY}-${startY + checkHeight}`);
        
        // Get image data from bottom-right area
        let imageData;
        try {
            imageData = ctx.getImageData(startX, startY, checkWidth, checkHeight);
        } catch (dataError) {
            console.error('[PRODUCT] Failed to get image data:', dataError.message);
            return false;
        }
        
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
        
        console.log(`[PRODUCT] Found ${brightPixels.length} bright pixels (brightness > 160)`);
        
        // Need fewer bright pixels to indicate text
        if (brightPixels.length > 20) {
            // Group bright pixels into potential text regions
            const textRegions = groupPixelsIntoRegions(brightPixels);
            console.log(`[PRODUCT] Found ${textRegions.length} potential text regions`);
            
            // Check if regions look like text (linear patterns)
            let textLikeRegions = 0;
            for (const region of textRegions) {
                if (isTextLikeRegion(region)) {
                    textLikeRegions++;
                }
            }
            
            console.log(`[PRODUCT] Found ${textLikeRegions} text-like regions`);
            
            // Need at least 1 text-like region to be CAT code
            if (textLikeRegions >= 1) {
                console.log(`[PRODUCT] Text region detected - likely CAT code present`);
                return true;
            }
        }
        
        console.log(`[PRODUCT] No text detected in image`);
        return false;
        
    } catch (error) {
        console.error('[PRODUCT] Canvas detection error:', error);
        // If any error occurs, allow the image by default
        console.log('[PRODUCT] Allowing image due to detection error');
        return false;
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
    
    console.log(`[PRODUCT TEXT CHECK] Region: ${region.length} pixels, size: ${width}x${height}, ratio: ${aspectRatio.toFixed(2)}, density: ${density.toFixed(3)} -> ${hasTextShape && hasLinearPattern ? 'TEXT-LIKE' : 'NOT TEXT'}`);
    
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
