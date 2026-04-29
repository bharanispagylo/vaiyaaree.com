import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { notifyOrderSuccess } from '@/services/whatsappService';
// import { sendWhatsAppText } from '@/lib/whatsapp';

import { getGatewaySettings } from '@/lib/settings';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId,
        } = await request.json();

        const settings = await getGatewaySettings();

        // --- Signature Verification ---
        // This is the most important security step.
        // We generate our own signature and compare it with Razorpay's signature.
        if (settings.razorpay_key_secret) {
            const body = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = crypto
                .createHmac('sha256', settings.razorpay_key_secret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return Response.json({ error: 'Payment signature mismatch. Potential fraud.' }, { status: 400 });
            }
        }
        // --- End Signature Verification ---

        // Fetch order details for WhatsApp message
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return Response.json({ error: 'Order not found after payment' }, { status: 404 });
        }

        // Mark order as PAID in Supabase
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'PAID',
                payment_method: 'Razorpay',
                razorpay_payment_id: razorpay_payment_id,
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating order status:', updateError);
        }

        // Send WhatsApp confirmation message to customer via centralized helper
        if (order.customer_phone) {
            await notifyOrderSuccess(orderId);
        }

        return Response.json({ success: true, orderId });

    } catch (err) {
        console.error('Payment verification error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
