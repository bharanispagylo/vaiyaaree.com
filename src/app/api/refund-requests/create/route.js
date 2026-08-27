import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { generateRefundId, calculateEligibleRefund, logRefundStatus, checkReturnConflict } from '@/services/refundService.js';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Standardized error response
function apiError(code, message, status = 400) {
    return NextResponse.json({ success: false, code, message }, { status });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { order_id, order_item_id, customer_id, reason, customer_note, image_url, damaged_image_url } = body;
        const finalImageUrl = image_url || damaged_image_url || null;

        if (!order_id || !reason) {
            return apiError('MISSING_FIELDS', 'Order ID and reason are required.');
        }

        // ── 1. Verify order exists ─────────────────────────────────────────────
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!orders || orders.length === 0) {
            return apiError('ORDER_NOT_FOUND', 'Order not found.', 404);
        }
        const order = orders[0];
        const custId = customer_id || order.customer_id || 'guest';

        // ── 2. Customer ownership verification ────────────────────────────────
        if (customer_id && order.customer_id && String(customer_id) !== String(order.customer_id)) {
            return apiError('ORDER_NOT_OWNED', 'You do not have permission to request a refund for this order.', 403);
        }

        // ── 3. Cross-table duplicate check: block if active return_request exists
        const conflictingReturnId = await checkReturnConflict(order_id, order_item_id || null);
        if (conflictingReturnId) {
            return apiError(
                'DUPLICATE_REQUEST',
                `An active return/exchange request (${conflictingReturnId}) already exists for this item. Please cancel it before filing a refund.`
            );
        }

        // ── 4. Check for duplicate active refund request for this order / order_item
        let dupQuery = 'SELECT id FROM refund_requests WHERE order_id = ? AND refund_status NOT IN ("REJECTED", "CANCELLED", "REFUNDED", "REFUND_FAILED")';
        const dupParams = [order_id];
        if (order_item_id) {
            dupQuery += ' AND order_item_id = ?';
            dupParams.push(order_item_id);
        }
        const [existing] = await pool.query(dupQuery, dupParams);
        if (existing && existing.length > 0) {
            return apiError('DUPLICATE_REQUEST', 'An active refund request already exists for this item or order.');
        }

        // ── 5. Discount rule non-returnable check ─────────────────────────────
        if (order_item_id) {
            const [itemRows] = await pool.query(
                'SELECT product_id FROM order_items WHERE id = ? AND order_id = ?',
                [order_item_id, order_id]
            );
            if (!itemRows || itemRows.length === 0) {
                return apiError('ITEM_NOT_FOUND', 'The selected order item does not belong to this order.');
            }
            const productId = itemRows[0].product_id;
            if (productId) {
                const [productRows] = await pool.query('SELECT category FROM products WHERE id = ? LIMIT 1', [productId]);
                const productCategory = productRows?.[0]?.category || '';
                const [discountRuleRows] = await pool.query(
                    `SELECT id FROM discounts
                     WHERE is_active = 1
                       AND (
                           (target_scope = 'SPECIFIC_PRODUCTS' AND JSON_CONTAINS(eligible_products, JSON_QUOTE(?)))
                           OR (target_scope = 'SPECIFIC_CATEGORIES' AND JSON_CONTAINS(eligible_categories, JSON_QUOTE(?)))
                       )
                       AND is_non_returnable = 1
                     LIMIT 1`,
                    [productId, productCategory]
                );
                if (discountRuleRows && discountRuleRows.length > 0) {
                    return apiError('NON_RETURNABLE_ITEM', 'This product was purchased under a promotional offer and is not eligible for a refund.');
                }
            }
        }

        // ── 6. Calculate refund amount (backend only, never trust frontend) ───
        const calc = await calculateEligibleRefund(order_id, order_item_id);
        const requestedAmount = calc.eligibleAmount;

        if (requestedAmount <= 0) {
            return apiError('INVALID_REFUND_AMOUNT', 'Eligible refund amount must be greater than 0.');
        }

        // ── 7. Idempotency: generate UUID + human-readable refund_id ──────────
        const id = randomUUID();
        const refundIdCode = await generateRefundId();
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

        // ── 8. Insert record into refund_requests (inside transaction) ────────
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const insertSql = `
                INSERT INTO refund_requests
                (id, refund_id, order_id, order_item_id, customer_id, reason, customer_note, image_url,
                 requested_amount, approved_amount, return_status, refund_status, requested_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETURN_REQUIRED', 'REFUND_REQUESTED', ?, NOW(), NOW())
            `;
            await conn.query(insertSql, [
                id, refundIdCode, order_id, order_item_id || null, custId,
                reason, customer_note || null, finalImageUrl,
                requestedAmount, requestedAmount, now
            ]);

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            conn.release();
            throw txErr;
        }
        conn.release();

        // ── 9. Write audit log ────────────────────────────────────────────────
        await logRefundStatus(id, null, 'REFUND_REQUESTED', customer_id || 'customer', 'customer', 'Refund request submitted by customer');

        // ── 10. Trigger WhatsApp notification async (non-blocking) ────────────
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/refunds/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refundId: id, status: 'REFUND_REQUESTED' })
            }).catch(e => console.error('[REFUND-NOTIFY] Async error:', e));
        } catch (e) {}

        // Fetch inserted record
        const [insertedRows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [id]);

        return NextResponse.json({
            success: true,
            message: 'Refund request submitted successfully.',
            refund: insertedRows[0] || { id, refund_id: refundIdCode, requested_amount: requestedAmount }
        });

    } catch (err) {
        console.error('[API /api/refund-requests/create Error]:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', message: err.message || 'Failed to submit refund request' }, { status: 500 });
    }
}
