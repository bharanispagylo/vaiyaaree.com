import { mysqlClient } from '@/lib/mysqlClient';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';

export async function POST(request) {
    try {
        const {
            requestId,
            status,
            notes,
            courierData,
            forceRetry = false
        } = await request.json();

        if (!requestId || !status) {
            return new Response(JSON.stringify({ error: 'Missing requestId or status' }), { status: 400 });
        }

        // Fetch return request with related data
        const { data: req, error } = await mysqlClient
            .from('return_requests')
            .select('*, customers(*), products(*), orders(*)')
            .eq('id', requestId)
            .single();

        if (error || !req) {
            return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
        }

        // Map status to notification engine event type
        let engineEventType = EVENT_TYPES.RETURN_REQUESTED;
        const normStatus = (status || '').toUpperCase();

        if (normStatus === 'RETURN_APPROVED' || normStatus === 'APPROVED') engineEventType = EVENT_TYPES.RETURN_APPROVED;
        else if (normStatus === 'RETURN_REJECTED' || normStatus === 'REJECTED') engineEventType = EVENT_TYPES.RETURN_REJECTED;
        else if (normStatus === 'CUSTOMER_SHIPPED') engineEventType = EVENT_TYPES.RETURN_COURIER_SUBMITTED;
        else if (normStatus === 'RECEIVED_BY_COMPANY' || normStatus === 'RECEIVED') engineEventType = EVENT_TYPES.RETURN_RECEIVED;
        else if (normStatus === 'REFUND_PENDING' || normStatus === 'REFUND_PROCESSING') engineEventType = EVENT_TYPES.REFUND_INITIATED;
        else if (normStatus === 'REFUND_COMPLETED' || normStatus === 'REFUNDED') engineEventType = EVENT_TYPES.REFUND_COMPLETED;
        else if (normStatus === 'EXCHANGE_PENDING' || normStatus === 'EXCHANGE_REQUESTED') engineEventType = EVENT_TYPES.EXCHANGE_REQUESTED;
        else if (normStatus === 'EXCHANGE_APPROVED' || normStatus === 'EXCHANGE_PROCESSING') engineEventType = EVENT_TYPES.EXCHANGE_APPROVED;
        else if (normStatus === 'EXCHANGE_SHIPPED') engineEventType = EVENT_TYPES.EXCHANGE_SHIPPED;
        else if (normStatus === 'EXCHANGE_DELIVERED') engineEventType = EVENT_TYPES.EXCHANGE_DELIVERED;

        const dispatchRes = await dispatchNotification({
            eventType: engineEventType,
            order: req.orders || null,
            returnReq: req,
            extraData: {
                reason: notes || req.rejection_reason || req.reason,
                courierName: courierData?.courierName || req.exchange_courier_name,
                trackingNumber: courierData?.awbNumber || req.exchange_tracking_number,
                refundAmount: req.refund_amount,
                method: req.refund_method
            },
            forceRetry
        });

        return new Response(JSON.stringify({ success: true, result: dispatchRes }), { status: 200 });

    } catch (error) {
        console.error('[RETURN-NOTIFY] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
