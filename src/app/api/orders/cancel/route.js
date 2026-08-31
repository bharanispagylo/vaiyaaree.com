import pool, { withTransaction } from '@/lib/mysql.js';
import { generateRefundId } from '@/services/refundService.js';
import { getGatewaySettings } from '@/lib/settings.js';
import crypto, { randomUUID } from 'crypto';

export async function POST(request) {
    try {
        const body = await request.json();
        const { orderId, otp, customerId, reason } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
        }

        const cancelReasonNote = reason ? `Reason: ${reason}` : 'Order cancelled by customer';

        const result = await withTransaction(async (conn) => {
            // 1. Fetch & lock order
            const [orderRows] = await conn.query("SELECT * FROM `orders` WHERE `id` = ? FOR UPDATE", [orderId]);
            if (orderRows.length === 0) {
                throw new Error('Order not found');
            }
            const order = orderRows[0];

            // STRICT CANCELLATION CHECK:
            // Customer can ONLY cancel before warehouse packing and fulfillment starts.
            // If status is PACKING, SHIPPED, DISPATCHED, OUT_FOR_DELIVERY, or DELIVERED, cancellation is strictly BLOCKED.
            const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
            const currentStatus = (order.status || '').toUpperCase();
            if (!cancellableStatuses.includes(currentStatus)) {
                throw new Error('This order cannot be cancelled because it is already being packed or has been dispatched/shipped. Please contact support or request a return upon delivery.');
            }

            // 2. Authentication Verification: OTP or Logged-in Customer ID
            let cleanPhone = null;
            if (otp) {
                let phone = order.customer_phone;
                if (!phone) throw new Error('No phone number associated with this order');
                cleanPhone = phone.trim().replace(/\D/g, '');
                if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

                const [otpRows] = await conn.query(
                    "SELECT * FROM `otps` WHERE `phone` = ? AND `code` = ? AND `expires_at` >= NOW() LIMIT 1",
                    [cleanPhone, otp]
                );
                if (otpRows.length === 0) {
                    throw new Error('Invalid or expired verification code');
                }
            } else if (customerId) {
                const orderCustId = String(order.customer_id || '');
                if (orderCustId && orderCustId !== String(customerId)) {
                    throw new Error('Unauthorized to cancel this order.');
                }
            } else {
                throw new Error('Verification code or customer authentication required');
            }

            // 3. Fetch order items
            const [items] = await conn.query("SELECT * FROM `order_items` WHERE `order_id` = ?", [orderId]);

            // 4. Restore Stock for each item
            for (const item of items) {
                const quantity = parseInt(item.quantity, 10) || 1;
                const histId = crypto.randomUUID ? crypto.randomUUID() : `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                if (item.variant_id) {
                    // Update variant stock
                    await conn.query(
                        "UPDATE `product_variants` SET `stock` = `stock` + ? WHERE `id` = ?",
                        [quantity, item.variant_id]
                    );

                    // Find parent product_id
                    let prodId = item.product_id;
                    if (!prodId) {
                        const [vRow] = await conn.query("SELECT `product_id` FROM `product_variants` WHERE `id` = ?", [item.variant_id]);
                        prodId = vRow[0]?.product_id;
                    }

                    if (prodId) {
                        // Sync parent product stock to the sum of all its variants, and decrement total_sold
                        await conn.query(
                            `UPDATE \`products\` 
                             SET \`stock\` = (SELECT COALESCE(SUM(\`stock\`), 0) FROM \`product_variants\` WHERE \`product_id\` = ?),
                                 \`total_sold\` = GREATEST(0, COALESCE(\`total_sold\` - ?, 0)) 
                             WHERE \`id\` = ?`,
                            [prodId, quantity, prodId]
                        );
                    }

                    const [vAfter] = await conn.query("SELECT `stock` FROM `product_variants` WHERE `id` = ?", [item.variant_id]);
                    const newStock = vAfter[0]?.stock ?? 0;

                    await conn.query(
                        `INSERT INTO \`product_history\` 
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, NOW())`,
                        [histId, prodId || item.product_id, item.variant_id, quantity, newStock, `Customer Cancellation (#${orderId})`]
                    );
                } else if (item.product_id) {
                    // Simple product: increase stock and decrement total_sold
                    await conn.query(
                        "UPDATE `products` SET `stock` = `stock` + ?, `total_sold` = GREATEST(0, COALESCE(`total_sold` - ?, 0)) WHERE `id` = ?",
                        [quantity, quantity, item.product_id]
                    );

                    const [pAfter] = await conn.query("SELECT `stock` FROM `products` WHERE `id` = ?", [item.product_id]);
                    const newStock = pAfter[0]?.stock ?? 0;

                    await conn.query(
                        `INSERT INTO \`product_history\` 
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, NULL, 'STOCK_IN', ?, ?, ?, NOW())`,
                        [histId, item.product_id, quantity, newStock, `Customer Cancellation (#${orderId})`]
                    );
                }
            }

            // 5. Razorpay Online Refund Integration (if order was paid via Razorpay)
            let razorpayRefund = null;
            const isPaidOnline = currentStatus === 'PAID' && (order.razorpay_payment_id || order.payment_method === 'Razorpay');

            if (isPaidOnline && order.razorpay_payment_id) {
                try {
                    const settings = await getGatewaySettings();
                    const keyId = settings.razorpay_key_id;
                    const keySecret = settings.razorpay_key_secret;

                    if (keyId && keySecret && !keyId.includes('placeholder')) {
                        const refundAmountPaise = Math.round(Number(order.total_amount) * 100);
                        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

                        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': authHeader
                            },
                            body: JSON.stringify({
                                amount: refundAmountPaise,
                                speed: 'optimum', // Instant UPI/IMPS refund if supported
                                notes: {
                                    order_id: orderId,
                                    reason: cancelReasonNote
                                }
                            })
                        });

                        const refundData = await rzpRes.json();
                        if (rzpRes.ok && refundData.id) {
                            razorpayRefund = refundData;
                            console.log(`[RAZORPAY-REFUND-SUCCESS] Order #${orderId} refunded: ${refundData.id}`);
                        } else {
                            console.error('[RAZORPAY-REFUND-ERROR]', refundData);
                        }
                    }
                } catch (rzpErr) {
                    console.error('[RAZORPAY-REFUND-EXCEPTION]', rzpErr);
                }
            }

            // 6. Update Order Status in database
            const refundStatusToSet = razorpayRefund ? 'REFUNDED' : (isPaidOnline ? 'REFUND_REQUESTED' : 'NOT_APPLICABLE');
            const razorpayRefundId = razorpayRefund?.id || null;

            const adminNoteText = razorpayRefund 
                ? `Order cancelled by customer. ${cancelReasonNote}. Razorpay Refund ID: ${razorpayRefund.id}`
                : `Order cancelled by customer. ${cancelReasonNote}`;

            await conn.query(
                `UPDATE \`orders\` 
                 SET \`status\` = 'CANCELLED', 
                     \`refund_status\` = ?, 
                     \`razorpay_refund_id\` = ?,
                     \`admin_notes\` = ?, 
                     \`updated_at\` = NOW() 
                 WHERE \`id\` = ?`,
                [refundStatusToSet, razorpayRefundId, adminNoteText, orderId]
            );

            // 7. Insert Order Status Log (Timeline Entry)
            const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const logNote = razorpayRefund
                ? `Order cancelled by customer. Refund of ₹${Number(order.total_amount).toLocaleString('en-IN')} initiated via Razorpay (Refund ID: ${razorpayRefund.id})`
                : `Order cancelled by customer. ${cancelReasonNote}`;

            await conn.query(
                "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, 'CANCELLED', ?, NOW())",
                [logId, orderId, logNote]
            );

            // 8. Create Refund Entry in refund_requests if order was paid
            if (isPaidOnline || ['PAID', 'AWAITING_PAYMENT'].includes(currentStatus)) {
                const refundUuid = randomUUID();
                const refundCode = await generateRefundId();
                const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

                await conn.query(`
                    INSERT INTO \`refund_requests\` (
                        \`id\`, \`refund_id\`, \`order_id\`, \`customer_id\`, \`reason\`, \`customer_note\`, 
                        \`requested_amount\`, \`approved_amount\`, \`return_status\`, \`refund_status\`, 
                        \`razorpay_payment_id\`, \`razorpay_refund_id\`, \`requested_at\`, \`created_at\`, \`updated_at\`
                    ) VALUES (
                        ?, ?, ?, ?, 'Order Cancelled', ?, ?, ?, 'NOT_REQUIRED', ?, ?, ?, ?, NOW(), NOW()
                    )
                `, [
                    refundUuid,
                    refundCode,
                    orderId,
                    order.customer_id || customerId || 'guest',
                    cancelReasonNote,
                    order.total_amount || 0,
                    order.total_amount || 0,
                    refundStatusToSet,
                    order.razorpay_payment_id || null,
                    razorpayRefundId,
                    now
                ]);
            }

            // 9. Delete the used OTP
            if (cleanPhone) {
                await conn.query("DELETE FROM `otps` WHERE `phone` = ?", [cleanPhone]);
            }

            return {
                order,
                refundId: razorpayRefundId,
                refundStatus: refundStatusToSet,
                refundAmount: order.total_amount
            };
        });

        const successMessage = result.refundId 
            ? `Order cancelled successfully. Refund of ₹${Number(result.refundAmount).toLocaleString('en-IN')} has been initiated via Razorpay (Refund ID: ${result.refundId}).`
            : 'Order cancelled successfully and stock restored.';

        return new Response(JSON.stringify({ 
            success: true, 
            message: successMessage,
            refundId: result.refundId,
            refundStatus: result.refundStatus
        }), { status: 200 });

    } catch (err) {
        console.error('[CANCEL-API-ERROR]', err);
        return new Response(JSON.stringify({ error: 'Cancellation failed: ' + (err.message || 'Unknown error') }), { status: 400 });
    }
}
