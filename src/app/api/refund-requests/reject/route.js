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
        const { refundRequestId, adminNote } = body;

        if (!refundRequestId) {
            return NextResponse.json({ error: 'refundRequestId is required' }, { status: 400 });
        }

        if (!adminNote || !adminNote.trim()) {
            return NextResponse.json({ error: 'Rejection reason (adminNote) is required' }, { status: 400 });
        }

        const [rows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
        }

        await pool.query(`
            UPDATE refund_requests 
            SET refund_status = 'REJECTED', admin_note = ?, updated_at = NOW()
            WHERE id = ?
        `, [adminNote.trim(), refundRequestId]);

        // Send WhatsApp Notification async
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/refunds/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refundId: refundRequestId, status: 'REJECTED', notes: adminNote })
            }).catch(e => console.error('[REFUND-REJECT-NOTIFY] Async error:', e));
        } catch (e) {}

        const [updatedRows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);

        return NextResponse.json({
            success: true,
            message: 'Refund request rejected successfully.',
            refund: updatedRows[0]
        });
    } catch (err) {
        console.error('[API /api/refund-requests/reject Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to reject refund request' }, { status: 500 });
    }
}
