import { stampProductCode, uploadWatermarkedImage } from './imageStamp';
import { detectWatermark } from './watermarkDetection';

// Generate a new CAT code
export function generateCatCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CAT-${timestamp.toString().slice(-4)}${random}`;
}

// Process product image: validate, watermark, and upload
// Process product image: validate, watermark, and upload in ONE high-performance backend call
export async function processProductImage(imageFile, existingUrl = null) {
    try {
        let file = imageFile;

        // If we only have a URL, fetch it and convert to a File object
        if (!file && existingUrl) {
            console.log(`[CAT CODE] Downloading library image for processing: ${existingUrl}`);
            const response = await fetch(existingUrl);
            const blob = await response.blob();
            file = new File([blob], `media-image-${Date.now()}.jpg`, { type: blob.type });
        }

        if (!file) throw new Error('No image source provided');

        // Prepare single-call upload (Backend handles OCR, storage, and double-versioning)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requireClean', 'true'); // Enforce Requirement 2

        console.log('[CAT CODE] Initiating high-performance backend processing...');
        const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error === 'Watermark already present') {
                return {
                    success: false,
                    error: 'CAT_CODE_DETECTED',
                    catalogId: data.catalogId,
                    message: 'Watermark already present. Please use a clean image.'
                };
            }
            throw new Error(data.error || 'Processing failed');
        }

        console.log(`[CAT CODE] Processing complete. Catalog ID: ${data.catalogId}`);

        return {
            success: true,
            catalogId: data.catalogId,
            originalImageUrl: data.originalUrl,
            watermarkedImageUrl: data.watermarkedUrl,
            message: 'Image processed successfully by backend'
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
