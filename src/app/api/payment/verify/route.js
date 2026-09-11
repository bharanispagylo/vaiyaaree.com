import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import crypto from 'crypto';
import { notifyOrderSuccess } from '@/services/whatsappService';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';
import { ensureOrdersPaymentSchema } from '@/lib/orderSchemaHelper';
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

        // Fetch order details
        const { data: order, error: fetchError } = await mysqlClient
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return Response.json({ error: 'Order not found after payment' }, { status: 404 });
        }

        // Ensure database table has necessary payment metadata columns
        await ensureOrdersPaymentSchema();

        const isCodAdvance = order.payment_method === 'COD';

        // IDEMPOTENCY CHECK
        if (isCodAdvance && (order.status === 'PLACED' || order.status === 'CONFIRMED' || order.status === 'SHIPPED') && order.razorpay_payment_id) {
            console.log(`[PAYMENT-VERIFY] COD Advance for Order #${orderId} already verified. Returning idempotent success.`);
            return Response.json({ success: true, orderId, alreadyVerified: true });
        }
        if (!isCodAdvance && order.status === 'PAID' && order.razorpay_payment_id) {
            console.log(`[PAYMENT-VERIFY] Order #${orderId} already verified and marked as PAID. Returning idempotent success.`);
            return Response.json({ success: true, orderId, alreadyVerified: true });
        }

        const nowIso = new Date().toISOString();
        const advanceAmount = isCodAdvance ? parseFloat(order.cod_advance_required || 0) : parseFloat(order.total_amount || 0);
        const balanceAmount = isCodAdvance ? Math.max(0, parseFloat(order.total_amount || 0) - advanceAmount) : 0;
        const targetStatus = isCodAdvance ? 'PLACED' : 'PAID';

        const updatePayload = {
            status: targetStatus,
            payment_method: isCodAdvance ? 'COD' : 'Razorpay',
            razorpay_payment_id: razorpay_payment_id,
            advance_paid: advanceAmount,
            balance_amount: balanceAmount,
            paid_at: nowIso
        };
        if (razorpay_order_id) updatePayload.razorpay_order_id = razorpay_order_id;
        if (razorpay_signature) updatePayload.razorpay_signature = razorpay_signature;

        // Update order in MySQL
        const { error: updateError } = await mysqlClient
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating order status:', updateError);
        } else {
            // Record in Order Activity Timeline Logs
            try {
                const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const notesList = isCodAdvance
                    ? [
                        `COD Advance payment of ₹${advanceAmount} received via Razorpay (Payment ID: ${razorpay_payment_id})`,
                        `Remaining cash balance ₹${balanceAmount} due on delivery`,
                        razorpay_order_id ? `Razorpay Order ID: ${razorpay_order_id}` : null
                    ].filter(Boolean).join(' | ')
                    : [
                        `Payment completed successfully via Razorpay (Payment ID: ${razorpay_payment_id})`,
                        razorpay_order_id ? `Razorpay Order ID: ${razorpay_order_id}` : null
                    ].filter(Boolean).join(' | ');

                await mysqlClient.from('order_status_logs').insert({
                    id: logId,
                    order_id: orderId,
                    status: targetStatus,
                    notes: notesList,
                    created_at: nowIso
                });
            } catch (logErr) {
                console.error('[STATUS-LOG-ERROR]', logErr);
            }
        }

        // Trigger Customer & Admin Notifications now that payment is confirmed
        try {
            await dispatchNotification({
                eventType: EVENT_TYPES.ORDER_PLACED,
                order: {
                    ...order,
                    status: targetStatus,
                    payment_method: isCodAdvance ? 'COD' : 'Razorpay',
                    razorpay_payment_id: razorpay_payment_id,
                    advance_paid: advanceAmount,
                    balance_amount: balanceAmount,
                    order_items: order.order_items || []
                },
                extraData: {
                    skipCustomerWhatsApp: true // notifyOrderSuccess below handles rich WhatsApp with saree images & PDF bill
                }
            });
        } catch (notifErr) {
            console.error('[PAYMENT-VERIFY-NOTIF-ERROR] Notification dispatch failed:', notifErr);
        }

        // Send WhatsApp confirmation message to customer via centralized helper
        if (order.customer_phone) {
            try {
                await notifyOrderSuccess(orderId, true);
            } catch (waErr) {
                console.error('[PAYMENT-VERIFY-WA-ERROR]', waErr);
            }
        }

        return Response.json({ success: true, orderId });

    } catch (err) {
        console.error('Payment verification error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
