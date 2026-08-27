import crypto from 'crypto';
import pool, { withTransaction } from '@/lib/mysql';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';

export async function POST(request) {
    try {
        const { orderId, otp } = await request.json();

        if (!orderId || !otp) {
            return new Response(JSON.stringify({ error: 'Order ID and verification code required' }), { status: 400 });
        }

        // ═════════════════════════════════════════════════════════════════════════
        // ACID TRANSACTION EXECUTION FOR ORDER CANCELLATION
        // ═════════════════════════════════════════════════════════════════════════
        const cancelledOrder = await withTransaction(async (conn) => {
            // 1. Fetch and Lock Order Row (SELECT ... FOR UPDATE)
            const [orderRows] = await conn.query(
                "SELECT * FROM `orders` WHERE `id` = ? FOR UPDATE",
                [orderId]
            );

            if (orderRows.length === 0) {
                throw new Error('Order not found');
            }

            const order = orderRows[0];
            const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
            if (!cancellableStatuses.includes(order.status)) {
                throw new Error(`Order #${orderId} cannot be cancelled in its current state (${order.status}).`);
            }

            let phone = order.customer_phone;
            if (!phone) {
                throw new Error('No phone number associated with this order');
            }

            // Normalize phone
            let cleanPhone = phone.trim().replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            // 2. Verify OTP
            const [otpRows] = await conn.query(
                "SELECT * FROM `otps` WHERE `phone` = ? AND `code` = ? AND `expires_at` >= NOW() LIMIT 1",
                [cleanPhone, otp]
            );

            if (otpRows.length === 0) {
                throw new Error('Invalid or expired verification code');
            }

            // 3. Fetch Order Items
            const [orderItems] = await conn.query(
                "SELECT * FROM `order_items` WHERE `order_id` = ?",
                [orderId]
            );

            // 4. Atomic Stock Restoration & History Logging
            for (const item of orderItems) {
                const histId = crypto.randomUUID ? crypto.randomUUID() : `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const quantity = parseInt(item.quantity, 10) || 1;

                if (item.variant_id) {
                    // Restore variant stock
                    await conn.query(
                        "UPDATE `product_variants` SET `stock` = `stock` + ? WHERE `id` = ?",
                        [quantity, item.variant_id]
                    );

                    // Restore parent product stock & reduce total_sold
                    await conn.query(
                        "UPDATE `products` SET `stock` = `stock` + ?, `total_sold` = GREATEST(0, COALESCE(`total_sold`, 0) - ?) WHERE `id` = ?",
                        [quantity, quantity, item.product_id]
                    );

                    const [vAfter] = await conn.query(
                        "SELECT `stock` FROM `product_variants` WHERE `id` = ?",
                        [item.variant_id]
                    );
                    const newStock = vAfter[0]?.stock ?? 0;

                    await conn.query(
                        `INSERT INTO \`product_history\`
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, ?, 'STOCK_IN', ?, ?, ?, NOW())`,
                        [histId, item.product_id, item.variant_id, quantity, newStock, `Customer Cancellation (#${orderId})`]
                    );
                } else if (item.product_id) {
                    // Restore product stock & reduce total_sold
                    await conn.query(
                        "UPDATE `products` SET `stock` = `stock` + ?, `total_sold` = GREATEST(0, COALESCE(`total_sold`, 0) - ?) WHERE `id` = ?",
                        [quantity, quantity, item.product_id]
                    );

                    const [pAfter] = await conn.query(
                        "SELECT `stock` FROM `products` WHERE `id` = ?",
                        [item.product_id]
                    );
                    const newStock = pAfter[0]?.stock ?? 0;

                    await conn.query(
                        `INSERT INTO \`product_history\`
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, NULL, 'STOCK_IN', ?, ?, ?, NOW())`,
                        [histId, item.product_id, quantity, newStock, `Customer Cancellation (#${orderId})`]
                    );
                }
            }

            // 5. Update Order Status to CANCELLED
            await conn.query(
                `UPDATE \`orders\` 
                 SET \`status\` = 'CANCELLED',
                     \`admin_notes\` = CONCAT(COALESCE(\`admin_notes\`, ''), '\nOrder cancelled by customer via website on ', NOW()),
                     \`updated_at\` = NOW()
                 WHERE \`id\` = ?`,
                [orderId]
            );

            // 6. Insert into order_status_logs
            const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await conn.query(
                `INSERT INTO \`order_status_logs\` (\`id\`, \`order_id\`, \`status\`, \`notes\`, \`created_at\`)
                 VALUES (?, ?, 'CANCELLED', 'Order cancelled by customer via website OTP verification', NOW())`,
                [logId, orderId]
            );

            // 7. Insert Refund Record if order was already paid
            if (['PAID', 'AWAITING_PAYMENT'].includes(order.status) && (parseFloat(order.total_amount) > 0)) {
                const refundId = crypto.randomUUID ? crypto.randomUUID() : `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                await conn.query(
                    `INSERT INTO \`refunds\` (\`id\`, \`order_id\`, \`amount\`, \`status\`, \`reason\`)
                     VALUES (?, ?, ?, 'REQUESTED', 'Customer Cancellation via Website')`,
                    [refundId, orderId, order.total_amount]
                );
            }

            // 8. Invalidate / Delete used OTP
            await conn.query("DELETE FROM `otps` WHERE `phone` = ?", [cleanPhone]);

            return {
                ...order,
                status: 'CANCELLED'
            };
        });

        // ═════════════════════════════════════════════════════════════════════════
        // POST-COMMIT: Trigger Customer & Admin Notifications
        // ═════════════════════════════════════════════════════════════════════════
        try {
            await dispatchNotification({
                eventType: EVENT_TYPES.ORDER_CANCELLED_CUSTOMER,
                order: cancelledOrder
            });
        } catch (notifErr) {
            console.error('[CANCEL-NOTIF-ERROR] Notification failed:', notifErr);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Order cancelled successfully. Stock has been restored.' 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error('[CANCEL-API-ERROR] Transaction rolled back:', err);
        return new Response(JSON.stringify({ 
            error: err.message || 'Cancellation failed. Transaction rolled back.' 
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
}
