/**
 * Vaiyaaree Sarees — Ultra-Premium Order Status HTML Email Templates
 * Designed for cross-client email compatibility (Gmail, Outlook, Apple Mail, Yahoo)
 * Brand Palette: Royal Burgundy (#5d0821, #3e0516), Warm Gold (#dfaa5b, #c8933b), Slate Dark (#0f172a, #334155)
 */

export const ORDER_EMAIL_STATUSES = [
    { key: 'PLACED', label: 'Order Placed', color: '#0284c7', bg: '#e0f2fe', icon: '🛍️' },
    { key: 'AWAITING_PAYMENT', label: 'Awaiting Payment', color: '#d97706', bg: '#fef3c7', icon: '⏳' },
    { key: 'PAID', label: 'Payment Confirmed', color: '#16a34a', bg: '#dcfce7', icon: '💳' },
    { key: 'PACKING', label: 'Packing & Inspection', color: '#7c3aed', bg: '#ede9fe', icon: '🎁' },
    { key: 'SHIPPED', label: 'Shipped / Dispatched', color: '#2563eb', bg: '#dbeafe', icon: '🚚' },
    { key: 'DELIVERED', label: 'Delivered', color: '#15803d', bg: '#dcfce7', icon: '🎉' },
    { key: 'CANCELLED', label: 'Order Cancelled', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    { key: 'RETURN', label: 'Return / Exchange', color: '#ea580c', bg: '#ffedd5', icon: '🔄' },
    { key: 'REFUND', label: 'Refund Processed', color: '#0d9488', bg: '#ccfbf1', icon: '💰' }
];

export function getOrderEmailSubject({ order = {}, status = 'PLACED', shopName = 'Vaiyaaree Sarees' }) {
    const s = String(status || order.status || 'PLACED').toUpperCase();
    const invNo = order.invoice_no 
        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
        : `#${String(order.id || 'WEB-1001').replace(/^[A-Z]+-/, 'INV-')}`;

    switch (s) {
        case 'PLACED':
            return `Order Confirmed: ${invNo} — Thank you for choosing ${shopName}!`;
        case 'AWAITING_PAYMENT':
            return `Action Required: Complete Payment for Order ${invNo} | ${shopName}`;
        case 'PAID':
            return `Payment Successful: Order ${invNo} Confirmed | ${shopName}`;
        case 'PACKING':
            return `Packaging Update: Your sarees in Order ${invNo} are being prepared!`;
        case 'SHIPPED':
            return `Order Shipped: ${invNo} is on its way! Track your package`;
        case 'DELIVERED':
            return `Delivered: Your ${shopName} order ${invNo} has arrived! ✨`;
        case 'CANCELLED':
            return `Order Cancelled: Update regarding Order ${invNo} | ${shopName}`;
        case 'RETURN':
            return `Return Update: Regarding your request for Order ${invNo}`;
        case 'REFUND':
            return `Refund Processed: ₹${Number(order.total_amount || 0).toLocaleString('en-IN')} credited for Order ${invNo}`;
        default:
            return `Order Update: ${invNo} | ${shopName}`;
    }
}

export function getStatusConfig(status, order = {}) {
    const s = String(status || order.status || 'PLACED').toUpperCase();
    const invNo = order.invoice_no || order.id || 'INV-001';
    const amountStr = `₹${Number(order.total_amount || 0).toLocaleString('en-IN')}`;

    switch (s) {
        case 'PLACED':
            return {
                title: 'Order Confirmed!',
                subtitle: 'We have received your saree order and are reviewing it for fulfillment.',
                heroBadge: 'ORDER PLACED',
                badgeBg: '#e0f2fe',
                badgeColor: '#0284c7',
                timelineStep: 0,
                bannerNote: `Thank you for shopping with Vaiyaaree! Your order <strong>${invNo}</strong> is being processed with the utmost care.`,
                ctaLabel: 'View Order Status',
                ctaUrlSuffix: `profile/orders/${order.id || ''}`
            };
        case 'AWAITING_PAYMENT':
            return {
                title: 'Complete Your Payment',
                subtitle: `Your order is reserved. Please complete payment of ${amountStr} to initiate dispatch.`,
                heroBadge: 'PAYMENT PENDING',
                badgeBg: '#fef3c7',
                badgeColor: '#b45309',
                timelineStep: 0,
                bannerNote: 'Your selected handcrafted sarees are on hold. Complete your secure online transaction to avoid automatic cancellation.',
                ctaLabel: 'Pay Now via Razorpay',
                ctaUrlSuffix: `pay/${order.id || ''}`
            };
        case 'PAID':
            return {
                title: 'Payment Received & Verified!',
                subtitle: `We have confirmed your payment of ${amountStr}. Your order is now in our fulfillment queue.`,
                heroBadge: 'PAID & CONFIRMED',
                badgeBg: '#dcfce7',
                badgeColor: '#15803d',
                timelineStep: 1,
                bannerNote: 'Your payment was successfully processed. Our saree artisans and specialists are readying your package.',
                ctaLabel: 'Track Order',
                ctaUrlSuffix: `profile/orders/${order.id || ''}`
            };
        case 'PACKING':
            return {
                title: 'Packaging & Quality Check',
                subtitle: 'Your sarees are undergoing quality inspection and luxury gift packaging.',
                heroBadge: 'PACKING IN PROGRESS',
                badgeBg: '#ede9fe',
                badgeColor: '#6d28d9',
                timelineStep: 1,
                bannerNote: 'Every saree is steam-pressed, carefully folded in protective packaging, and boxed for safe transit.',
                ctaLabel: 'View Order Details',
                ctaUrlSuffix: `profile/orders/${order.id || ''}`
            };
        case 'SHIPPED':
            return {
                title: 'Your Order Has Shipped!',
                subtitle: `Dispatched via ${order.courier_name || 'BlueDart / Delhivery'}. Tracking: ${order.tracking_number || 'Live Tracking Available'}`,
                heroBadge: 'OUT FOR DELIVERY / SHIPPED',
                badgeBg: '#dbeafe',
                badgeColor: '#1d4ed8',
                timelineStep: 2,
                bannerNote: `Your package has left our fulfillment hub. Track your shipment live using the link below.`,
                ctaLabel: 'Track Live Shipment',
                ctaUrlSuffix: order.tracking_url || `profile/orders/${order.id || ''}`
            };
        case 'DELIVERED':
            return {
                title: 'Package Delivered!',
                subtitle: 'Your Vaiyaaree saree package has been delivered. We hope you love your collection!',
                heroBadge: 'DELIVERED',
                badgeBg: '#dcfce7',
                badgeColor: '#15803d',
                timelineStep: 3,
                bannerNote: 'We hope your new sarees bring elegance and joy. If you have any questions or feedback, our support team is always here for you.',
                ctaLabel: 'Share Feedback / View Order',
                ctaUrlSuffix: `profile/orders/${order.id || ''}`
            };
        case 'CANCELLED':
            return {
                title: 'Order Cancelled',
                subtitle: `Order ${invNo} has been cancelled as requested.`,
                heroBadge: 'CANCELLED',
                badgeBg: '#fee2e2',
                badgeColor: '#dc2626',
                timelineStep: -1,
                bannerNote: `If this was a pre-paid order, a full refund of <strong>${amountStr}</strong> has been initiated back to your original payment method.`,
                ctaLabel: 'Visit Store',
                ctaUrlSuffix: 'shop'
            };
        case 'RETURN':
            return {
                title: 'Return / Replacement Initiated',
                subtitle: `We have processed your return request for Order ${invNo}.`,
                heroBadge: 'RETURN IN TRANSIT',
                badgeBg: '#ffedd5',
                badgeColor: '#ea580c',
                timelineStep: -1,
                bannerNote: 'Our courier partner will pick up the package from your delivery address within 2-3 business days. Please keep original tags intact.',
                ctaLabel: 'Check Return Status',
                ctaUrlSuffix: 'profile?tab=return'
            };
        case 'REFUND':
            return {
                title: 'Refund Processed Successfully!',
                subtitle: `An amount of ${amountStr} has been refunded to your original payment account.`,
                heroBadge: 'REFUND COMPLETED',
                badgeBg: '#ccfbf1',
                badgeColor: '#0f766e',
                timelineStep: -1,
                bannerNote: 'The refund has been executed via Razorpay / Bank Transfer. Depending on your bank, it usually reflects in your account within 2-5 business days.',
                ctaLabel: 'View Account Details',
                ctaUrlSuffix: 'profile?tab=refund'
            };
        default:
            return {
                title: 'Order Update',
                subtitle: `Status update regarding your order ${invNo}.`,
                heroBadge: s,
                badgeBg: '#e2e8f0',
                badgeColor: '#475569',
                timelineStep: 0,
                bannerNote: `Here are the latest updates for your order ${invNo}.`,
                ctaLabel: 'View Order',
                ctaUrlSuffix: `profile/orders/${order.id || ''}`
            };
    }
}

function parseAddr(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try { return JSON.parse(trimmed); } catch (e) { return { address: trimmed }; }
        }
        return { address: trimmed };
    }
    return null;
}

export function buildOrderStatusEmailHtml({
    order = {},
    status = 'PLACED',
    settings = {},
    baseUrl = 'https://vaiyaaree.com',
    customNotes = ''
}) {
    const effectiveStatus = String(status || order.status || 'PLACED').toUpperCase();
    const config = getStatusConfig(effectiveStatus, order);
    const shopName = settings.shop_name || 'Vaiyaaree Sarees';
    const shopPhone = settings.shop_phone || settings.business_phone || '8667793292';
    const shopEmail = settings.shop_email || 'vaiyaaree@gmail.com';
    const shopAddress = settings.shop_address || 'Salem Main Road, Komarapalayam, Namakkal, Tamil Nadu, 638183';

    const invoiceNo = order.invoice_no 
        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
        : `#${String(order.id || 'WEB-1001').replace(/^[A-Z]+-/, 'INV-')}`;

    const orderDateStr = order.created_at 
        ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Address Parsing
    const shippingObj = parseAddr(order.shipping_address) || parseAddr(order.billing_address) || {};
    const billingObj = parseAddr(order.billing_address) || shippingObj;

    const customerName = shippingObj.name || order.customer_name || 'Valued Customer';
    const customerPhone = shippingObj.phone || order.customer_phone || '';
    const customerAddressText = [
        shippingObj.address || order.delivery_address || '',
        shippingObj.city ? `${shippingObj.city} - ${shippingObj.pincode || ''}` : '',
        shippingObj.state ? `${shippingObj.state}${shippingObj.country ? `, ${shippingObj.country}` : ''}` : ''
    ].filter(Boolean).join('<br/>') || 'Address provided at checkout';

    // Financial Calculation
    const items = order.order_items || [];
    const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.price_at_time || it.price || 0) * (it.quantity || 1)), 0);
    const subtotal = Number(order.subtotal || itemsSubtotal || order.total_amount || 0);
    const totalDiscount = Number(order.total_discount || order.cart_discount || order.product_discount || order.coupon_discount || 0);
    const shippingCost = Number(order.shipping_cost || 0);
    const taxAmount = Number(order.tax_amount || 0);
    const grandTotal = Number(order.total_amount || (subtotal - totalDiscount + shippingCost + taxAmount));

    // Direct Target URLs
    const cleanBaseUrl = (baseUrl || 'https://vaiyaaree.com').replace(/\/$/, '');
    const ctaDirectUrl = config.ctaUrlSuffix?.startsWith('http') ? config.ctaUrlSuffix : `${cleanBaseUrl}/${config.ctaUrlSuffix}`;
    const invoicePdfUrl = `${cleanBaseUrl}/api/invoice/${order.id || 'sample'}?phone=${encodeURIComponent(customerPhone)}`;
    const whatsAppHelpUrl = `https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shopName}, I have a query about my order ${invoiceNo}.`)}`;

    // Generate Items HTML Rows
    const itemsRowsHtml = items.map((item, idx) => {
        const rawImg = item.image_url || item.products?.image_url || '';
        let imgUrl = rawImg ? rawImg.split(',')[0].trim() : '';
        if (!imgUrl && item.products?.images) {
            try {
                const parsed = typeof item.products.images === 'string' ? JSON.parse(item.products.images) : item.products.images;
                if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
            } catch (e) {}
        }
        if (!imgUrl) imgUrl = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80';

        const itemName = item.product_name || item.name || 'Pure Handloom Silk Saree';
        const variantName = item.variant_name || item.variant || '';
        const qty = item.quantity || 1;
        const unitPrice = Number(item.price_at_time || item.price || 0);
        const lineTotal = unitPrice * qty;

        return `
            <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            <td width="64" style="vertical-align: top; padding-right: 14px;">
                                <img src="${imgUrl}" alt="${itemName}" width="64" height="64" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #e2e8f0; display: block;" />
                            </td>
                            <td style="vertical-align: top;">
                                <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.35;">${itemName}</div>
                                ${variantName ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px; font-weight: 600;">Option: <span style="color: #475569; background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${variantName}</span></div>` : ''}
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Qty: <strong>${qty}</strong> × ₹${unitPrice.toLocaleString('en-IN')}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td align="right" style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 15px; font-weight: 800; color: #0f172a;">
                    ₹${lineTotal.toLocaleString('en-IN')}
                </td>
            </tr>
        `;
    }).join('');

    // 4-Stage Timeline Visual Indicator (for standard flow)
    let timelineHtml = '';
    if (config.timelineStep >= 0) {
        const steps = [
            { label: 'Placed', idx: 0 },
            { label: 'Confirmed', idx: 1 },
            { label: 'Shipped', idx: 2 },
            { label: 'Delivered', idx: 3 }
        ];

        timelineHtml = `
            <!-- TIMELINE PROGRESS BAR -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 26px 0; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 12px;">
                <tr>
                    <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                ${steps.map(step => {
                                    const isDone = step.idx <= config.timelineStep;
                                    const circleBg = isDone ? '#5d0821' : '#e2e8f0';
                                    const circleColor = isDone ? '#ffffff' : '#94a3b8';
                                    const textColor = isDone ? '#5d0821' : '#94a3b8';
                                    const fontWeight = isDone ? '800' : '600';

                                    return `
                                        <td align="center" style="vertical-align: top; width: 25%;">
                                            <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: ${circleBg}; color: ${circleColor}; font-size: 12px; font-weight: 800; margin: 0 auto 6px auto; text-align: center;">
                                                ${isDone ? '✓' : (step.idx + 1)}
                                            </div>
                                            <div style="font-size: 11px; font-weight: ${fontWeight}; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                                                ${step.label}
                                            </div>
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `;
    }

    // Tracking / Courier Card (Shipped Status)
    let trackingCardHtml = '';
    if (order.tracking_number || order.courier_name || effectiveStatus === 'SHIPPED') {
        trackingCardHtml = `
            <!-- COURIER & LIVE TRACKING CARD -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px 20px;">
                <tr>
                    <td>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td>
                                    <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">🚚 LOGISTICS & LIVE TRACKING</div>
                                    <div style="font-size: 15px; font-weight: 800; color: #14532d;">
                                        ${order.courier_name || 'BlueDart / Delhivery'} — <span style="font-family: monospace; background: #dcfce7; padding: 2px 8px; border-radius: 4px;">${order.tracking_number || 'AWB-PENDING'}</span>
                                    </div>
                                </td>
                                ${order.tracking_url ? `
                                <td align="right" style="vertical-align: middle;">
                                    <a href="${order.tracking_url}" target="_blank" style="background: #15803d; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; display: inline-block;">
                                        Track Carrier &rarr;
                                    </a>
                                </td>` : ''}
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `;
    }

    return `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>${config.title} - ${shopName}</title>
            <style type="text/css">
                body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
                table { border-collapse: collapse; }
                img { border: 0; outline: none; text-decoration: none; }
                @media only screen and (max-width: 620px) {
                    .email-wrapper { padding: 10px !important; width: 100% !important; }
                    .email-inner { padding: 20px 16px !important; }
                    .header-title { font-size: 20px !important; }
                    .hero-title { font-size: 20px !important; }
                    .stack-mobile { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6f8;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f6f8; padding: 35px 12px;">
                <tr>
                    <td align="center">
                        <!-- MAIN CONTAINER CARD -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); overflow: hidden;">
                            
                            <!-- 1. LUXURY TOP BRAND BANNER -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #5d0821 0%, #3e0516 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid #dfaa5b;">
                                    <div style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                                        ${shopName}
                                    </div>
                                    <div style="font-size: 11px; color: #f3e5c8; text-transform: uppercase; letter-spacing: 3px; margin-top: 4px; font-weight: 600;">
                                        Pure Handloom & Designer Saree Studio
                                    </div>
                                </td>
                            </tr>

                            <!-- 2. STATUS HERO & GREETING BANNER -->
                            <tr>
                                <td class="email-inner" style="padding: 30px 28px 20px 28px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td>
                                                <div style="display: inline-block; background-color: ${config.badgeBg}; color: ${config.badgeColor}; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                                                    ${config.heroBadge}
                                                </div>
                                                <h2 class="hero-title" style="margin: 0 0 6px 0; font-size: 23px; font-weight: 900; color: #0f172a; line-height: 1.3;">
                                                    ${config.title}
                                                </h2>
                                                <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.55;">
                                                    Hello <strong>${customerName}</strong>, ${config.subtitle}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- TIMELINE (IF APPLICABLE) -->
                                    ${timelineHtml}

                                    <!-- NOTICE BOX -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fafbfc; border-left: 4px solid #5d0821; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                                        <tr>
                                            <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                                                ${config.bannerNote}
                                                ${customNotes ? `<div style="margin-top: 6px; font-weight: 600; color: #5d0821;">${customNotes}</div>` : ''}
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- TRACKING DETAILS IF SHIPPED -->
                                    ${trackingCardHtml}

                                    <!-- 3. ORDER OVERVIEW META CARD -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 24px;">
                                        <tr>
                                            <td width="50%" class="stack-mobile" style="vertical-align: top;">
                                                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">ORDER REFERENCE</div>
                                                <div style="font-size: 16px; font-weight: 900; color: #5d0821; font-family: monospace, sans-serif; margin-top: 2px;">${invoiceNo}</div>
                                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Placed: ${orderDateStr}</div>
                                            </td>
                                            <td width="50%" class="stack-mobile" style="vertical-align: top; text-align: right;">
                                                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">PAYMENT METHOD</div>
                                                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${order.payment_method || 'Online Razorpay / UPI'}</div>
                                                <div style="font-size: 12px; font-weight: 700; color: ${order.payment_status === 'PAID' ? '#16a34a' : '#d97706'}; margin-top: 2px;">
                                                    ${order.payment_status || 'PENDING'}
                                                </div>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- 4. ORDERED ITEMS TABLE -->
                                    <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
                                        ORDERED ITEMS (${items.length})
                                    </div>
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                                        ${itemsRowsHtml}
                                    </table>

                                    <!-- 5. FINANCIAL SUMMARY CARD -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
                                        <tr>
                                            <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Items Subtotal</td>
                                            <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">₹${subtotal.toLocaleString('en-IN')}.00</td>
                                        </tr>
                                        ${totalDiscount > 0 ? `
                                        <tr>
                                            <td style="padding: 4px 0; font-size: 13px; color: #16a34a; font-weight: 700;">Offers & Discounts Applied</td>
                                            <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #16a34a;">-₹${totalDiscount.toLocaleString('en-IN')}.00</td>
                                        </tr>` : ''}
                                        <tr>
                                            <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Shipping & Delivery</td>
                                            <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 700; color: ${shippingCost === 0 ? '#16a34a' : '#0f172a'};">
                                                ${shippingCost === 0 ? 'FREE' : `₹${shippingCost.toLocaleString('en-IN')}.00`}
                                            </td>
                                        </tr>
                                        ${taxAmount > 0 ? `
                                        <tr>
                                            <td style="padding: 4px 0; font-size: 13px; color: #64748b;">GST Tax</td>
                                            <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">₹${taxAmount.toLocaleString('en-IN')}.00</td>
                                        </tr>` : ''}
                                        <tr>
                                            <td style="padding: 12px 0 0 0; border-top: 1px solid #e2e8f0; font-size: 16px; font-weight: 900; color: #0f172a;">
                                                Total Paid / Payable
                                            </td>
                                            <td align="right" style="padding: 12px 0 0 0; border-top: 1px solid #e2e8f0; font-size: 18px; font-weight: 900; color: #5d0821;">
                                                ₹${grandTotal.toLocaleString('en-IN')}.00
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- 6. DELIVERY ADDRESS CARD -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                                        <tr>
                                            <td>
                                                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">📍 DELIVERY ADDRESS</div>
                                                <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${customerName}</div>
                                                <div style="font-size: 13px; color: #334155; line-height: 1.5; margin-top: 3px;">
                                                    ${customerAddressText}
                                                </div>
                                                ${customerPhone ? `<div style="font-size: 13px; color: #64748b; margin-top: 6px;">Phone: <strong>${customerPhone}</strong></div>` : ''}
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- 7. PRIMARY CALL-TO-ACTION BUTTON -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                                        <tr>
                                            <td align="center">
                                                <a href="${ctaDirectUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #5d0821, #400516); color: #ffffff; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 6px 18px rgba(93, 8, 33, 0.28);">
                                                    ${config.ctaLabel} &rarr;
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- 8. ATTACHMENT & WHATSAPP SUPPORT PILL -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px dashed #cbd5e1; margin-bottom: 10px;">
                                        <tr>
                                            <td align="center" style="font-size: 13px; color: #475569;">
                                                📄 <strong>Tax Invoice PDF:</strong> Attached to this email for your accounting records.
                                                <br/>
                                                💬 Need instant help? <a href="${whatsAppHelpUrl}" target="_blank" style="color: #15803d; font-weight: 700; text-decoration: underline;">Chat with us on WhatsApp</a>
                                            </td>
                                        </tr>
                                    </table>

                                </td>
                            </tr>

                            <!-- 9. LUXURY FOOTER -->
                            <tr>
                                <td style="background-color: #fdfbf7; border-top: 1px solid #f0e6d2; padding: 24px; text-align: center;">
                                    <div style="font-size: 14px; font-weight: 800; color: #5d0821; text-transform: uppercase; letter-spacing: 1px;">
                                        ${shopName}
                                    </div>
                                    <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                                        ${shopAddress}
                                    </div>
                                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                        Email: <a href="mailto:${shopEmail}" style="color: #5d0821; font-weight: 700; text-decoration: none;">${shopEmail}</a> | Phone: <strong style="color: #0f172a;">+91 ${shopPhone}</strong>
                                    </div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 14px; border-top: 1px solid #f0e6d2; padding-top: 12px;">
                                        &copy; ${new Date().getFullYear()} ${shopName}. All rights reserved. Handcrafted with pride in India.
                                    </div>
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

export function getSampleDemoOrder(status = 'PLACED') {
    return {
        id: 'WEB-1042',
        invoice_no: 'INV-1042',
        created_at: new Date().toISOString(),
        status: status || 'PLACED',
        customer_name: 'Priya Sundaram',
        customer_email: 'customer@example.com',
        customer_phone: '9876543210',
        payment_method: 'Razorpay (UPI / Card)',
        payment_status: ['PLACED', 'AWAITING_PAYMENT'].includes(status) ? 'PENDING' : 'PAID',
        courier_name: 'BlueDart Express',
        tracking_number: 'BD-884920194IN',
        tracking_url: 'https://www.bluedart.com',
        subtotal: 7800,
        total_discount: 1560,
        shipping_cost: 0,
        tax_amount: 312,
        total_amount: 6552,
        shipping_address: JSON.stringify({
            name: 'Priya Sundaram',
            phone: '9876543210',
            address: 'Flat 402, Royal Palms Residency, Anna Nagar',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600040',
            country: 'India'
        }),
        billing_address: JSON.stringify({
            name: 'Priya Sundaram',
            phone: '9876543210',
            address: 'Flat 402, Royal Palms Residency, Anna Nagar',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600040',
            country: 'India'
        }),
        order_items: [
            {
                id: 'item_1',
                product_name: 'Kanjivaram Pure Silk Saree with Rich Zari Pallu',
                variant_name: 'Royal Maroon & Gold Zari',
                quantity: 1,
                price_at_time: 4800,
                image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'
            },
            {
                id: 'item_2',
                product_name: 'Blended South Cotton Saree with Readymade Blouse',
                variant_name: 'Emerald Green / Size 38',
                quantity: 1,
                price_at_time: 3000,
                image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80'
            }
        ]
    };
}
