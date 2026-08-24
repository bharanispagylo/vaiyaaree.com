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
        const [rows] = await pool.query('SELECT refund_id FROM refund_requests ORDER BY created_at DESC LIMIT 100');
        let maxNum = 0;
        if (rows && rows.length > 0) {
            for (const r of rows) {
                if (r.refund_id) {
                    const match = r.refund_id.match(/RF-(\d+)/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                }
            }
        }
        const nextNum = maxNum + 1;
        return `RF-${String(nextNum).padStart(4, '0')}`;
    } catch (e) {
        console.warn('[REFUND-SERVICE] Error generating refund_id, fallback to timestamp:', e);
        return `RF-${Date.now().toString().slice(-6)}`;
    }
}

/**
 * Calculate eligible refund amount for an order or specific order item.
 * Calculates: product price - item discount
 */
export async function calculateEligibleRefund(orderId, orderItemId = null) {
    try {
        if (orderItemId) {
            const [items] = await pool.query(
                'SELECT * FROM order_items WHERE order_id = ? AND (id = ? OR product_id = ?)',
                [orderId, orderItemId, orderItemId]
            );
            if (items && items.length > 0) {
                const item = items[0];
                const price = Number(item.price_at_time || item.price || 0);
                const discount = Number(item.discount_at_time || item.discount || 0);
                const qty = Number(item.quantity || 1);
                const totalItemPrice = price * qty;
                const eligibleAmount = Math.max(0, totalItemPrice - discount);
                return {
                    price: totalItemPrice,
                    discount,
                    eligibleAmount,
                    productName: item.product_name || 'Product Item'
                };
            }
        }

        // Fallback: order total amount
        const [orders] = await pool.query('SELECT total_amount FROM orders WHERE id = ?', [orderId]);
        if (orders && orders.length > 0) {
            const total = Number(orders[0].total_amount || 0);
            return {
                price: total,
                discount: 0,
                eligibleAmount: total,
                productName: 'Order Total'
            };
        }

        return { price: 0, discount: 0, eligibleAmount: 0, productName: 'Unknown' };
    } catch (err) {
        console.error('[REFUND-SERVICE] Calculate refund error:', err);
        return { price: 0, discount: 0, eligibleAmount: 0, productName: 'Unknown' };
    }
}
