import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import crypto from 'crypto';
import { notifyOrderSuccess } from '@/services/whatsappService';
// import { sendWhatsAppText } from '@/lib/whatsapp';

import { getGatewaySettings } from '@/lib/settings';

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
        // We generate our own signature and compare it with Razorpay's signature when real keys exist.
        const isPlaceholder = (key) => !key || key.includes('PASTE_YOUR_KEY') || key.includes('placeholder');
        if (settings.razorpay_key_secret && !isPlaceholder(settings.razorpay_key_secret)) {
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
        const { data: order, error: fetchError } = await mysqlClient
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return Response.json({ error: 'Order not found after payment' }, { status: 404 });
        }

        // IDEMPOTENCY CHECK: If order is already PAID, return success immediately
        if (order.status === 'PAID') {
            console.log(`[PAYMENT-VERIFY] Order #${orderId} already verified and marked as PAID. Returning idempotent success.`);
            return Response.json({ success: true, orderId, alreadyVerified: true });
        }

        // Mark order as PAID in MySQL
        const { error: updateError } = await mysqlClient
            .from('orders')
            .update({
                status: 'PAID',
                payment_method: 'Razorpay',
                razorpay_payment_id: razorpay_payment_id,
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating order status:', updateError);
        } else {
            // Record in Order Activity Timeline Logs
            try {
                const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                await mysqlClient.from('order_status_logs').insert({
                    id: logId,
                    order_id: orderId,
                    status: 'PAID',
                    notes: `Payment completed successfully via Razorpay (Payment ID: ${razorpay_payment_id})`,
                    created_at: new Date().toISOString()
                });
            } catch (logErr) {
                console.error('[STATUS-LOG-ERROR]', logErr);
            }
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
