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

    let cleanedNum = to.replace(/\D/g, '');
    while (cleanedNum.startsWith('0')) {
        cleanedNum = cleanedNum.substring(1);
    }
    
    if (cleanedNum.length === 12 && cleanedNum.startsWith('91')) {
        // Correct E.164
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

        let refund = null;
        let { data: reqData } = await supabase
            .from('refund_requests')
            .select('*, orders:order_id(*)')
            .eq('id', refundId)
            .maybeSingle();

        if (reqData) {
            refund = {
                ...reqData,
                amount: reqData.approved_amount || reqData.requested_amount || 0
            };
        } else {
            const { data: oldRefund } = await supabase
                .from('refunds')
                .select('*, orders:order_id(*)')
                .eq('id', refundId)
                .maybeSingle();
            refund = oldRefund;
        }

        if (!refund) {
            return new Response(JSON.stringify({ error: 'Refund not found' }), { status: 404 });
        }

        let phone = refund.orders?.customer_phone;
        let customerName = refund.orders?.customer_name;

        if (!phone && refund.customer_id) {
            const { data: cust } = await supabase.from('customers').select('phone, name').eq('id', refund.customer_id).single();
            if (cust) {
                phone = cust.phone;
                customerName = customerName || cust.name;
            }
        }

        const orderId = refund.order_id;
        const amount = refund.amount || 0;
        const brand = 'Vaiyaaree';

        const webUrl = 'https://vaiyaaree-com-ten.vercel.app/profile?tab=refund';

        let message = '';
        if (status === 'REQUESTED' || status === 'PENDING' || status === 'SUBMITTED') {
            message = [
                `REFUND REQUEST RECEIVED`,
                ``,
                `Hi ${customerName || 'Customer'},`,
                `We have received your refund request for Order #${orderId}.`,
                ``,
                `Amount: ₹${amount.toLocaleString('en-IN')}`,
                `Reason: ${refund.reason || 'Not specified'}`,
                `Status: Under Review`,
                ``,
                `Our accounts team is reviewing your request and will notify you once processed.`,
                ``,
                `🌐 Track status on website: ${webUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'APPROVED') {
            message = [
                `REFUND APPROVED`,
                ``,
                `Hi ${customerName || 'Customer'},`,
                `Status: APPROVED`,
                `Order ID: #${orderId}`,
                `Refund Amount: ₹${amount.toLocaleString('en-IN')}`,
                ``,
                `Your refund has been approved and is being processed. It should reflect in your account within 5-7 business days.`,
                ``,
                `🌐 Track status on website: ${webUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'REJECTED') {
            message = [
                `REFUND REJECTED`,
                ``,
                `Hi ${customerName || 'Customer'},`,
                `Order ID: #${orderId}`,
                `Status: REJECTED`,
                ``,
                `Reason: ${notes || 'Please contact support for details.'}`,
                ``,
                `If you have any questions, feel free to reach out to us.`,
                ``,
                `🌐 View status on website: ${webUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else if (status === 'COMPLETED') {
            message = [
                `REFUND COMPLETED!`,
                ``,
                `Hi ${customerName || 'Customer'},`,
                `Order ID: #${orderId}`,
                `Status: COMPLETED`,
                `Refund Amount: ₹${amount.toLocaleString('en-IN')}`,
                ``,
                `The refund has been successfully processed and sent to your original payment method.`,
                ``,
                `Thank you for your patience!`,
                ``,
                `🌐 View details on website: ${webUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');
        } else {
            message = `Refund update for Order #${orderId}: Status changed to ${status}.\n\n🌐 View on website: ${webUrl}\n— ${brand}`;
        }

        if (phone && message) {
            await sendWhatsAppText(phone, message);
        }

        // Send Email Notification to Customer
        try {
            const { sendRefundStatusEmail } = await import('@/lib/emailService');
            await sendRefundStatusEmail(refund, status, { admin_note: notes });
        } catch (emailErr) {
            console.error('[REFUND-NOTIFY-EMAIL-ERROR]', emailErr);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Refund notify error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
