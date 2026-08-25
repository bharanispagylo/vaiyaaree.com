import { mysqlClient } from '@/lib/mysqlClient';

export async function GET() {
    try {
        // Insert a test return request
        const testReturn = {
            order_id: 'TEST-ORDER-001',
            product_id: null, // We'll use a simple UUID
            customer_id: null, // We'll use a simple UUID
            request_type: 'RETURN',
            reason: 'Test return request - Debugging',
            status: 'PENDING',
            created_at: new Date().toISOString()
        };

        const { data, error } = await mysqlClient
            .from('return_requests')
            .insert(testReturn)
            .select()
            .single();

        if (error) {
            return Response.json({ error: error.message, details: error }, { status: 500 });
        }

        // Now try to fetch it back
        const { data: fetchResult, error: fetchError } = await mysqlClient
            .from('return_requests')
            .select(`
                id, order_id, request_type, reason, status, admin_notes, created_at,
                products (id, name, image_url),
                customers (id, name, phone, email)
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (fetchError) {
            return Response.json({ error: fetchError.message, details: fetchError }, { status: 500 });
        }

        return Response.json({ 
            success: true, 
            inserted: data,
            fetched: fetchResult,
            count: fetchResult?.length || 0
        });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
