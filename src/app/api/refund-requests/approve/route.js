import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { verifyAdmin } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { refundRequestId, approvedAmount, adminNote, returnRequired = true } = body;

        if (!refundRequestId) {
            return NextResponse.json({ error: 'refundRequestId is required' }, { status: 400 });
        }

        const [rows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
        }

        const current = rows[0];
        const newRefundStatus = returnRequired ? 'RETURN_REQUIRED' : 'APPROVED';
        const newReturnStatus = returnRequired ? 'RETURN_REQUIRED' : 'NOT_REQUIRED';
        const finalApprovedAmount = approvedAmount !== undefined && approvedAmount !== null ? Number(approvedAmount) : Number(current.requested_amount);
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

        await pool.query(`
            UPDATE refund_requests 
            SET refund_status = ?, return_status = ?, approved_amount = ?, admin_note = ?, approved_at = ?, updated_at = NOW()
            WHERE id = ?
        `, [newRefundStatus, newReturnStatus, finalApprovedAmount, adminNote || null, now, refundRequestId]);

        // Send WhatsApp Notification async
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/refunds/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refundId: refundRequestId, status: newRefundStatus, notes: adminNote })
            }).catch(e => console.error('[REFUND-APPROVE-NOTIFY] Async error:', e));
        } catch (e) {}

        const [updatedRows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);

        return NextResponse.json({
            success: true,
            message: 'Refund request approved successfully.',
            refund: updatedRows[0]
        });
    } catch (err) {
        console.error('[API /api/refund-requests/approve Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to approve refund request' }, { status: 500 });
    }
}
