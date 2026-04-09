// API Route: Send Return/Exchange WhatsApp Notifications
import { supabase } from '@/lib/supabaseClient';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials missing, skipping notification');
        return;
    }

    let cleanedNum = to.replace(/\D/g, '');
    while (cleanedNum.startsWith('0')) {
        cleanedNum = cleanedNum.substring(1);
    }
    if (cleanedNum.length === 12 && cleanedNum.startsWith('91')) {
        // Correct
    } else if (cleanedNum.length === 10 && /^[6789]/.test(cleanedNum)) {
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
        return await response.json();
    } catch (error) {
        console.error('WA return notification failed:', error);
    }
}

export async function POST(request) {
    try {
        const { requestId, status, notes } = await request.json();

        if (!requestId || !status) {
            return new Response(JSON.stringify({ error: 'Missing requestId or status' }), { status: 400 });
        }

        const { data: req, error } = await supabase
            .from('return_requests')
            .select('*, customers(*), products(*)')
            .eq('id', requestId)
            .single();

        if (error || !req) {
            return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
        }

        const phone = req.customers?.phone;
        const orderId = req.order_id;
        const type = req.request_type; // 'RETURN' or 'EXCHANGE'
        const productName = req.products?.name || 'Product';
        const brand = 'Cast Printz';

        let message = '';
        if (status === 'APPROVED') {
            message = [
                `✅ ${type} REQUEST APPROVED`,
                ``,
                `Hi ${req.customers?.name || 'Customer'},`,
                `Good news! Your ${type.toLowerCase()} request for Order #${orderId} has been approved.`,
                ``,
                `Product: ${productName}`,
                `Next Steps: Our team will contact you shortly to arrange the ${type === 'RETURN' ? 'pickup' : 'exchange'} process.`,
                ``,
                `Notes: ${notes || 'Standard protocol initiated.'}`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'REJECTED') {
            message = [
                `❌ ${type} REQUEST REJECTED`,
                ``,
                `Hi ${req.customers?.name || 'Customer'},`,
                `Your ${type.toLowerCase()} request for Order #${orderId} was not approved.`,
                ``,
                `Product: ${productName}`,
                `Reason: ${notes || 'Does not meet our policy requirements.'}`,
                ``,
                `Please contact our support team if you have any questions.`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'COMPLETED') {
            message = [
                `✨ ${type} COMPLETED`,
                ``,
                `Hi ${req.customers?.name || 'Customer'},`,
                `The ${type.toLowerCase()} process for your Order #${orderId} is now complete.`,
                ``,
                `Product: ${productName}`,
                `We hope you are satisfied with the resolution!`,
                ``,
                `— ${brand}`
            ].join('\n');
        }

        if (phone && message) {
            await sendWhatsAppText(phone, message);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('Return notify error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
