import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        // Test query to see return_requests data
        const { data, error } = await supabase
            .from('return_requests')
            .select(`
                id, order_id, request_type, reason, status, admin_notes, created_at,
                products (id, name, image_url),
                customers (id, name, phone, email)
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            return Response.json({ error: error.message, details: error }, { status: 500 });
        }

        return Response.json({ 
            success: true, 
            count: data?.length || 0,
            data: data 
        });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
