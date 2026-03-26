
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSync() {
    const { data, error } = await supabase.from('products').select('name, image_url, product_catalog_image_id');
    if (error) return console.error(error);
    
    data.forEach(p => {
        const match = (p.image_url || '').match(/CAT-([A-Z0-9]{5})/);
        const urlId = match ? match[1] : null;
        if (urlId && urlId !== p.product_catalog_image_id?.replace('CAT-', '')) {
            console.log(`Mismatch for ${p.name}: URL has ${urlId}, DB has ${p.product_catalog_image_id}`);
        }
    });
}
checkSync();
