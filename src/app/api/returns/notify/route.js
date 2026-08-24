// API Route: Send Return/Exchange WhatsApp Notifications
import { supabase } from '@/lib/supabaseClient';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const BRAND = 'Vaiyaaree Sarees';
const WEBSITE = process.env.NEXT_PUBLIC_APP_URL || 'https://vaiyaaree.com';
const RETURN_URL = `${WEBSITE}/profile?tab=return`;

async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('[RETURN-NOTIFY] WhatsApp credentials missing, skipping notification');
        return;
    }

    let cleanedNum = String(to).replace(/\D/g, '');
    while (cleanedNum.startsWith('0')) cleanedNum = cleanedNum.substring(1);
    if (cleanedNum.length === 10 && /^[6789]/.test(cleanedNum)) cleanedNum = '91' + cleanedNum;

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanedNum,
                type: 'text',
                text: { body: text }
            })
        });
        const data = await response.json();
        if (data.error) console.error('[RETURN-NOTIFY] WA error:', data.error);
        return data;
    } catch (error) {
        console.error('[RETURN-NOTIFY] Send failed:', error);
    }
}

export async function POST(request) {
    try {
        const {
            requestId,
            status,
            notes,
            courierData,
            sendWhatsApp = true,
            sendEmail = true,
            phone: phoneOverride,
            email: emailOverride
        } = await request.json();

        if (!requestId || !status) {
            return new Response(JSON.stringify({ error: 'Missing requestId or status' }), { status: 400 });
        }

        // Fetch return request with related data
        const { data: req, error } = await supabase
            .from('return_requests')
            .select('*, customers(*), products(*)')
            .eq('id', requestId)
            .single();

        if (error || !req) {
            return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
        }

        let targetPhone = phoneOverride || req.customers?.phone;
        let targetEmail = emailOverride || req.customers?.email;
        let customerName = req.customers?.name || 'Valued Customer';

        if ((!targetPhone || !targetEmail) && req.order_id) {
            const { data: ord } = await supabase.from('orders').select('customer_phone, customer_email, customer_name').eq('id', req.order_id).single();
            if (ord) {
                if (!targetPhone) targetPhone = ord.customer_phone;
                if (!targetEmail) targetEmail = ord.customer_email;
                customerName = customerName === 'Valued Customer' ? (ord.customer_name || customerName) : customerName;
            }
        }

        const orderId = req.order_id;
        const type = (req.type || 'RETURN').toUpperCase();
        const productName = req.products?.name || 'Saree';
        const returnId = req.return_id || `#${String(requestId).substring(0, 8)}`;

        const templates = {
            RETURN_REQUESTED: [
                `🔄 ${type} REQUEST RECEIVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `We've received your ${type.toLowerCase()} request for Order #${orderId}.`,
                '',
                `📦 Product: ${productName}`,
                `📝 Reason: ${req.reason || 'Not specified'}`,
                `🔖 Status: Under Review`,
                '',
                `Our team will review your request within 1-2 business days and update you.`,
                '',
                `🌐 Track status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            RETURN_APPROVED: [
                `✅ ${type} REQUEST APPROVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Good news! Your ${type.toLowerCase()} request for Order #${orderId} has been *APPROVED*! 🎉`,
                '',
                `📦 Product: ${productName}`,
                `📍 Next Step: Please ship the product to our company address using your preferred courier service (DTDC, Delhivery, India Post, etc.):`,
                '',
                `*Return Address:*`,
                `VAIYAAREE SAREES`,
                `16, Dhanalakshmi Nagar Extension, Masakalipalayam Road`,
                `Uppili Palayam, Coimbatore, Tamil Nadu - 641015`,
                `India`,
                '',
                `After shipping, please click *"I've Shipped the Product"* on our website to submit your tracking details.`,
                '',
                `🌐 Submit tracking details: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            RETURN_REJECTED: [
                `❌ ${type} REQUEST NOT APPROVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `We regret to inform you that your ${type.toLowerCase()} request for Order #${orderId} was not approved.`,
                '',
                `📦 Product: ${productName}`,
                `📋 Reason: ${notes || req.rejection_reason || 'Does not meet our return policy requirements.'}`,
                '',
                `For assistance, please contact us via WhatsApp.`,
                `🌐 View status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            CUSTOMER_SHIPPED: [
                `🚚 TRACKING DETAILS RECEIVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Thank you for providing your return shipment tracking details!`,
                '',
                `📦 Product: ${productName}`,
                courierData?.courierName ? `🚚 Courier: ${courierData.courierName}` : '',
                courierData?.awbNumber ? `📬 AWB / Tracking No: ${courierData.awbNumber}` : '',
                '',
                `We will notify you as soon as your package is received at our facility.`,
                `🌐 Track return: ${RETURN_URL}`,
                `— ${BRAND}`,
            ].filter(l => l !== ''),
            RECEIVED_BY_COMPANY: [
                `🏭 PRODUCT RECEIVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `We have received your returned product at our facility.`,
                '',
                `📦 Product: ${productName}`,
                `🔍 Our quality inspection team will inspect the product shortly.`,
                `⏱ You will receive an update within 1-2 business days.`,
                '',
                `🌐 Track status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            INSPECTION_APPROVED: [
                `✅ INSPECTION APPROVED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your returned product has passed our quality inspection! ✨`,
                '',
                `📦 Product: ${productName}`,
                `💰 Your ${type === 'EXCHANGE' ? 'exchange' : 'refund'} is now being processed.`,
                '',
                `🌐 Track status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            INSPECTION_REJECTED: [
                `⚠️ INSPECTION RESULT — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `After inspection, we were unable to process your ${type.toLowerCase()} request.`,
                '',
                `📦 Product: ${productName}`,
                `📋 Reason: ${notes || 'Product did not meet our return condition requirements.'}`,
                '',
                `Your product will be returned to you shortly.`,
                `🌐 Track status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ],
            REFUND_PROCESSING: [
                `💳 REFUND PROCESSING — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your refund is being processed!`,
                '',
                `📦 Product: ${productName}`,
                req.refund_amount ? `💰 Refund Amount: ₹${Number(req.refund_amount).toLocaleString('en-IN')}` : '',
                req.refund_method ? `📲 Refund Method: ${req.refund_method}` : '',
                `⏱ Refund will be credited within 5-7 business days.`,
                '',
                `🌐 Track status: ${RETURN_URL}`,
                `— ${BRAND}`,
            ].filter(l => l !== ''),
            REFUND_COMPLETED: [
                `💚 REFUND COMPLETED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your refund has been successfully processed! ✅`,
                '',
                `📦 Product: ${productName}`,
                req.refund_amount ? `💰 Amount: ₹${Number(req.refund_amount).toLocaleString('en-IN')}` : '',
                req.refund_id ? `🔖 Refund ID: ${req.refund_id}` : '',
                '',
                `Thank you for shopping with us. We hope to serve you again! 🙏`,
                `🌐 Visit: ${WEBSITE}`,
                `— ${BRAND}`,
            ].filter(l => l !== ''),
            EXCHANGE_SHIPPED: [
                `🚚 EXCHANGE SHIPPED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your exchange order has been shipped! 📦`,
                '',
                courierData?.courierName ? `🚚 Courier: ${courierData.courierName}` : '',
                courierData?.awbNumber ? `📬 AWB Number: ${courierData.awbNumber}` : '',
                courierData?.trackingUrl ? `🔗 Track shipment: ${courierData.trackingUrl}` : '',
                '',
                `You should receive your exchange product within 3-5 business days.`,
                `🌐 Track return: ${RETURN_URL}`,
                `— ${BRAND}`,
            ].filter(l => l !== ''),
            RETURN_TO_CUSTOMER_SHIPPED: [
                `📦 PRODUCT SHIPPED BACK — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `We have shipped your product back to you.`,
                '',
                courierData?.courierName ? `🚚 Courier: ${courierData.courierName}` : '',
                courierData?.awbNumber ? `📬 AWB Number: ${courierData.awbNumber}` : '',
                `⏱ Estimated delivery: 3-5 business days.`,
                '',
                `For any queries, please contact us via WhatsApp.`,
                `— ${BRAND}`,
            ].filter(l => l !== ''),
            COMPLETED: [
                `✅ RETURN COMPLETED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your ${type.toLowerCase()} request has been fully processed and completed.`,
                '',
                `Thank you for your patience. We hope to see you again! 🛍`,
                `🌐 Shop: ${WEBSITE}`,
                `— ${BRAND}`,
            ],
            RETURN_CLOSED: [
                `📌 RETURN CLOSED — ${returnId}`,
                '',
                `Hi ${customerName},`,
                `Your ${type.toLowerCase()} case has been closed.`,
                `— ${BRAND}`,
            ]
        };

        const lines = templates[status] || templates.EXCHANGE_SHIPPED;
        if (sendWhatsApp && targetPhone && lines) {
            const message = lines.join('\n');
            await sendWhatsAppText(targetPhone, message);
        } else {
            console.log(`[RETURN-NOTIFY] WhatsApp skipped or targetPhone missing/disabled for status: ${status}`);
        }

        // Send Email Notification to Customer if enabled
        if (sendEmail && targetEmail) {
            try {
                const { sendReturnStatusEmail } = await import('@/lib/emailService');
                await sendReturnStatusEmail(req, status, {
                    notes,
                    courierName: courierData?.courierName || req.exchange_courier_name,
                    trackingNumber: courierData?.awbNumber || req.exchange_tracking_number,
                    recipientEmail: targetEmail
                });
            } catch (emailErr) {
                console.error('[RETURN-NOTIFY-EMAIL-ERROR]', emailErr);
            }
        } else {
            console.log(`[RETURN-NOTIFY] Email skipped or targetEmail missing/disabled for status: ${status}`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('[RETURN-NOTIFY] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
