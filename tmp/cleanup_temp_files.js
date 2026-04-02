const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from the workspace root
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'media';
const FOLDERS = ['', 'with-watermark', 'without-watermark'];

async function cleanup() {
    console.log('--- Cleaning up stray temp-check files ---');
    
    for (const folder of FOLDERS) {
        console.log(`Checking folder: ${folder || 'root'}`);
        // 1. List files in folder
        const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
            limit: 1000
        });

        if (error) {
            console.error(`Error listing files in ${folder}:`, error.message);
            continue;
        }

        const tempFiles = files
            .filter(f => f.name.startsWith('temp-check-'))
            .map(f => (folder ? `${folder}/${f.name}` : f.name));

        if (tempFiles.length === 0) {
            console.log(`No temp-check files found in ${folder || 'root'}.`);
        } else {
            console.log(`Found ${tempFiles.length} temp files in ${folder || 'root'}:`, tempFiles);
            const { error: delError } = await supabase.storage.from(BUCKET_NAME).remove(tempFiles);
            if (delError) {
                console.error(`Error deleting files in ${folder}:`, delError.message);
            } else {
                console.log(`Successfully deleted ${tempFiles.length} temp files matching pattern.`);
            }
        }
    }

    console.log('\n--- Done ---');
}

cleanup();
