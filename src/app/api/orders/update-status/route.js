// API Route: Update Order Status + Send WhatsApp Notification
import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import crypto from 'crypto';
import { verifyAdmin } from '@/lib/auth';
import { sendPdfBuffer } from '@/services/whatsappService';
import { generateOrderPDFBuffer } from '@/app/api/invoice/[orderId]/route';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';


const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials missing, skipping notification');
        return;
    }

    // Clean number: remove all non-digits
    let cleanedNum = to.replace(/\D/g, '');
    // For India: If starts with 7,8,9 and is 10 digits, add 91
    if (cleanedNum.length === 10 && /^[6789]/.test(cleanedNum)) {
        cleanedNum = '91' + cleanedNum;
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanedNum,
                type: "text",
                text: { 
                    preview_url: true,
                    body: text 
                }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('WA notification error:', data.error);
        } else {
            console.log(` WhatsApp notification sent to ${to}`);
        }
        return data;
    } catch (error) {
        console.error('WA notification failed:', error);
    }
}

async function getStatusMessage(orderId, status, order, items = []) {
    const totalAmount = order.total_amount || 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.vaiyaaree.com');
    const brand = 'Vaiyaaree';
    const displayInv = order.invoice_no 
        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
        : `#${String(orderId).replace(/^[A-Z]+-/, 'INV-')}`;

    switch (status) {
        case 'PAID':
            const itemList = items.map(i => `• ${i.product_name} (x${i.quantity}) - ₹${(i.price_at_time * i.quantity).toLocaleString()}`).join('\n');
            return [
                `INVOICE NO: ${displayInv}`,
                `--------------------------`,
                `Payment Received!`,
                ``,
                `Items:`,
                itemList,
                `--------------------------`,
                `Total Paid: ₹${totalAmount.toLocaleString()}`,
                `Method: ${order.payment_method || 'UPI/Online'}`,
                ``,
                `Your order is being processed. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'CANCELLED':
            return [
                `ORDER CANCELLED`,
                ``,
                `Order ${displayInv} has been cancelled.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `If you did not request this cancellation, please contact us!`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'PACKING':
            return [
                `ORDER PACKING`,
                ``,
                `Hi! We are currently packing your order ${displayInv}.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `It will be shipped shortly. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'SHIPPED': {
            const itemsList = items.map(i => `• ${i.product_name} (x${i.quantity})`).join('\n');
            let trackingUrl = order.tracking_url || '';
            const trackingNum = order.tracking_number || '';
            
            if (trackingUrl && trackingNum && trackingUrl.includes('{')) {
                trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNum);
            }

            return [
                ` *ORDER SHIPPED*`,
                ``,
                `Great news! Order ${displayInv} is on its way!`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
                ``,
                ` *Shipping Details:*`,
                `• Carrier: ${order.courier_name || 'N/A'}`,
                `• Tracking: ${trackingNum || 'N/A'}`,
                trackingUrl ? `• Track: ${trackingUrl}` : `• Details: ${appUrl}`,
                ``,
                `Thank you for shopping with us!`,
                `— ${brand}`
            ].join('\n');
        }

        case 'DELIVERED':
            return [
                `ORDER DELIVERED!`,
                ``,
                `Order ${displayInv} has been delivered successfully!`,
                `Total: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Hope you love your new saree!`,
                `Type Hi to shop again anytime.`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'PLACED':
            return [
                `ORDER CONFIRMED`,
                ``,
                `Your order ${displayInv} has been confirmed!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `We are preparing your saree for shipping.`,
                `— ${brand}`
            ].join('\n');

        default:
            return `Order ${displayInv} status updated to: ${status}\n— ${brand}`;
    }
}

export async function POST(request) {
    try {
        const {
            orderId,
            status,
            courierName,
            trackingNumber,
            trackingUrl
        } = await request.json();

        // 0. Authorization Check
        const { authorized, error: authError } = await verifyAdmin(request);
        if (!authorized) {
            return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!orderId || !status) {
            return new Response(JSON.stringify({ error: 'Missing orderId or status' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Get the order details first
        const { data: order, error: fetchError } = await mysqlClient
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch order items for status notifications (PAID, SHIPPED, PACKING, DELIVERED)
        let items = [];
        const { data: itemData } = await mysqlClient
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);
        items = itemData || [];

        // 3. Update the order status and shipping info
        const updatePayload = { status };
        if (courierName) updatePayload.courier_name = courierName;
        if (trackingNumber) updatePayload.tracking_number = trackingNumber;
        if (trackingUrl) updatePayload.tracking_url = trackingUrl;

        const { error: updateError } = await mysqlClient
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (updateError) {
            return new Response(JSON.stringify({ error: 'Failed to update order' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- NEW: Insert into order_status_logs ---
        await mysqlClient.from('order_status_logs').insert({
            order_id: orderId,
            status: status,
            notes: `Status updated to ${status} via Admin Dashboard`,
            created_at: new Date().toISOString()
        });

        // Refetch order to get updated shipping info for the message
        const { data: updatedOrder } = await mysqlClient.from('orders').select('*').eq('id', orderId).single();
        const finalOrder = updatedOrder || order;
        finalOrder.order_items = items;

        // Map status to notification engine event type
        let engineEventType = null;
        switch (status) {
            case 'PAID': engineEventType = EVENT_TYPES.PAYMENT_SUCCESS; break;
            case 'CONFIRMED': engineEventType = EVENT_TYPES.ORDER_CONFIRMED; break;
            case 'PROCESSING': engineEventType = EVENT_TYPES.ORDER_PROCESSING; break;
            case 'PACKING': engineEventType = EVENT_TYPES.ORDER_PACKED; break;
            case 'SHIPPED': engineEventType = EVENT_TYPES.ORDER_SHIPPED; break;
            case 'OUT_FOR_DELIVERY': engineEventType = EVENT_TYPES.OUT_FOR_DELIVERY; break;
            case 'DELIVERED': engineEventType = EVENT_TYPES.ORDER_DELIVERED; break;
            case 'CANCELLED': engineEventType = EVENT_TYPES.ORDER_CANCELLED_ADMIN; break;
            case 'DELIVERY_FAILED': engineEventType = EVENT_TYPES.DELIVERY_FAILED; break;
            default: engineEventType = EVENT_TYPES.ORDER_CONFIRMED; break;
        }

        // Trigger Notification Engine (with duplicate suppression + fallback)
        try {
            await dispatchNotification({
                eventType: engineEventType,
                order: finalOrder,
                extraData: {
                    courierName: courierName || finalOrder.courier_name,
                    trackingNumber: trackingNumber || finalOrder.tracking_number,
                    trackingUrl: trackingUrl || finalOrder.tracking_url
                }
            });
        } catch (notifError) {
            console.error('[STATUS-UPDATE-NOTIF-ERROR]', notifError);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Order updated to ${status} and notification engine triggered`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update order error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
