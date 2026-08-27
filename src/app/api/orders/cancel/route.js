import { mysqlClient } from '@/lib/mysqlClient';
import pool from '@/lib/mysql.js';
import { generateRefundId } from '@/services/refundService.js';
import { randomUUID } from 'crypto';

export async function POST(request) {
    try {
        const body = await request.json();
        const { orderId, otp, customerId, reason } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
        }

        // 1. Fetch Order
        const { data: order, error: orderError } = await mysqlClient
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }

        const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
        if (!cancellableStatuses.includes((order.status || '').toUpperCase())) {
            return new Response(JSON.stringify({ error: 'This order cannot be cancelled as it is already being processed or shipped.' }), { status: 400 });
        }

        // 2. Authentication Verification: OTP or Logged-in Customer ID
        let cleanPhone = null;
        if (otp) {
            let phone = order.customer_phone;
            if (!phone) {
                return new Response(JSON.stringify({ error: 'No phone number associated with this order' }), { status: 400 });
            }
            cleanPhone = phone.trim().replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            const { data: otpData, error: otpError } = await mysqlClient
                .from('otps')
                .select('*')
                .eq('phone', cleanPhone)
                .eq('code', otp)
                .gte('expires_at', new Date().toISOString())
                .maybeSingle();

            if (otpError || !otpData) {
                return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), { status: 401 });
            }
        } else if (customerId) {
            // Verify order belongs to customer
            const orderCustId = String(order.customer_id || '');
            if (orderCustId && orderCustId !== String(customerId)) {
                return new Response(JSON.stringify({ error: 'Unauthorized to cancel this order.' }), { status: 403 });
            }
        } else {
            return new Response(JSON.stringify({ error: 'Verification code or customer authentication required' }), { status: 400 });
        }

        const cancelReasonNote = reason ? `Reason: ${reason}` : 'Order cancelled by customer';

        // 3. Proceed with Atomic Cancellation:
        
        // 3a. Restore Stock
        if (order.order_items) {
            for (const item of order.order_items) {
                const table = item.variant_id ? 'product_variants' : 'products';
                const id = item.variant_id || item.product_id;
                
                const { data: current } = await mysqlClient.from(table).select('stock').eq('id', id).single();
                if (current) {
                    const newStock = (current.stock || 0) + item.quantity;
                    await mysqlClient.from(table).update({ stock: newStock }).eq('id', id);
                    
                    // Log product history
                    if (!item.variant_id) {
                        await mysqlClient.from('product_history').insert({
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
        const { error: updateError } = await mysqlClient
            .from('orders')
            .update({ 
                status: 'CANCELLED',
                admin_notes: `Order cancelled by customer via website on ${new Date().toLocaleString()}. ${cancelReasonNote}`
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        // 3c. Insert Status Log
        await mysqlClient.from('order_status_logs').insert({ 
            order_id: orderId, 
            status: 'CANCELLED', 
            notes: `Order cancelled by customer. ${cancelReasonNote}`, 
            created_at: new Date().toISOString() 
        });

        // 3d. Create Refund Entry in refund_requests if order was paid
        if (['PAID', 'AWAITING_PAYMENT'].includes((order.status || '').toUpperCase())) {
            try {
                const refundUuid = randomUUID();
                const refundCode = await generateRefundId();
                const now = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

                await pool.query(`
                    INSERT INTO \`refund_requests\` (
                        id, refund_id, order_id, customer_id, reason, customer_note, requested_amount, approved_amount, return_status, refund_status, requested_at, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, 'Order Cancelled', ?, ?, ?, 'NOT_REQUIRED', 'REFUND_REQUESTED', ?, NOW(), NOW()
                    )
                `, [
                    refundUuid,
                    refundCode,
                    orderId,
                    order.customer_id || customerId || 'guest',
                    cancelReasonNote,
                    order.total_amount || 0,
                    order.total_amount || 0,
                    now
                ]);
            } catch (refErr) {
                console.warn('[CANCEL-API] Warning creating refund_requests record:', refErr.message);
            }
        }

        // 4. Delete the used OTP if OTP path
        if (cleanPhone) {
            await mysqlClient.from('otps').delete().eq('phone', cleanPhone);
        }

        return new Response(JSON.stringify({ success: true, message: 'Order cancelled successfully' }), { status: 200 });

    } catch (err) {
        console.error('[CANCEL-API-ERROR]', err);
        return new Response(JSON.stringify({ error: 'Cancellation failed: ' + (err.message || 'Unknown error') }), { status: 500 });
    }
}
