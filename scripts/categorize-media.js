// One-time script to categorize all existing media library images
// Run this in browser console on the media library page

async function categorizeAllImages() {
    const files = JSON.parse(localStorage.getItem('mediaFiles') || '[]');
    const watermarkList = [];
    const noWatermarkList = [];
    
    console.log(`Analyzing ${files.length} images...`);
    
    for (const file of files) {
        try {
            const res = await fetch('/api/admin/watermark-detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: file.url })
            });
            
            const data = await res.json();
            
            if (data.hasWatermark) {
                watermarkList.push(file.url);
                console.log(`✓ ${file.name}: WITH watermark`);
            } else {
                noWatermarkList.push(file.url);
                console.log(`✓ ${file.name}: NO watermark`);
            }
        } catch (err) {
            console.error(`✗ ${file.name}: Failed to analyze`, err);
            noWatermarkList.push(file.url);
        }
        
        // Small delay to not overwhelm the server
        await new Promise(r => setTimeout(r, 100));
    }
    
    // Save to settings via Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    await supabase.from('app_settings').upsert([
        { key: 'watermark_images', value: JSON.stringify(watermarkList) },
        { key: 'no_watermark_images', value: JSON.stringify(noWatermarkList) }
    ]);
    
    console.log('\n=== CATEGORIZATION COMPLETE ===');
    console.log(`With Watermark: ${watermarkList.length} images`);
    console.log(`Without Watermark: ${noWatermarkList.length} images`);
    console.log('\nRefresh the page to see the updated categories.');
    
    return { watermarkList, noWatermarkList };
}

// Run it
categorizeAllImages();
