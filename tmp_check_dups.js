
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data, error } = await supabase.from('products').select('product_catalog_image_id');
    if (error) return console.error(error);
    const counts = {};
    data.forEach(p => {
        if (p.product_catalog_image_id) {
            counts[p.product_catalog_image_id] = (counts[p.product_catalog_image_id] || 0) + 1;
        }
    });
    const dups = Object.entries(counts).filter(([id, count]) => count > 1);
    console.log('Duplicates:', JSON.stringify(dups));
}
checkDuplicates();
