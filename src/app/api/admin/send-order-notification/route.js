import { sendText } from '@/services/whatsappService';
import { sendOrderConfirmationEmail } from '@/lib/emailService';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
    try {
        const { orderId, sendWhatsApp, sendEmail } = await request.json();
        
        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const notifications = [];

        // Send WhatsApp notification
        if (sendWhatsApp && order.customer_phone) {
            try {
                await sendText(order.customer_phone, 
                    `✅ *Order Confirmed — Cast Printz* 🎉\n\n` +
                    `Dear ${order.customer_name},\n\n` +
                    `Your order #${orderId} has been placed successfully.\n\n` +
                    `📦 *Order Details:*\n` +
                    `• Total Amount: ₹${order.total_amount?.toLocaleString() || '0'}\n` +
                    `• Payment Method: ${order.payment_method || 'N/A'}\n` +
                    `• Items: ${order.order_items?.length || 0} product(s)\n\n` +
                    `Thank you for shopping with Cast Printz! 💖`
                );
                notifications.push('WhatsApp');
            } catch (whatsappErr) {
                console.error('Failed to send WhatsApp notification:', whatsappErr);
                notifications.push('WhatsApp (failed)');
            }
        }
        
        // Send Email notification
        if (sendEmail && order.customer_email) {
            try {
                await sendOrderConfirmationEmail(order);
                notifications.push('Email');
            } catch (emailErr) {
                console.error('Failed to send email notification:', emailErr);
                notifications.push('Email (failed)');
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Notifications sent: ${notifications.join(', ')}`,
            notifications 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        return new Response(JSON.stringify({ error: 'Failed to send notifications' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
