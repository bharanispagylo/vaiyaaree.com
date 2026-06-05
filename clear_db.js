const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
const envLocal = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envLocal.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Business data tables ordered by dependency (children first, parents later)
const tablesToClear = [
    'whatsapp_cart',
    'order_status_logs',
    'order_items', 
    'returns', 
    'refunds', 
    'orders', 
    'customers',
    'shipping_zones',
    'product_variants', 
    'products'
];

async function clearDatabase() {
    console.log('Starting database cleanup...');
    
    // Using an arbitrary condition that is always true to delete all rows
    for (const table of tablesToClear) {
        try {
            // Delete all rows where id is not null (effectively all rows)
            const { data, error } = await supabase
                .from(table)
                .delete()
                .not('id', 'is', null);
                
            if (error) {
                // Try deleting using another common field if 'id' is not present
                const { error: err2 } = await supabase
                    .from(table)
                    .delete()
                    .neq('created_at', '1970-01-01T00:00:00Z');
                    
                if (err2) {
                    console.error(`Failed to clear table ${table}:`, err2.message);
                } else {
                    console.log(`Successfully cleared table: ${table} (using created_at)`);
                }
            } else {
                console.log(`Successfully cleared table: ${table}`);
            }
        } catch (err) {
            console.error(`Error clearing ${table}:`, err.message);
        }
    }
    
    console.log('Database cleanup completed!');
}

clearDatabase();
