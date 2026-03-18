// API Route: Update Order Status + Send WhatsApp Notification
import { supabase } from '@/lib/supabaseClient';

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
    if (cleanedNum.length === 10 && /^[789]/.test(cleanedNum)) {
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
                text: { body: text }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('WA notification error:', data.error);
        } else {
            console.log(`✅ WhatsApp notification sent to ${to}`);
        }
        return data;
    } catch (error) {
        console.error('WA notification failed:', error);
    }
}

async function getStatusMessage(orderId, status, order, items = []) {
    const totalAmount = order.total_amount || 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const invoiceUrl = `${appUrl}/shop/invoice?oid=${orderId}`;
    const brand = 'Cast Print';

    switch (status) {
        case 'PAID':
            const itemList = items.map(i => `• ${i.product_name} (x${i.quantity}) - ₹${(i.price_at_time * i.quantity).toLocaleString()}`).join('\n');
            return [
                `🧾 *INVOICE: ${orderId}*`,
                `--------------------------`,
                `✅ *Payment Received!*`,
                ``,
                `*Items:*`,
                itemList,
                `--------------------------`,
                `*Total Paid:* ₹${totalAmount.toLocaleString()}`,
                `*Method:* ${order.payment_method || 'UPI/Online'}`,
                ``,
                `🔗 *View Full Bill:* ${invoiceUrl}`,
                ``,
                `Your order is being processed. Thank you! 💮`,
                `— ${brand}`
            ].join('\n');

        case 'CANCELLED':
            return [
                `❌ *ORDER CANCELLED*`,
                ``,
                `Order #${orderId} has been cancelled.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `If you did not request this cancellation, please contact us!`,
                ``,
                `— ${brand} 💮`
            ].join('\n');

        case 'PACKING':
            return [
                `📦 *ORDER PACKING*`,
                ``,
                `Hi! We are currently packing your order #${orderId}.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `It will be shipped shortly. Thank you! 💮`,
                `— ${brand}`
            ].join('\n');

        case 'SHIPPED':
            return [
                `🚚 *ORDER SHIPPED!*`,
                ``,
                `Order #${orderId} is on its way!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `*Shipping Details:*`,
                `Carrier: ${order.courier_name || 'N/A'}`,
                `Tracking: ${order.tracking_number || 'N/A'}`,
                ``,
                order.tracking_url ? `🔗 *Track Here:* ${order.tracking_url}` : `🔗 *View Details:* ${invoiceUrl}`,
                ``,
                `Thank you for shopping with us! 💮`,
                `— ${brand}`
            ].join('\n');

        case 'DELIVERED':
            return [
                `✅ *ORDER DELIVERED!*`,
                ``,
                `Order #${orderId} has been delivered successfully!`,
                `Total: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Hope you love your new saree! 💕`,
                `Type *Hi* to shop again anytime.`,
                ``,
                `— ${brand} 💮`
            ].join('\n');

        case 'PLACED':
            return [
                `📦 *ORDER CONFIRMED*`,
                ``,
                `Your order #${orderId} has been confirmed!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `We are preparing your saree for shipping.`,
                `— ${brand} 💮`
            ].join('\n');

        default:
            return `📋 Order #${orderId} status updated to: ${status}\n— ${brand}`;
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

        if (!orderId || !status) {
            return new Response(JSON.stringify({ error: 'Missing orderId or status' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Get the order details first
        const { data: order, error: fetchError } = await supabase
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

        // 2. Fetch order items if we're sending a detailed receipt (PAID status)
        let items = [];
        if (status === 'PAID') {
            const { data: itemData } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);
            items = itemData || [];
        }

        // 3. Update the order status and shipping info
        const updatePayload = { status };
        if (courierName) updatePayload.courier_name = courierName;
        if (trackingNumber) updatePayload.tracking_number = trackingNumber;
        if (trackingUrl) updatePayload.tracking_url = trackingUrl;

        const { error: updateError } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (updateError) {
            return new Response(JSON.stringify({ error: 'Failed to update order' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Refetch order to get updated shipping info for the message
        const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();

        // 4. Send WhatsApp notification to customer
        const message = await getStatusMessage(orderId, status, updatedOrder || order, items);
        await sendWhatsAppText(order.customer_phone, message);

        console.log(`✅ Order ${orderId} → ${status} | WhatsApp notification sent to ${order.customer_phone}`);

        return new Response(JSON.stringify({
            success: true,
            message: `Order updated to ${status} and customer notified via WhatsApp`
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
