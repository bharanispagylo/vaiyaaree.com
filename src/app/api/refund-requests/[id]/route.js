import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Refund Request ID is required' }, { status: 400 });
        }

        const [rows] = await pool.query(
            'SELECT * FROM refund_requests WHERE id = ? OR refund_id = ?',
            [id, id]
        );

        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Refund Request not found' }, { status: 404 });
        }

        const refund = rows[0];

        // Fetch related order
        let orderData = null;
        if (refund.order_id) {
            const [oRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [refund.order_id]);
            if (oRows && oRows.length > 0) {
                orderData = oRows[0];
            }
        }

        // Fetch shipment info
        let shipmentData = null;
        const [sRows] = await pool.query('SELECT * FROM refund_shipments WHERE refund_request_id = ? ORDER BY created_at DESC', [refund.id]);
        if (sRows && sRows.length > 0) {
            shipmentData = sRows[0];
        }

        // Fetch customer info
        let customerData = null;
        if (refund.customer_id) {
            const [cRows] = await pool.query('SELECT id, name, email, phone FROM customers WHERE id = ?', [refund.customer_id]);
            if (cRows && cRows.length > 0) {
                customerData = cRows[0];
            }
        }

        return NextResponse.json({
            success: true,
            refund: {
                ...refund,
                orders: orderData,
                refund_shipments: shipmentData,
                customers: customerData
            }
        });
    } catch (err) {
        console.error('[API /api/refund-requests/[id] Error]:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
