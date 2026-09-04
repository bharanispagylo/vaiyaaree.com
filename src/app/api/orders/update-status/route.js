// API Route: Update Order Status + Send WhatsApp Notification
import crypto from 'crypto';
import pool, { withTransaction } from '@/lib/mysql';
import { verifyAdmin } from '@/lib/auth';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';

export async function POST(request) {
    try {
        const {
            orderId,
            status,
            courierName,
            trackingNumber,
            trackingUrl,
            notes,
            adminNotes,
            cancelReason
        } = await request.json();

        // 0. Authorization Check
        const { authorized, error: authError } = await verifyAdmin(request);
        if (!authorized) {
            return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!orderId || !status) {
            return new Response(JSON.stringify({ error: 'Missing orderId or status' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ═════════════════════════════════════════════════════════════════════════
        // ACID TRANSACTION EXECUTION FOR ADMIN STATUS UPDATES
        // ═════════════════════════════════════════════════════════════════════════
        const updatedOrderResult = await withTransaction(async (conn) => {
            // 1. Get and lock order record
            const [orderRows] = await conn.query(
                "SELECT * FROM `orders` WHERE `id` = ? FOR UPDATE",
                [orderId]
            );

            if (orderRows.length === 0) {
                throw new Error('Order not found');
            }

            const order = orderRows[0];
            const oldStatus = order.status;

            // 2. Fetch order items
            const [items] = await conn.query(
                "SELECT * FROM `order_items` WHERE `order_id` = ?",
                [orderId]
            );

            // 3. If transitioning TO 'CANCELLED' from an active state, restore inventory
            if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
                for (const item of items) {
                    const quantity = parseInt(item.quantity, 10) || 1;
                    const histId = crypto.randomUUID ? crypto.randomUUID() : `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                    if (item.variant_id) {
                        await conn.query(
                            "UPDATE `product_variants` SET `stock` = `stock` + ? WHERE `id` = ?",
                            [quantity, item.variant_id]
                        );

                        let prodId = item.product_id;
                        if (!prodId) {
                            const [vRow] = await conn.query("SELECT `product_id` FROM `product_variants` WHERE `id` = ?", [item.variant_id]);
                            prodId = vRow[0]?.product_id;
                        }

                        if (prodId) {
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
                            [histId, prodId || item.product_id, item.variant_id, quantity, newStock, `Admin Status Cancellation (#${orderId})`]
                        );
                    } else if (item.product_id) {
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
                            [histId, item.product_id, quantity, newStock, `Admin Status Cancellation (#${orderId})`]
                        );
                    }
                }
            } else if (oldStatus === 'CANCELLED' && status !== 'CANCELLED') {
                // If transitioning FROM 'CANCELLED' to an active state, re-deduct inventory
                for (const item of items) {
                    const quantity = parseInt(item.quantity, 10) || 1;
                    const histId = crypto.randomUUID ? crypto.randomUUID() : `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                    if (item.variant_id) {
                        await conn.query(
                            "UPDATE `product_variants` SET `stock` = GREATEST(0, `stock` - ?) WHERE `id` = ?",
                            [quantity, item.variant_id]
                        );

                        let prodId = item.product_id;
                        if (!prodId) {
                            const [vRow] = await conn.query("SELECT `product_id` FROM `product_variants` WHERE `id` = ?", [item.variant_id]);
                            prodId = vRow[0]?.product_id;
                        }

                        if (prodId) {
                            await conn.query(
                                `UPDATE \`products\` 
                                 SET \`stock\` = (SELECT COALESCE(SUM(\`stock\`), 0) FROM \`product_variants\` WHERE \`product_id\` = ?),
                                     \`total_sold\` = COALESCE(\`total_sold\` + ?, 0) 
                                 WHERE \`id\` = ?`,
                                [prodId, quantity, prodId]
                            );
                        }

                        const [vAfter] = await conn.query("SELECT `stock` FROM `product_variants` WHERE `id` = ?", [item.variant_id]);
                        const newStock = vAfter[0]?.stock ?? 0;

                        await conn.query(
                            `INSERT INTO \`product_history\` 
                             (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                             VALUES (?, ?, ?, 'SALE', ?, ?, ?, NOW())`,
                            [histId, prodId || item.product_id, item.variant_id, -quantity, newStock, `Admin Status Reactivated (#${orderId})`]
                        );
                    } else if (item.product_id) {
                        await conn.query(
                            "UPDATE `products` SET `stock` = GREATEST(0, `stock` - ?), `total_sold` = COALESCE(`total_sold` + ?, 0) WHERE `id` = ?",
                            [quantity, quantity, item.product_id]
                        );
                        const [pAfter] = await conn.query("SELECT `stock` FROM `products` WHERE `id` = ?", [item.product_id]);
                        const newStock = pAfter[0]?.stock ?? 0;

                        await conn.query(
                            `INSERT INTO \`product_history\` 
                             (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                             VALUES (?, ?, NULL, 'SALE', ?, ?, ?, NOW())`,
                            [histId, item.product_id, -quantity, newStock, `Admin Status Reactivated (#${orderId})`]
                        );
                    }
                }
            }

            // 4. Update the order status and shipping info
            const updateFields = ["`status` = ?", "`updated_at` = NOW()"];
            const updateParams = [status];

            if (adminNotes || cancelReason) {
                const combinedAdminNotes = adminNotes || `Cancelled: ${cancelReason}`;
                updateFields.push("`admin_notes` = ?");
                updateParams.push(combinedAdminNotes);
            }
            if (cancelReason) {
                updateFields.push("`cancel_reason` = ?");
                updateParams.push(cancelReason);
            }
            if (courierName) {
                updateFields.push("`courier_name` = ?");
                updateParams.push(courierName);
            }
            if (trackingNumber) {
                updateFields.push("`tracking_number` = ?");
                updateParams.push(trackingNumber);
            }
            if (trackingUrl) {
                updateFields.push("`tracking_url` = ?");
                updateParams.push(trackingUrl);
            }

            updateParams.push(orderId);
            await conn.query(
                `UPDATE \`orders\` SET ${updateFields.join(', ')} WHERE \`id\` = ?`,
                updateParams
            );

            // 5. Insert into order_status_logs
            const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const noteText = notes || (courierName ? `Shipped via ${courierName} (Tracking: ${trackingNumber || 'N/A'})` : cancelReason ? `Order cancelled. Reason: ${cancelReason}` : `Status updated to ${status} via Admin Dashboard`);
            await conn.query(
                "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, ?, ?, NOW())",
                [logId, orderId, status, noteText]
            );

            // Fetch latest updated order for notification
            const [finalOrderRows] = await conn.query("SELECT * FROM `orders` WHERE `id` = ?", [orderId]);
            const finalOrder = finalOrderRows[0] || order;
            finalOrder.order_items = items;

            return finalOrder;
        });

        // ═════════════════════════════════════════════════════════════════════════
        // POST-COMMIT: Trigger Notification Engine
        // ═════════════════════════════════════════════════════════════════════════
        let engineEventType = null;
        switch (status) {
            case 'PAID': engineEventType = EVENT_TYPES.PAYMENT_SUCCESS; break;
            case 'CONFIRMED': engineEventType = EVENT_TYPES.ORDER_CONFIRMED; break;
            case 'PROCESSING': engineEventType = EVENT_TYPES.ORDER_PROCESSING; break;
            case 'PACKING': engineEventType = EVENT_TYPES.ORDER_PACKED; break;
            case 'SHIPPED': engineEventType = EVENT_TYPES.ORDER_SHIPPED; break;
            case 'OUT_FOR_DELIVERY': engineEventType = EVENT_TYPES.OUT_FOR_DELIVERY; break;
            case 'DELIVERED': engineEventType = EVENT_TYPES.ORDER_DELIVERED; break;
            case 'CANCELLED': engineEventType = EVENT_TYPES.ORDER_CANCELLED_ADMIN; break;
            case 'DELIVERY_FAILED': engineEventType = EVENT_TYPES.DELIVERY_FAILED; break;
            default: engineEventType = EVENT_TYPES.ORDER_CONFIRMED; break;
        }

        try {
            await dispatchNotification({
                eventType: engineEventType,
                order: updatedOrderResult,
                extraData: {
                    courierName: courierName || updatedOrderResult.courier_name,
                    trackingNumber: trackingNumber || updatedOrderResult.tracking_number,
                    trackingUrl: trackingUrl || updatedOrderResult.tracking_url
                }
            });
        } catch (notifError) {
            console.error('[STATUS-UPDATE-NOTIF-ERROR]', notifError);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Order updated to ${status} with ACID transaction guarantee and notification triggered`,
            order: updatedOrderResult
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[STATUS-UPDATE-ERROR] Transaction rolled back:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
