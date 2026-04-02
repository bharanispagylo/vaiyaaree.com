import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const { base64Image, imageUrl } = await request.json();
        const ocrApiKey = process.env.OCR_SPACE_API_KEY || 'K85953559988957';

        // Step 1: Prepare fetch call to OCR.space API
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
                throw new Error('No image source provided');
            }

            const res = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            return res.json();
        };

        let ocrJson = await callOcr('2');
        let detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';

        if (!detectedText.trim() || ocrJson.IsErroredOnProcessing) {
            ocrJson = await callOcr('1');
            detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
        }

        // Patterns to detect our specific watermark formats (CAT-XXXXX, etc.)
        const patterns = [
            // Matches CAT-A7B2C or similar alphanumeric patterns
            { regex: /CAT[-\s]?([A-Z0-9]{3,8})/i, prefix: 'CAT-' },
            { regex: /ASR[-\s]?([A-Z0-9]{3,8})/i, prefix: 'ASR-' },
            { regex: /CP[-\s]?([A-Z0-9]{3,8})/i, prefix: 'CP-' },
            { regex: /([A-Z]{2,3})[-\s]([A-Z0-9]{3,8})/i, prefix: '' }
        ];

        let catalogId = null;
        for (const pattern of patterns) {
            const match = detectedText.match(pattern.regex);
            if (match) {
                // Determine the code part based on whether we matched a prefix or a generic ID
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

        return NextResponse.json({
            hasWatermark: !!catalogId,
            catalogId: catalogId,
            detectedText: detectedText
        });

    } catch (err) {
        console.error('OCR API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
