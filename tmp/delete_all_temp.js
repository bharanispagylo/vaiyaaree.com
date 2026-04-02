const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/aiswarya/.env.local' });

async function run() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const bucket = 'media';
    console.log('Searching for and deleting ALL temp-check-* files...');
    
    let deleteCount = 0;
    
    async function searchAndDelete(folder = '') {
        const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
        if (error) return;
        
        const toDelete = [];
        for (const item of (data || [])) {
            const currentPath = folder ? `${folder}/${item.name}` : item.name;
            if (item.id === null) {
                await searchAndDelete(currentPath);
            } else if (item.name.includes('temp-check-')) {
                toDelete.push(currentPath);
            }
        }
        
        if (toDelete.length > 0) {
            console.log(`Deleting ${toDelete.length} files from ${folder || 'root'}:`, toDelete);
            const { error: delError } = await supabase.storage.from(bucket).remove(toDelete);
            if (!delError) deleteCount += toDelete.length;
            else console.error('Delete error:', delError);
        }
    }
    
    await searchAndDelete();
    console.log(`\nTOTAL DELETED: ${deleteCount}`);
}
run();
