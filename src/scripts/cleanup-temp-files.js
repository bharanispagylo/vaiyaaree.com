const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupStorage() {
    const bucket = 'media';
    console.log(`Checking bucket: ${bucket} for cleanup...`);

    // List root files
    const { data: rootFiles, error: rootErr } = await supabase.storage.from(bucket).list('', { limit: 1000 });
    if (rootErr) {
        console.error('Error listing root:', rootErr.message);
        return;
    }

    const filesToDelete = rootFiles
        .filter(f => f.name.startsWith('ocr-temp-') || f.name.startsWith('temp-check-'))
        .map(f => f.name);

    if (filesToDelete.length > 0) {
        console.log(`Deleting ${filesToDelete.length} temp files from root...`);
        const { error: delErr } = await supabase.storage.from(bucket).remove(filesToDelete);
        if (delErr) console.error('Delete error:', delErr.message);
        else console.log('Successfully cleaned root!');
    }

    // List without_watermark folder
    const { data: noWmFiles, error: noWmErr } = await supabase.storage.from(bucket).list('without_watermark', { limit: 1000 });
    if (!noWmErr && noWmFiles) {
        const moreToDelete = noWmFiles
            .filter(f => f.name.startsWith('ocr-temp-') || f.name.startsWith('temp-check-'))
            .map(f => `without_watermark/${f.name}`);

        if (moreToDelete.length > 0) {
            console.log(`Deleting ${moreToDelete.length} temp files from without_watermark...`);
            const { error: del2Err } = await supabase.storage.from(bucket).remove(moreToDelete);
            if (del2Err) console.error('Delete 2 error:', del2Err.message);
            else console.log('Successfully cleaned without_watermark!');
        }
    }

    console.log('Cleanup complete.');
}

cleanupStorage();
