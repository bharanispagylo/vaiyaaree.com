import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            refundRequestId,
            courierCompany,
            trackingNumber,
            shippingDate,
            shippingCost,
            receiptUrl,
            customerNotes
        } = body;

        if (!refundRequestId || !courierCompany || !trackingNumber) {
            return NextResponse.json({ error: 'refundRequestId, courierCompany, and trackingNumber are required' }, { status: 400 });
        }

        const [rows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
        }

        const refund = rows[0];

        // Insert into refund_shipments
        const insertShipmentSql = `
            INSERT INTO refund_shipments 
            (refund_request_id, courier_company, tracking_number, shipping_date, shipping_cost, receipt_url, status, customer_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'CUSTOMER_SHIPPED', ?, NOW(), NOW())
        `;
        await pool.query(insertShipmentSql, [
            refundRequestId,
            courierCompany.trim(),
            trackingNumber.trim(),
            shippingDate || null,
            shippingCost ? Number(shippingCost) : 0,
            receiptUrl || null,
            customerNotes || null
        ]);

        // Update refund_requests status to CUSTOMER_SHIPPED
        await pool.query(`
            UPDATE refund_requests 
            SET refund_status = 'CUSTOMER_SHIPPED', return_status = 'CUSTOMER_SHIPPED', updated_at = NOW()
            WHERE id = ?
        `, [refundRequestId]);

        // Send WhatsApp Notification async
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/refunds/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refundId: refundRequestId, status: 'CUSTOMER_SHIPPED', notes: `Courier: ${courierCompany}, Tracking: ${trackingNumber}` })
            }).catch(e => console.error('[REFUND-SHIPPING-NOTIFY] Async error:', e));
        } catch (e) {}

        const [updatedRows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);

        return NextResponse.json({
            success: true,
            message: 'Shipping details submitted successfully.',
            refund: updatedRows[0]
        });
    } catch (err) {
        console.error('[API /api/refund-requests/submit-shipping Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to submit shipping details' }, { status: 500 });
    }
}
