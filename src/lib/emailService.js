import nodemailer from 'nodemailer';
import { supabase } from './supabaseClient';


// Create transporter using environment variables or default settings
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

export async function sendOrderConfirmationEmail(order) {
    // If no SMTP config, just log and return success (for dev/testing)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('Email service not configured. Order confirmation email not sent.');
        console.log('Order details:', order.id, order.customer_email);
        return { success: true, message: 'Email logging mode - SMTP not configured' };
    }

    const items = order.order_items?.map(item => 
        `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name || 'Product'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price?.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity)?.toLocaleString()}</td>
        </tr>`
    ).join('') || '';

    const invoiceUrl = order.invoice_url || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/invoice/${order.id}`;
    const orderUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order-confirmation?orderId=${order.id}`;

    const { data: logoSetting } = await supabase.from('app_settings').select('value').eq('key', 'shop_logo').single();
    const shopLogo = logoSetting?.value || '';

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz" <orders@castprintz.com>',
        to: order.customer_email || order.customer_phone,
        subject: `Order Confirmation - ${order.id}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    ${shopLogo ? `<img src="${shopLogo}" alt="Cast Printz" style="max-height: 80px; margin-bottom: 20px;">` : ''}
                    <h2 style="color: #333; margin-bottom: 20px;">Thank you for your order!</h2>
                    
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleString('en-IN')}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${order.status}</span></p>
                        <p style="margin: 5px 0;"><strong>Payment:</strong> ${order.payment_method || 'N/A'}</p>
                    </div>

                    <h3 style="color: #555; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 10px; text-align: left;">Product</th>
                                <th style="padding: 10px; text-align: center;">Qty</th>
                                <th style="padding: 10px; text-align: right;">Price</th>
                                <th style="padding: 10px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items}
                        </tbody>
                    </table>

                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Subtotal:</span>
                            <span>₹${(order.subtotal || 0).toLocaleString()}</span>
                        </div>
                        ${order.cgst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>CGST (2.5%):</span><span>₹${order.cgst.toLocaleString()}</span></div>` : ''}
                        ${order.sgst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>SGST (2.5%):</span><span>₹${order.sgst.toLocaleString()}</span></div>` : ''}
                        ${order.igst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>IGST (5%):</span><span>₹${order.igst.toLocaleString()}</span></div>` : ''}
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Shipping:</span>
                            <span>₹${(order.shipping_amount || order.shipping || 0).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 10px 0 5px 0; padding-top: 10px; border-top: 2px solid #ddd; font-weight: bold; font-size: 1.1em;">
                            <span>Total Amount:</span>
                            <span style="color: #059669;">₹${(order.total_amount || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${invoiceUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 5px;">Download Invoice</a>
                        <a href="${orderUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 5px;">Track Order</a>
                    </div>

                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #92400e;">Delivery Address</h4>
                        <p style="margin: 0; color: #78350f;">
                            ${(() => {
                                const addr = order.shipping_address || order.delivery_address;
                                if (!addr) return 'Same as billing address';
                                if (typeof addr === 'string') {
                                    try {
                                        const parsed = JSON.parse(addr);
                                        return `${parsed.name || ''}, ${parsed.address || ''}, ${parsed.city || ''}, ${parsed.state || ''} - ${parsed.pincode || ''}`;
                                    } catch {
                                        return addr;
                                    }
                                }
                                return `${addr.name || ''}, ${addr.address || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`;
                            })()}
                        </p>
                    </div>

                    <p style="color: #666; font-size: 0.9em; margin-top: 30px; text-align: center;">
                        We'll notify you when your order ships. For any queries, contact us at <a href="mailto:support@castprintz.com">support@castprintz.com</a>
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

export async function sendOrderStatusEmail(order, status) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return { success: true };
    
    const { data: logoSetting } = await supabase.from('app_settings').select('value').eq('key', 'shop_logo').single();
    const shopLogo = logoSetting?.value || '';

    const statusConfig = {
        'PAID': { title: 'Payment Confirmed', body: 'We have received your payment for order #' + order.id + '. Your order is being processed.' },
        'PACKING': { title: 'Order Packing', body: 'Great news! We are currently packing your items for order #' + order.id + '.' },
        'SHIPPED': { title: 'Order Shipped!', body: 'Your order #' + order.id + ' is on its way!' + (order.courier_name ? ` (via ${order.courier_name})` : '') },
        'DELIVERED': { title: 'Order Delivered', body: 'Your order #' + order.id + ' has been delivered successfully. Enjoy your new saree!' },
        'CANCELLED': { title: 'Order Cancelled', body: 'Your order #' + order.id + ' has been cancelled.' }
    };

    const config = statusConfig[status] || { title: `Order Update: ${status}`, body: `Your order #${order.id} status has been updated to: ${status}` };
    const orderUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order-confirmation?orderId=${order.id}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz" <orders@castprintz.com>',
        to: order.customer_email || order.customer_phone,
        subject: `${config.title} - ${order.id}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    ${shopLogo ? `<img src="${shopLogo}" alt="Cast Printz" style="max-height: 80px; margin-bottom: 20px;">` : ''}
                    <h2 style="color: #333; margin-bottom: 15px;">${config.title}</h2>
                    <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">${config.body}</p>
                    
                    ${order.tracking_number ? `
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                        <p style="margin: 5px 0;"><strong>Carrier:</strong> ${order.courier_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${order.tracking_number}</p>
                    </div>` : ''}

                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${orderUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Order Details</a>
                    </div>

                    <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                        For any queries, contact us at <a href="mailto:support@castprintz.com">support@castprintz.com</a>
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Status Email Error:', error);
        return { success: false, error };
    }
}
