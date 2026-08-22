
import { finalizeOrder } from '@/services/whatsappService';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request) {
    try {
        const { orderId, transactionId } = await request.json();

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
        }

        // Fetch order to get phone number
        const { data: order } = await supabase
            .from('orders')
            .select('customer_phone')
            .eq('id', orderId)
            .single();

        if (!order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }

        // Finalize order (Database update + Invoice generation + WhatsApp notification)
        // We pass 'UPI' as method.
        // Note: finalizeOrder updates the status to PAID/PLACED.
        // We might want to pass transactionId if we had a column for it, but for now we simplify.

        await finalizeOrder(order.customer_phone, 'UPI', orderId);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Payment Callback Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
