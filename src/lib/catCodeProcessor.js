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

// Check if image has CAT code
export async function checkForCatCode(imageFile, imageUrl = null) {
    const detected = await detectWatermark(imageFile || imageUrl);
    return {
        detected,
        catalogId: detected ? 'CAT-DETECTED' : null
    };
}

// Validate media library image before using for product
export async function validateMediaImageForProduct(imageUrl) {
    const hasWatermark = await detectWatermark(imageUrl);
    if (hasWatermark) {
        return {
            valid: false,
            error: 'CAT_CODE_DETECTED',
            message: 'This image already has a CAT code and cannot be used for products'
        };
    }
    return { valid: true };
}
