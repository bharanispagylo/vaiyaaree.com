import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { sendOrderConfirmationEmail } from '@/lib/emailService';

export async function POST(request) {
    try {
        const { orderId } = await request.json();
        
        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }

        // Fetch order details
        const { data: order, error: orderError } = await mysqlClient
            .from('orders')
            .select(`*, order_items(*)`)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Send order confirmation email
        await sendOrderConfirmationEmail(order);

        // Log email sent
        await mysqlClient.from('email_logs').insert({
            order_id: orderId,
            email_type: 'order_confirmation',
            recipient_email: order.customer_email || order.customer_phone,
            subject: `Order Confirmation - ${orderId}`,
            status: 'sent',
            sent_at: new Date().toISOString()
        });

        // Update order email_sent flag
        await mysqlClient.from('orders').update({
            email_sent: true,
            email_sent_at: new Date().toISOString()
        }).eq('id', orderId);

        return NextResponse.json({
            success: true,
            message: 'Order confirmation email sent successfully'
        });

    } catch (error) {
        console.error('Resend Email Error:', error);
        return NextResponse.json(
            { error: 'Failed to send email: ' + error.message },
            { status: 500 }
        );
    }
}
