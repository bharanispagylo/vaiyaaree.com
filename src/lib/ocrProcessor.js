/**
 * Core OCR logical processor
 * Handles communication with OCR.space and pattern matching for catalog IDs.
 */

export async function processOcr(base64Image, imageUrl) {
    const ocrApiKey = process.env.OCR_SPACE_API_KEY || 'K85953559988957';

    const callOcr = async (engine) => {
        const formData = new URLSearchParams();
        formData.append('apikey', ocrApiKey);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', engine);
        formData.append('isTable', 'false');

        if (base64Image) {
            formData.append('base64Image', base64Image);
        } else if (imageUrl) {
            formData.append('url', imageUrl);
        } else {
            throw new Error('No image source provided for OCR');
        }

        const res = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        
        if (!res.ok) throw new Error(`OCR.space returned ${res.status}`);
        return res.json();
    };

    try {
        let ocrJson = await callOcr('2');
        let detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
        
        if (!detectedText.trim() || ocrJson.IsErroredOnProcessing) {
            console.log(`[OCR-LIB] Engine 2 failed, trying Engine 1...`);
            ocrJson = await callOcr('1');
            detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
        }

        const patterns = [
            { regex: /(?:CAT|GAT|CRT|OAT|CAI|LAT|CHT)[-\s]?([A-Z0-9]{3,10})/i, prefix: 'CAT-' },
            { regex: /ASR[-\s]?([A-Z0-9]{3,10})/i, prefix: 'ASR-' },
            { regex: /CP[-\s]?([A-Z0-9]{3,10})/i, prefix: 'CP-' },
            { regex: /([A-Z]{2,4})[-\s]([A-Z0-9]{3,10})/i, prefix: '' }
        ];

        let catalogId = null;
        for (const pattern of patterns) {
            const match = detectedText.match(pattern.regex);
            if (match) {
                let codePart;
                if (pattern.prefix) {
                    codePart = match[1].trim().toUpperCase();
                } else {
                    codePart = (match[1] + '-' + match[2]).trim().toUpperCase();
                }
                
                if (codePart.length >= 3) {
                    catalogId = pattern.prefix ? (pattern.prefix + codePart) : codePart;
                    break;
                }
            }
        }

        return {
            hasWatermark: !!catalogId,
            catalogId,
            detectedText
        };
    } catch (err) {
        console.error('[OCR-LIB] Processing failed:', err);
        return { hasWatermark: false, error: err.message };
    }
}
