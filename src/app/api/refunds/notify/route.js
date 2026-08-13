// API Route: Send Refund WhatsApp Notifications
import { supabase } from '@/lib/supabaseClient';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials missing, skipping notification');
        return;
    }

    // Clean number: remove all non-digits (+ , etc.)
    let cleanedNum = to.replace(/\D/g, '');
    
    // Remove leading zeros
    while (cleanedNum.startsWith('0')) {
        cleanedNum = cleanedNum.substring(1);
    }
    
    // If it starts with 91 and has 12 digits, it's correct for India
    if (cleanedNum.length === 12 && cleanedNum.startsWith('91')) {
        // Already correct
    } else if (cleanedNum.length === 10 && /^[6789]/.test(cleanedNum)) {
        // 10 digits for India, add 91
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
        return data;
    } catch (error) {
        console.error('WA refund notification failed:', error);
    }
}

export async function POST(request) {
    try {
        const { refundId, status, notes } = await request.json();

        if (!refundId || !status) {
            return new Response(JSON.stringify({ error: 'Missing refundId or status' }), { status: 400 });
        }

        // Fetch refund and order details
        const { data: refund, error: refundError } = await supabase
            .from('refunds')
            .select('*, orders:order_id(*)')
            .eq('id', refundId)
            .single();

        if (refundError || !refund || !refund.orders) {
            return new Response(JSON.stringify({ error: 'Refund or associated order not found' }), { status: 404 });
        }

        const phone = refund.orders.customer_phone;
        const orderId = refund.order_id;
        const amount = refund.amount || 0;
        const brand = 'Vaiyaaree';

        let message = '';
        if (status === 'APPROVED') {
            message = [
                `REFUND APPROVED`,
                ``,
                `Hi ${refund.orders.customer_name || 'Customer'},`,
                `Status: APPROVED ✅`,
                `Order ID: #${orderId}`,
                `Refund Amount: ₹${amount.toLocaleString()}`,
                ``,
                `Your refund has been approved and is being processed. It should reflect in your account within 5-7 business days.`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'REJECTED') {
            message = [
                `REFUND REJECTED`,
                ``,
                `Hi ${refund.orders.customer_name || 'Customer'},`,
                `Order ID: #${orderId}`,
                `Status: REJECTED ❌`,
                ``,
                `Reason: ${notes || 'Please contact support for details.'}`,
                ``,
                `If you have any questions, feel free to reach out to us.`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'COMPLETED') {
            message = [
                `REFUND COMPLETED!`,
                ``,
                `Hi ${refund.orders.customer_name || 'Customer'},`,
                `Order ID: #${orderId}`,
                `Status: COMPLETED 💰`,
                `Refund Amount: ₹${amount.toLocaleString()}`,
                ``,
                `The refund has been successfully processed and sent to your original payment method.`,
                ``,
                `Thank you for your patience!`,
                `— ${brand}`
            ].join('\n');
        } else {
            message = `Refund update for Order #${orderId}: Status changed to ${status}.\n— ${brand}`;
        }

        if (phone) {
            await sendWhatsAppText(phone, message);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Refund notify error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
