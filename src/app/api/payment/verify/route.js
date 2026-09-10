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

let ordersSchemaChecked = false;
async function ensureOrdersPaymentSchema() {
    if (ordersSchemaChecked) return;
    try {
        const { default: pool } = await import('@/lib/mysql.js');
        const [orderIdCol] = await pool.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_order_id'");
        if (!orderIdCol || orderIdCol.length === 0) {
            await pool.query("ALTER TABLE `orders` ADD COLUMN `razorpay_order_id` VARCHAR(100) NULL AFTER `razorpay_payment_id`");
        }
        const [sigCol] = await pool.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_signature'");
        if (!sigCol || sigCol.length === 0) {
            await pool.query("ALTER TABLE `orders` ADD COLUMN `razorpay_signature` VARCHAR(255) NULL AFTER `razorpay_order_id`");
        }
        const [paidAtCol] = await pool.query("SHOW COLUMNS FROM `orders` LIKE 'paid_at'");
        if (!paidAtCol || paidAtCol.length === 0) {
            await pool.query("ALTER TABLE `orders` ADD COLUMN `paid_at` DATETIME NULL AFTER `razorpay_signature`");
        }
        ordersSchemaChecked = true;
    } catch (e) {
        // Safe to ignore if columns already exist
    }
}

        // Fetch order details for WhatsApp message
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

        // IDEMPOTENCY CHECK: If order is already PAID and already has payment id saved
        if (order.status === 'PAID' && order.razorpay_payment_id) {
            console.log(`[PAYMENT-VERIFY] Order #${orderId} already verified and marked as PAID. Returning idempotent success.`);
            return Response.json({ success: true, orderId, alreadyVerified: true });
        }

        const nowIso = new Date().toISOString();
        const updatePayload = {
            status: 'PAID',
            payment_method: 'Razorpay',
            razorpay_payment_id: razorpay_payment_id,
            paid_at: nowIso
        };
        if (razorpay_order_id) updatePayload.razorpay_order_id = razorpay_order_id;
        if (razorpay_signature) updatePayload.razorpay_signature = razorpay_signature;

        // Mark order as PAID in MySQL
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
                const notesList = [
                    `Payment completed successfully via Razorpay (Payment ID: ${razorpay_payment_id})`,
                    razorpay_order_id ? `Razorpay Order ID: ${razorpay_order_id}` : null
                ].filter(Boolean).join(' | ');

                await mysqlClient.from('order_status_logs').insert({
                    id: logId,
                    order_id: orderId,
                    status: 'PAID',
                    notes: notesList,
                    created_at: nowIso
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
