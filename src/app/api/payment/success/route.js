
import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';

export async function POST(request) {
    try {
        const { orderId, transactionId, paymentStatus } = await request.json();

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
        }

        // Fetch order to get details
        const { data: order } = await mysqlClient
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (!order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }

        const isSuccess = paymentStatus !== 'FAILED' && paymentStatus !== 'FAILURE';
        const newStatus = isSuccess ? 'PAID' : 'PAYMENT_FAILED';

        // Update database order record
        await mysqlClient.from('orders').update({
            status: newStatus,
            payment_status: isSuccess ? 'PAID' : 'FAILED',
            transaction_id: transactionId || order.transaction_id || null
        }).eq('id', orderId);

        // Record status log
        await mysqlClient.from('order_status_logs').insert({
            order_id: orderId,
            status: newStatus,
            notes: `Payment ${isSuccess ? 'Verified & Received' : 'Failed'} (${transactionId || 'N/A'})`,
            created_at: new Date().toISOString()
        });

        // Trigger Notification Engine (Customer & Admin alerts)
        await dispatchNotification({
            eventType: isSuccess ? EVENT_TYPES.PAYMENT_SUCCESS : EVENT_TYPES.PAYMENT_FAILED,
            order: { ...order, status: newStatus, transaction_id: transactionId }
        });

        return new Response(JSON.stringify({ success: isSuccess }), { status: 200 });

    } catch (error) {
        console.error('Payment Callback Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
