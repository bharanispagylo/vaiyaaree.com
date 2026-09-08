import pool from '@/lib/mysql.js';

export const REFUND_STATUSES = {
    REFUND_REQUESTED: 'REFUND_REQUESTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    RETURN_REQUIRED: 'RETURN_REQUIRED',
    CUSTOMER_SHIPPED: 'CUSTOMER_SHIPPED',
    RETURN_RECEIVED: 'RETURN_RECEIVED',
    REFUND_PROCESSING: 'REFUND_PROCESSING',
    REFUNDED: 'REFUNDED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    REFUND_FAILED: 'REFUND_FAILED'
};

export const RETURN_STATUSES = {
    RETURN_REQUIRED: 'RETURN_REQUIRED',
    CUSTOMER_SHIPPED: 'CUSTOMER_SHIPPED',
    RETURN_RECEIVED: 'RETURN_RECEIVED',
    NOT_REQUIRED: 'NOT_REQUIRED'
};

const VALID_TRANSITIONS = {
    REFUND_REQUESTED: ['UNDER_REVIEW', 'APPROVED', 'RETURN_REQUIRED', 'REJECTED', 'CANCELLED'],
    UNDER_REVIEW: ['APPROVED', 'RETURN_REQUIRED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['RETURN_REQUIRED', 'CUSTOMER_SHIPPED', 'RETURN_RECEIVED', 'REFUND_PROCESSING', 'REFUNDED', 'CANCELLED'],
    RETURN_REQUIRED: ['CUSTOMER_SHIPPED', 'RETURN_RECEIVED', 'CANCELLED'],
    CUSTOMER_SHIPPED: ['RETURN_RECEIVED', 'REFUND_PROCESSING'],
    RETURN_RECEIVED: ['APPROVED', 'REFUND_PROCESSING', 'REJECTED'],
    REFUND_PROCESSING: ['REFUNDED', 'REFUND_FAILED'],
    REFUNDED: [],
    REJECTED: [],
    CANCELLED: [],
    REFUND_FAILED: ['REFUND_PROCESSING', 'REFUNDED', 'CANCELLED']
};

export function validateRefundTransition(oldStatus, newStatus) {
    if (!oldStatus || !newStatus) return true;
    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    return allowed.includes(newStatus);
}

/**
 * Generate human-readable Refund ID: RF-0001, RF-0002 etc.
 */
export async function generateRefundId() {
    try {
        const [rows] = await pool.query(`
            SELECT refund_id FROM refund_requests 
            WHERE refund_id NOT LIKE 'RF-TEST-%' 
              AND order_id NOT LIKE 'ORD-TEST-%'
            ORDER BY created_at DESC
        `);
        let maxNum = 0;
        if (rows && rows.length > 0) {
            for (const r of rows) {
                if (r.refund_id) {
                    const match = r.refund_id.match(/^RF-(\d{1,5})$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            }
        }
        const nextNum = maxNum + 1;
        return `RF-${String(nextNum).padStart(4, '0')}`;
    } catch (e) {
        console.warn('[REFUND-SERVICE] Error generating refund_id, fallback to count:', e);
        try {
            const [countRows] = await pool.query("SELECT COUNT(*) as count FROM refund_requests WHERE order_id NOT LIKE 'ORD-TEST-%'");
            const count = (countRows[0]?.count || 0) + 1;
            return `RF-${String(count).padStart(4, '0')}`;
        } catch (err) {
            return `RF-${Date.now().toString().slice(-4)}`;
        }
    }
}

/**
 * Log a refund status change to refund_status_logs (audit trail).
 */
export async function logRefundStatus(refundRequestId, oldStatus, newStatus, actor = 'system', actorType = 'system', notes = null) {
    try {
        await pool.query(
            `INSERT INTO refund_status_logs (refund_request_id, old_status, new_status, actor, actor_type, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [refundRequestId, oldStatus || null, newStatus, actor, actorType, notes || null]
        );
    } catch (err) {
        console.error('[REFUND-SERVICE] Failed to log refund status:', err.message);
        // Non-fatal: do not throw
    }
}

/**
 * Check if an active return_request exists for the given order_item_id or order_id.
 * Returns the conflicting request ID if found, null otherwise.
 */
export async function checkReturnConflict(orderId, orderItemId = null) {
    try {
        const col = orderItemId ? 'order_item_id' : 'order_id';
        const val = orderItemId || orderId;
        const [rows] = await pool.query(
            `SELECT return_id FROM return_requests
             WHERE ${col} = ?
               AND status NOT IN ('CANCELLED', 'RETURN_REJECTED', 'REJECTED', 'INSPECTION_REJECTED', 'RETURN_CLOSED', 'COMPLETED')
             LIMIT 1`,
            [val]
        );
        return rows && rows.length > 0 ? rows[0].return_id : null;
    } catch (err) {
        console.error('[REFUND-SERVICE] checkReturnConflict error:', err.message);
        return null;
    }
}

/**
 * Calculate eligible refund amount for an order or specific order item(s).
 * For each item: (unit_price × quantity) − discount_adjustment + SGST + CGST (or IGST).
 * Supports single order_item_id or array / comma-separated list of order_item_ids.
 */
export async function calculateEligibleRefund(orderId, orderItemIds = null) {
    try {
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!orders || orders.length === 0) {
            return { price: 0, discount: 0, eligibleAmount: 0, productName: 'Unknown', items: [] };
        }
        const order = orders[0];

        let ids = [];
        if (Array.isArray(orderItemIds)) {
            ids = orderItemIds.filter(Boolean);
        } else if (typeof orderItemIds === 'string' && orderItemIds.trim()) {
            ids = orderItemIds.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(', ');
            const [items] = await pool.query(
                `SELECT * FROM order_items WHERE order_id = ? AND (id IN (${placeholders}) OR product_id IN (${placeholders}))`,
                [orderId, ...ids, ...ids]
            );

            if (items && items.length > 0) {
                const orderSubtotal = Number(order.subtotal || 0);
                const orderTotalDiscount = Number(order.total_discount || 0);
                const orderTaxable = Math.max(1, orderSubtotal - orderTotalDiscount);

                const hasOrderCGST = Number(order.cgst || 0) > 0;
                const hasOrderSGST = Number(order.sgst || 0) > 0;
                const hasOrderIGST = Number(order.igst || 0) > 0;

                let cgstRate = 0.025;
                let sgstRate = 0.025;
                let igstRate = 0;

                if (hasOrderIGST && !hasOrderCGST && !hasOrderSGST) {
                    igstRate = Number(order.igst) / orderTaxable;
                    cgstRate = 0;
                    sgstRate = 0;
                } else if (hasOrderCGST || hasOrderSGST) {
                    cgstRate = hasOrderCGST ? Number(order.cgst) / orderTaxable : 0.025;
                    sgstRate = hasOrderSGST ? Number(order.sgst) / orderTaxable : 0.025;
                    igstRate = 0;
                }

                const breakdownItems = items.map(item => {
                    const qty = Number(item.quantity || 1);
                    const unitPrice = Number(item.price_at_time || item.price || 0);
                    const grossPrice = unitPrice * qty;

                    let itemDiscount = 0;
                    if (item.paid_price_per_unit != null && Number(item.paid_price_per_unit) > 0) {
                        const paidUnit = Number(item.paid_price_per_unit);
                        itemDiscount = Math.max(0, Math.round((unitPrice - paidUnit) * qty * 100) / 100);
                    } else if (orderTotalDiscount > 0 && orderSubtotal > 0) {
                        itemDiscount = Math.round(((grossPrice / orderSubtotal) * orderTotalDiscount) * 100) / 100;
                    }

                    const taxable = Math.max(0, grossPrice - itemDiscount);
                    const cgst = Math.round(taxable * cgstRate);
                    const sgst = Math.round(taxable * sgstRate);
                    const igst = Math.round(taxable * igstRate);
                    const eligibleAmount = Math.round(taxable + cgst + sgst + igst);

                    return {
                        order_item_id: item.id,
                        product_id: item.product_id,
                        product_name: item.product_name || 'Product Item',
                        unit_price: unitPrice,
                        quantity: qty,
                        gross_price: grossPrice,
                        discount_adjustment: itemDiscount,
                        taxable_amount: taxable,
                        cgst,
                        sgst,
                        igst,
                        eligible_amount: eligibleAmount
                    };
                });

                const totalPrice = breakdownItems.reduce((sum, it) => sum + it.gross_price, 0);
                const totalDiscount = breakdownItems.reduce((sum, it) => sum + it.discount_adjustment, 0);
                const totalEligible = breakdownItems.reduce((sum, it) => sum + it.eligible_amount, 0);
                const cappedEligible = Math.min(totalEligible, Number(order.total_amount || totalEligible));

                return {
                    price: totalPrice,
                    discount: totalDiscount,
                    eligibleAmount: cappedEligible,
                    productName: breakdownItems.length === 1 ? breakdownItems[0].product_name : `${breakdownItems.length} Products Selected`,
                    items: breakdownItems
                };
            }
        }

        // Fallback: entire order total
        const total = Number(order.total_amount || 0);
        return {
            price: total,
            discount: Number(order.total_discount || 0),
            eligibleAmount: total,
            productName: 'Order Total',
            items: []
        };
    } catch (err) {
        console.error('[REFUND-SERVICE] Calculate refund error:', err);
        return { price: 0, discount: 0, eligibleAmount: 0, productName: 'Unknown', items: [] };
    }
}
