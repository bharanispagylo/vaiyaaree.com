const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/aiswarya/.env.local' });

async function run() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const BUCKETS = ['media', 'product-images', 'invoices'];
    
    for (const bucket of BUCKETS) {
        console.log(`Searching for temp files in ${bucket}...`);
        const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
        if (error) continue;
        
        const toDelete = data.filter(f => f.name.includes('temp-check-')).map(f => f.name);
        if (toDelete.length > 0) {
            console.log(` Found ${toDelete.length} files to delete in ${bucket}:`, toDelete);
            await supabase.storage.from(bucket).remove(toDelete);
        } else {
            console.log(' No temp files found.');
        }
    }
}
run();
