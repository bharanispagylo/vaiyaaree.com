import Razorpay from 'razorpay';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

import { getGatewaySettings } from '@/lib/settings';

export async function POST(request) {
    try {
        const { orderId } = await request.json();
        const settings = await getGatewaySettings();

        if (!orderId) {
            return Response.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Fetch the order and its items from Supabase
        const { data: order, error } = await supabase
            .from('orders')
            .select('id, total_amount, customer_name, customer_phone, order_items(*)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // --- Amazon-style Security: Server-side Price Verification ---
        // Verify that the total_amount matches actual product prices + taxes/shipping from DB.
        let calculatedItemsTotal = 0;
        for (const item of order.order_items) {
            if (item.variant_id) {
                const { data: variant } = await supabase.from('product_variants').select('price').eq('id', item.variant_id).single();
                calculatedItemsTotal += (variant?.price || 0) * item.quantity;
            } else {
                const { data: product } = await supabase.from('products').select('price').eq('id', item.product_id).single();
                calculatedItemsTotal += (product?.price || 0) * item.quantity;
            }
        }

        const expectedTotal = calculatedItemsTotal + (order.tax_amount || 0) + (order.shipping_cost || 0);
        const diff = Math.abs(expectedTotal - order.total_amount);

        if (diff > 5) { // Allow max ₹5 tolerance for rounding
            console.error(`[FRAUD-ALERT] Price mismatch for order ${orderId}. Expected: ${expectedTotal}, Received: ${order.total_amount}`);
            return Response.json({ error: 'Order verification failed. Pricing mismatch detected.' }, { status: 403 });
        }
        // --- End Price Verification ---

        // ALWAYS use the server-verified expectedTotal for Razorpay initialization
        const finalPayableAmount = expectedTotal > 0 ? expectedTotal : order.total_amount;

        // Detect if keys are placeholders or missing
        const isPlaceholder = (key) => !key || key.includes('PASTE_YOUR_KEY');
        const hasValidKeys = !isPlaceholder(settings.razorpay_key_id) && !isPlaceholder(settings.razorpay_key_secret);

        if (!hasValidKeys) {
            console.log('Using Razorpay Test Mode Fallback');
            return Response.json({
                razorpayOrderId: `order_test_${Date.now()}`,
                amount: Math.round(finalPayableAmount * 100),
                currency: 'INR',
                keyId: 'rzp_test_placeholder',
                orderDetails: order,
                testMode: true
            });
        }

        const razorpay = new Razorpay({
            key_id: settings.razorpay_key_id,
            key_secret: settings.razorpay_key_secret,
        });

        // Create Razorpay order using server-verified payable amount
        const rzpOrder = await razorpay.orders.create({
            amount: Math.round(finalPayableAmount * 100), // amount in paise
            currency: 'INR',
            receipt: `receipt_${orderId}`,
            notes: {
                orderId: orderId,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
            }
        });

        // Store razorpay order ID in our DB for verification later
        await supabase
            .from('orders')
            .update({ razorpay_order_id: rzpOrder.id })
            .eq('id', orderId);

        return Response.json({
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: settings.razorpay_key_id,
            orderDetails: order,
        });

    } catch (err) {
        console.error('Create Razorpay order error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
