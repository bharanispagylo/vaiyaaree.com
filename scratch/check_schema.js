
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    const { data, error } = await supabase.from('customers').select('*').limit(1);
    if (error) {
        console.error('Error fetching customer:', error);
    } else if (data && data.length > 0) {
        console.log('Customer columns:', Object.keys(data[0]));
    } else {
        console.log('No customers found to check schema.');
    }
}

checkSchema();
