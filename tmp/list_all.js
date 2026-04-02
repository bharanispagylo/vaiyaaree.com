const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_NAME = 'media';

async function listAll() {
    console.log('Listing all files in bucket...');
    const folders = ['', 'with-watermark', 'without-watermark'];
    for (const f of folders) {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list(f);
        if (error) console.error(error);
        else {
            console.log(`\nFolder: ${f || 'root'}`);
            data.forEach(file => console.log(` - ${file.name}`));
        }
    }
}
listAll();
