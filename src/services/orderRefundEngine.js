import pool from '@/lib/mysql.js';
import { getGatewaySettings } from '@/lib/settings.js';
import crypto from 'crypto';

/**
 * Ensures razorpay_refund_id column exists on orders table
 */
let schemaChecked = false;
export async function ensureOrdersRefundSchema(conn) {
    if (schemaChecked) return;
    try {
        const [cols] = await conn.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_refund_id'");
        if (!cols || cols.length === 0) {
            await conn.query("ALTER TABLE `orders` ADD COLUMN `razorpay_refund_id` VARCHAR(100) NULL AFTER `razorpay_payment_id`");
        }
    } catch (e) {
        // Safe to ignore if column already exists or restricted
    }
    try {
        const [cols] = await conn.query("SHOW COLUMNS FROM `orders` LIKE 'cancel_reason'");
        if (!cols || cols.length === 0) {
            await conn.query("ALTER TABLE `orders` ADD COLUMN `cancel_reason` TEXT NULL AFTER `status`");
        }
    } catch (e) {
        // Safe to ignore if column already exists or restricted
    }
    schemaChecked = true;
}

/**
 * Automatically processes a refund for cancelled orders (both Customer & Admin initiated)
 * Handles:
 * 1. 100% Online / Razorpay orders -> Full order amount refunded
 * 2. COD with advance pay -> Advance amount refunded
 * 3. Pure COD with no advance -> Marked NOT_APPLICABLE (no refund needed)
 * 
 * @param {Object} params
 * @param {Object} params.conn - Active MySQL connection inside transaction
 * @param {Object} params.order - The locked order row from MySQL
 * @param {string} params.cancelReason - Reason for cancellation
 * @param {string} params.actor - 'customer' or 'admin'
 * @returns {Promise<Object>} Refund outcome summary
 */
export async function processOrderCancellationRefund({
    conn,
    order,
    cancelReason = 'Order cancelled',
    actor = 'customer'
}) {
    if (!order) {
        throw new Error('Order is required for refund processing');
    }

    await ensureOrdersRefundSchema(conn);

    const orderId = order.id;
    const paymentMethodUpper = String(order.payment_method || '').toUpperCase();
    const isCod = paymentMethodUpper === 'COD' || 
                  paymentMethodUpper.includes('CASH ON DELIVERY') || 
                  paymentMethodUpper === 'CASH';

    const advancePaid = Number(order.advance_paid || order.cod_advance_required || 0);
    const totalAmount = Number(order.total_amount || 0);
    const razorpayPaymentId = order.razorpay_payment_id || null;

    let eligibleRefundAmount = 0;
    let isCodAdvance = false;

    if (isCod) {
        if (advancePaid > 0 && razorpayPaymentId) {
            eligibleRefundAmount = advancePaid;
            isCodAdvance = true;
        }
    } else {
        // Online order
        const isPaidOnline = Boolean(razorpayPaymentId) || 
                             order.payment_status === 'PAID' || 
                             order.status === 'PAID' || 
                             ['RAZORPAY', 'ONLINE', 'UPI', 'PHONEPE', 'CARD'].some(m => paymentMethodUpper.includes(m));
        if (isPaidOnline && razorpayPaymentId) {
            eligibleRefundAmount = totalAmount;
        }
    }

    // Case A: Pure COD (No advance paid, no online transaction to refund)
    if (isCod && eligibleRefundAmount <= 0) {
        const refundStatus = 'NOT_APPLICABLE';
        const refundAmount = 0;
        const adminNoteText = `Order cancelled by ${actor}. Reason: ${cancelReason} (Cash on Delivery - No online payment to refund).`;
        const logNote = `Order cancelled by ${actor}. Reason: ${cancelReason}. Payment: Cash on Delivery (No refund required).`;

        await conn.query(
            `UPDATE \`orders\` 
             SET \`status\` = 'CANCELLED',
                 \`cancel_reason\` = COALESCE(?, \`cancel_reason\`),
                 \`refund_status\` = ?, 
                 \`refund_amount\` = ?, 
                 \`admin_notes\` = ?,
                 \`updated_at\` = NOW() 
             WHERE \`id\` = ?`,
            [cancelReason, refundStatus, refundAmount, adminNoteText, orderId]
        );

        const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await conn.query(
            "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, 'CANCELLED', ?, NOW())",
            [logId, orderId, logNote]
        );

        return {
            success: true,
            status: 'CANCELLED',
            refundStatus,
            refundAmount,
            razorpayRefundId: null,
            isCodAdvance: false,
            message: 'Cash on delivery order cancelled. No refund required.'
        };
    }

    // Case B: Online order but missing razorpay_payment_id (e.g. manual mark paid)
    if (!razorpayPaymentId && eligibleRefundAmount > 0) {
        const refundStatus = 'REFUND_REQUESTED';
        const refundAmount = eligibleRefundAmount;
        const adminNoteText = `Order cancelled by ${actor}. Reason: ${cancelReason}. Online payment of ₹${eligibleRefundAmount.toLocaleString('en-IN')} pending manual admin payout (No Razorpay transaction ID linked).`;
        const logNote = `Order cancelled by ${actor}. Reason: ${cancelReason}. Online payment of ₹${eligibleRefundAmount.toLocaleString('en-IN')} queued for manual admin refund.`;

        await conn.query(
            `UPDATE \`orders\` 
             SET \`status\` = 'CANCELLED',
                 \`cancel_reason\` = COALESCE(?, \`cancel_reason\`),
                 \`refund_status\` = ?, 
                 \`refund_amount\` = ?, 
                 \`admin_notes\` = ?,
                 \`updated_at\` = NOW() 
             WHERE \`id\` = ?`,
            [cancelReason, refundStatus, refundAmount, adminNoteText, orderId]
        );

        // Record in refunds table
        const refundRecordId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        try {
            await conn.query(
                `INSERT INTO \`refunds\` (\`id\`, \`customer_id\`, \`order_id\`, \`amount\`, \`status\`, \`reason\`, \`payment_method\`, \`created_at\`, \`updated_at\`)
                 VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?, NOW(), NOW())`,
                [refundRecordId, order.customer_id || null, orderId, refundAmount, cancelReason, order.payment_method || 'ONLINE']
            );
        } catch (e) {
            console.error('[REFUND LOGGING ERROR]', e.message);
        }

        const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await conn.query(
            "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, 'CANCELLED', ?, NOW())",
            [logId, orderId, logNote]
        );

        return {
            success: true,
            refundStatus,
            refundAmount,
            razorpayRefundId: null,
            isCodAdvance,
            message: `Order cancelled. Refund of ₹${eligibleRefundAmount} queued for admin payout.`
        };
    }

    // Case C: Online Payment Captured via Razorpay (either full online order OR COD advance payment)
    let razorpayRefund = null;
    let refundErrorMsg = null;
    const refundAmountPaise = Math.round(eligibleRefundAmount * 100);

    try {
        const settings = await getGatewaySettings();
        const keyId = settings.razorpay_key_id;
        const keySecret = settings.razorpay_key_secret;

        if (keyId && keySecret && !keyId.includes('placeholder') && !keySecret.includes('placeholder')) {
            const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
            const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    amount: refundAmountPaise,
                    speed: 'optimum',
                    notes: {
                        order_id: String(orderId),
                        invoice_no: String(order.invoice_no || orderId),
                        cancelled_by: actor,
                        cancellation_type: isCodAdvance ? 'COD_ADVANCE_REFUND' : 'ONLINE_FULL_REFUND',
                        reason: cancelReason
                    }
                })
            });

            const refundData = await rzpRes.json();
            if (rzpRes.ok && refundData.id) {
                razorpayRefund = refundData;
                console.log(`[RAZORPAY-AUTO-REFUND-SUCCESS] Order #${orderId} (${isCodAdvance ? 'COD Advance' : 'Full Online'}): Refund ID ${refundData.id}, Amount: ₹${eligibleRefundAmount}`);
            } else {
                refundErrorMsg = refundData?.error?.description || refundData?.error?.message || JSON.stringify(refundData);
                console.warn('[RAZORPAY-AUTO-REFUND-NOTICE] Gateway response:', refundErrorMsg);
            }
        } else {
            refundErrorMsg = 'Razorpay live credentials not configured';
            console.warn('[RAZORPAY-AUTO-REFUND-NOTICE] Razorpay credentials missing or placeholder');
        }
    } catch (rzpErr) {
        refundErrorMsg = rzpErr.message;
        console.error('[RAZORPAY-AUTO-REFUND-EXCEPTION]', rzpErr.message);
    }

    // Determine final status based on Razorpay response
    let refundStatusToSet = 'REFUND_REQUESTED';
    let razorpayRefundId = razorpayRefund?.id || null;
    let adminNoteText = '';
    let logNote = '';

    const refundLabel = isCodAdvance ? 'COD partial advance payment' : 'Online payment';

    if (razorpayRefund) {
        refundStatusToSet = 'REFUNDED';
        adminNoteText = `Order cancelled by ${actor}. Reason: ${cancelReason}. ${refundLabel} of ₹${eligibleRefundAmount.toLocaleString('en-IN')} automatically refunded via Razorpay (Refund ID: ${razorpayRefund.id}).`;
        logNote = `Order cancelled by ${actor}. ${refundLabel} of ₹${eligibleRefundAmount.toLocaleString('en-IN')} automatically refunded via Razorpay (Refund ID: ${razorpayRefund.id}).`;
    } else {
        refundStatusToSet = 'REFUND_REQUESTED';
        adminNoteText = `Order cancelled by ${actor}. Reason: ${cancelReason}. Automatic gateway refund could not be completed (${refundErrorMsg || 'Gateway error'}). Refund of ₹${eligibleRefundAmount.toLocaleString('en-IN')} queued for manual Admin review/payout.`;
        logNote = `Order cancelled by ${actor}. Reason: ${cancelReason}. ${refundLabel} refund of ₹${eligibleRefundAmount.toLocaleString('en-IN')} queued for manual Admin processing.`;
    }

    // Update order in MySQL
    await conn.query(
        `UPDATE \`orders\` 
         SET \`status\` = 'CANCELLED',
             \`cancel_reason\` = COALESCE(?, \`cancel_reason\`),
             \`refund_status\` = ?, 
             \`refund_amount\` = ?,
             \`razorpay_refund_id\` = ?,
             \`admin_notes\` = ?, 
             \`updated_at\` = NOW() 
         WHERE \`id\` = ?`,
        [cancelReason, refundStatusToSet, eligibleRefundAmount, razorpayRefundId, adminNoteText, orderId]
    );

    // Insert into refunds tracking table
    const refundRecordId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        await conn.query(
            `INSERT INTO \`refunds\` (\`id\`, \`customer_id\`, \`order_id\`, \`amount\`, \`status\`, \`reason\`, \`payment_method\`, \`refund_id\`, \`created_at\`, \`updated_at\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                refundRecordId,
                order.customer_id || null,
                orderId,
                eligibleRefundAmount,
                refundStatusToSet === 'REFUNDED' ? 'REFUNDED' : 'REQUESTED',
                `${isCodAdvance ? '[COD Advance Refund]' : '[Order Refund]'} ${cancelReason}`,
                order.payment_method || 'RAZORPAY',
                razorpayRefundId
            ]
        );
    } catch (e) {
        console.error('[REFUND AUDIT LOGGING ERROR]', e.message);
    }

    // Insert timeline log entry
    const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await conn.query(
        "INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `notes`, `created_at`) VALUES (?, ?, 'CANCELLED', ?, NOW())",
        [logId, orderId, logNote]
    );

    return {
        success: true,
        status: 'CANCELLED',
        refundStatus: refundStatusToSet,
        refundAmount: eligibleRefundAmount,
        razorpayRefundId,
        isCodAdvance,
        gatewayRefunded: Boolean(razorpayRefund),
        message: razorpayRefund
            ? `Order cancelled. Refund of ₹${eligibleRefundAmount.toLocaleString('en-IN')} has been automatically sent to customer via Razorpay (Refund ID: ${razorpayRefund.id}).`
            : `Order cancelled. Refund of ₹${eligibleRefundAmount.toLocaleString('en-IN')} queued for admin processing.`
    };
}
