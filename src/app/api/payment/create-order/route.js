import Razorpay from 'razorpay';
import { mysqlClient } from '@/lib/mysqlClient';
import { getGatewaySettings } from '@/lib/settings';
import { ensureOrdersPaymentSchema } from '@/lib/orderSchemaHelper';

export async function POST(request) {
    try {
        const { orderId } = await request.json();
        const settings = await getGatewaySettings();

        if (!orderId) {
            return Response.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Ensure orders table has payment metadata columns
        await ensureOrdersPaymentSchema();

        // Fetch the order and its items from MySQL
        const { data: order, error } = await mysqlClient
            .from('orders')
            .select('id, total_amount, total_discount, tax_amount, shipping_cost, customer_name, customer_phone, payment_method, cod_advance_required, order_items(*)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // Fetch items safely with fallback if relation was not populated
        let items = Array.isArray(order.order_items) ? order.order_items : [];
        if (items.length === 0) {
            const { data: dbItems } = await mysqlClient.from('order_items').select('*').eq('order_id', orderId);
            items = dbItems || [];
        }

        // --- Server-side Price Verification ---
        let calculatedItemsTotal = 0;
        for (const item of items) {
            let unitPrice = null;
            if (item.variant_id) {
                const { data: variant } = await mysqlClient.from('product_variants').select('price').eq('id', item.variant_id).maybeSingle();
                if (variant && variant.price !== undefined && variant.price !== null) {
                    unitPrice = parseFloat(variant.price);
                }
            }
            if (unitPrice === null && item.product_id) {
                const { data: product } = await mysqlClient.from('products').select('price').eq('id', item.product_id).maybeSingle();
                if (product && product.price !== undefined && product.price !== null) {
                    unitPrice = parseFloat(product.price);
                }
            }
            if (unitPrice === null) {
                unitPrice = parseFloat(item.price_at_time || item.price || item.paid_price_per_unit || 0);
            }
            const qty = parseInt(item.quantity || item.qty, 10) || 1;
            calculatedItemsTotal += unitPrice * qty;
        }

        const discountTotal = parseFloat(order.total_discount || 0);
        const taxTotal = parseFloat(order.tax_amount || 0);
        const shippingTotal = parseFloat(order.shipping_cost || 0);
        const expectedTotal = Math.round(Math.max(0, calculatedItemsTotal - discountTotal) + taxTotal + shippingTotal);
        const diff = Math.abs(expectedTotal - parseFloat(order.total_amount || 0));

        if (diff > 5) { // Allow max ₹5 tolerance for rounding
            console.error(`[FRAUD-ALERT] Price mismatch for order ${orderId}. Expected: ${expectedTotal}, Received: ${order.total_amount}`);
            return Response.json({ error: 'Order verification failed. Pricing mismatch detected.' }, { status: 403 });
        }
        // --- End Price Verification ---

        // Check if this is a COD order with advance required:
        const isCodAdvance = order.payment_method === 'COD' && parseFloat(order.cod_advance_required || 0) > 0;
        // ALWAYS use the server-verified payable amount for Razorpay initialization
        const finalPayableAmount = isCodAdvance 
            ? parseFloat(order.cod_advance_required)
            : (expectedTotal > 0 ? expectedTotal : order.total_amount);

        // Detect if keys are placeholders or missing (with trimming)
        const keyId = (settings.razorpay_key_id || '').trim();
        const keySecret = (settings.razorpay_key_secret || '').trim();
        const isPlaceholder = (key) => !key || key.includes('PASTE_YOUR_KEY') || key.includes('placeholder');
        const hasValidKeys = !isPlaceholder(keyId) && !isPlaceholder(keySecret);

        if (!hasValidKeys) {
            console.log('Using Razorpay Test Mode Fallback');
            return Response.json({
                razorpayOrderId: `order_test_${Date.now()}`,
                amount: Math.round(finalPayableAmount * 100),
                currency: 'INR',
                keyId: 'rzp_test_placeholder',
                orderDetails: order,
                isCodAdvance,
                testMode: true
            });
        }

        let rzpOrder;
        try {
            const razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });

            // Create Razorpay order using server-verified payable amount
            rzpOrder = await razorpay.orders.create({
                amount: Math.round(finalPayableAmount * 100), // amount in paise
                currency: 'INR',
                receipt: `receipt_${orderId}`,
                notes: {
                    orderId: String(orderId),
                    customerName: order.customer_name || 'Customer',
                    customerPhone: order.customer_phone || '',
                    paymentType: isCodAdvance ? 'COD_ADVANCE' : 'FULL_PAYMENT'
                }
            });
        } catch (gatewayErr) {
            const description = gatewayErr.error?.description || gatewayErr.description || gatewayErr.message || 'Failed to initialize payment gateway';
            console.error('[RAZORPAY-INIT-ERROR]', description, gatewayErr);
            return Response.json({ error: description }, { status: 400 });
        }

        // Store razorpay order ID in our DB for verification later
        await mysqlClient
            .from('orders')
            .update({ razorpay_order_id: rzpOrder.id })
            .eq('id', orderId);

        return Response.json({
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || 'INR',
            keyId: keyId,
            orderDetails: order,
            isCodAdvance
        });

    } catch (err) {
        console.error('Create Razorpay order error:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
