import pool, { withTransaction } from '@/lib/mysql.js';
import { generateRefundId, logRefundStatus } from '@/services/refundService.js';
import { getGatewaySettings } from '@/lib/settings.js';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine.js';
import { processOrderCancellationRefund, ensureOrdersRefundSchema } from '@/services/orderRefundEngine.js';
import crypto, { randomUUID } from 'crypto';

let ordersSchemaChecked = false;
async function ensureOrdersSchema(conn) {
    if (ordersSchemaChecked) return;
    try {
        const [cols] = await conn.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_refund_id'");
        if (!cols || cols.length === 0) {
            await conn.query("ALTER TABLE `orders` ADD COLUMN `razorpay_refund_id` VARCHAR(100) NULL AFTER `razorpay_payment_id`");
        }
        ordersSchemaChecked = true;
    } catch (e) {
        // Safe to ignore if column already exists or restricted
    }
}

function normalizePhone(p) {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.slice(-10); // Normalize to last 10 digits for Indian phone numbers
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { orderId, otp, customerId, customerPhone, customerEmail, reason } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
        }

        const cancelReasonNote = reason ? `Reason: ${reason}` : 'Order cancelled by customer';

        const result = await withTransaction(async (conn) => {
            await ensureOrdersRefundSchema(conn);

            // 1. Fetch & lock order
            const [orderRows] = await conn.query("SELECT * FROM `orders` WHERE `id` = ? FOR UPDATE", [orderId]);
            if (orderRows.length === 0) {
                throw new Error('Order not found');
            }
            const order = orderRows[0];

            const currentStatus = (order.status || '').toUpperCase();

            // Check if already cancelled
            if (currentStatus === 'CANCELLED') {
                return {
                    alreadyCancelled: true,
                    order,
                    refundStatus: order.refund_status || 'NOT_APPLICABLE',
                    refundAmount: order.refund_amount || 0
                };
            }

            // STRICT CANCELLATION CHECK:
            // Customer can ONLY cancel before warehouse packing and dispatch begins.
            // If status is PACKING, SHIPPED, DISPATCHED, OUT_FOR_DELIVERY, or DELIVERED, cancellation is strictly BLOCKED.
            const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'PROCESSING'];
            if (!cancellableStatuses.includes(currentStatus)) {
                throw new Error('This order cannot be cancelled because it is already being packed or has been dispatched/shipped. Please contact support or request a return upon delivery.');
            }

            // 2. Authentication Verification: OTP or Logged-in Customer
            let cleanPhone = null;
            let authenticatedCustomer = null;

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
            } else if (customerId || customerPhone || customerEmail) {
                // Fetch customer record if customerId is provided
                if (customerId) {
                    const [custRows] = await conn.query(
                        "SELECT `id`, `name`, `phone`, `email` FROM `customers` WHERE `id` = ? LIMIT 1",
                        [customerId]
                    );
                    if (custRows.length > 0) {
                        authenticatedCustomer = custRows[0];
                    }
                }

                // Verify order ownership:
                // Ownership is valid if:
                // 1) order.customer_id matches customerId or authenticatedCustomer.id
                // 2) OR normalized phone of order matches normalized phone of customer or input customerPhone
                // 3) OR customer email matches order.customer_email
                const orderCustId = String(order.customer_id || '').trim();
                const passedCustId = String(customerId || '').trim();
                const dbCustId = authenticatedCustomer ? String(authenticatedCustomer.id).trim() : '';

                const orderPhone10 = normalizePhone(order.customer_phone);
                const dbCustPhone10 = authenticatedCustomer ? normalizePhone(authenticatedCustomer.phone) : '';
                const passedPhone10 = normalizePhone(customerPhone);

                const orderEmail = String(order.customer_email || '').trim().toLowerCase();
                const dbCustEmail = authenticatedCustomer ? String(authenticatedCustomer.email || '').trim().toLowerCase() : '';
                const passedEmail = String(customerEmail || '').trim().toLowerCase();

                const isIdMatch = (passedCustId && orderCustId && orderCustId === passedCustId) ||
                                  (dbCustId && orderCustId && orderCustId === dbCustId);

                const isPhoneMatch = Boolean(orderPhone10 && (
                    (dbCustPhone10 && orderPhone10 === dbCustPhone10) ||
                    (passedPhone10 && orderPhone10 === passedPhone10)
                ));

                const isEmailMatch = Boolean(orderEmail && (
                    (dbCustEmail && orderEmail === dbCustEmail) ||
                    (passedEmail && orderEmail === passedEmail)
                ));

                if (!isIdMatch && !isPhoneMatch && !isEmailMatch) {
                    throw new Error('Unauthorized to cancel this order.');
                }

                // If order didn't have customer_id attached, link it now to the authenticated customer
                if (!order.customer_id && authenticatedCustomer) {
                    await conn.query("UPDATE `orders` SET `customer_id` = ? WHERE `id` = ?", [authenticatedCustomer.id, orderId]);
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

            // 5. Automatic Refund Processing for Online & COD Advance Payments
            const refundResult = await processOrderCancellationRefund({
                conn,
                order,
                cancelReason: cancelReasonNote,
                actor: 'customer'
            });

            // 6. Explicitly set orders table status to CANCELLED and store cancel_reason
            await conn.query(
                "UPDATE `orders` SET `status` = 'CANCELLED', `cancel_reason` = COALESCE(?, `cancel_reason`), `updated_at` = NOW() WHERE `id` = ?",
                [cancelReasonNote, orderId]
            );

            // Fetch freshly updated order row
            const [finalOrderRows] = await conn.query("SELECT * FROM `orders` WHERE `id` = ?", [orderId]);
            const finalOrder = finalOrderRows[0] || { ...order, status: 'CANCELLED', cancel_reason: cancelReasonNote };

            // 7. Delete the used OTP if applicable
            if (cleanPhone) {
                await conn.query("DELETE FROM `otps` WHERE `phone` = ?", [cleanPhone]);
            }

            return {
                order: finalOrder,
                refundResult
            };
        });

        // If order was already cancelled
        if (result.alreadyCancelled) {
            return new Response(JSON.stringify({
                success: true,
                message: `Order #${orderId} is already cancelled.`,
                refundStatus: result.refundStatus
            }), { status: 200 });
        }

        // Generate friendly user-facing confirmation message
        let successMessage = '';
        const rf = result.refundResult || {};
        if (rf.isCodAdvance) {
            if (rf.gatewayRefunded) {
                successMessage = `Order cancelled successfully. Your advance payment of ₹${Number(rf.refundAmount).toLocaleString('en-IN')} has been automatically refunded to your original payment method via Razorpay (Refund ID: ${rf.razorpayRefundId}).`;
            } else {
                successMessage = `Order cancelled successfully. Your advance payment refund of ₹${Number(rf.refundAmount).toLocaleString('en-IN')} has been queued and will be processed to your original payment account.`;
            }
        } else if (rf.refundStatus === 'NOT_APPLICABLE') {
            successMessage = 'Your Cash on Delivery order has been cancelled successfully. Since no payment was deducted, no refund is required.';
        } else if (rf.gatewayRefunded) {
            successMessage = `Order cancelled successfully. Full refund of ₹${Number(rf.refundAmount).toLocaleString('en-IN')} has been automatically processed via Razorpay (Refund ID: ${rf.razorpayRefundId}).`;
        } else {
            successMessage = `Order cancelled successfully. A refund request of ₹${Number(rf.refundAmount || 0).toLocaleString('en-IN')} has been submitted and will be processed to your original payment method.`;
        }

        // Trigger async WhatsApp/Email order cancellation notifications
        try {
            await dispatchNotification({
                eventType: EVENT_TYPES.ORDER_CANCELLED_CUSTOMER,
                order: {
                    ...result.order,
                    status: 'CANCELLED',
                    refund_status: rf.refundStatus,
                    refund_amount: rf.refundAmount,
                    razorpay_refund_id: rf.razorpayRefundId
                },
                extraData: {
                    reason: cancelReasonNote,
                    refundAmount: rf.refundAmount,
                    refundStatus: rf.refundStatus,
                    razorpayRefundId: rf.razorpayRefundId,
                    isCodAdvance: rf.isCodAdvance
                }
            });
        } catch (notifErr) {
            console.error('[CANCEL-NOTIFICATION-TRIGGER-ERROR]', notifErr);
        }

        // If online payment refund is pending manual admin processing, notify admin
        if (rf.refundStatus === 'REFUND_REQUESTED') {
            try {
                await dispatchNotification({
                    eventType: EVENT_TYPES.REFUND_INITIATED,
                    order: {
                        ...result.order,
                        status: 'CANCELLED',
                        refund_status: 'REFUND_REQUESTED',
                        refund_amount: rf.refundAmount
                    },
                    extraData: {
                        refundAmount: rf.refundAmount,
                        reason: cancelReasonNote,
                        adminNote: `Customer cancelled order. Manual refund of ₹${Number(rf.refundAmount).toLocaleString('en-IN')} required.`
                    }
                });
            } catch (notifErr) {
                console.error('[REFUND-ADMIN-NOTIFICATION-TRIGGER-ERROR]', notifErr);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            status: 'CANCELLED',
            message: successMessage,
            refund: rf,
            order: result.order
        }), { status: 200 });

    } catch (err) {
        console.error('[CANCEL-API-ERROR]', err);
        return new Response(JSON.stringify({ error: 'Cancellation failed: ' + (err.message || 'Unknown error') }), { status: 400 });
    }
}
