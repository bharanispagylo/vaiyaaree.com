import { NextResponse } from 'next/server';
import { detectWatermark } from '@/lib/imageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        console.log(`[API-WM-DETECT] Fetching: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Analyze image using the robust service
        const detection = await detectWatermark(buffer, imageUrl.split('/').pop());
        
        return NextResponse.json({ 
            hasWatermark: detection.hasWatermark, 
            catalogId: detection.catalogId,
            detectedText: detection.detectedText,
            processed: true
        });
        
    } catch (error) {
        console.error('[API-WM-DETECT] Error:', error);
        return NextResponse.json({ 
            error: error.message,
            hasWatermark: false 
        }, { status: 500 });
    }
}
