const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/aiswarya/.env.local' });

async function run() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const bucket = 'media';
    console.log('Listing all files in bucket recursively...');
    
    async function listFolder(folder = '') {
        const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
        if (error) {
            console.error(error);
            return;
        }
        for (const item of (data || [])) {
            const currentPath = folder ? `${folder}/${item.name}` : item.name;
            if (item.id === null) {
                // It's a folder (Supabase storage.list returns id:null for folders)
                await listFolder(currentPath);
            } else {
                console.log(` - ${currentPath}`);
            }
        }
    }
    
    await listFolder();
    console.log('Done.');
}
run();
