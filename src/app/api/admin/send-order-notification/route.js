import { sendText, sendRawMessage } from '@/services/whatsappService';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '@/lib/emailService';
import { mysqlClient } from '@/lib/mysqlClient';
import { isValidPublicUrl, toPublicImageUrl } from '@/lib/whatsapp';

function getDisplayInv(order, orderId) {
    const raw = order?.invoice_no || orderId || order?.id || '';
    const clean = String(raw).trim().replace(/^#/, '');
    const inv = clean.replace(/^([A-Z]+-)?/i, 'INV-');
    return inv.startsWith('#') ? inv : `#${inv}`;
}

// Build the correct WhatsApp message for a given status (mirrors update-status route logic)
function buildStatusMessage(order, status, orderId) {
    const totalAmount = order.total_amount || 0;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const brand = 'Vaiyaaree';
    const items = order.order_items || [];
    const itemsList = items.map(i => `• ${i.product_name} (x${i.quantity})`).join('\n');
    const displayInv = getDisplayInv(order, orderId);
    const invoiceUrl = `${appUrl}/shop/invoice?oid=${displayInv.replace('#', '')}`;
    
    // Common Shipping Block
    const shipDetails = [];
    if (order.courier_name || order.tracking_number) {
        let trackingUrl = order.tracking_url || '';
        const trackingNum = order.tracking_number || '';
        
        if (trackingUrl && trackingNum && trackingUrl.includes('{') && trackingUrl.includes('}')) {
            trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNum);
        }

        shipDetails.push(`\n *Shipping Details:*`);
        shipDetails.push(`• Carrier: ${order.courier_name || 'N/A'}`);
        shipDetails.push(`• Tracking: ${trackingNum || 'N/A'}`);
        if (trackingUrl) shipDetails.push(`• Track: ${trackingUrl}`);
    }

    switch (status) {
        case 'PLACED':
            return [
                ` *ORDER CONFIRMED*`,
                ``,
                `Hi ${order.customer_name || 'Customer'}, your order ${displayInv} is confirmed!`,
                ` Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `We are preparing your package for dispatch.`,
                `— ${brand}`
            ].join('\n');

        case 'AWAITING_PAYMENT':
            return [
                ` *PAYMENT PENDING*`,
                ``,
                `Your order ${displayInv} is awaiting payment.`,
                `Amount Due: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Please complete your payment to confirm your order.`,
                `View Invoice: ${invoiceUrl}`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'PAID':
            return [
                ` *PAYMENT RECEIVED*`,
                `--------------------------`,
                `Invoice No: ${displayInv}`,
                `Total Paid: ₹${totalAmount.toLocaleString()}`,
                `Method: ${order.payment_method || 'UPI/Online'}`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `View Full Bill: ${invoiceUrl}`,
                ``,
                `Your order is being processed. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'PACKING':
            return [
                ` *ORDER PACKING*`,
                ``,
                `Hi! We are currently packing your order ${displayInv}.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                `It will be shipped shortly. Thank you!`,
                `— ${brand}`
            ].join('\n');

        case 'SHIPPED':
            return [
                ` *ORDER SHIPPED*`,
                ``,
                `Great news! Order ${displayInv} is on its way!`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
                ...shipDetails,
                ``,
                order.tracking_url ? ` Track Here: ${order.tracking_url}` : ` View Details: ${invoiceUrl}`,
                ``,
                `Thank you for shopping with us!`,
                `— ${brand}`
            ].join('\n');

        case 'DELIVERED':
            return [
                ` *ORDER DELIVERED*`,
                ``,
                `Order ${displayInv} has been delivered successfully!`,
                `Total: ₹${totalAmount.toLocaleString()}`,
                ``,
                `Hope you love your new saree! `,
                `Type "Hi" to shop again anytime.`,
                ``,
                `— ${brand}`
            ].join('\n');

        case 'CANCELLED':
            return [
                ` *ORDER CANCELLED*`,
                ``,
                `Order ${displayInv} has been cancelled.`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                `If you did not request this cancellation, please contact us.`,
                ``,
                `— ${brand}`
            ].join('\n');

        default:
            return [
                ` *Order Update — ${brand}*`,
                ``,
                `Invoice No: ${displayInv}`,
                `Status: ${status}`,
                `Amount: ₹${totalAmount.toLocaleString()}`,
                ``,
                ` *Items:*\n${itemsList || '• Order Items'}`,
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
        const { data: order, error: orderError } = await mysqlClient
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
        let emailSent = false;
        let whatsappSent = false;
        let emailErrorMsg = null;
        let waErrorMsg = null;

        // Send WhatsApp notification
        const finalPhone = targetPhone || order.billing_phone || order.customer_phone;
        if (sendWhatsApp && finalPhone) {
            try {
                const displayInv = getDisplayInv(order, orderId);

                const message = statusOverride
                    ? buildStatusMessage(order, statusOverride, orderId)
                    : (
                        ` *Order Confirmed — Vaiyaaree* \n\n` +
                        `Dear ${order.customer_name},\n\n` +
                        `Your order ${displayInv} has been placed successfully.\n\n` +
                        ` *Order Details:*\n` +
                        `• Total Amount: ₹${order.total_amount?.toLocaleString() || '0'}\n` +
                        `• Payment Method: ${order.payment_method || 'N/A'}\n` +
                        `• Items: ${order.order_items?.length || 0} product(s)\n\n` +
                        `Thank you for shopping with Vaiyaaree! `
                    );

                // Fetch product images
                const itemsWithImages = [];
                if (order.order_items && order.order_items.length > 0) {
                    for (const item of order.order_items) {
                        try {
                            const { data: product } = await mysqlClient
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

                let waImageSent = false;

                if (itemsWithImages.length > 0) {
                    const firstItem = itemsWithImages[0];
                    const publicUrl = toPublicImageUrl(firstItem.image_url);

                    if (publicUrl) {
                        let caption = message;
                        if (order.order_items.length === 1) {
                            caption += `\n\n *Item:* ${firstItem.product_name}\n` +
                                (firstItem.variant_name ? ` *Option:* ${firstItem.variant_name}\n` : '') +
                                ` *Price:* ₹${firstItem.price_at_time.toLocaleString()}\n` +
                                ` *Quantity:* ${firstItem.quantity}`;
                        }

                        const rawRes = await sendRawMessage(finalPhone, {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: finalPhone,
                            type: "image",
                            image: {
                                link: publicUrl,
                                caption: caption.substring(0, 1024)
                            }
                        });

                        if (rawRes && !rawRes.error) {
                            waImageSent = true;
                        }
                    }
                }

                if (!waImageSent) {
                    // Fallback to text message if image URL is non-public, missing or failed
                    const txtRes = await sendText(finalPhone, message);
                    if (txtRes && txtRes.error) {
                        waErrorMsg = txtRes.error;
                    } else {
                        whatsappSent = true;
                    }
                } else {
                    whatsappSent = true;
                }

                notifications.push(`WhatsApp (${finalPhone})`);
            } catch (whatsappErr) {
                console.error('Failed to send WhatsApp notification:', whatsappErr);
                waErrorMsg = whatsappErr.message;
                notifications.push('WhatsApp (failed)');
            }
        }

        // Send Email notification
        const finalEmail = targetEmail || order.billing_email || order.customer_email;
        if (sendEmail && finalEmail) {
            try {
                const orderWithTarget = { ...order, customer_email: finalEmail };
                let mailRes;
                if (statusOverride) {
                    mailRes = await sendOrderStatusEmail(orderWithTarget, statusOverride);
                } else {
                    mailRes = await sendOrderConfirmationEmail(orderWithTarget);
                }

                if (mailRes && mailRes.success) {
                    emailSent = true;
                } else {
                    emailErrorMsg = mailRes?.error || 'Email dispatch failed';
                }
                notifications.push(`Email (${finalEmail})`);
            } catch (emailErr) {
                console.error('Failed to send email notification:', emailErr);
                emailErrorMsg = emailErr.message;
                notifications.push('Email (failed)');
            }
        }

        const isSuccess = (sendEmail ? emailSent : true) && (sendWhatsApp ? whatsappSent : true);

        return new Response(JSON.stringify({
            success: isSuccess,
            message: isSuccess ? `Notifications sent: ${notifications.join(', ')}` : `Some notifications failed: ${notifications.join(', ')}`,
            email: {
                attempted: Boolean(sendEmail && finalEmail),
                sent: emailSent,
                error: emailErrorMsg
            },
            whatsapp: {
                attempted: Boolean(sendWhatsApp && finalPhone),
                sent: whatsappSent,
                error: waErrorMsg
            },
            notifications
        }), {
            status: isSuccess ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to send notifications: ' + error.message,
            email: { attempted: false, sent: false, error: error.message },
            whatsapp: { attempted: false, sent: false, error: error.message }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
