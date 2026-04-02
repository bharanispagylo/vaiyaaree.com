const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/aiswarya/.env.local' });

async function run() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.storage.listBuckets();
    if (error) console.error(error);
    else {
        console.log('Buckets list:');
        data.forEach(b => console.log(` - ${b.name} (${b.public ? 'public' : 'private'})`));
    }
}
run();
