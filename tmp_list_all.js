
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    console.log('--- All Products ---');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, product_catalog_image_id, stock, price, category');
    
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log('Total products:', data.length);
    data.forEach(p => {
        console.log(`- ${p.name} | ID: ${p.product_catalog_image_id} | Stock: ${p.stock}`);
    });
}

checkProducts();
