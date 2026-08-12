import nodemailer from 'nodemailer';
import { supabase } from './supabaseClient';
import { generateOrderPDFBuffer } from '@/app/api/invoice/[orderId]/route';


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
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price_at_time || item.price || 0).toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${((item.price_at_time || item.price || 0) * item.quantity).toLocaleString()}</td>
        </tr>`
    ).join('') || '';

    // Calculate subtotal if missing or zero
    const calculatedSubtotal = order.order_items?.reduce((sum, item) => sum + ((item.price_at_time || item.price || 0) * (item.quantity || 1)), 0) || 0;
    const subtotal = order.subtotal || order.sub_total || calculatedSubtotal;
    const shipping = order.shipping_cost || order.shipping_amount || order.shipping || 0;
    const totalTax = order.tax_amount || ((order.cgst || 0) + (order.sgst || 0) + (order.igst || 0));

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');
    const invoiceUrl = `${baseUrl}/api/invoice/${order.id}`;
    const orderUrl = `${baseUrl}/order-confirmation?orderId=${order.id}`;

    let { data: logoSetting } = await supabase.from('app_settings').select('value').eq('key', 'shop_logo').single();
    let shopLogo = logoSetting?.value || '';

    // Ensure shopLogo is an absolute URL for email clients
    // We prefer the Vercel URL for images because ngrok blocks Gmail's image proxy
    const assetBaseUrl = 'https://aiswaryasaree.vercel.app';

    if (shopLogo && !shopLogo.startsWith('http')) {
        let logoPath = shopLogo;
        if (!shopLogo.startsWith('/')) {
            logoPath = '/images/' + shopLogo;
        }
        shopLogo = assetBaseUrl + logoPath;
    }

    // Fetch settings for the PDF
    let settings = {
        shop_name: 'Cast Printz',
        shop_phone: '7558189732',
        shop_email: 'castprintzofficial@gmail.com',
        shop_address: 'Premium Saree Collections',
        shop_gstin: '',
        bill_terms: 'All sales are final. Returns accepted within 7 days of delivery.',
        bill_footer: 'Thank you for shopping with Cast Printz!'
    };

    try {
        const { data: settingsData } = await supabase.from('app_settings').select('*');
        if (settingsData) {
            settingsData.forEach(item => {
                if (item.key === 'shop_name') settings.shop_name = item.value;
                if (item.key === 'business_phone' || item.key === 'shop_phone') settings.shop_phone = item.value;
                if (item.key === 'shop_email') settings.shop_email = item.value;
                if (item.key === 'shop_address') settings.shop_address = item.value;
                if (item.key === 'shop_gstin') settings.shop_gstin = item.value;
                if (item.key === 'bill_terms') settings.bill_terms = item.value;
                if (item.key === 'bill_footer') settings.bill_footer = item.value;
            });
        }
    } catch (err) {
        console.error('Settings fetch error:', err);
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz" <orders@castprintz.com>',
        to: order.customer_email || order.customer_phone,
        subject: `Order Confirmation - ${order.id}`,
        attachments: [],
        html: `
            <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
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
                            <span>₹${subtotal.toLocaleString()}</span>
                        </div>
                        ${order.cgst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>CGST (2.5%):</span><span>₹${order.cgst.toLocaleString()}</span></div>` : ''}
                        ${order.sgst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>SGST (2.5%):</span><span>₹${order.sgst.toLocaleString()}</span></div>` : ''}
                        ${order.igst ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;"><span>IGST (5%):</span><span>₹${order.igst.toLocaleString()}</span></div>` : ''}
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Shipping:</span>
                            <span>₹${shipping.toLocaleString()}</span>
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

                </div>
            </div>
        `
    };

    // Attach High-Quality PDF Invoice
    try {
        const pdfBuffer = await generateOrderPDFBuffer(order, settings);
        if (pdfBuffer) {
            mailOptions.attachments.push({
                filename: `Invoice_${order.id}.pdf`,
                content: pdfBuffer
            });
        }
    } catch (pdfErr) {
        console.error('Failed to generate PDF attachment:', pdfErr);
    }

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

export async function sendOrderStatusEmail(order, status, specificEmails = null) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return { success: true };

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

    let { data: logoSetting } = await supabase.from('app_settings').select('value').eq('key', 'shop_logo').single();
    let shopLogo = logoSetting?.value || '';

    // Ensure shopLogo is an absolute URL for email clients
    const assetBaseUrl = 'https://aiswaryasaree.vercel.app';
    if (shopLogo && !shopLogo.startsWith('http')) {
        let logoPath = shopLogo;
        if (!shopLogo.startsWith('/')) {
            logoPath = '/images/' + shopLogo;
        }
        shopLogo = assetBaseUrl + logoPath;
    }

    const statusConfig = {
        'PAID': { title: 'Payment Confirmed', body: 'We have received your payment for order #' + order.id + '. Your order is being processed.' },
        'PACKING': { title: 'Order Packing', body: 'Great news! We are currently packing your items for order #' + order.id + '.' },
        'SHIPPED': { title: 'Order Shipped!', body: 'Your order #' + order.id + ' is on its way!' + (order.courier_name ? ` (via ${order.courier_name})` : '') },
        'DELIVERED': { title: 'Order Delivered', body: 'Your order #' + order.id + ' has been delivered successfully. Enjoy your new saree!' },
        'CANCELLED': { title: 'Order Cancelled', body: 'Your order #' + order.id + ' has been cancelled.' }
    };

    const config = statusConfig[status] || { title: `Order Update: ${status}`, body: `Your order #${order.id} status has been updated to: ${status}` };
    const orderUrl = `${baseUrl}/order-confirmation?orderId=${order.id}`;

    const toEmails = specificEmails ? Array.from(specificEmails).join(',') : (order.customer_email || order.customer_phone);
    if (!toEmails || toEmails.indexOf('@') === -1) return { success: true };
    
    // Fetch settings for PDF branding
    let settingsUI = {
        shop_name: 'Cast Printz',
        shop_phone: '7558189732',
        shop_email: 'castprintzofficial@gmail.com',
        shop_address: 'Premium Saree Collections',
        shop_gstin: '',
        bill_terms: 'All sales are final. Returns accepted within 7 days of delivery.',
        bill_footer: 'Thank you for shopping with Cast Printz!'
    };

    try {
        const { data: settingsData } = await supabase.from('app_settings').select('*');
        if (settingsData) {
            settingsData.forEach(item => {
                if (item.key === 'shop_name') settingsUI.shop_name = item.value;
                if (item.key === 'business_phone' || item.key === 'shop_phone') settingsUI.shop_phone = item.value;
                if (item.key === 'shop_email') settingsUI.shop_email = item.value;
                if (item.key === 'shop_address') settingsUI.shop_address = item.value;
                if (item.key === 'shop_gstin') settingsUI.shop_gstin = item.value;
                if (item.key === 'bill_terms') settingsUI.bill_terms = item.value;
                if (item.key === 'bill_footer') settingsUI.bill_footer = item.value;
            });
        }
    } catch (err) {
        console.error('Settings fetch error:', err);
    }

    const shipping = order.shipping_cost || order.shipping_amount || order.shipping || 0;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz" <orders@castprintz.com>',
        to: toEmails,
        subject: `${config.title} - ${order.id}`,
        attachments: [],
        html: `
            <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    ${shopLogo ? `<img src="${shopLogo}" alt="Cast Printz" style="max-height: 80px; margin-bottom: 20px;">` : ''}
                    <h2 style="color: #333; margin-bottom: 15px;">${config.title}</h2>
                    <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">${config.body}</p>
                    
                    ${order.tracking_number ? `
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                        <p style="margin: 5px 0;"><strong>Carrier:</strong> ${order.courier_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${order.tracking_number}</p>
                    </div>` : ''}

                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                        <p style="margin: 5px 0; display: flex; justify-content: space-between;"><strong>Order ID:</strong> <span>#${order.id}</span></p>
                        <p style="margin: 5px 0; display: flex; justify-content: space-between;"><strong>Total Amount:</strong> <span>₹${(order.total_amount || 0).toLocaleString()}</span></p>
                        <p style="margin: 5px 0; display: flex; justify-content: space-between;"><strong>Shipping:</strong> <span>₹${shipping.toLocaleString()}</span></p>
                    </div>

                </div>
            </div>
        `
    };

    // Attach PDF Invoice for Status emails too
    try {
        const pdfBuffer = await generateOrderPDFBuffer(order, settingsUI);
        if (pdfBuffer) {
            mailOptions.attachments.push({
                filename: `Invoice_${order.id}.pdf`,
                content: pdfBuffer
            });
        }
    } catch (pdfErr) {
        console.error('Failed to generate PDF attachment for status email:', pdfErr);
    }

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Status Email Error:', error);
        return { success: false, error };
    }
}

export async function sendAdminPasswordResetOTP(toEmail, otp) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[ADMIN-OTP-DEV] SMTP not configured. Verification OTP for ${toEmail} is: ${otp}`);
        return { success: true, message: 'SMTP not configured. OTP logged to server logs.' };
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz Security" <security@castprintz.com>',
        to: toEmail,
        subject: `Password Reset Verification Code - Cast Printz Admin`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
                <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔐</div>
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Admin Password Reset</h2>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">We received a request to reset your Cast Printz Admin Password. Use the verification OTP below to proceed:</p>
                    <div style="background: #f1f5f9; padding: 16px 28px; border-radius: 10px; display: inline-block; margin: 20px 0; border: 1px dashed #cbd5e1;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('[ADMIN-OTP-ERROR] Failed to send email:', error);
        throw error;
    }
}

export async function sendAdminPasswordResetSuccessEmail(toEmail) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[ADMIN-OTP-DEV] Password reset notification logged for ${toEmail}`);
        return { success: true };
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Cast Printz Security" <security@castprintz.com>',
        to: toEmail,
        subject: `Your Admin Password Was Reset - Cast Printz`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
                <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Password Reset Successful</h2>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">Your Cast Printz Admin password has been updated successfully on <strong>${new Date().toLocaleString('en-IN')}</strong>.</p>
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">If you did not perform this change, please contact system administration immediately.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('[ADMIN-OTP-SUCCESS-ERROR] Failed to send email:', error);
        return { success: false };
    }
}
