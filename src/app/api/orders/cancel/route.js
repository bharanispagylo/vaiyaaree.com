import pool, { withTransaction } from '@/lib/mysql.js';
import { generateRefundId, logRefundStatus } from '@/services/refundService.js';
import { getGatewaySettings } from '@/lib/settings.js';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine.js';
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
            await ensureOrdersSchema(conn);

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

            // 5. Payment Classification: Cash on Delivery (COD) vs Online Payment
            const paymentMethodUpper = String(order.payment_method || '').toUpperCase();
            const isCod = paymentMethodUpper === 'COD' || 
                          paymentMethodUpper.includes('CASH ON DELIVERY') || 
                          paymentMethodUpper === 'CASH' ||
                          (!order.razorpay_payment_id && currentStatus !== 'PAID' && !['RAZORPAY', 'UPI', 'PHONEPE'].some(m => paymentMethodUpper.includes(m)));

            const isPaidOnline = !isCod && (
                Boolean(order.razorpay_payment_id) || 
                currentStatus === 'PAID' ||
                ['RAZORPAY', 'ONLINE', 'UPI', 'PHONEPE', 'CARD'].some(m => paymentMethodUpper.includes(m))
            );

            // 6. Online Refund Processing (Razorpay / Admin Workflow)
            let razorpayRefund = null;

            if (isPaidOnline && order.razorpay_payment_id) {
                try {
                    const settings = await getGatewaySettings();
                    const keyId = settings.razorpay_key_id;
                    const keySecret = settings.razorpay_key_secret;

                    // Only attempt direct Razorpay API if live credentials exist
                    if (keyId && keySecret && !keyId.includes('placeholder') && !keySecret.includes('placeholder')) {
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
                                speed: 'optimum',
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
                            console.warn('[RAZORPAY-REFUND-NOTICE] Gateway response:', refundData?.error?.description || refundData);
                        }
                    }
                } catch (rzpErr) {
                    console.error('[RAZORPAY-REFUND-EXCEPTION]', rzpErr.message);
                }
            }

            // 7. Determine Refund Status & Admin Notes
            let refundStatusToSet = 'NOT_APPLICABLE';
            let razorpayRefundId = razorpayRefund?.id || null;
            let adminNoteText = '';

            if (isCod) {
                refundStatusToSet = 'NOT_APPLICABLE';
                adminNoteText = `Order cancelled by customer. ${cancelReasonNote} (Cash on Delivery - No refund required).`;
            } else if (isPaidOnline) {
                if (razorpayRefund) {
                    refundStatusToSet = 'REFUNDED';
                    adminNoteText = `Order cancelled by customer. ${cancelReasonNote}. Razorpay Refund ID: ${razorpayRefund.id}`;
                } else {
                    refundStatusToSet = 'REFUND_REQUESTED';
                    adminNoteText = `Order cancelled by customer. ${cancelReasonNote}. Online payment refund of ₹${Number(order.total_amount).toLocaleString('en-IN')} pending admin payout.`;
                }
            }

            // Update orders table in MySQL
            const refundAmountToStore = isPaidOnline ? order.total_amount : 0;
            await conn.query(
                `UPDATE \`orders\` 
                 SET \`status\` = 'CANCELLED', 
                     \`refund_status\` = ?, 
                     \`refund_amount\` = ?,
                     \`razorpay_refund_id\` = ?,
                     \`admin_notes\` = ?, 
                     \`updated_at\` = NOW() 
                 WHERE \`id\` = ?`,
                [refundStatusToSet, refundAmountToStore, razorpayRefundId, adminNoteText, orderId]
            );

            // 8. Insert Order Status Log (Timeline Entry)
            const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const logNote = isCod 
                ? `Order cancelled by customer. ${cancelReasonNote}. Payment Method: Cash on Delivery (No refund required).`
                : (razorpayRefund 
                    ? `Order cancelled by customer. Refund of ₹${Number(order.total_amount).toLocaleString('en-IN')} initiated via Razorpay (Refund ID: ${razorpayRefund.id})`
                    : `Order cancelled by customer. ${cancelReasonNote}. Online payment of ₹${Number(order.total_amount).toLocaleString('en-IN')} queued for Admin refund processing.`);

            await conn.query(
                "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, 'CANCELLED', ?, NOW())",
                [logId, orderId, logNote]
            );

            // 9. For Paid Online Orders: Create Refund Record in refund_requests
            let createdRefundCode = null;
            if (isPaidOnline) {
                const refundUuid = randomUUID();
                const refundCode = await generateRefundId();
                createdRefundCode = refundCode;
                const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

                // Prepare items_detail breakdown
                const itemsDetail = items.map(item => ({
                    order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_name: item.variant_name || null,
                    quantity: parseInt(item.quantity, 10) || 1,
                    unit_price: Number(item.price_at_time || item.price || 0),
                    eligible_amount: Number(item.paid_price_per_unit ? item.paid_price_per_unit * (parseInt(item.quantity, 10) || 1) : (item.price || 0) * (parseInt(item.quantity, 10) || 1))
                }));

                await conn.query(`
                    INSERT INTO \`refund_requests\` (
                        \`id\`, \`refund_id\`, \`order_id\`, \`order_item_id\`, \`customer_id\`, \`reason\`, \`customer_note\`, 
                        \`admin_note\`, \`requested_amount\`, \`approved_amount\`, \`return_status\`, \`refund_status\`, 
                        \`razorpay_payment_id\`, \`razorpay_refund_id\`, \`refund_gateway\`, \`items_detail\`,
                        \`requested_at\`, \`created_at\`, \`updated_at\`
                    ) VALUES (
                        ?, ?, ?, NULL, ?, 'Order Cancelled by Customer', ?, 
                        ?, ?, ?, 'NOT_REQUIRED', ?, 
                        ?, ?, ?, ?,
                        ?, NOW(), NOW()
                    )
                `, [
                    refundUuid,
                    refundCode,
                    orderId,
                    order.customer_id || customerId || authenticatedCustomer?.id || 'guest',
                    cancelReasonNote,
                    adminNoteText,
                    order.total_amount || 0,
                    order.total_amount || 0,
                    refundStatusToSet,
                    order.razorpay_payment_id || null,
                    razorpayRefundId,
                    order.payment_method || 'Razorpay',
                    JSON.stringify(itemsDetail),
                    now
                ]);

                // Audit log in refund_status_logs
                await logRefundStatus(
                    refundUuid,
                    null,
                    refundStatusToSet,
                    authenticatedCustomer?.name || 'Customer',
                    'customer',
                    `Order #${orderId} cancelled. Requested full refund of ₹${Number(order.total_amount).toLocaleString('en-IN')}`
                );
            }

            // 10. Delete the used OTP
            if (cleanPhone) {
                await conn.query("DELETE FROM `otps` WHERE `phone` = ?", [cleanPhone]);
            }

            return {
                order,
                isCod,
                isPaidOnline,
                refundCode: createdRefundCode,
                refundId: razorpayRefundId,
                refundStatus: refundStatusToSet,
                refundAmount: order.total_amount
            };
        });

        // If order was already cancelled
        if (result.alreadyCancelled) {
            return new Response(JSON.stringify({
                success: true,
                message: `Order #${orderId} is already cancelled.`,
                isCod: result.isCod,
                refundStatus: result.refundStatus
            }), { status: 200 });
        }

        // Generate friendly user-facing confirmation message
        let successMessage = '';
        if (result.isCod) {
            successMessage = 'Your Cash on Delivery order has been cancelled successfully. Since no payment was deducted, no refund is required.';
        } else if (result.refundId) {
            successMessage = `Order cancelled successfully. Instant refund of ₹${Number(result.refundAmount).toLocaleString('en-IN')} has been initiated via Razorpay (Refund ID: ${result.refundId}).`;
        } else {
            successMessage = `Order cancelled successfully. A refund request of ₹${Number(result.refundAmount).toLocaleString('en-IN')} has been submitted and will be processed by our admin team to your original payment method.`;
        }

        // Trigger async WhatsApp/Email order cancellation notifications
        try {
            dispatchNotification(EVENT_TYPES.ORDER_CANCELLED_CUSTOMER, {
                order: { ...result.order, status: 'CANCELLED', refund_status: result.refundStatus },
                reason: cancelReasonNote,
                refundAmount: result.refundAmount,
                isCod: result.isCod,
                refundCode: result.refundCode
            }).catch(err => console.error('[CANCEL-NOTIFICATION-ASYNC-ERROR]', err));
        } catch (notifErr) {
            console.error('[CANCEL-NOTIFICATION-TRIGGER-ERROR]', notifErr);
        }

        // If online payment refund is pending manual admin processing, notify admin
        if (result.isPaidOnline && result.refundStatus === 'REFUND_REQUESTED') {
            try {
                dispatchNotification(EVENT_TYPES.REFUND_INITIATED, {
                    order: { ...result.order, status: 'CANCELLED', refund_status: 'REFUND_REQUESTED' },
                    refundAmount: result.refundAmount,
                    refundCode: result.refundCode,
                    reason: cancelReasonNote,
                    adminNote: `Customer cancelled order. Manual refund of ₹${Number(result.refundAmount).toLocaleString('en-IN')} required. Refund Code: ${result.refundCode || 'N/A'}`
                }).catch(err => console.error('[REFUND-ADMIN-NOTIFICATION-ERROR]', err));
            } catch (notifErr) {
                console.error('[REFUND-ADMIN-NOTIFICATION-TRIGGER-ERROR]', notifErr);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: successMessage,
            isCod: result.isCod,
            refundCode: result.refundCode,
            refundId: result.refundId,
            refundStatus: result.refundStatus,
            refundAmount: result.refundAmount
        }), { status: 200 });

    } catch (err) {
        console.error('[CANCEL-API-ERROR]', err);
        return new Response(JSON.stringify({ error: 'Cancellation failed: ' + (err.message || 'Unknown error') }), { status: 400 });
    }
}
