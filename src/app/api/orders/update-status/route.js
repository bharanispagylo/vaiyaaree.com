// API Route: Update Order Status + Send WhatsApp Notification
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { notifyOrderSuccess } from '@/services/whatsappService';
import { supabase } from '@/lib/supabaseClient';
import { sendOrderStatusEmail } from '@/lib/emailService';
import { verifyAdmin } from '@/lib/auth';
import { sendPdfBuffer } from '@/services/whatsappService';
import { generateOrderPDFBuffer } from '@/app/api/invoice/[orderId]/route';


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
            console.log(`✅ WhatsApp notification sent to ${to}`);
        }
        return data;
    } catch (error) {
        console.error('WA notification failed:', error);
    }
}

async function getStatusMessage(orderId, status, order, items = []) {
    const totalAmount = order.total_amount || 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mathematically-foliaged-palmer.ngrok-free.dev');
    const invoiceUrl = `${appUrl}/api/invoice/${orderId}`;
    const brand = 'Vaiyaaree';

    switch (status) {
        case 'PAID':
            const itemList = items.map(i => `• ${i.product_name} (x${i.quantity}) - ₹${(i.price_at_time * i.quantity).toLocaleString()}`).join('\n');
            return [
                `INVOICE: ${orderId}`,
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
                `Order #${orderId} has been cancelled.`,
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
                `Hi! We are currently packing your order #${orderId}.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `It will be shipped shortly. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'SHIPPED': {
            const itemsList = items.map(i => `• ${i.product_name} (x${i.quantity})`).join('\n');
            let trackingUrl = order.tracking_url || '';
            const trackingNum = order.tracking_number || '';
            
            // Fix placeholders {tracking_number} etc.
            if (trackingUrl && trackingNum && trackingUrl.includes('{')) {
                trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNum);
            }

            return [
                `🚀 *ORDER SHIPPED*`,
                ``,
                `Great news! Order #${orderId} is on its way!`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ``,
                `🚚 *Shipping Details:*`,
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
                `Order #${orderId} has been delivered successfully!`,
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
                `Your order #${orderId} has been confirmed!`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `We are preparing your saree for shipping.`,
                `— ${brand}`
            ].join('\n');

        default:
            return `Order #${orderId} status updated to: ${status}\n— ${brand}`;
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

        // 2. Fetch order items for status notifications (PAID, SHIPPED, PACKING, DELIVERED)
        let items = [];
        const { data: itemData } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);
        items = itemData || [];

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

        // --- NEW: Insert into order_status_logs ---
        await supabase.from('order_status_logs').insert({
            order_id: orderId,
            status: status,
            notes: `Status updated to ${status} via Admin Dashboard`,
            created_at: new Date().toISOString()
        });

        // Refetch order to get updated shipping info for the message
        const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();

        // 4. Determine Targets
        const finalOrder = updatedOrder || order;
        finalOrder.order_items = items;
        
        // Find Phones
        const billPhone = finalOrder.billing_phone || (typeof finalOrder.billing_address === 'object' ? finalOrder.billing_address?.phone || finalOrder.billing_address?.mobile : null) || finalOrder.customer_phone;
        const shipPhone = finalOrder.shipping_phone || (typeof finalOrder.shipping_address === 'object' ? finalOrder.shipping_address?.phone || finalOrder.shipping_address?.mobile : null);
        
        const targetPhones = new Set();
        if (billPhone) targetPhones.add(billPhone);
        if (['SHIPPED', 'DELIVERED'].includes(status) && shipPhone) {
            targetPhones.add(shipPhone);
        }

        // Find Emails
        const billEmail = finalOrder.billing_email || (typeof finalOrder.billing_address === 'object' ? finalOrder.billing_address?.email : null) || finalOrder.customer_email;
        const shipEmail = finalOrder.shipping_email || (typeof finalOrder.shipping_address === 'object' ? finalOrder.shipping_address?.email : null);
        
        const targetEmails = new Set();
        if (billEmail && billEmail.includes('@')) targetEmails.add(billEmail);
        if (['SHIPPED', 'DELIVERED'].includes(status) && shipEmail && shipEmail.includes('@')) {
            targetEmails.add(shipEmail);
        }

        // 5. Send notifications to all targets
        const message = await getStatusMessage(orderId, status, finalOrder, items);
        
        // WhatsApp
        for (const phone of targetPhones) {
            await sendWhatsAppText(phone, message);
            
            if (status === 'PAID') {
                try {
                    let settings = { shop_name: 'Vaiyaaree', shop_phone: '7558189732', shop_email: 'vaiyaaree.official@gmail.com', shop_address: 'Premium Saree Collections' };
                    try {
                        const { data: settingsData } = await supabase.from('app_settings').select('*');
                        if (settingsData) {
                            settingsData.forEach(item => {
                                if (item.key === 'shop_name') settings.shop_name = item.value;
                                if (item.key === 'shop_phone' || item.key === 'business_phone') settings.shop_phone = item.value;
                                if (item.key === 'shop_address') settings.shop_address = item.value;
                            });
                        }
                    } catch (e) {}

                    const pdfBuffer = await generateOrderPDFBuffer(finalOrder, settings);
                    await new Promise(r => setTimeout(r, 1000));
                    await sendPdfBuffer(phone, pdfBuffer, `Invoice_${orderId}.pdf`, `Invoice - Order #${orderId}`);
                } catch (pdfErr) {
                    console.error('Failed to generate/send PDF in update-status:', pdfErr);
                }
            }
        }
        
        // Email
        if (targetEmails.size > 0) {
            await sendOrderStatusEmail(finalOrder, status, targetEmails);
        } else {
            await sendOrderStatusEmail(finalOrder, status); // fallback just in case
        }

        console.log(`✅ Order ${orderId} → ${status} | Notifications sent to ${targetPhones.size} phones and ${targetEmails.size} emails.`);

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
