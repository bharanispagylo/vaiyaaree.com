import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { dispatchNotification } from '@/services/notificationEngine';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request) {
    try {
        const { authorized, error: authErr } = await verifyAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { notificationLogId, orderId, returnId, eventType } = body;

        if (!notificationLogId && !orderId) {
            return NextResponse.json({ error: 'Notification Log ID or Order ID is required for retry' }, { status: 400 });
        }

        let targetLog = null;
        if (notificationLogId) {
            const { data } = await mysqlClient.from('notification_logs').select('*').eq('id', notificationLogId).single();
            targetLog = data;
        }

        const targetOrderId = orderId || targetLog?.order_id;
        const targetReturnId = returnId || targetLog?.return_id;
        const targetEventType = eventType || targetLog?.event_type;

        if (!targetOrderId && !targetReturnId) {
            return NextResponse.json({ error: 'No associated Order ID or Return ID found' }, { status: 400 });
        }

        // Fetch Order or Return record
        let orderObj = null;
        let returnObj = null;

        if (targetOrderId) {
            const { data: o } = await mysqlClient.from('orders').select('*').eq('id', targetOrderId).single();
            orderObj = o;
        }

        if (targetReturnId) {
            const { data: r } = await mysqlClient.from('return_requests').select('*').eq('id', targetReturnId).single();
            returnObj = r;
        }

        // Execute dispatch with forceRetry = true
        const retryResult = await dispatchNotification({
            eventType: targetEventType,
            order: orderObj,
            returnReq: returnObj,
            forceRetry: true
        });

        return NextResponse.json({
            success: true,
            message: `Notification retry initiated for ${targetEventType}`,
            result: retryResult
        }, { status: 200 });

    } catch (err) {
        console.error('[POST /api/admin/notifications/retry Error]:', err);
        return NextResponse.json({ error: err.message || 'Notification retry failed' }, { status: 500 });
    }
}
