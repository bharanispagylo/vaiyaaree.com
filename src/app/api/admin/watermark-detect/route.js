import { NextResponse } from 'next/server';
import { detectWatermark } from '@/lib/imageService';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        console.log(`[API-WM-DETECT] Analyzing: ${imageUrl}`);
        let buffer;

        if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
            const relPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
            const localFilePath = path.join(process.cwd(), 'public', relPath);
            if (fs.existsSync(localFilePath)) {
                buffer = await fs.promises.readFile(localFilePath);
            } else {
                // Fallback to fetch via base URL
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const response = await fetch(`${baseUrl}/${relPath}`);
                if (!response.ok) throw new Error(`Local fetch failed: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }
        } else {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Remote fetch failed: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }
        
        const fileNameHint = imageUrl.split('?')[0].split('/').pop() || 'image.jpg';
        const detection = await detectWatermark(buffer, fileNameHint);
        
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
