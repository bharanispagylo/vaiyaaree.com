import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { base64Image } = await request.json();
        if (!base64Image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const ocrApiKey = process.env.OCR_SPACE_API_KEY || 'K85953559988957';

        // Step 1: Call OCR.space API
        const callOcr = async (engine) => {
            const params = new URLSearchParams({
                base64Image, language: 'eng', isOverlayRequired: 'false',
                detectOrientation: 'true', scale: 'true', OCREngine: engine, isTable: 'false',
            });
            const res = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: { 'apikey': ocrApiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            return res.json();
        };

        let ocrJson = await callOcr('2');
        let detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';

        if (!detectedText.trim() || ocrJson.IsErroredOnProcessing) {
            ocrJson = await callOcr('1');
            detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
        }

        // Pattern matching for Catalog IDs (matches pattern like CAT-XXXXX or ASR-XXXXX)
        const patterns = [
            /CAT[-\s]?([A-Z0-9]{3,8})/i,
            /ASR[-\s]?([A-Z0-9]{3,8})/i,
            /CP[-\s]?([A-Z0-9]{3,8})/i,
            /([A-Z]{2,3})[-\s]([A-Z0-9]{3,8})/i,
        ];

        let catalogId = null;
        for (const pattern of patterns) {
            const m = detectedText.match(pattern);
            if (m) {
                const code = (m[1] + (m[2] || '')).replace(/[-\s]/g, '').toUpperCase();
                if (code.length >= 4) {
                    catalogId = code;
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
