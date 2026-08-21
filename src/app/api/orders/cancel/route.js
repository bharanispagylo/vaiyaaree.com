import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// Using MySQL supabase client from @/lib/supabaseClient

export async function POST(request) {
    try {
        const { orderId, otp } = await request.json();

        if (!orderId || !otp) {
            return new Response(JSON.stringify({ error: 'Order ID and verification code required' }), { status: 400 });
        }

        // 1. Fetch Order to get customer phone
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }

        const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
        if (!cancellableStatuses.includes(order.status)) {
            return new Response(JSON.stringify({ error: 'This order cannot be cancelled anymore.' }), { status: 400 });
        }

        let phone = order.customer_phone;
        if (!phone) {
            return new Response(JSON.stringify({ error: 'No phone number associated with this order' }), { status: 400 });
        }

        // Clean phone
        let cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        // 2. Verify OTP
        const { data: otpData, error: otpError } = await supabase
            .from('otps')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('code', otp)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

        if (otpError || !otpData) {
            return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), { status: 401 });
        }

        // 3. OTP is valid! Proceed with atomic cancellation.
        
        // 3a. Restore Stock
        if (order.order_items) {
            for (const item of order.order_items) {
                const table = item.variant_id ? 'product_variants' : 'products';
                const id = item.variant_id || item.product_id;
                
                const { data: current } = await supabase.from(table).select('stock').eq('id', id).single();
                if (current) {
                    const newStock = (current.stock || 0) + item.quantity;
                    await supabase.from(table).update({ stock: newStock }).eq('id', id);
                    
                    // Log product history
                    if (!item.variant_id) {
                        await supabase.from('product_history').insert({
                            product_id: id,
                            change_type: 'STOCK_IN',
                            quantity_change: item.quantity,
                            new_stock: newStock,
                            reason: `Customer Cancellation (#${orderId})`
                        });
                    }
                }
            }
        }

        // 3b. Update Order Status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                status: 'CANCELLED',
                admin_notes: `Order cancelled by customer via website on ${new Date().toLocaleString()}`
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        // 3c. Insert Status Log
        await supabase.from('order_status_logs').insert({ 
            order_id: orderId, 
            status: 'CANCELLED', 
            notes: 'Order cancelled by customer via website verification', 
            created_at: new Date().toISOString() 
        });

        // 3d. Create Refund Entry if paid
        if (['PAID', 'AWAITING_PAYMENT'].includes(order.status)) {
            await supabase.from('refunds').insert({
                order_id: orderId,
                amount: order.total_amount,
                status: 'REQUESTED',
                reason: 'Customer Cancellation via Website'
            });
        }

        // 4. Delete the used OTP
        await supabase.from('otps').delete().eq('phone', cleanPhone);

        return new Response(JSON.stringify({ success: true, message: 'Order cancelled successfully' }), { status: 200 });

    } catch (err) {
        console.error('[CANCEL-API-ERROR]', err);
        return new Response(JSON.stringify({ error: 'Cancellation failed: ' + err.message }), { status: 500 });
    }
}
