const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentActivity() {
    console.log('Checking recent order status logs...');
    const { data: logs, error } = await supabase
        .from('order_status_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log('Recent Logs:', JSON.stringify(logs, null, 2));

    if (logs.length > 0) {
        const lastOrderId = logs[0].order_id;
        console.log(`Checking order ${lastOrderId}...`);
        const { data: order } = await supabase.from('orders').select('*').eq('id', lastOrderId).single();
        console.log('Order Details:', JSON.stringify(order, null, 2));

        console.log(`Checking refund for ${lastOrderId}...`);
        const { data: refund } = await supabase.from('refunds').select('*').eq('order_id', lastOrderId).single();
        console.log('Refund Details:', JSON.stringify(refund, null, 2));
        
        console.log(`Checking return request for ${lastOrderId}...`);
        const { data: returnReq } = await supabase.from('return_requests').select('*').eq('order_id', lastOrderId).single();
        console.log('Return Request Details:', JSON.stringify(returnReq, null, 2));
    }
}

checkRecentActivity();
