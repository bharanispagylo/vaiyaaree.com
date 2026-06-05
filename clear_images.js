const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
const envLocal = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envLocal.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearImages() {
    console.log('Emptying media bucket...');
    
    // First try the built-in emptyBucket function
    const { data, error } = await supabase.storage.emptyBucket('media');
    
    if (error) {
        console.log('emptyBucket returned an error, falling back to manual deletion...', error.message);
        
        // Manual deletion for common folders
        const folders = ['', 'with-watermark', 'without-watermark'];
        
        for (const folder of folders) {
            try {
                const { data: files, error: listError } = await supabase.storage.from('media').list(folder, { limit: 1000 });
                
                if (listError) throw listError;
                
                if (files && files.length > 0) {
                    // Filter out folders (which have no id)
                    const toRemove = files.filter(f => f.id).map(f => folder ? `${folder}/${f.name}` : f.name);
                    
                    if (toRemove.length > 0) {
                        const { error: removeError } = await supabase.storage.from('media').remove(toRemove);
                        if (removeError) throw removeError;
                        console.log(`Removed ${toRemove.length} files from '${folder || 'root'}' folder`);
                    }
                } else {
                    console.log(`No files to remove in '${folder || 'root'}' folder`);
                }
            } catch (err) {
                console.error(`Failed to clear folder '${folder}':`, err.message);
            }
        }
    } else {
        console.log('Successfully emptied media bucket using emptyBucket.');
    }

    console.log('Resetting image-related app_settings...');
    const keysToReset = ['hero_slider_images', 'gallery_images', 'watermark_images', 'no_watermark_images'];
    
    for (const key of keysToReset) {
        const { error: updateError } = await supabase
            .from('app_settings')
            .update({ value: '[]' })
            .eq('key', key);
            
        if (updateError) {
            console.error(`Failed to reset setting ${key}:`, updateError.message);
        } else {
            console.log(`Reset setting: ${key}`);
        }
    }
    
    console.log('Done clearing all images!');
}

clearImages();
