
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCatalogIds() {
    console.log('--- Starting Sync ---');
    const { data: products, error } = await supabase.from('products').select('id, name, image_url, product_catalog_image_id');
    if (error) return console.error('Error fetching products:', error);

    let syncedCount = 0;
    for (const p of products) {
        const match = (p.image_url || '').match(/CAT-([A-Z0-9]{5})/i);
        if (match) {
            const codeInUrl = `CAT-${match[1].toUpperCase()}`;
            if (p.product_catalog_image_id !== codeInUrl) {
                console.log(`Updating ${p.name}: ${p.product_catalog_image_id} -> ${codeInUrl}`);
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ product_catalog_image_id: codeInUrl })
                    .eq('id', p.id);
                if (updateError) console.error(`Error updating ${p.name}:`, updateError);
                else syncedCount++;
            }
        }
    }
    console.log(`--- Sync Complete! Updated ${syncedCount} products. ---`);
}
syncCatalogIds();
