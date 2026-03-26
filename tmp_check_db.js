
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    console.log('--- Checking catalog IDs ---');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, product_catalog_image_id, is_active');
    
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log('Total products:', data.length);
    const interesting = data.filter(p => 
        (p.product_catalog_image_id || '').toLowerCase().includes('ky028') || 
        (p.product_catalog_image_id || '').toLowerCase().includes('a89p5') ||
        p.name.toLowerCase().includes('ky028') ||
        p.name.toLowerCase().includes('a89p5')
    );

    console.log('Found matching products:', JSON.stringify(interesting, null, 2));
}

checkProducts();
