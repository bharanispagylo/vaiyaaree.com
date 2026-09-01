import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import pool from '@/lib/mysql.js';

// ─── TIMEZONE HELPER (Asia/Kolkata = IST) ────────────────────────────────────
/**
 * Returns the current time as a Date adjusted so that comparisons made in
 * plain JS reflect IST midnight boundaries correctly.
 */
function nowIST() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function toIST(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

// ─── STANDARDIZED ERROR HELPER ────────────────────────────────────────────────
function returnError(code, message) {
    return { success: false, code, message };
}

// ─── STATUS CONSTANTS ───────────────────────────────────────────────────────

export const RETURN_STATUSES = {
    RETURN_REQUESTED: 'RETURN_REQUESTED',
    RETURN_APPROVED: 'RETURN_APPROVED',
    CUSTOMER_SHIPPING_PENDING: 'CUSTOMER_SHIPPING_PENDING',
    RETURN_REJECTED: 'RETURN_REJECTED',
    CUSTOMER_SHIPPED: 'CUSTOMER_SHIPPED',
    IN_TRANSIT: 'IN_TRANSIT',
    RECEIVED_BY_COMPANY: 'RECEIVED_BY_COMPANY',
    INSPECTION_PENDING: 'INSPECTION_PENDING',
    UNDER_INSPECTION: 'UNDER_INSPECTION',
    INSPECTION_APPROVED: 'INSPECTION_APPROVED',
    INSPECTION_REJECTED: 'INSPECTION_REJECTED',
    REFUND_PENDING: 'REFUND_PENDING',
    REFUND_PROCESSING: 'REFUND_PROCESSING',
    REFUND_COMPLETED: 'REFUND_COMPLETED',
    EXCHANGE_PENDING: 'EXCHANGE_PENDING',
    EXCHANGE_PROCESSING: 'EXCHANGE_PROCESSING',
    EXCHANGE_SHIPPED: 'EXCHANGE_SHIPPED',
    EXCHANGE_DELIVERED: 'EXCHANGE_DELIVERED',
    RETURN_TO_CUSTOMER: 'RETURN_TO_CUSTOMER',
    RETURN_TO_CUSTOMER_SHIPPED: 'RETURN_TO_CUSTOMER_SHIPPED',
    RETURN_TO_CUSTOMER_DELIVERED: 'RETURN_TO_CUSTOMER_DELIVERED',
    RETURN_CLOSED: 'RETURN_CLOSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    // Legacy (keep backward compat)
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};

// ─── VALID STATUS TRANSITIONS ────────────────────────────────────────────────
const VALID_TRANSITIONS = {
    RETURN_REQUESTED:           ['RETURN_APPROVED', 'RETURN_REJECTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'UNDER_REVIEW'],
    UNDER_REVIEW:               ['RETURN_APPROVED', 'RETURN_REJECTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
    RETURN_APPROVED:            ['CUSTOMER_SHIPPED', 'IN_TRANSIT', 'RECEIVED_BY_COMPANY', 'RECEIVED', 'CANCELLED', 'RETURN_REQUIRED'],
    APPROVED:                   ['CUSTOMER_SHIPPED', 'IN_TRANSIT', 'RECEIVED_BY_COMPANY', 'RECEIVED', 'RETURN_REQUIRED', 'INSPECTION_PASSED', 'INSPECTION_APPROVED', 'EXCHANGE_SHIPPED', 'REFUND_PROCESSING', 'CANCELLED'],
    CUSTOMER_SHIPPING_PENDING:  ['CUSTOMER_SHIPPED', 'CANCELLED'],
    CUSTOMER_SHIPPED:           ['IN_TRANSIT', 'RECEIVED_BY_COMPANY', 'RECEIVED', 'RETURN_RECEIVED', 'INSPECTION_PENDING', 'UNDER_INSPECTION', 'INSPECTION_PASSED', 'INSPECTION_APPROVED', 'EXCHANGE_SHIPPED', 'REFUND_PROCESSING', 'CANCELLED'],
    IN_TRANSIT:                 ['RECEIVED_BY_COMPANY', 'RECEIVED', 'RETURN_RECEIVED', 'INSPECTION_PENDING', 'UNDER_INSPECTION', 'INSPECTION_PASSED', 'INSPECTION_APPROVED', 'CANCELLED'],
    RECEIVED_BY_COMPANY:        ['INSPECTION_PENDING', 'UNDER_INSPECTION', 'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'INSPECTION_PASSED', 'INSPECTION_FAILED', 'EXCHANGE_PENDING', 'EXCHANGE_PROCESSING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REJECTED', 'APPROVED'],
    RECEIVED:                   ['RECEIVED_BY_COMPANY', 'INSPECTION_PENDING', 'UNDER_INSPECTION', 'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'INSPECTION_PASSED', 'INSPECTION_FAILED', 'EXCHANGE_PENDING', 'EXCHANGE_PROCESSING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REJECTED', 'APPROVED'],
    RETURN_RECEIVED:            ['INSPECTION_PENDING', 'UNDER_INSPECTION', 'INSPECTION_PASSED', 'INSPECTION_FAILED', 'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'EXCHANGE_SHIPPED', 'REFUND_PROCESSING', 'REJECTED', 'APPROVED'],
    INSPECTION_PENDING:         ['UNDER_INSPECTION', 'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'INSPECTION_PASSED', 'INSPECTION_FAILED'],
    UNDER_INSPECTION:           ['INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'INSPECTION_PASSED', 'INSPECTION_FAILED'],
    INSPECTION_APPROVED:        ['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'REFUNDED', 'EXCHANGE_PENDING', 'EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED', 'APPROVED', 'COMPLETED'],
    INSPECTION_PASSED:          ['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'REFUNDED', 'EXCHANGE_PENDING', 'EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED', 'APPROVED', 'COMPLETED'],
    INSPECTION_REJECTED:        ['REJECTED', 'RETURN_TO_CUSTOMER', 'RETURN_TO_CUSTOMER_SHIPPED', 'CANCELLED'],
    INSPECTION_FAILED:          ['REJECTED', 'RETURN_TO_CUSTOMER', 'RETURN_TO_CUSTOMER_SHIPPED', 'CANCELLED'],
    QUALITY_CHECK_FAILED:       ['REJECTED', 'RETURN_TO_CUSTOMER', 'CANCELLED'],
    REFUND_PENDING:             ['REFUND_PROCESSING', 'REFUND_COMPLETED', 'REFUNDED'],
    REFUND_PROCESSING:          ['REFUND_COMPLETED', 'REFUNDED', 'REFUND_FAILED', 'COMPLETED'],
    REFUNDED:                   ['COMPLETED', 'RETURN_CLOSED'],
    REFUND_COMPLETED:           ['COMPLETED', 'RETURN_CLOSED'],
    EXCHANGE_PENDING:           ['EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED'],
    EXCHANGE_PROCESSING:        ['EXCHANGE_SHIPPED'],
    EXCHANGE_SHIPPED:           ['EXCHANGE_DELIVERED', 'EXCHANGE_COMPLETED', 'COMPLETED'],
    EXCHANGE_DELIVERED:         ['EXCHANGE_COMPLETED', 'COMPLETED'],
    EXCHANGE_COMPLETED:         ['COMPLETED', 'RETURN_CLOSED'],
    RETURN_TO_CUSTOMER:         ['RETURN_TO_CUSTOMER_SHIPPED'],
    RETURN_TO_CUSTOMER_SHIPPED: ['RETURN_TO_CUSTOMER_DELIVERED'],
    RETURN_TO_CUSTOMER_DELIVERED:['RETURN_CLOSED', 'COMPLETED'],
    RETURN_REJECTED:            [],
    REJECTED:                   [],
    RETURN_CLOSED:              [],
    COMPLETED:                  [],
    CANCELLED:                  [],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function validateStatusTransition(oldStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    return allowed.includes(newStatus);
}

/**
 * Generate a human-readable sequential Return ID: RET-0001, RET-0002...
 */
export async function generateReturnId() {
    try {
        const { data: lastRequests } = await mysqlAdmin
            .from('return_requests')
            .select('return_id')
            .order('created_at', { ascending: false })
            .limit(100);

        let maxNumber = 0;
        if (lastRequests && lastRequests.length > 0) {
            for (const req of lastRequests) {
                const retId = req.return_id || '';
                const match = retId.match(/RET-(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            }
        }

        const nextNumber = maxNumber + 1;
        return `RET-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
        console.error('Error generating sequential return ID:', err);
        return `RET-${String(Date.now()).slice(-4)}`;
    }
}

/**
 * Log a return status change to return_status_logs
 */
export async function logReturnStatus(returnRequestId, oldStatus, newStatus, actor = 'system', notes = null) {
    try {
        await mysqlAdmin.from('return_status_logs').insert({
            return_request_id: returnRequestId,
            old_status: oldStatus,
            new_status: newStatus,
            actor,
            notes,
        });
    } catch (err) {
        console.error('[RETURN-LOG] Failed to log status:', err);
    }
}

/**
 * Send WhatsApp notification for a return status
 */
async function notifyReturnStatus(returnRequestId, status, extraData = {}) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/returns/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: returnRequestId, status, ...extraData })
        });
    } catch (err) {
        console.error('[RETURN-SERVICE] Notify failed:', err);
    }
}

// ─── CORE FUNCTION: Submit Return Request ─────────────────────────────────────

/**
 * Process a full return/exchange submission from the customer.
 * Performs: ownership verification, cross-table duplicate check, partial
 * quantity validation, IST-aware 10-day window, discount-rule eligibility,
 * and inserts with standardized error codes.
 */
export async function processReturnRequest({
    orderId,
    orderItemId,
    items,
    productId,
    customerId,
    requestedQuantity = 1,
    type,
    reason,
    description,
    productCondition,
    policyAccepted,
    photoUrls,
    requestedFrom,
}) {
    console.log(`[RETURN-SERVICE] Processing ${type} for Order ${orderId} (Source: ${requestedFrom})`);

    try {
        // ── 1. Fetch Order ───────────────────────────────────────────────────────
        const { data: order, error: orderError } = await mysqlAdmin
            .from('orders')
            .select('status, created_at, total_amount, customer_phone, customer_name, customer_id')
            .eq('id', orderId)
            .single();

        if (orderError || !order) return returnError('ORDER_NOT_FOUND', 'Order not found.');

        // ── 2. Customer ownership verification ──────────────────────────────────
        // Only check if customerId is provided (guest orders may skip)
        if (customerId && order.customer_id && String(customerId) !== String(order.customer_id)) {
            return returnError('ORDER_NOT_OWNED', 'You do not have permission to request a return for this order.');
        }

        if (order.status !== 'DELIVERED') {
            return returnError('ORDER_NOT_DELIVERED', `Cannot request ${type.toLowerCase()} for an order that is not DELIVERED. Current status: ${order.status}.`);
        }

        // ── 3. Single Source of Truth: 7-day return window check ────────────────
        const RETURN_WINDOW_DAYS = 7;
        const { data: deliveryLog } = await mysqlAdmin
            .from('order_status_logs')
            .select('created_at')
            .eq('order_id', orderId)
            .eq('status', 'DELIVERED')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const deliveryDateIST = deliveryLog ? toIST(deliveryLog.created_at) : toIST(order.created_at);
        const windowEndIST = new Date(deliveryDateIST);
        windowEndIST.setDate(windowEndIST.getDate() + RETURN_WINDOW_DAYS);
        windowEndIST.setHours(23, 59, 59, 999);
        if (nowIST() > windowEndIST) {
            return returnError('RETURN_WINDOW_EXPIRED', `The ${RETURN_WINDOW_DAYS}-day return period has expired for this order.`);
        }

        // ── 4. Validate order item ownership and quantity ────────────────────────
        const effectiveProdId = productId || null;
        if (orderItemId) {
            const [itemRows] = await pool.query(
                'SELECT quantity FROM order_items WHERE id = ? AND order_id = ?',
                [orderItemId, orderId]
            );
            if (!itemRows || itemRows.length === 0) {
                return returnError('ITEM_NOT_FOUND', 'The selected item does not belong to this order.');
            }
            const orderedQty = Number(itemRows[0].quantity) || 1;
            const reqQty = Number(requestedQuantity) || 1;
            if (reqQty < 1 || reqQty > orderedQty) {
                return returnError('INVALID_QUANTITY', `Requested quantity (${reqQty}) exceeds ordered quantity (${orderedQty}).`);
            }

            // Check how much has already been returned/exchanged for this item
            const [alreadyRows] = await pool.query(
                `SELECT COALESCE(SUM(COALESCE(approved_quantity, requested_quantity, 1)), 0) AS already_qty
                 FROM return_requests
                 WHERE order_id = ? AND order_item_id = ?
                   AND status NOT IN ('CANCELLED', 'RETURN_REJECTED', 'REJECTED', 'INSPECTION_REJECTED', 'RETURN_CLOSED')`,
                [orderId, orderItemId]
            );
            const alreadyQty = Number(alreadyRows[0]?.already_qty) || 0;
            if (alreadyQty + reqQty > orderedQty) {
                return returnError('ITEM_ALREADY_RETURNED', `Only ${orderedQty - alreadyQty} unit(s) of this item are eligible for return/exchange.`);
            }
        }

        // ── 5. Cross-table duplicate check: block if active refund_request exists ─
        if (orderItemId || effectiveProdId) {
            const dupCheckCol = orderItemId ? 'order_item_id' : 'order_id';
            const dupCheckVal = orderItemId || orderId;
            const [existingRefund] = await pool.query(
                `SELECT id FROM refund_requests
                 WHERE ${dupCheckCol} = ?
                   AND refund_status NOT IN ('REJECTED', 'CANCELLED', 'REFUNDED', 'REFUND_FAILED')
                 LIMIT 1`,
                [dupCheckVal]
            );
            if (existingRefund && existingRefund.length > 0) {
                return returnError('DUPLICATE_REQUEST', 'An active refund request already exists for this item. Please cancel it before filing a return.');
            }
        }

        // ── 6. Discount rule eligibility ─────────────────────────────────────────
        // Check if any active discount rule marks this product/category as non-returnable
        if (effectiveProdId) {
            const [productRows] = await pool.query(
                'SELECT category FROM products WHERE id = ? LIMIT 1',
                [effectiveProdId]
            );
            if (productRows && productRows.length > 0) {
                const productCategory = productRows[0].category;
                const [discountRuleRows] = await pool.query(
                    `SELECT id FROM discounts
                     WHERE is_active = 1
                       AND (
                           (target_scope = 'SPECIFIC_PRODUCTS' AND JSON_CONTAINS(eligible_products, JSON_QUOTE(?)))
                           OR (target_scope = 'SPECIFIC_CATEGORIES' AND JSON_CONTAINS(eligible_categories, JSON_QUOTE(?)))
                       )
                       AND is_non_returnable = 1
                     LIMIT 1`,
                    [effectiveProdId, productCategory || '']
                );
                if (discountRuleRows && discountRuleRows.length > 0) {
                    return returnError('NON_RETURNABLE_ITEM', 'This product was purchased under a promotional offer and is not eligible for return or exchange.');
                }
            }
        }

        // ── 7. Check for duplicate active return_requests ───────────────────────
        const { data: existingRequests } = await mysqlAdmin
            .from('return_requests')
            .select('id, product_id, status')
            .eq('order_id', orderId);

        const isDuplicate = (existingRequests || []).some(r => {
            const productMatch = String(r.product_id) === String(effectiveProdId) ||
                (effectiveProdId === null && r.product_id === null);
            const isActive = !['CANCELLED', 'RETURN_REJECTED', 'REJECTED', 'INSPECTION_REJECTED', 'RETURN_CLOSED', 'COMPLETED'].includes(r.status);
            return productMatch && isActive;
        });
        if (isDuplicate) {
            return returnError('DUPLICATE_REQUEST', 'An active return or exchange request already exists for this product.');
        }

        // ── 8. Generate Return ID ─────────────────────────────────────────────
        const returnId = await generateReturnId();

        const payload = {
            order_id: orderId,
            product_id: effectiveProdId,
            customer_id: customerId || null,
            order_item_id: orderItemId || null,
            type: type,
            reason: reason,
            description: description || null,
            product_condition: productCondition || null,
            policy_accepted: policyAccepted ? 1 : 0,
            status: 'RETURN_REQUESTED',
            return_id: returnId,
            requested_quantity: Number(requestedQuantity) || 1,
            notes: null,
        };

        // 5. Insert return_requests
        const { data: inserted, error: insertError } = await mysqlAdmin
            .from('return_requests')
            .insert(payload)
            .select()
            .single();

        if (insertError) {
            console.error('[RETURN-SERVICE] Insert error:', insertError);
            return returnError('DB_INSERT_FAILED', insertError.message);
        }

        // 6. Log status
        await logReturnStatus(inserted.id, null, 'RETURN_REQUESTED', 'customer', 'Return request submitted by customer');

        // 7. Save photos
        if (photoUrls && photoUrls.length > 0) {
            const imageRows = [];
            photoUrls.forEach(url => {
                imageRows.push({
                    return_request_id: inserted.id,
                    image_url: url,
                    image_type: 'customer_photo',
                });
                if (inserted.return_id && inserted.return_id !== inserted.id) {
                    imageRows.push({
                        return_request_id: inserted.return_id,
                        image_url: url,
                        image_type: 'customer_photo',
                    });
                }
            });
            await mysqlAdmin.from('return_images').insert(imageRows);
        }

        // 8. Notify customer
        notifyReturnStatus(inserted.id, 'RETURN_REQUESTED');

        console.log(`[RETURN-SERVICE] Created ${returnId}`);
        return { success: true, data: inserted, returnId };

    } catch (error) {
        console.error('[RETURN-SERVICE] Critical Exception:', error);
        return returnError('INTERNAL_ERROR', error.message);
    }
}

/**
 * Admin or system transition a return request to a new status with validation.
 */
export async function transitionReturnStatus({
    returnRequestId,
    newStatus,
    actor = 'admin',
    notes = null,
    extraUpdates = {},
}) {
    try {
        const { data: current, error: fetchErr } = await mysqlAdmin
            .from('return_requests')
            .select('id, status, return_id, order_id, product_id')
            .eq('id', returnRequestId)
            .single();

        if (fetchErr || !current) return { success: false, error: 'Return request not found' };

        const oldStatus = current.status;
        if (!validateStatusTransition(oldStatus, newStatus)) {
            return { success: false, error: `Invalid status transition: ${oldStatus} → ${newStatus}` };
        }

        const updates = { status: newStatus, ...extraUpdates };
        const { error: updateErr } = await mysqlAdmin
            .from('return_requests')
            .update(updates)
            .eq('id', returnRequestId);

        if (updateErr) return { success: false, error: updateErr.message };

        await logReturnStatus(returnRequestId, oldStatus, newStatus, actor, notes);
        notifyReturnStatus(returnRequestId, newStatus, extraUpdates);

        return { success: true };
    } catch (err) {
        console.error('[RETURN-SERVICE] Transition error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Process return product inspection by admin
 */
export async function processReturnInspection({ returnRequestId, passed, notes, adminUser }) {
    try {
        const { data: current, error: fetchErr } = await mysqlAdmin
            .from('return_requests')
            .select('*, customers(*), orders(*)')
            .eq('id', returnRequestId)
            .single();

        if (fetchErr || !current) return { success: false, error: 'Return request not found' };

        const newInspectionStatus = passed ? 'PASSED' : 'FAILED';
        const newReturnStatus = passed ? 'INSPECTION_PASSED' : 'INSPECTION_FAILED';

        const extraUpdates = {
            inspection_status: newInspectionStatus,
            inspection_notes: notes || null,
            inspected_at: new Date().toISOString(),
            inspected_by: adminUser || 'admin',
            status: newReturnStatus
        };

        const { error: updateErr } = await mysqlAdmin
            .from('return_requests')
            .update(extraUpdates)
            .eq('id', returnRequestId);

        if (updateErr) return { success: false, error: updateErr.message };

        await logReturnStatus(returnRequestId, current.status, newReturnStatus, adminUser || 'admin', `Inspection: ${newInspectionStatus}. ${notes || ''}`);

        // Dispatch Email & WhatsApp Notifications
        try {
            const { sendReturnStatusEmail } = await import('@/lib/emailService');
            await sendReturnStatusEmail(current, newReturnStatus, { notes });
        } catch (emailErr) {
            console.error('[RETURN-INSPECTION-EMAIL-ERROR]', emailErr);
        }

        notifyReturnStatus(returnRequestId, newReturnStatus, { notes });

        return { success: true, inspectionStatus: newInspectionStatus, returnStatus: newReturnStatus };
    } catch (err) {
        console.error('[RETURN-SERVICE] Inspection Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Process exchange replacement shipment dispatch by admin
 */
export async function processExchangeDispatch({ returnRequestId, courierName, trackingNumber, notes, adminUser }) {
    try {
        const { data: current, error: fetchErr } = await mysqlAdmin
            .from('return_requests')
            .select('*, customers(*), orders(*)')
            .eq('id', returnRequestId)
            .single();

        if (fetchErr || !current) return { success: false, error: 'Return request not found' };

        const extraUpdates = {
            exchange_courier_name: courierName,
            exchange_tracking_number: trackingNumber,
            exchange_shipped_at: new Date().toISOString(),
            status: 'EXCHANGE_SHIPPED'
        };

        const { error: updateErr } = await mysqlAdmin
            .from('return_requests')
            .update(extraUpdates)
            .eq('id', returnRequestId);

        if (updateErr) return { success: false, error: updateErr.message };

        await logReturnStatus(returnRequestId, current.status, 'EXCHANGE_SHIPPED', adminUser || 'admin', `Dispatched replacement via ${courierName} (AWB: ${trackingNumber})`);

        // Dispatch Email & WhatsApp Notifications
        try {
            const { sendReturnStatusEmail } = await import('@/lib/emailService');
            await sendReturnStatusEmail(current, 'EXCHANGE_SHIPPED', { courierName, trackingNumber });
        } catch (emailErr) {
            console.error('[EXCHANGE-DISPATCH-EMAIL-ERROR]', emailErr);
        }

        notifyReturnStatus(returnRequestId, 'EXCHANGE_SHIPPED', { courierName, trackingNumber });

        return { success: true };
    } catch (err) {
        console.error('[RETURN-SERVICE] Exchange Dispatch Error:', err);
        return { success: false, error: err.message };
    }
}
