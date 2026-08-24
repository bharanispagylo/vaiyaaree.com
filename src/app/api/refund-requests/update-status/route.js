import { NextResponse } from 'next/server';
import pool from '@/lib/mysql.js';
import { verifyAdmin } from '@/lib/auth.js';
import { validateRefundTransition } from '@/services/refundService.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { refundRequestId, status, returnStatus, adminNote, failureReason } = body;

        if (!refundRequestId || !status) {
            return NextResponse.json({ error: 'refundRequestId and status are required' }, { status: 400 });
        }

        const [rows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
        }

        const current = rows[0];

        if (!validateRefundTransition(current.refund_status, status)) {
            return NextResponse.json({
                error: `Invalid status transition from ${current.refund_status} to ${status}`
            }, { status: 400 });
        }

        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
        let setClauses = ['`refund_status` = ?', '`updated_at` = NOW()'];
        let params = [status];

        if (returnStatus) {
            setClauses.push('`return_status` = ?');
            params.push(returnStatus);
        }

        if (adminNote) {
            setClauses.push('`admin_note` = ?');
            params.push(adminNote);
        }

        if (status === 'RETURN_RECEIVED') {
            setClauses.push('`return_status` = ?');
            params.push('RETURN_RECEIVED');
            setClauses.push('`received_at` = ?');
            params.push(now);
        } else if (status === 'REFUNDED') {
            setClauses.push('`completed_at` = ?');
            params.push(now);

            // Update main order status to REFUNDED
            if (current.order_id) {
                await pool.query('UPDATE orders SET status = "REFUNDED", updated_at = NOW() WHERE id = ?', [current.order_id]);
            }
        } else if (status === 'REFUND_FAILED') {
            setClauses.push('`refund_failed_at` = ?');
            params.push(now);
            if (failureReason) {
                setClauses.push('`refund_failure_reason` = ?');
                params.push(failureReason);
            }
        }

        params.push(refundRequestId);
        const sql = `UPDATE refund_requests SET ${setClauses.join(', ')} WHERE id = ?`;
        await pool.query(sql, params);

        // Send WhatsApp & Email Notifications async
        try {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${origin}/api/refunds/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refundId: refundRequestId, status, notes: adminNote || failureReason })
            }).catch(e => console.error('[REFUND-UPDATE-NOTIFY] Async error:', e));

            // Email Notification
            import('@/lib/emailService').then(({ sendRefundStatusEmail }) => {
                sendRefundStatusEmail(current, status, { admin_note: adminNote, failureReason });
            }).catch(e => console.error('[REFUND-EMAIL-NOTIFY] Error:', e));
        } catch (e) {}

        const [updatedRows] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [refundRequestId]);

        return NextResponse.json({
            success: true,
            message: `Refund status updated to ${status}.`,
            refund: updatedRows[0]
        });
    } catch (err) {
        console.error('[API /api/refund-requests/update-status Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to update refund status' }, { status: 500 });
    }
}
