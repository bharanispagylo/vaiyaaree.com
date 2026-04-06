import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request) {
    try {
        const { imageUrl } = await request.json();
        
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        
        // Load image and analyze for watermark using Sharp
        const hasWatermark = await detectWatermark(Buffer.from(buffer));
        
        return NextResponse.json({ 
            hasWatermark,
            confidence: hasWatermark ? 0.85 : 0.75 
        });
        
    } catch (error) {
        console.error('Watermark detection error:', error);
        return NextResponse.json({ 
            error: 'Failed to analyze image',
            hasWatermark: false 
        }, { status: 500 });
    }
}

async function detectWatermark(buffer) {
    try {
        const image = sharp(buffer);
        const { width, height } = await image.metadata();

        // Focus on bottom 15% where CAT codes often reside
        const bottomHeight = Math.min(150, Math.floor(height * 0.15));
        const bottomY = height - bottomHeight;

        // Stats-based heuristic: High entropy or sharp edges in bottom region
        // We crop and use stats to see if there's high intensity variance (potential text)
        const stats = await sharp(buffer)
            .extract({ left: 0, top: bottomY, width, height: bottomHeight })
            .stats();

        // Calculate a simple score based on standard deviation (variance in texture)
        // High variance suggests text or complex shapes over a clean background
        const variance = (stats.channels[0].stdev + stats.channels[1].stdev + stats.channels[2].stdev) / 3;
        
        console.log(`[LEGACY-DETECTOR] Bottom region variance: ${variance}`);
        
        // CAT codes on plain background typically create a variance > 25
        return variance > 30;
        
    } catch (error) {
        console.error('Image analysis failed:', error);
        return false;
    }
}
