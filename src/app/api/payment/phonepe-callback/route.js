import { createClient } from '@supabase/supabase-js';
import { notifyOrderSuccess } from '@/services/whatsappService';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
// import { sendWhatsAppText } from '@/lib/whatsapp';

import { getGatewaySettings } from '@/lib/settings';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// PhonePe calls this endpoint after payment (GET redirect from browser OR POST webhook)
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const txnId = searchParams.get('txnId');

    if (!orderId || !txnId) {
        return NextResponse.redirect(new URL(`/pay/${orderId || ''}?error=missing_params`, request.url));
    }

    try {
        const settings = await getGatewaySettings();
        const merchantId = settings.phonepe_merchant_id;
        const saltKey = settings.phonepe_salt_key;
        const saltIndex = settings.phonepe_salt_index || '1';
        const phonepeEnv = settings.phonepe_env || 'sandbox';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // PhonePe endpoints
        const PHONEPE_BASE_URL = phonepeEnv === 'production'
            ? 'https://api.phonepe.com/apis/hermes'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

        // Verify payment status with PhonePe
        const statusEndpoint = `/pg/v1/status/${merchantId}/${txnId}`;
        const hashInput = statusEndpoint + saltKey;
        const xVerify = crypto.createHash('sha256').update(hashInput).digest('hex') + '###' + saltIndex;

        const statusRes = await fetch(`${PHONEPE_BASE_URL}${statusEndpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': merchantId,
                'accept': 'application/json',
            },
        });

        const statusData = await statusRes.json();
        const paymentSuccess = statusData.success && statusData.code === 'PAYMENT_SUCCESS';

        if (paymentSuccess) {
            // Fetch order details
            const { data: order } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId)
                .single();

            // Update order as PAID
            await supabase
                .from('orders')
                .update({
                    status: 'PAID',
                    payment_method: 'PhonePe',
                    transaction_id: txnId,
                })
                .eq('id', orderId);

            // Send WhatsApp confirmation via centralized helper
            if (order?.customer_phone) {
                await notifyOrderSuccess(orderId);
            }

            // Redirect to thank you page
            return NextResponse.redirect(new URL(`/pay/${orderId}?status=success`, appUrl));
        } else {
            // Payment failed
            console.error('PhonePe payment failed:', statusData);
            return NextResponse.redirect(new URL(`/pay/${orderId}?status=failed&reason=${encodeURIComponent(statusData.message || 'Payment failed')}`, appUrl));
        }

    } catch (err) {
        console.error('PhonePe callback error:', err);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL(`/pay/${orderId}?status=failed`, appUrl));
    }
}

// Handle POST webhook from PhonePe (server-to-server notification)
export async function POST(request) {
    return GET(request);
}
