import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { imageUrl } = await request.json();
        
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        // Load image and analyze for watermark
        const hasWatermark = await detectWatermark(imageUrl);
        
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

async function detectWatermark(imageUrl) {
    try {
        // Robust dynamic import for Vercel-friendly native binaries
        let canvasLib;
        try {
            canvasLib = await import('@napi-rs/canvas');
        } catch (e) {
            console.error('[DETECTOR] Native Canvas (napi-rs) not loaded:', e.message);
            return false;
        }

        const { createCanvas, loadImage } = canvasLib;
        const image = await loadImage(imageUrl);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check bottom 15% where text watermarks like "CAT-XXXXX" typically appear
        const bottomHeight = Math.min(150, Math.floor(canvas.height * 0.15));
        const bottomY = canvas.height - bottomHeight;
        
        // Analyze bottom region
        const bottomRegion = getRegionData(data, canvas.width, canvas.height, 
            0, bottomY, canvas.width, bottomHeight);
        
        // Multiple detection strategies for text watermarks
        const textDetectionScore = detectTextLines(bottomRegion, canvas.width);
        const highContrastScore = detectHighContrastRegions(bottomRegion, canvas.width);
        const patternScore = detectRepeatingPatterns(bottomRegion, canvas.width);
        
        // Log scores for debugging
        console.log('Watermark detection:', { 
            textScore: textDetectionScore, 
            contrastScore: highContrastScore, 
            patternScore: patternScore,
            url: imageUrl 
        });
        
        // CAT codes like "CAT-XXXXX" create:
        // 1. Sharp edges between text and background
        // 2. Horizontal text lines
        // 3. Repeating patterns
        // Lower thresholds for better sensitivity to CAT codes
        // Increased thresholds to be more conservative (avoid CAT codes as watermarks)
        const hasWatermark = textDetectionScore > 0.25 || highContrastScore > 0.3 || patternScore > 0.45;
        
        console.log('Watermark detection result:', { 
            hasWatermark,
            textScore: textDetectionScore, 
            contrastScore: highContrastScore, 
            patternScore: patternScore
        });
        
        return hasWatermark;
        
    } catch (error) {
        console.error('Image analysis failed:', error);
        return false;
    }
}

// Detect horizontal text lines
function detectTextLines(pixels, width) {
    if (pixels.length === 0 || width === 0) return 0;
    
    const height = Math.floor(pixels.length / width);
    let textLineCount = 0;
    
    for (let y = 0; y < height; y++) {
        const rowStart = y * width;
        const rowEnd = Math.min(rowStart + width, pixels.length);
        const rowPixels = pixels.slice(rowStart, rowEnd);
        
        if (rowPixels.length < 50) continue;
        
        // Calculate brightness for this row
        const brightnesses = rowPixels.map(p => (p.r + p.g + p.b) / 3);
        const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
        
        // Count sharp transitions (edges of text characters)
        let sharpTransitions = 0;
        let darkPixels = 0;
        let lightPixels = 0;
        
        for (let i = 0; i < brightnesses.length - 1; i++) {
            const diff = Math.abs(brightnesses[i] - brightnesses[i + 1]);
            if (diff > 40) sharpTransitions++;
            
            if (brightnesses[i] < avgBrightness - 30) darkPixels++;
            else if (brightnesses[i] > avgBrightness + 30) lightPixels++;
        }
        
        // Text line characteristics:
        // - Moderate to high sharp transitions
        // - Mix of dark and light pixels
        // - Not too uniform
        const transitionDensity = sharpTransitions / brightnesses.length;
        const hasContrast = darkPixels > 10 && lightPixels > 10;
        const notUniform = transitionDensity > 0.02 && transitionDensity < 0.5;
        
        if (hasContrast && notUniform && sharpTransitions > 20) {
            textLineCount++;
        }
    }
    
    return textLineCount / Math.max(height, 1);
}

// Detect high contrast regions typical of text overlays
function detectHighContrastRegions(pixels, width) {
    if (pixels.length === 0) return 0;
    
    let highContrastPixelCount = 0;
    const totalPixels = pixels.length;
    
    for (let i = 0; i < totalPixels; i++) {
        const p = pixels[i];
        const brightness = (p.r + p.g + p.b) / 3;
        
        // Check neighbors for contrast
        const neighbors = [];
        if (i > 0) neighbors.push(pixels[i - 1]);
        if (i < totalPixels - 1) neighbors.push(pixels[i + 1]);
        if (i >= width) neighbors.push(pixels[i - width]);
        if (i < totalPixels - width) neighbors.push(pixels[i + width]);
        
        for (const neighbor of neighbors) {
            const neighborBrightness = (neighbor.r + neighbor.g + neighbor.b) / 3;
            if (Math.abs(brightness - neighborBrightness) > 50) {
                highContrastPixelCount++;
                break;
            }
        }
    }
    
    return highContrastPixelCount / totalPixels;
}

// Detect repeating patterns (character spacing in text)
function detectRepeatingPatterns(pixels, width) {
    if (pixels.length === 0 || width < 10) return 0;
    
    const height = Math.floor(pixels.length / width);
    let patternScore = 0;
    
    // Sample rows and look for repeating brightness patterns
    const sampleRows = Math.min(height, 20);
    const rowStep = Math.max(1, Math.floor(height / sampleRows));
    
    for (let y = 0; y < height; y += rowStep) {
        const rowStart = y * width;
        const rowEnd = Math.min(rowStart + width, pixels.length);
        const rowPixels = pixels.slice(rowStart, rowEnd);
        
        if (rowPixels.length < 100) continue;
        
        // Calculate brightness
        const brightnesses = rowPixels.map(p => (p.r + p.g + p.b) / 3);
        
        // Look for periodic patterns (text characters create repeating patterns)
        let periodicPatterns = 0;
        const windowSize = 10; // Typical character width
        
        for (let i = 0; i < brightnesses.length - windowSize * 2; i += windowSize) {
            const window1 = brightnesses.slice(i, i + windowSize);
            const window2 = brightnesses.slice(i + windowSize, i + windowSize * 2);
            
            // Check if patterns are similar (repeating character structure)
            let similarity = 0;
            for (let j = 0; j < windowSize; j++) {
                if (Math.abs(window1[j] - window2[j]) < 30) similarity++;
            }
            
            if (similarity / windowSize > 0.6) {
                periodicPatterns++;
            }
        }
        
        patternScore += periodicPatterns / Math.max(brightnesses.length / windowSize, 1);
    }
    
    return patternScore / Math.max(sampleRows, 1);
}

function getRegionData(data, width, height, startX, startY, regionWidth, regionHeight) {
    const pixels = [];
    
    for (let y = startY; y < Math.min(startY + regionHeight, height); y++) {
        for (let x = startX; x < Math.min(startX + regionWidth, width); x++) {
            const idx = (y * width + x) * 4;
            pixels.push({
                r: data[idx],
                g: data[idx + 1],
                b: data[idx + 2],
                a: data[idx + 3]
            });
        }
    }
    
    return pixels;
}

function calculateUniformity(pixels) {
    if (pixels.length === 0) return 0;
    
    const avgR = pixels.reduce((sum, p) => sum + p.r, 0) / pixels.length;
    const avgG = pixels.reduce((sum, p) => sum + p.g, 0) / pixels.length;
    const avgB = pixels.reduce((sum, p) => sum + p.b, 0) / pixels.length;
    
    const variance = pixels.reduce((sum, p) => {
        return sum + Math.pow(p.r - avgR, 2) + Math.pow(p.g - avgG, 2) + Math.pow(p.b - avgB, 2);
    }, 0) / (pixels.length * 3 * 255 * 255);
    
    return Math.max(0, 1 - variance);
}
