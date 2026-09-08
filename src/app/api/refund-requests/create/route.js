import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { generateRefundId, calculateEligibleRefund, logRefundStatus, checkReturnConflict } from '@/services/refundService.js';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Standardized error response
function apiError(code, message, status = 400) {
    return NextResponse.json({ success: false, code, message }, { status });
}

let refundSchemaEnsured = false;
async function ensureRefundSchema() {
    if (refundSchemaEnsured) return;
    try {
        const [cols] = await pool.query("SHOW COLUMNS FROM `refund_requests` LIKE 'image_url'");
        if (!cols || cols.length === 0) {
            await pool.query("ALTER TABLE `refund_requests` ADD COLUMN `image_url` VARCHAR(500) NULL AFTER `customer_note`");
        }
        const [detailCols] = await pool.query("SHOW COLUMNS FROM `refund_requests` LIKE 'items_detail'");
        if (!detailCols || detailCols.length === 0) {
            await pool.query("ALTER TABLE `refund_requests` ADD COLUMN `items_detail` TEXT NULL AFTER `image_url`");
        }
        try {
            await pool.query("ALTER TABLE `refund_requests` MODIFY COLUMN `order_item_id` VARCHAR(255) NULL");
        } catch (_) {}
        refundSchemaEnsured = true;
    } catch (e) {
        // Ignore if exists or error
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { order_id, order_item_id, selected_items, order_item_ids, customer_id, reason, customer_note, image_url, damaged_image_url } = body;
        const finalImageUrl = image_url || damaged_image_url || null;

        if (!order_id || !reason) {
            return apiError('MISSING_FIELDS', 'Order ID and reason are required.');
        }

        // ── 1. Resolve selected item IDs ──────────────────────────────────────
        let targetItemIds = [];
        if (Array.isArray(selected_items) && selected_items.length > 0) {
            targetItemIds = selected_items.map(it => it.order_item_id || it.id || it.product_id).filter(Boolean);
        } else if (Array.isArray(order_item_ids) && order_item_ids.length > 0) {
            targetItemIds = order_item_ids.filter(Boolean);
        } else if (order_item_id) {
            targetItemIds = String(order_item_id).split(',').map(s => s.trim()).filter(Boolean);
        }

        if (targetItemIds.length === 0) {
            return apiError('MISSING_ITEMS', 'Please select at least one product for refund.');
        }

        // ── 2. Verify order exists ─────────────────────────────────────────────
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!orders || orders.length === 0) {
            return apiError('ORDER_NOT_FOUND', 'Order not found.', 404);
        }
        const order = orders[0];
        const custId = customer_id || order.customer_id || 'guest';

        // ── 3. Customer ownership verification ────────────────────────────────
        if (customer_id && order.customer_id && String(customer_id) !== String(order.customer_id)) {
            return apiError('ORDER_NOT_OWNED', 'You do not have permission to request a refund for this order.', 403);
        }

        // ── 4. Verify all selected items belong to this order ─────────────────
        const placeholders = targetItemIds.map(() => '?').join(', ');
        const [itemRows] = await pool.query(
            `SELECT * FROM order_items WHERE order_id = ? AND (id IN (${placeholders}) OR product_id IN (${placeholders}))`,
            [order_id, ...targetItemIds, ...targetItemIds]
        );
        if (!itemRows || itemRows.length === 0) {
            return apiError('ITEMS_NOT_FOUND', 'The selected products do not belong to this order.', 400);
        }

        const validItemIds = itemRows.map(it => it.id);

        // ── 5. Cross-table duplicate check: active return_requests ────────────
        for (const item of itemRows) {
            const conflictingReturnId = await checkReturnConflict(order_id, item.id);
            if (conflictingReturnId) {
                return apiError(
                    'DUPLICATE_REQUEST',
                    `An active return/exchange request (${conflictingReturnId}) already exists for product "${item.product_name}". Please cancel it before filing a refund.`
                );
            }
        }

        // ── 6. Check for duplicate active refund requests for these items ─────
        const [existingRefunds] = await pool.query(
            `SELECT id, order_item_id FROM refund_requests 
             WHERE order_id = ? AND refund_status NOT IN ("REJECTED", "CANCELLED", "REFUNDED", "REFUND_FAILED")`,
            [order_id]
        );

        if (existingRefunds && existingRefunds.length > 0) {
            for (const ref of existingRefunds) {
                if (!ref.order_item_id) {
                    return apiError('DUPLICATE_REQUEST', 'An active refund request already covers the entire order.');
                }
                const activeItemIds = String(ref.order_item_id).split(',').map(s => s.trim());
                const overlap = validItemIds.some(vid => activeItemIds.includes(vid));
                if (overlap) {
                    return apiError('DUPLICATE_REQUEST', 'An active refund request already exists for one or more of the selected products.');
                }
            }
        }

        // ── 7. Discount rule non-returnable check ─────────────────────────────
        for (const item of itemRows) {
            const productId = item.product_id;
            if (productId) {
                try {
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
                        return apiError('NON_RETURNABLE_ITEM', `Product "${item.product_name}" was purchased under a promotional offer and is not eligible for a refund.`);
                    }
                } catch (discountCheckErr) {
                    console.warn('[REFUND-CREATE] Discount non-returnable check skipped:', discountCheckErr.message);
                }
            }
        }

        // ── 8. Calculate refund amount (backend only, never trust frontend) ───
        const calc = await calculateEligibleRefund(order_id, validItemIds);
        const requestedAmount = calc.eligibleAmount;

        if (requestedAmount <= 0) {
            return apiError('INVALID_REFUND_AMOUNT', 'Eligible refund amount must be greater than 0.');
        }

        // ── 9. Idempotency: generate UUID + human-readable refund_id ──────────
        const id = randomUUID();
        const refundIdCode = await generateRefundId();
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
        const itemsDetailJson = JSON.stringify(calc.items || []);
        const orderItemIdVal = validItemIds.join(',');

        // ── 10. Insert record into refund_requests (inside transaction) ───────
        await ensureRefundSchema();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const insertSql = `
                INSERT INTO refund_requests
                (id, refund_id, order_id, order_item_id, customer_id, reason, customer_note, image_url, items_detail,
                 requested_amount, approved_amount, return_status, refund_status, requested_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETURN_REQUIRED', 'REFUND_REQUESTED', ?, NOW(), NOW())
            `;
            await conn.query(insertSql, [
                id, refundIdCode, order_id, orderItemIdVal, custId,
                reason, customer_note || null, finalImageUrl, itemsDetailJson,
                requestedAmount, requestedAmount, now
            ]);

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            conn.release();
            throw txErr;
        }
        conn.release();

        // ── 11. Write audit log ───────────────────────────────────────────────
        await logRefundStatus(id, null, 'REFUND_REQUESTED', customer_id || 'customer', 'customer', 'Refund request submitted by customer');

        // ── 12. Trigger WhatsApp notification async (non-blocking) ────────────
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
            refund: insertedRows[0] || { id, refund_id: refundIdCode, requested_amount: requestedAmount, items_detail: itemsDetailJson }
        });

    } catch (err) {
        console.error('[API /api/refund-requests/create Error]:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', message: err.message || 'Failed to submit refund request' }, { status: 500 });
    }
}
