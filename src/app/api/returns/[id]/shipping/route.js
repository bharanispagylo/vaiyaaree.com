import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { transitionReturnStatus } from '@/services/returnService';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    let conn;
    try {
        // ── Next.js 15/16: params is a Promise ──────────────────────────────
        const resolvedParams = await params;
        const rawId = resolvedParams?.id;

        if (!rawId) {
            return NextResponse.json({ error: 'Return ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const {
            courier_company_id,
            courier_company_name,
            tracking_number,
            shipping_date,
            shipping_cost,
            receipt_url,
            notes,
            customer_id,
        } = body;

        // ── 1. Fetch return request by UUID or return_id code ────────────────
        let [retRows] = await pool.query(
            'SELECT id, return_id, status, customer_id, order_id FROM return_requests WHERE id = ? LIMIT 1',
            [rawId]
        );
        if (!retRows || retRows.length === 0) {
            // Try by return_id code (RET-XXXX)
            [retRows] = await pool.query(
                'SELECT id, return_id, status, customer_id, order_id FROM return_requests WHERE return_id = ? LIMIT 1',
                [rawId]
            );
        }
        if (!retRows || retRows.length === 0) {
            return NextResponse.json({ error: 'Return request not found.' }, { status: 404 });
        }
        const ret = retRows[0];
        const id = ret.id;

        // ── 2. Customer ownership check ──────────────────────────────────────
        if (customer_id && ret.customer_id && String(ret.customer_id) !== String(customer_id)) {
            return NextResponse.json({ error: 'Unauthorized: This return request does not belong to your account.' }, { status: 403 });
        }

        // ── 3. Status validation ─────────────────────────────────────────────
        const ALLOWED_SHIPPING_STATUSES = [
            'RETURN_APPROVED', 'APPROVED', 'CUSTOMER_SHIPPING_PENDING', 'CUSTOMER_SHIPPED'
        ];
        if (!ALLOWED_SHIPPING_STATUSES.includes(ret.status)) {
            return NextResponse.json({
                error: `Cannot submit shipping. Current return status is '${ret.status}'. Only approved returns can submit shipping details.`
            }, { status: 400 });
        }

        // ── 4. Validate required fields ──────────────────────────────────────
        if (!courier_company_name || !String(courier_company_name).trim()) {
            return NextResponse.json({ error: 'Courier company name is required.' }, { status: 400 });
        }
        if (!tracking_number || !String(tracking_number).trim()) {
            return NextResponse.json({ error: 'Courier tracking / AWB number is required.' }, { status: 400 });
        }
        if (!shipping_date) {
            return NextResponse.json({ error: 'Shipping date is required.' }, { status: 400 });
        }

        // ── 5. Validate shipping cost (0 is valid) ───────────────────────────
        const cost = (shipping_cost === null || shipping_cost === undefined || shipping_cost === '')
            ? null
            : Number(shipping_cost);
        if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
            return NextResponse.json({ error: 'Shipping cost must be a valid non-negative number.' }, { status: 400 });
        }

        const courierName = String(courier_company_name).trim();
        const trackingNum = String(tracking_number).trim();
        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // ── 6. Upsert into return_shipping inside a transaction ───────────────
        conn = await pool.getConnection();
        await conn.beginTransaction();

        try {
            // Check existing row
            const [existingRows] = await conn.query(
                'SELECT id FROM return_shipping WHERE return_request_id = ? LIMIT 1',
                [id]
            );

            if (existingRows && existingRows.length > 0) {
                // Update existing
                await conn.query(
                    `UPDATE return_shipping
                     SET courier_company_id = ?, courier_company_name = ?, tracking_number = ?,
                         shipping_date = ?, shipping_cost = ?, receipt_url = ?, notes = ?,
                         status = 'SHIPPED', shipped_at = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [
                        courier_company_id || null, courierName, trackingNum,
                        shipping_date, cost, receipt_url || null, notes || null,
                        nowStr, existingRows[0].id
                    ]
                );
            } else {
                // Insert new
                await conn.query(
                    `INSERT INTO return_shipping
                     (return_request_id, courier_company_id, courier_company_name, tracking_number,
                      shipping_date, shipping_cost, receipt_url, notes, status, shipped_at, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SHIPPED', ?, NOW(), NOW())`,
                    [
                        id, courier_company_id || null, courierName, trackingNum,
                        shipping_date, cost, receipt_url || null, notes || null, nowStr
                    ]
                );
            }

            // Update return_requests status to CUSTOMER_SHIPPED (if not already)
            if (ret.status !== 'CUSTOMER_SHIPPED') {
                await conn.query(
                    `UPDATE return_requests
                     SET status = 'CUSTOMER_SHIPPED', shipped_at = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [nowStr, id]
                );

                // Insert status log
                await conn.query(
                    `INSERT INTO return_status_logs (return_request_id, old_status, new_status, actor, notes, created_at)
                     VALUES (?, ?, 'CUSTOMER_SHIPPED', 'customer', ?, NOW())`,
                    [id, ret.status, `Shipped via ${courierName} (AWB: ${trackingNum})`]
                );
            }

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            console.error('[SHIPPING-TX-ERROR]', txErr);
            throw txErr;
        } finally {
            conn.release();
            conn = null;
        }

        // ── 7. WhatsApp notification async (non-blocking) ────────────────────
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/returns/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: id,
                    status: 'CUSTOMER_SHIPPED',
                    notes: `Shipped via ${courierName}, Tracking: ${trackingNum}`
                })
            }).catch(e => console.error('[SHIPPING-NOTIFY]', e.message));
        } catch (e) {}

        return NextResponse.json({
            success: true,
            message: 'Shipping details submitted successfully. Your return package is now marked as shipped.',
        });

    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
            try { conn.release(); } catch (_) {}
        }
        console.error('[POST /api/returns/[id]/shipping] Exception:', {
            message: err.message,
            code: err.code,
            sql: err.sql,
        });
        return NextResponse.json({
            error: 'Failed to record shipping details.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        }, { status: 500 });
    }
}
