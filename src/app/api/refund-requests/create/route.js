import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { generateRefundId, calculateEligibleRefund } from '@/services/refundService.js';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { order_id, order_item_id, customer_id, reason, customer_note } = body;

        if (!order_id || !reason) {
            return NextResponse.json({ error: 'Order ID and reason are required.' }, { status: 400 });
        }

        // 1. Verify order exists and check customer
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!orders || orders.length === 0) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }
        const order = orders[0];
        const custId = customer_id || order.customer_id || 'guest';

        // 2. Check for duplicate active refund request for this order / order_item
        let dupQuery = 'SELECT id FROM refund_requests WHERE order_id = ? AND refund_status NOT IN ("REJECTED", "CANCELLED")';
        const dupParams = [order_id];
        if (order_item_id) {
            dupQuery += ' AND order_item_id = ?';
            dupParams.push(order_item_id);
        }
        const [existing] = await pool.query(dupQuery, dupParams);
        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'An active refund request already exists for this item/order.' }, { status: 400 });
        }

        // 3. Calculate refund amount on the backend (DO NOT trust frontend input)
        const calc = await calculateEligibleRefund(order_id, order_item_id);
        const requestedAmount = calc.eligibleAmount;

        if (requestedAmount <= 0) {
            return NextResponse.json({ error: 'Eligible refund amount must be greater than 0.' }, { status: 400 });
        }

        // 4. Generate unique UUID and human-readable refund_id
        const id = randomUUID();
        const refundIdCode = await generateRefundId();
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

        // 5. Insert record into refund_requests
        const insertSql = `
            INSERT INTO refund_requests 
            (id, refund_id, order_id, order_item_id, customer_id, reason, customer_note, requested_amount, approved_amount, return_status, refund_status, requested_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETURN_REQUIRED', 'REFUND_REQUESTED', ?, NOW(), NOW())
        `;
        await pool.query(insertSql, [
            id,
            refundIdCode,
            order_id,
            order_item_id || null,
            custId,
            reason,
            customer_note || null,
            requestedAmount,
            requestedAmount,
            now
        ]);

        // 6. Trigger WhatsApp notification async
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
        return NextResponse.json({ error: err.message || 'Failed to submit refund request' }, { status: 500 });
    }
}
