import { mysqlClient } from '../lib/mysqlClient.js';
import { sendEmail, sendOrderStatusEmail } from '../lib/emailService.js';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../lib/whatsapp.js';

/**
 * Central Notification Engine for Customer & Admin Notifications
 * Enforces duplicate suppression, records notification logs, and handles provider failures gracefully.
 */

// Baseline Event Definitions
export const EVENT_TYPES = {
    ORDER_PLACED: 'ORDER_PLACED',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_PROCESSING: 'ORDER_PROCESSING',
    ORDER_PACKED: 'ORDER_PACKED',
    ORDER_SHIPPED: 'ORDER_SHIPPED',
    COURIER_DETAILS_ADDED: 'COURIER_DETAILS_ADDED',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    DELIVERY_FAILED: 'DELIVERY_FAILED',
    ORDER_CANCELLED_CUSTOMER: 'ORDER_CANCELLED_CUSTOMER',
    ORDER_CANCELLED_ADMIN: 'ORDER_CANCELLED_ADMIN',
    REFUND_INITIATED: 'REFUND_INITIATED',
    REFUND_COMPLETED: 'REFUND_COMPLETED',
    RETURN_REQUESTED: 'RETURN_REQUESTED',
    RETURN_APPROVED: 'RETURN_APPROVED',
    RETURN_REJECTED: 'RETURN_REJECTED',
    RETURN_COURIER_SUBMITTED: 'RETURN_COURIER_SUBMITTED',
    RETURN_RECEIVED: 'RETURN_RECEIVED',
    EXCHANGE_REQUESTED: 'EXCHANGE_REQUESTED',
    EXCHANGE_APPROVED: 'EXCHANGE_APPROVED',
    EXCHANGE_SHIPPED: 'EXCHANGE_SHIPPED',
    EXCHANGE_DELIVERED: 'EXCHANGE_DELIVERED'
};

/**
 * Normalizes phone numbers to standard format with 91 prefix for India
 */

function normalizePhone(p) {
    if (!p) return '';
    let digits = String(p).replace(/\D/g, '');
    if (digits.length === 10 && /^[6789]/.test(digits)) {
        digits = '91' + digits;
    }
    return digits;
}

/**
 * Formats invoice display ID
 */
function formatDisplayInvoice(order) {
    if (!order) return '#INV-0001';
    if (order.invoice_no) {
        return order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`;
    }
    const id = order.id || order.orderId || '0001';
    return `#${String(id).replace(/^[A-Z]+-/, 'INV-')}`;
}

/**
 * Main dispatch function for customer & admin notifications
 */
export async function dispatchNotification({
    eventType,
    order = null,
    returnReq = null,
    extraData = {},
    forceRetry = false
}) {
    const results = [];
    const orderId = order?.id || returnReq?.order_id || extraData?.orderId || null;
    const returnId = returnReq?.id || extraData?.returnId || null;
    const customerId = order?.customer_id || returnReq?.customer_id || extraData?.customerId || null;

    const displayInv = formatDisplayInvoice(order);
    const customerEmail = (order?.billing_email || order?.customer_email || extraData?.email || '').trim();
    const customerPhone = normalizePhone(order?.billing_phone || order?.customer_phone || extraData?.phone || '');
    const customerName = order?.customer_name || order?.billing_name || extraData?.customerName || 'Valued Customer';

    // 1. Fetch Admin Notification Contacts
    let adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'vaiyaaree@gmail.com';
    let adminPhone = normalizePhone(process.env.ADMIN_ALERT_PHONE || '918667793292');

    try {
        const { data: settings } = await mysqlClient.from('app_settings').select('*');
        if (settings) {
            settings.forEach(s => {
                if (s.key === 'admin_notification_email' && s.value) adminEmail = s.value.trim();
                if ((s.key === 'admin_notification_phone' || s.key === 'business_phone') && s.value) adminPhone = normalizePhone(s.value);
            });
        }
    } catch (e) {}

    // 2. Build Message Content for Event
    const content = buildEventMessages(eventType, { order, returnReq, extraData, displayInv, customerName });

    // 3. Dispatch Customer Email
    if (customerEmail && content.customerEmail) {
        const emailRes = await sendWithDuplicateCheck({
            orderId,
            returnId,
            customerId,
            eventType,
            channel: 'EMAIL',
            recipient: customerEmail,
            recipientType: 'CUSTOMER',
            forceRetry,
            sendFn: async () => await sendEmail({ to: customerEmail, subject: content.customerEmail.subject, html: content.customerEmail.html })
        });
        results.push(emailRes);
    }

    // 4. Dispatch Customer WhatsApp
    if (customerPhone && content.customerWhatsApp) {
        const waRes = await sendWithDuplicateCheck({
            orderId,
            returnId,
            customerId,
            eventType,
            channel: 'WHATSAPP',
            recipient: customerPhone,
            recipientType: 'CUSTOMER',
            forceRetry,
            sendFn: async () => await sendWhatsAppText(customerPhone, content.customerWhatsApp)
        });
        results.push(waRes);
    }

    // 5. Dispatch Admin Operational Alert (if applicable for event)
    if (content.isAdminEvent) {
        if (adminEmail && content.adminEmail) {
            const adminEmailRes = await sendWithDuplicateCheck({
                orderId,
                returnId,
                customerId,
                eventType: `${eventType}_ADMIN`,
                channel: 'EMAIL',
                recipient: adminEmail,
                recipientType: 'ADMIN',
                forceRetry,
                sendFn: async () => await sendEmail({ to: adminEmail, subject: content.adminEmail.subject, html: content.adminEmail.html })
            });
            results.push(adminEmailRes);
        }

        if (adminPhone && content.adminWhatsApp) {
            const adminWaRes = await sendWithDuplicateCheck({
                orderId,
                returnId,
                customerId,
                eventType: `${eventType}_ADMIN`,
                channel: 'WHATSAPP',
                recipient: adminPhone,
                recipientType: 'ADMIN',
                forceRetry,
                sendFn: async () => await sendWhatsAppText(adminPhone, content.adminWhatsApp)
            });
            results.push(adminWaRes);
        }
    }

    return { success: true, eventType, orderId, results };
}

/**
 * Helper to execute send function with duplicate suppression and DB logging
 */
async function sendWithDuplicateCheck({
    orderId,
    returnId,
    customerId,
    eventType,
    channel,
    recipient,
    recipientType,
    forceRetry,
    sendFn
}) {
    const logId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
        // Duplicate suppression check
        if (!forceRetry) {
            let dupQuery = mysqlClient
                .from('notification_logs')
                .select('id, status')
                .eq('event_type', eventType)
                .eq('channel', channel)
                .eq('recipient', recipient)
                .in('status', ['SENT', 'LOGGED_ONLY']);

            if (orderId) dupQuery = dupQuery.eq('order_id', orderId);
            else if (returnId) dupQuery = dupQuery.eq('return_id', returnId);

            const { data: existingLog } = await dupQuery.maybeSingle();

            if (existingLog) {
                console.log(`[NOTIF ENGINE] Duplicate blocked: ${eventType} (${channel}) to ${recipient} for Order #${orderId}`);
                await mysqlClient.from('notification_logs').insert([{
                    id: logId,
                    order_id: orderId,
                    return_id: returnId,
                    customer_id: customerId,
                    event_type: eventType,
                    channel,
                    recipient,
                    recipient_type: recipientType,
                    status: 'SKIPPED_DUPLICATE',
                    error_message: 'Duplicate event skipped',
                    sent_at: new Date().toISOString()
                }]);
                return { channel, recipient, status: 'SKIPPED_DUPLICATE' };
            }
        }

        // Execute send function
        const sendResult = await sendFn();
        const isSuccess = sendResult?.success || !sendResult?.error;
        const status = isSuccess ? (sendResult?.messageId ? 'SENT' : 'LOGGED_ONLY') : 'FAILED';
        const errorMsg = sendResult?.error || (sendResult?.error_message ? JSON.stringify(sendResult.error_message) : null);
        const msgId = sendResult?.messageId || sendResult?.data?.messages?.[0]?.id || null;

        // Log record into notification_logs
        await mysqlClient.from('notification_logs').insert([{
            id: logId,
            order_id: orderId,
            return_id: returnId,
            customer_id: customerId,
            event_type: eventType,
            channel,
            recipient,
            recipient_type: recipientType,
            status,
            provider_message_id: msgId,
            error_message: errorMsg,
            sent_at: isSuccess ? new Date().toISOString() : null
        }]);

        return { channel, recipient, status, msgId, error: errorMsg };

    } catch (err) {
        console.error(`[NOTIF ENGINE ERROR] Failed to dispatch ${eventType} (${channel}):`, err);
        try {
            await mysqlClient.from('notification_logs').insert([{
                id: logId,
                order_id: orderId,
                return_id: returnId,
                customer_id: customerId,
                event_type: eventType,
                channel,
                recipient,
                recipient_type: recipientType,
                status: 'FAILED',
                error_message: err.message || 'Dispatch exception',
                sent_at: null
            }]);
        } catch (dbErr) {}

        return { channel, recipient, status: 'FAILED', error: err.message };
    }
}

/**
 * Helper to generate rich responsive HTML email layout for Admin Notifications
 */
function renderAdminAlertHtml({
    badgeText = 'NEW ORDER',
    badgeBg = '#5d0821',
    title = 'New Order Received',
    displayInv = '#INV-0000',
    customerName = 'Valued Customer',
    customerPhone = '',
    customerEmail = '',
    totalAmount = '₹0',
    paymentMethod = 'COD / Online',
    items = [],
    extraDetails = [],
    actionUrl = ''
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vaiyaaree.com';
    const finalActionUrl = actionUrl || `${appUrl}/admin/orders`;

    let itemsHtml = '';
    if (Array.isArray(items) && items.length > 0) {
        const itemRows = items.map(item => `
            <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; font-weight: 600;">
                    ${item.product_name || item.name || 'Saree Item'}
                    ${item.variant_name ? `<br/><span style="font-size: 11px; color: #64748b; font-weight: normal;">Variant: ${item.variant_name}</span>` : ''}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; text-align: center; font-weight: 700;">
                    ${item.quantity || 1}
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">
                    ₹${Number(item.price_at_time || item.price || 0).toLocaleString('en-IN')}
                </td>
            </tr>
        `).join('');

        itemsHtml = `
            <div style="margin-top: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Order Items Breakdown</h4>
                <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Product Name</th>
                            <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Qty</th>
                            <th style="padding: 8px 12px; text-align: right; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    let extraHtml = '';
    if (Array.isArray(extraDetails) && extraDetails.length > 0) {
        extraHtml = extraDetails.map(d => `
            <div style="margin-top: 10px; padding: 10px 14px; background: #f8fafc; border-left: 4px solid #5d0821; border-radius: 6px; font-size: 13px; color: #334155;">
                <strong style="color: #0f172a;">${d.label}:</strong> ${d.value}
            </div>
        `).join('');
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${displayInv}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f1f5f9; padding: 25px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- HEADER BAR -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #5d0821 0%, #3b0515 100%); padding: 24px 28px; text-align: left;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td>
                                        <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">VAIYAAREE</span>
                                        <span style="display: block; font-size: 10px; color: #fecdd3; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px;">Saree Collection</span>
                                    </td>
                                    <td style="text-align: right;">
                                        <span style="background: ${badgeBg}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
                                            ${badgeText}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CONTENT AREA -->
                    <tr>
                        <td style="padding: 28px;">
                            <div style="margin-bottom: 20px;">
                                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${title}</h2>
                                <p style="margin: 0; font-size: 14px; color: #64748b;">Order Reference: <strong style="color: #5d0821;">${displayInv}</strong></p>
                            </div>

                            <!-- SUMMARY METRICS GRID -->
                            <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-left: -10px; margin-right: -10px; margin-bottom: 20px;">
                                <tr>
                                    <td style="background: #fff1f2; border: 1px solid #ffe4e6; padding: 14px; border-radius: 10px; text-align: center; width: 50%;">
                                        <span style="display: block; font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase;">Total Amount</span>
                                        <span style="display: block; font-size: 22px; font-weight: 900; color: #881337; margin-top: 2px;">${totalAmount}</span>
                                    </td>
                                    <td style="background: #f0fdf4; border: 1px solid #dcfce7; padding: 14px; border-radius: 10px; text-align: center; width: 50%;">
                                        <span style="display: block; font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Payment Method</span>
                                        <span style="display: block; font-size: 15px; font-weight: 800; color: #14532d; margin-top: 4px;">${paymentMethod}</span>
                                    </td>
                                </tr>
                            </table>

                            <!-- CUSTOMER DETAILS CARD -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                                <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Customer Details</h4>
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; width: 120px; font-weight: 600;">Customer Name:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${customerName}</td>
                                    </tr>
                                    ${customerPhone ? `
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Mobile Phone:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${customerPhone}</td>
                                    </tr>` : ''}
                                    ${customerEmail && customerEmail !== 'N/A' ? `
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Email Address:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${customerEmail}</td>
                                    </tr>` : ''}
                                </table>
                            </div>

                            ${itemsHtml}
                            ${extraHtml}

                            <!-- ACTION CTA BUTTON -->
                            <div style="margin-top: 28px; text-align: center;">
                                <a href="${finalActionUrl}" target="_blank" style="background: #5d0821; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(93,8,33,0.25);">
                                    Open Admin Dashboard &rarr;
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- FOOTER BAR -->
                    <tr>
                        <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
                            Vaiyaaree Sarees Admin Notification Engine &bull; Automatic System Alert<br/>
                            <a href="${appUrl}" style="color: #64748b; text-decoration: underline;">www.vaiyaaree.com</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

/**
 * Message Template Builder across all 24 events
 */
function buildEventMessages(eventType, { order, returnReq, extraData, displayInv, customerName }) {
    const totalAmount = order?.total_amount ? `₹${parseFloat(order.total_amount).toLocaleString()}` : (extraData.amount ? `₹${parseFloat(extraData.amount).toLocaleString()}` : '₹0');
    const brand = 'Vaiyaaree Sarees';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vaiyaaree.com';
    const customerPhoneVal = order?.customer_phone || order?.billing_phone || extraData?.phone || '';
    const customerEmailVal = order?.customer_email || order?.billing_email || extraData?.email || '';
    const paymentMethodVal = order?.payment_method || extraData?.paymentMethod || 'COD / Online';
    const orderItemsVal = order?.order_items || extraData?.items || [];

    let customerEmail = null;
    let customerWhatsApp = null;
    let adminEmail = null;
    let adminWhatsApp = null;
    let isAdminEvent = false;

    switch (eventType) {
        case EVENT_TYPES.ORDER_PLACED:
        case EVENT_TYPES.ORDER_CONFIRMED:
            customerWhatsApp = `🌸 *Order Confirmed!* 🌸\n\nDear ${customerName},\nYour order *${displayInv}* has been placed successfully!\nTotal Amount: *${totalAmount}*\n\nWe are preparing your saree collection for dispatch. Thank you for shopping with ${brand}! ✨`;
            customerEmail = {
                subject: `Order Confirmed - ${displayInv} | ${brand}`,
                html: `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Order Confirmed!</h2><p>Dear ${customerName},</p><p>Thank you for your order <strong>${displayInv}</strong> for <strong>${totalAmount}</strong>.</p><p>We are processing your items.</p></div>`
            };
            isAdminEvent = true;
            adminWhatsApp = `🔔 *NEW ORDER ALERT* 🔔\n\nOrder: *${displayInv}*\nCustomer: ${customerName} (${order?.customer_phone || ''})\nTotal: *${totalAmount}*\nPayment Method: ${order?.payment_method || 'COD'}`;
            adminEmail = {
                subject: `[ADMIN ALERT] New Order Received - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'NEW ORDER',
                    badgeBg: '#16a34a',
                    title: 'New Order Received',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.PAYMENT_SUCCESS:
            customerWhatsApp = `✅ *Payment Successful!* ✅\n\nDear ${customerName},\nPayment of *${totalAmount}* for order *${displayInv}* was received successfully via ${order?.payment_method || 'UPI/Online'}.\n\nYour order is now being processed! 🎁`;
            customerEmail = {
                subject: `Payment Successful - Order ${displayInv}`,
                html: `<p>Dear ${customerName}, payment of <strong>${totalAmount}</strong> for order ${displayInv} was received successfully.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `💰 *PAYMENT RECEIVED* 💰\n\nOrder: *${displayInv}*\nCustomer: ${customerName}\nAmount Paid: *${totalAmount}*`;
            adminEmail = {
                subject: `[ADMIN ALERT] Payment Received - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'PAYMENT RECEIVED',
                    badgeBg: '#16a34a',
                    title: 'Payment Received & Verified',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.PAYMENT_FAILED:
            customerWhatsApp = `⚠️ *Payment Failed* ⚠️\n\nDear ${customerName},\nPayment attempt of *${totalAmount}* for order *${displayInv}* failed or was cancelled.\n\nPlease retry payment or select COD to confirm your order: ${appUrl}/checkout`;
            customerEmail = {
                subject: `Payment Action Required - Order ${displayInv}`,
                html: `<p>Dear ${customerName}, your payment attempt for order ${displayInv} failed. Please retry payment to complete your order.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `🚨 *PAYMENT FAILED ALERT* 🚨\n\nOrder: *${displayInv}*\nCustomer: ${customerName}\nAttempted Amount: ${totalAmount}`;
            adminEmail = {
                subject: `[ADMIN ALERT] Payment Failed - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'PAYMENT FAILED',
                    badgeBg: '#dc2626',
                    title: 'Payment Attempt Failed',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.ORDER_PROCESSING:
            customerWhatsApp = `⚙️ *Order Processing* ⚙️\n\nHi ${customerName}, order *${displayInv}* is being processed by our packaging team.`;
            customerEmail = {
                subject: `Order Processing - ${displayInv}`,
                html: `<p>Order ${displayInv} is currently being processed.</p>`
            };
            break;

        case EVENT_TYPES.ORDER_PACKED:
            customerWhatsApp = `📦 *Order Packed!* 📦\n\nHi ${customerName}, your order *${displayInv}* has been packed carefully and is ready for courier pickup!`;
            customerEmail = {
                subject: `Order Packed - ${displayInv}`,
                html: `<p>Order ${displayInv} has been packed.</p>`
            };
            break;

        case EVENT_TYPES.ORDER_SHIPPED:
        case EVENT_TYPES.COURIER_DETAILS_ADDED:
            const courier = order?.courier_name || extraData.courierName || 'Courier';
            const trackNo = order?.tracking_number || extraData.trackingNumber || 'N/A';
            const trackUrl = order?.tracking_url || extraData.trackingUrl || appUrl;
            customerWhatsApp = `🚚 *Order Shipped!* 🚚\n\nGreat news ${customerName}!\nOrder *${displayInv}* has been shipped.\n\n*Carrier:* ${courier}\n*Tracking No:* ${trackNo}\n*Track Here:* ${trackUrl}`;
            customerEmail = {
                subject: `Order Shipped - ${displayInv} (${courier})`,
                html: `<p>Order ${displayInv} has been shipped via ${courier}. Tracking No: ${trackNo}. <a href="${trackUrl}">Track Package</a></p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `🚚 *SHIPMENT DISPATCHED*\n\nOrder: *${displayInv}*\nCourier: ${courier}\nTracking: ${trackNo}`;
            adminEmail = {
                subject: `[ADMIN INFO] Order Shipped - ${displayInv}`,
                html: `<p>Order ${displayInv} shipped via ${courier} (${trackNo}).</p>`
            };
            break;

        case EVENT_TYPES.OUT_FOR_DELIVERY:
            customerWhatsApp = `🛵 *Out For Delivery!* 🛵\n\nHi ${customerName}, order *${displayInv}* is out for delivery today. Please keep *${totalAmount}* ready if COD.`;
            customerEmail = {
                subject: `Out for Delivery - ${displayInv}`,
                html: `<p>Order ${displayInv} is out for delivery today!</p>`
            };
            break;

        case EVENT_TYPES.ORDER_DELIVERED:
            customerWhatsApp = `🎉 *Delivered Successfully!* 🎉\n\nOrder *${displayInv}* has been delivered!\nThank you for choosing ${brand}. We hope you love your saree! 💖`;
            customerEmail = {
                subject: `Delivered - ${displayInv}`,
                html: `<p>Order ${displayInv} has been delivered. Thank you!</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `✅ *DELIVERY COMPLETED*\n\nOrder *${displayInv}* delivered to ${customerName}.`;
            adminEmail = {
                subject: `[ADMIN INFO] Delivered - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'DELIVERED',
                    badgeBg: '#16a34a',
                    title: 'Order Delivered Successfully',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.DELIVERY_FAILED:
            customerWhatsApp = `⚠️ *Delivery Delayed / Attempt Failed* ⚠️\n\nHi ${customerName}, delivery attempt for order *${displayInv}* could not be completed. The courier will retry shortly.`;
            customerEmail = {
                subject: `Delivery Update - ${displayInv}`,
                html: `<p>Delivery attempt for ${displayInv} failed or was delayed. Our team is assisting.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `🚨 *DELIVERY FAILED ALERT*\n\nOrder *${displayInv}* delivery failed/delayed.`;
            adminEmail = {
                subject: `[ADMIN ALERT] Delivery Failed - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'DELIVERY FAILED',
                    badgeBg: '#dc2626',
                    title: 'Order Delivery Failed / Delayed',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.ORDER_CANCELLED_CUSTOMER:
        case EVENT_TYPES.ORDER_CANCELLED_ADMIN:
            customerWhatsApp = `❌ *Order Cancelled* ❌\n\nDear ${customerName}, order *${displayInv}* has been cancelled.\nIf payment was deducted, refund processing has been initiated.`;
            customerEmail = {
                subject: `Order Cancelled - ${displayInv}`,
                html: `<p>Order ${displayInv} has been cancelled.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `❌ *ORDER CANCELLED*\n\nOrder: *${displayInv}*\nCustomer: ${customerName}`;
            adminEmail = {
                subject: `[ADMIN ALERT] Order Cancelled - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'ORDER CANCELLED',
                    badgeBg: '#dc2626',
                    title: 'Order Cancelled',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/orders`
                })
            };
            break;

        case EVENT_TYPES.RETURN_REQUESTED:
            customerWhatsApp = `🔄 *Return Request Received* 🔄\n\nHi ${customerName}, your return request for order *${displayInv}* has been received. Our team will review it within 24 hours.`;
            customerEmail = {
                subject: `Return Request Received - ${displayInv}`,
                html: `<p>Return request received for ${displayInv}.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `📩 *NEW RETURN REQUEST*\n\nOrder: *${displayInv}*\nReason: ${returnReq?.reason || 'Customer Return'}`;
            adminEmail = {
                subject: `[ADMIN ALERT] New Return Request - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'RETURN REQUEST',
                    badgeBg: '#7c3aed',
                    title: 'New Return Request Received',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    extraDetails: [
                        { label: 'Return Reason', value: returnReq?.reason || 'Customer Return' },
                        { label: 'Product Condition', value: returnReq?.product_condition || 'Original Packaging' }
                    ],
                    actionUrl: `${appUrl}/admin/returns`
                })
            };
            break;

        case EVENT_TYPES.RETURN_APPROVED:
            customerWhatsApp = `✅ *Return Approved!* ✅\n\nHi ${customerName}, return for order *${displayInv}* is approved. Please ship the product back and update tracking details.`;
            customerEmail = {
                subject: `Return Approved - ${displayInv}`,
                html: `<p>Return approved for ${displayInv}.</p>`
            };
            break;

        case EVENT_TYPES.RETURN_REJECTED:
            customerWhatsApp = `❌ *Return Request Declined* ❌\n\nHi ${customerName}, return for order *${displayInv}* could not be approved.\nReason: ${extraData.reason || returnReq?.rejection_reason || 'Policy criteria not met'}`;
            customerEmail = {
                subject: `Return Request Update - ${displayInv}`,
                html: `<p>Return request for ${displayInv} was declined.</p>`
            };
            break;

        case EVENT_TYPES.RETURN_COURIER_SUBMITTED:
            customerWhatsApp = `📦 *Return Tracking Received* 📦\n\nHi ${customerName}, return courier tracking for *${displayInv}* has been recorded.`;
            customerEmail = {
                subject: `Return Tracking Updated - ${displayInv}`,
                html: `<p>Return shipment tracking received for ${displayInv}.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `📦 *RETURN SHIPMENT UPDATED*\n\nOrder: *${displayInv}*\nTracking: ${extraData.trackingNumber || 'N/A'}`;
            adminEmail = {
                subject: `[ADMIN INFO] Return Tracking Submitted - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'RETURN SHIPPED',
                    badgeBg: '#7c3aed',
                    title: 'Customer Submitted Return Courier Tracking',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    extraDetails: [
                        { label: 'Courier Company', value: extraData.courierName || 'Courier' },
                        { label: 'Tracking / AWB No', value: extraData.trackingNumber || 'N/A' }
                    ],
                    actionUrl: `${appUrl}/admin/returns`
                })
            };
            break;

        case EVENT_TYPES.RETURN_RECEIVED:
            customerWhatsApp = `📥 *Return Item Received* 📥\n\nHi ${customerName}, we have received your return package for *${displayInv}*. Inspection is in progress.`;
            customerEmail = {
                subject: `Return Item Received - ${displayInv}`,
                html: `<p>Return package received for ${displayInv}.</p>`
            };
            break;

        case EVENT_TYPES.REFUND_INITIATED:
            const refAmt = extraData.refundAmount ? `₹${parseFloat(extraData.refundAmount).toLocaleString()}` : totalAmount;
            customerWhatsApp = `💸 *Refund Initiated* 💸\n\nHi ${customerName}, refund of *${refAmt}* for order *${displayInv}* has been initiated via ${extraData.method || 'Original Payment'}.`;
            customerEmail = {
                subject: `Refund Initiated - ${displayInv}`,
                html: `<p>Refund of ${refAmt} initiated for ${displayInv}.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `💸 *REFUND INITIATED*\n\nOrder: *${displayInv}*\nAmount: ${refAmt}`;
            adminEmail = {
                subject: `[ADMIN INFO] Refund Initiated - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'REFUND INITIATED',
                    badgeBg: '#2563eb',
                    title: 'Refund Request Initiated',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount: refAmt,
                    paymentMethod: extraData.method || 'Original Payment',
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/refunds`
                })
            };
            break;

        case EVENT_TYPES.REFUND_COMPLETED:
            const compAmt = extraData.refundAmount ? `₹${parseFloat(extraData.refundAmount).toLocaleString()}` : totalAmount;
            customerWhatsApp = `🎉 *Refund Completed!* 🎉\n\nHi ${customerName}, refund of *${compAmt}* for order *${displayInv}* has been completed successfully!`;
            customerEmail = {
                subject: `Refund Completed - ${displayInv}`,
                html: `<p>Refund of ${compAmt} completed for ${displayInv}.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `✅ *REFUND COMPLETED*\n\nOrder: *${displayInv}*\nAmount: ${compAmt}`;
            adminEmail = {
                subject: `[ADMIN INFO] Refund Completed - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'REFUND COMPLETED',
                    badgeBg: '#16a34a',
                    title: 'Refund Processed & Completed',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount: compAmt,
                    paymentMethod: extraData.method || 'Original Payment',
                    items: orderItemsVal,
                    actionUrl: `${appUrl}/admin/refunds`
                })
            };
            break;

        case EVENT_TYPES.EXCHANGE_REQUESTED:
            customerWhatsApp = `🔄 *Exchange Request Received* 🔄\n\nHi ${customerName}, exchange request for order *${displayInv}* has been recorded. Replacement item: ${extraData.exchangeItemName || 'Requested Product'}.`;
            customerEmail = {
                subject: `Exchange Requested - ${displayInv}`,
                html: `<p>Exchange requested for ${displayInv}.</p>`
            };
            isAdminEvent = true;
            adminWhatsApp = `🔄 *NEW EXCHANGE REQUEST*\n\nOrder: *${displayInv}*\nCustomer: ${customerName}`;
            adminEmail = {
                subject: `[ADMIN ALERT] Exchange Requested - ${displayInv}`,
                html: renderAdminAlertHtml({
                    badgeText: 'EXCHANGE REQUEST',
                    badgeBg: '#7c3aed',
                    title: 'Customer Requested Product Exchange',
                    displayInv,
                    customerName,
                    customerPhone: customerPhoneVal,
                    customerEmail: customerEmailVal,
                    totalAmount,
                    paymentMethod: paymentMethodVal,
                    items: orderItemsVal,
                    extraDetails: [
                        { label: 'Requested Replacement Item', value: extraData.exchangeItemName || 'Saree Product' }
                    ],
                    actionUrl: `${appUrl}/admin/returns`
                })
            };
            break;

        case EVENT_TYPES.EXCHANGE_APPROVED:
            customerWhatsApp = `✅ *Exchange Approved!* ✅\n\nHi ${customerName}, your exchange for order *${displayInv}* is approved! Our team is preparing your replacement item.`;
            customerEmail = {
                subject: `Exchange Approved - ${displayInv}`,
                html: `<p>Exchange approved for ${displayInv}.</p>`
            };
            break;

        case EVENT_TYPES.EXCHANGE_SHIPPED:
            customerWhatsApp = `🚚 *Replacement Item Shipped!* 🚚\n\nHi ${customerName}, replacement saree for order *${displayInv}* has been shipped!\nCourier: ${extraData.courierName || 'Courier'}\nTracking: ${extraData.trackingNumber || 'N/A'}`;
            customerEmail = {
                subject: `Replacement Shipped - ${displayInv}`,
                html: `<p>Replacement item shipped for ${displayInv}.</p>`
            };
            break;

        case EVENT_TYPES.EXCHANGE_DELIVERED:
            customerWhatsApp = `🎉 *Exchange Completed!* 🎉\n\nHi ${customerName}, replacement item for order *${displayInv}* has been delivered! Enjoy your new saree! 💖`;
            customerEmail = {
                subject: `Exchange Delivered - ${displayInv}`,
                html: `<p>Exchange product delivered for ${displayInv}.</p>`
            };
            break;

        default:
            customerWhatsApp = `Order ${displayInv} notification update from ${brand}.`;
            customerEmail = {
                subject: `Order Update - ${displayInv}`,
                html: `<p>Update for order ${displayInv}.</p>`
            };
    }

    return {
        customerEmail,
        customerWhatsApp,
        adminEmail,
        adminWhatsApp,
        isAdminEvent
    };
}
