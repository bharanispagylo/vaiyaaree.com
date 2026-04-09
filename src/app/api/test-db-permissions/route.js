import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };

    try {
        // Test 1: Check if return_requests table exists
        console.log('🔍 Test 1: Checking if return_requests table exists...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('return_requests')
            .select('*')
            .limit(1);

        results.tests.push({
            name: 'Table Access Test',
            status: tableError ? 'FAILED' : 'PASSED',
            error: tableError?.message,
            data: tableInfo ? `Table accessible, ${tableInfo.length} rows found` : 'No data'
        });

        // Test 2: Check table structure
        console.log('🔍 Test 2: Checking table structure...');
        const { data: columns, error: columnError } = await supabase
            .from('return_requests')
            .select('id, order_id, request_type, reason, status')
            .limit(1);

        results.tests.push({
            name: 'Column Access Test',
            status: columnError ? 'FAILED' : 'PASSED',
            error: columnError?.message,
            data: columns ? 'Columns accessible' : 'Column access failed'
        });

        // Test 3: Try to insert a test record
        console.log('🔍 Test 3: Testing insert permissions...');
        const testRecord = {
            order_id: 'TEST-ORDER-' + Date.now(),
            product_id: null,
            customer_id: null,
            request_type: 'RETURN',
            reason: 'Database permission test',
            status: 'PENDING',
            created_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('return_requests')
            .insert(testRecord)
            .select()
            .single();

        results.tests.push({
            name: 'Insert Permission Test',
            status: insertError ? 'FAILED' : 'PASSED',
            error: insertError?.message,
            data: insertData ? `Insert successful, ID: ${insertData.id}` : 'Insert failed'
        });

        // Test 4: Try to read back the inserted record
        if (insertData) {
            console.log('🔍 Test 4: Testing read permissions...');
            const { data: readData, error: readError } = await supabase
                .from('return_requests')
                .select('*')
                .eq('id', insertData.id)
                .single();

            results.tests.push({
                name: 'Read Permission Test',
                status: readError ? 'FAILED' : 'PASSED',
                error: readError?.message,
                data: readData ? `Read successful, Order: ${readData.order_id}` : 'Read failed'
            });

            // Test 5: Clean up - delete the test record
            console.log('🔍 Test 5: Testing delete permissions...');
            const { error: deleteError } = await supabase
                .from('return_requests')
                .delete()
                .eq('id', insertData.id);

            results.tests.push({
                name: 'Delete Permission Test',
                status: deleteError ? 'FAILED' : 'PASSED',
                error: deleteError?.message,
                data: deleteError ? 'Delete failed' : 'Delete successful'
            });
        }

        // Test 6: Check orders table access (needed for return flow)
        console.log('🔍 Test 6: Checking orders table access...');
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, status, customer_phone')
            .eq('status', 'DELIVERED')
            .limit(1);

        results.tests.push({
            name: 'Orders Table Access Test',
            status: ordersError ? 'FAILED' : 'PASSED',
            error: ordersError?.message,
            data: ordersData ? `Orders accessible, ${ordersData.length} delivered orders found` : 'No orders found'
        });

        // Test 7: Check customers table access
        console.log('🔍 Test 7: Checking customers table access...');
        const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, phone, admin_notes')
            .limit(1);

        results.tests.push({
            name: 'Customers Table Access Test',
            status: customersError ? 'FAILED' : 'PASSED',
            error: customersError?.message,
            data: customersData ? `Customers accessible, ${customersData.length} customers found` : 'No customers found'
        });

    } catch (error) {
        results.tests.push({
            name: 'General Error',
            status: 'FAILED',
            error: error.message,
            stack: error.stack
        });
    }

    return Response.json(results);
}
