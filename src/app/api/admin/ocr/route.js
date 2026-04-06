import { NextResponse } from 'next/server';
import { processOcr } from '@/lib/ocrProcessor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const { base64Image, imageUrl } = await request.json();
        
        const result = await processOcr(base64Image, imageUrl);
        
        if (result.error) {
            throw new Error(result.error);
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('OCR API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
