import { sendText, sendRawMessage } from '@/services/whatsappService';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '@/lib/emailService';
import { supabase } from '@/lib/supabaseClient';

// Build the correct WhatsApp message for a given status (mirrors update-status route logic)
function buildStatusMessage(order, status, orderId) {
    const totalAmount = order.total_amount || 0;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const invoiceUrl = `${appUrl}/shop/invoice?oid=${orderId}`;
    const brand = 'Cast Printz';
    const items = order.order_items || [];
    const itemsList = items.map(i => `• ${i.product_name} (x${i.quantity})`).join('\n');
    
    // Common Shipping Block
    const shipDetails = [];
    if (order.courier_name || order.tracking_number) {
        let trackingUrl = order.tracking_url || '';
        const trackingNum = order.tracking_number || '';
        
        // Fix: If tracking_url has a placeholder like {tracking_number} or {821011}, replace it
        if (trackingUrl && trackingNum && trackingUrl.includes('{') && trackingUrl.includes('}')) {
            trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNum);
        }

        shipDetails.push(`\n🚚 *Shipping Details:*`);
        shipDetails.push(`• Carrier: ${order.courier_name || 'N/A'}`);
        shipDetails.push(`• Tracking: ${trackingNum || 'N/A'}`);
        if (trackingUrl) shipDetails.push(`• Track: ${trackingUrl}`);
    }

    switch (status) {
        case 'PLACED':
            return [
                `✅ *ORDER CONFIRMED*`,
                ``,
                `Hi ${order.customer_name || 'Customer'}, your order #${orderId} is confirmed!`,
                `💰 Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `We are preparing your package for dispatch.`,
                `— ${brand}`
            ].join('\n');

        case 'AWAITING_PAYMENT':
            return [
                `⏳ *PAYMENT PENDING*`,
                ``,
                `Your order #${orderId} is awaiting payment.`,
                `Amount Due: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Please complete your payment to confirm your order.`,
                `View Invoice: ${invoiceUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'PAID':
            return [
                `💳 *PAYMENT RECEIVED*`,
                `--------------------------`,
                `Order ID: #${orderId}`,
                `Total Paid: ₹${totalAmount.toLocaleString()}`,
                `Method: ${order.payment_method || 'UPI/Online'}`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `View Full Bill: ${invoiceUrl}`,
                ``,
                `Your order is being processed. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'PACKING':
            return [
                `📦 *ORDER PACKING*`,
                ``,
                `Hi! We are currently packing your order #${orderId}.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `It will be shipped shortly. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'SHIPPED':
            return [
                `🚀 *ORDER SHIPPED*`,
                ``,
                `Great news! Order #${orderId} is on its way!`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                order.tracking_url ? `🔗 Track Here: ${order.tracking_url}` : `🔗 View Details: ${invoiceUrl}`,
                ``,
                `Thank you for shopping with us!`,
                `— ${brand}`
            ].join('\n');

        case 'DELIVERED':
            return [
                `🎉 *ORDER DELIVERED*`,
                ``,
                `Order #${orderId} has been delivered successfully!`,
                `Total: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Hope you love your new saree! 💖`,
                `Type "Hi" to shop again anytime.`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'CANCELLED':
            return [
                `❌ *ORDER CANCELLED*`,
                ``,
                `Order #${orderId} has been cancelled.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `If you did not request this cancellation, please contact us.`,
                ``,
                `— ${brand}`
            ].join('\n');

        default:
            return [
                `✅ *Order Update — ${brand}*`,
                ``,
                `Order: #${orderId}`,
                `Status: ${status}`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `🛍️ *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `Thank you for your patience!`,
                `— ${brand}`
            ].join('\n');
    }
}

export async function POST(request) {
    try {
        const { orderId, sendWhatsApp, sendEmail, targetPhone, targetEmail, statusOverride } = await request.json();

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
        const finalPhone = targetPhone || order.billing_phone || order.customer_phone;
        if (sendWhatsApp && finalPhone) {
            try {
                const message = statusOverride
                    ? buildStatusMessage(order, statusOverride, orderId)
                    : (
                        `✅ *Order Confirmed — Cast Printz* 🎉\n\n` +
                        `Dear ${order.customer_name},\n\n` +
                        `Your order #${orderId} has been placed successfully.\n\n` +
                        `📦 *Order Details:*\n` +
                        `• Total Amount: ₹${order.total_amount?.toLocaleString() || '0'}\n` +
                        `• Payment Method: ${order.payment_method || 'N/A'}\n` +
                        `• Items: ${order.order_items?.length || 0} product(s)\n\n` +
                        `Thank you for shopping with Cast Printz! 💖`
                    );

                // Fetch product images
                const itemsWithImages = [];
                if (order.order_items && order.order_items.length > 0) {
                    for (const item of order.order_items) {
                        try {
                            const { data: product } = await supabase
                                .from('products')
                                .select('image_url')
                                .eq('id', item.product_id)
                                .single();
                            
                            const imgUrl = product?.image_url;
                            if (imgUrl) {
                                itemsWithImages.push({
                                    ...item,
                                    image_url: imgUrl
                                });
                            }
                        } catch (err) {
                            console.error('Error fetching product image:', err);
                        }
                    }
                }

                if (itemsWithImages.length > 0) {
                    // Send first product image with the main message as the caption
                    const firstItem = itemsWithImages[0];
                    let caption = message;
                    
                    // If there is only 1 item in the order, append its details directly to the main caption
                    if (order.order_items.length === 1) {
                        caption += `\n\n🛍️ *Item:* ${firstItem.product_name}\n` +
                            (firstItem.variant_name ? `🎨 *Option:* ${firstItem.variant_name}\n` : '') +
                            `💵 *Price:* ₹${firstItem.price_at_time.toLocaleString()}\n` +
                            `🔢 *Quantity:* ${firstItem.quantity}`;
                    }

                    await sendRawMessage(finalPhone, {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: finalPhone,
                        type: "image",
                        image: {
                            link: firstItem.image_url,
                            caption: caption.substring(0, 1024)
                        }
                    });

                    // Send remaining product images with their captions
                    for (let i = 1; i < itemsWithImages.length; i++) {
                        const item = itemsWithImages[i];
                        const itemCaption = `🛍️ *Item:* ${item.product_name}\n` +
                            (item.variant_name ? `🎨 *Option:* ${item.variant_name}\n` : '') +
                            `💵 *Price:* ₹${item.price_at_time.toLocaleString()}\n` +
                            `🔢 *Quantity:* ${item.quantity}`;
                        
                        await sendRawMessage(finalPhone, {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: finalPhone,
                            type: "image",
                            image: {
                                link: item.image_url,
                                caption: itemCaption.substring(0, 1024)
                            }
                        });
                    }
                } else {
                    // Fallback to text message if no product images exist
                    await sendText(finalPhone, message);
                }

                notifications.push(`WhatsApp (${finalPhone})`);
            } catch (whatsappErr) {
                console.error('Failed to send WhatsApp notification:', whatsappErr);
                notifications.push('WhatsApp (failed)');
            }
        }

        // Send Email notification
        const finalEmail = targetEmail || order.billing_email || order.customer_email;
        if (sendEmail && finalEmail) {
            try {
                const orderWithTarget = { ...order, customer_email: finalEmail };
                if (statusOverride) {
                    // Use status-specific email if available
                    await sendOrderStatusEmail(orderWithTarget, statusOverride);
                } else {
                    await sendOrderConfirmationEmail(orderWithTarget);
                }
                notifications.push(`Email (${finalEmail})`);
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
