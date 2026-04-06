import { stampProductCode, uploadWatermarkedImage } from './imageStamp';
import { detectWatermark } from './watermarkDetection';

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
        const hasWatermark = await detectWatermark(imageFile || existingUrl);
        
        if (hasWatermark) {
            return {
                success: false,
                error: 'CAT_CODE_DETECTED',
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

// Check if image has CAT code (Uses robust backend OCR)
export async function checkForCatCode(imageFile, imageUrl = null) {
    try {
        // If we have a file, we must check it via backend
        if (imageFile) {
            console.log('[FAST CHECK] Checking file for watermark via backend...');
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('checkOnly', 'true');
            
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            return { 
                detected: data.hasWatermark || false, 
                catalogId: data.catalogId || null 
            };
        }
        
        // If we have a URL, use OCR directly
        if (imageUrl) {
            console.log(`[FAST CHECK] Checking URL for watermark via backend: ${imageUrl}`);
            const response = await fetch('/api/admin/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: imageUrl })
            });
            
            if (response.ok) {
                const result = await response.json();
                return { 
                    detected: result.hasWatermark || result.catalogId || false, 
                    catalogId: result.catalogId || null
                };
            }
        }
        
        return { detected: false, catalogId: null };
    } catch (error) {
        console.error('[FAST CHECK] Detection failed:', error);
        return { detected: false, catalogId: null };
    }
}

// Validate media library image before using for product (Uses robust backend)
export async function validateMediaImageForProduct(imageUrl) {
    try {
        console.log(`[PRODUCT] Validating image via backend OCR: ${imageUrl}`);
        const response = await fetch('/api/admin/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: imageUrl })
        });
        
        if (!response.ok) throw new Error('OCR validation failed');
        
        const result = await response.json();
        if (result.hasWatermark || result.catalogId) {
            return {
                valid: false,
                error: 'CAT_CODE_DETECTED',
                catalogId: result.catalogId || 'CAT-DETECTED',
                message: 'This image already has a CAT code and cannot be used for products'
            };
        }
        
        return { valid: true, message: 'Image is valid' };
    } catch (error) {
        console.error('[PRODUCT] Validation error:', error);
        return { valid: true, message: 'Validation failed, allowing by default' };
    }
}

// Legacy function stub (No longer used/working in browser)
async function detectWatermarkInBuffer(imageBuffer, fileName = '') {
    console.warn('[PRODUCT] detectWatermarkInBuffer is deprecated in browser.');
    return false;
}

// Helper stubs to prevent import errors if still used elsewhere
function groupPixelsIntoRegions() { return []; }
function isTextLikeRegion() { return false; }
