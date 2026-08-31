import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { mysqlClient } from './mysqlClient.js';
import { generateInvoicePDF, generateOrderPDFBuffer } from './invoiceGenerator.js';
import { getDiscountDetails } from './discountHelper.js';

export function getCleanBaseUrl() {
    let url = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!url || url.includes('trycloudflare.com') || url.includes('loca.lt') || url.includes('ngrok')) {
        url = process.env.NODE_ENV === 'production' ? 'https://vaiyaaree.com' : 'http://localhost:3000';
    }
    return url.replace(/\/$/, '');
}

// Helper to get local Vaiyaaree logo attachment
function getLogoAttachment() {
    try {
        const candidates = [
            path.join(process.cwd(), 'public', 'images', 'vaiyaaree-email-logo.jpg'),
            path.join(process.cwd(), 'public', 'images', 'vaiyaaree-logo.png'),
            path.join(process.cwd(), 'public', 'logo.png'),
            path.join(process.cwd(), 'public', 'images', 'logo.png')
        ];
        for (const logoPath of candidates) {
            if (fs.existsSync(logoPath)) {
                const ext = path.extname(logoPath).toLowerCase();
                return {
                    filename: path.basename(logoPath),
                    path: logoPath,
                    cid: 'vaiyaaree_email_logo_cid',
                    contentDisposition: 'inline',
                    contentType: ext === '.png' ? 'image/png' : 'image/jpeg'
                };
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
}

import { getTransporter, getSmtpConfig, verifySmtpConnection } from './emailTransporter.js';
export { getSmtpConfig, verifySmtpConnection };

export async function sendEmail({ to, subject, html, attachments = [] }) {
    let resultStatus = 'SENT';
    let messageId = null;
    let errorMessage = null;

    const { transporter, config } = await getTransporter();

    if (!transporter || !config.user || !config.pass) {
        console.log(`[EMAIL-SERVICE] Logging mode (SMTP credentials not configured) ΓÇö To: ${to}, Subject: ${subject}`);
        resultStatus = 'LOGGED_ONLY';
    } else {
        try {
            const info = await transporter.sendMail({
                from: config.from || `"Vaiyaaree Sarees" <${config.user}>`,
                to,
                subject,
                html,
                attachments: attachments // ONLY the PDF attachment!
            });
            messageId = info.messageId;
        } catch (err) {
            console.error('[EMAIL-SERVICE] Error sending email:', err);
            resultStatus = 'FAILED';
            if (err.message && (err.message.includes('535') || err.message.includes('BadCredentials') || err.code === 'EAUTH')) {
                errorMessage = `SMTP Auth Failed (535 Bad Credentials). If using Gmail, ensure 2-Step Verification is enabled and use a 16-character App Password generated at https://myaccount.google.com/apppasswords. Original error: ${err.message}`;
            } else {
                errorMessage = err.message;
            }
        }
    }

    // Log record directly into MySQL email_logs table
    try {
        const { default: pool } = await import('./mysql.js');
        const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await pool.execute(
            `INSERT INTO email_logs (id, recipient_email, subject, status, message_id, error_message, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [logId, to, subject, resultStatus, messageId, errorMessage]
        );
    } catch (dbErr) {
        console.error('[EMAIL-SERVICE-DB-LOG-ERROR]', dbErr);
    }

    return { success: resultStatus === 'SENT', messageId, error: errorMessage, status: resultStatus };
}

// Helper for Status Badge HTML (Pure HTML inline styles)
function getStatusBadgeHtml(status) {
    const s = (status || '').toUpperCase();
    let bg = '#e2e8f0';
    let color = '#475569';

    if (['PLACED', 'CONFIRMED'].includes(s)) {
        bg = '#d1fae5';
        color = '#047857';
    } else if (['PAID'].includes(s)) {
        bg = '#e0f2fe';
        color = '#0284c7';
    } else if (['PACKING'].includes(s)) {
        bg = '#ede9fe';
        color = '#6d28d9';
    } else if (['SHIPPED'].includes(s)) {
        bg = '#dbeafe';
        color = '#1d4ed8';
    } else if (['DELIVERED'].includes(s)) {
        bg = '#dcfce7';
        color = '#15803d';
    } else if (['CANCELLED'].includes(s)) {
        bg = '#fee2e2';
        color = '#b91c1c';
    }

    return `<span style="display: inline-block; background-color: ${bg}; color: ${color}; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${status || 'N/A'}</span>`;
}

// Helper for Standard HTML Email Header with "Vaiyaaree Sarees" Title
function getHeaderHtml(title = 'Vaiyaaree Sarees', shopLogo = '', subtitle = 'Premium Saree Collections') {
    return `
        <!-- HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #5d0821 0%, #3e0516 100%); border-top-left-radius: 12px; border-top-right-radius: 12px; border-bottom: 2px solid #dfaa5b;">
            <tr>
                <td style="padding: 28px 20px; text-align: center;">
                    <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
                        <img src="cid:vaiyaaree_email_logo_cid" alt="Vaiyaaree Sarees" style="max-height: 54px; width: auto; display: block; margin: 0 auto;" />
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; font-family: 'Outfit', Arial, sans-serif; letter-spacing: 0.5px;">${title}</h1>
                    ${subtitle ? `<p style="color: #f3e5c8; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${subtitle}</p>` : ''}
                </td>
            </tr>
        </table>
    `;
}

// Helper for Standard HTML Email Footer
function getFooterHtml(settings = {}) {
    const shopName = settings.shop_name || 'Vaiyaaree Sarees';
    const shopPhone = settings.shop_phone || '8667793292';
    const shopEmail = settings.shop_email || 'vaiyaaree@gmail.com';
    const shopAddress = settings.shop_address || 'Premium Saree Collections';
    const billTerms = settings.bill_terms || 'All sales are final. Returns accepted within 7 days of delivery.';

    return `
        <!-- FOOTER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fdfbf7; border-top: 1px solid #f0e6d2; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
            <tr>
                <td style="padding: 24px 20px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #64748b; line-height: 1.6;">
                    <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 15px; color: #1e293b;">${shopName}</p>
                    <p style="margin: 0 0 10px 0;">${shopAddress}</p>
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">${billTerms}</p>
                    <div style="border-top: 1px solid #e2e8f0; margin: 12px auto; width: 80%;"></div>
                    <p style="margin: 0 0 6px 0;">
                        Need help? Contact us: 
                        <a href="mailto:${shopEmail}" style="color: #5d0821; font-weight: 600; text-decoration: none;">${shopEmail}</a> | 
                        <a href="tel:${shopPhone}" style="color: #5d0821; font-weight: 600; text-decoration: none;">+91 ${shopPhone}</a>
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
                </td>
            </tr>
        </table>
    `;
}

// Helper for formatting addresses
function formatAddress(addr, defaultName = '') {
    if (!addr) return defaultName ? `<strong>${defaultName}</strong>` : '';
    if (typeof addr === 'string') return addr.replace(/\n/g, '<br/>');

    const name = addr.name || addr.full_name || addr.customer_name || defaultName;
    const line1 = addr.address || addr.address_line1 || addr.line1 || '';
    const line2 = addr.address_line2 || addr.line2 || '';
    const city = addr.city || '';
    const state = addr.state || '';
    const pincode = addr.pincode || addr.postal_code || addr.zip || '';
    const phone = addr.phone || addr.mobile || addr.contact || '';

    const lines = [];
    if (name) lines.push(`<strong>${name}</strong>`);
    if (line1) lines.push(line1);
    if (line2) lines.push(line2);

    const cityStateZip = [city, state, pincode].filter(Boolean).join(', ');
    if (cityStateZip) lines.push(cityStateZip);
    if (phone) lines.push(`Phone: +91 ${phone}`);

    return lines.join('<br/>');
}
import { buildOrderStatusEmailHtml, getOrderEmailSubject } from './orderEmailTemplates.js';

export async function sendOrderStatusEmail(order, status = 'PLACED', specificEmails = null, customNotes = '') {
    if (!order) return { success: false, error: 'No order provided' };

    const effectiveStatus = String(status || order.status || 'PLACED').toUpperCase();
    const recipientEmail = specificEmails ? Array.from(specificEmails).join(',') : (order.customer_email || order.billing_email);

    if (!recipientEmail || recipientEmail.indexOf('@') === -1) {
        console.log(`[EMAIL-SERVICE] No valid customer email for order ${order.id}. Skipping email.`);
        return { success: true, message: 'No valid recipient email' };
    }

    const baseUrl = getCleanBaseUrl();

    // Fetch store branding settings
    let settings = {
        shop_name: 'Vaiyaaree Sarees',
        shop_phone: '8667793292',
        shop_email: 'vaiyaaree@gmail.com',
        shop_address: 'Salem Main Road, Komarapalayam, Namakkal, Tamil Nadu, 638183'
    };

    try {
        const { data: settingsData } = await mysqlClient.from('app_settings').select('*');
        if (settingsData) {
            settingsData.forEach(item => {
                if (item.key === 'shop_name') settings.shop_name = item.value;
                if (item.key === 'business_phone' || item.key === 'shop_phone') settings.shop_phone = item.value;
                if (item.key === 'shop_email') settings.shop_email = item.value;
                if (item.key === 'shop_address') settings.shop_address = item.value;
            });
        }
    } catch (err) {
        console.error('Settings fetch error for email:', err);
    }

    const subject = getOrderEmailSubject({ order, status: effectiveStatus, shopName: settings.shop_name });
    const html = buildOrderStatusEmailHtml({
        order,
        status: effectiveStatus,
        settings,
        baseUrl,
        customNotes
    });

    const attachments = [];

    // Automatically generate and attach pre-built PDF Tax Invoice for customer
    try {
        const pdfBuffer = await generateOrderPDFBuffer(order, settings);
        if (pdfBuffer) {
            const cleanInv = order.invoice_no 
                ? order.invoice_no.replace(/^#/, '') 
                : String(order.id).replace(/^[A-Z]+-/, 'INV-');
            attachments.push({
                filename: `Invoice_${cleanInv}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });
        }
    } catch (pdfErr) {
        console.error('[EMAIL-SERVICE] Failed to generate PDF invoice attachment:', pdfErr);
    }

    return await sendEmail({
        to: recipientEmail,
        subject,
        html,
        attachments
    });
}

export async function sendOrderConfirmationEmail(order) {
    return await sendOrderStatusEmail(order, 'PLACED');
}

export async function sendAdminPasswordResetOTP(toEmail, otp) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[ADMIN-OTP-DEV] SMTP not configured. Verification OTP for ${toEmail} is: ${otp}`);
        return { success: true, message: 'SMTP not configured. OTP logged to server logs.' };
    }

    let { data: logoSetting } = await mysqlClient.from('app_settings').select('value').eq('key', 'shop_logo').single();
    let shopLogo = logoSetting?.value || '';
    const assetBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vaiyaaree.com');
    if (shopLogo && !shopLogo.startsWith('http')) {
        let logoPath = shopLogo;
        if (!shopLogo.startsWith('/')) {
            logoPath = '/images/' + shopLogo;
        }
        shopLogo = assetBaseUrl + logoPath;
    }

    const logoAtt = getLogoAttachment();
    const attachments = logoAtt ? [logoAtt] : [];

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Vaiyaaree Sarees Security" <security@vaiyaaree.com>',
        to: toEmail,
        subject: `Password Reset Verification Code | Vaiyaaree Sarees Admin`,
        attachments,
        html: `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>Admin Password Reset - Vaiyaaree Sarees</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Outfit', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 30px 10px;">
                    <tr>
                        <td align="center">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
                                <tr>
                                    <td>
                                        ${getHeaderHtml('Vaiyaaree Sarees Admin', shopLogo, 'Security & Authentication')}

                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 30px 24px; text-align: center;">
                                            <tr>
                                                <td>
                                                    <div style="font-size: 42px; margin-bottom: 12px;"></div>
                                                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Admin Password Reset</h2>
                                                    <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">We received a request to reset your Vaiyaaree Sarees Admin Password. Use the 6-digit verification code below to proceed:</p>

                                                    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px auto;">
                                                        <tr>
                                                            <td style="background-color: #fdfbf7; border: 2px dashed #e5c9ad; border-radius: 10px; padding: 16px 32px; text-align: center;">
                                                                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #5d0821; font-family: monospace;">${otp}</span>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <p style="color: #64748b; font-size: 13px; margin: 0;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.</p>
                                                </td>
                                            </tr>
                                        </table>

                                        ${getFooterHtml({ shop_name: 'Vaiyaaree Sarees Administration' })}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    };

    try {
        return await sendEmail({
            to: toEmail,
            subject: mailOptions.subject,
            html: mailOptions.html,
            attachments: mailOptions.attachments || []
        });
    } catch (error) {
        console.error('[ADMIN-OTP-ERROR] Failed to send email:', error);
        return { success: false, error: error.message };
    }
}

export async function sendAdminPasswordResetSuccessEmail(toEmail) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[ADMIN-OTP-DEV] Password reset notification logged for ${toEmail}`);
        return { success: true };
    }

    let { data: logoSetting } = await mysqlClient.from('app_settings').select('value').eq('key', 'shop_logo').single();
    let shopLogo = logoSetting?.value || '';
    const assetBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vaiyaaree.com');
    if (shopLogo && !shopLogo.startsWith('http')) {
        let logoPath = shopLogo;
        if (!shopLogo.startsWith('/')) {
            logoPath = '/images/' + shopLogo;
        }
        shopLogo = assetBaseUrl + logoPath;
    }

    const logoAtt = getLogoAttachment();
    const attachments = logoAtt ? [logoAtt] : [];

    const formattedDate = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Vaiyaaree Sarees Security" <security@vaiyaaree.com>',
        to: toEmail,
        subject: `Your Admin Password Was Reset | Vaiyaaree Sarees Admin`,
        attachments,
        html: `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>Password Reset Successful - Vaiyaaree Sarees</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Outfit', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 30px 10px;">
                    <tr>
                        <td align="center">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
                                <tr>
                                    <td>
                                        ${getHeaderHtml('Vaiyaaree Sarees Admin', shopLogo, 'Security & Authentication')}

                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 30px 24px; text-align: center;">
                                            <tr>
                                                <td>
                                                    <div style="font-size: 42px; margin-bottom: 12px;"></div>
                                                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Password Reset Successful</h2>
                                                    <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">Your Vaiyaaree Sarees Admin password was successfully updated on <strong>${formattedDate}</strong>.</p>
                                                    <p style="color: #64748b; font-size: 13px; margin: 0;">If you did not perform this change, please contact system administration immediately.</p>
                                                </td>
                                            </tr>
                                        </table>

                                        ${getFooterHtml({ shop_name: 'Vaiyaaree Sarees Administration' })}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    };

    try {
        return await sendEmail({
            to: toEmail,
            subject: mailOptions.subject,
            html: mailOptions.html,
            attachments: mailOptions.attachments || []
        });
    } catch (error) {
        console.error('[ADMIN-OTP-SUCCESS-ERROR] Failed to send email:', error);
        return { success: false, error: error.message };
    }
}

export async function sendReturnStatusEmail(returnReq, status, extraData = {}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EMAIL-SERVICE] Return Email Skipped (SMTP not configured) - Status: ${status}, Return ID: ${returnReq?.return_id || returnReq?.id}`);
        return { success: true, logged: true };
    }

    try {
        const recipientEmail = extraData.recipientEmail || extraData.email || returnReq.customers?.email || returnReq.orders?.customer_email;
        if (!recipientEmail || recipientEmail.indexOf('@') === -1) {
            return { success: false, error: 'No valid recipient email address' };
        }

        const returnId = returnReq.return_id || returnReq.id;
        const orderId = returnReq.order_id || 'N/A';
        const type = (returnReq.type || 'RETURN').toUpperCase();

        const statusTitles = {
            'RETURN_REQUESTED': 'Return/Exchange Request Received',
            'APPROVED': 'Request Approved - Action Required',
            'RETURN_REQUIRED': 'Return Shipping Required',
            'CUSTOMER_SHIPPED': 'Return Package In Transit',
            'RETURN_RECEIVED': 'Returned Item Received at Facility',
            'INSPECTION_PASSED': 'Quality Inspection Passed',
            'INSPECTION_FAILED': 'Quality Inspection Issue Found',
            'EXCHANGE_SHIPPED': 'Replacement Saree Dispatched!',
            'REJECTED': 'Return Request Rejected',
            'CANCELLED': 'Return Request Cancelled'
        };

        const statusDescriptions = {
            'RETURN_REQUESTED': `We have received your ${type.toLowerCase()} request for Order #${orderId}. Our verification team is reviewing it.`,
            'APPROVED': `Your ${type.toLowerCase()} request #${returnId} for Order #${orderId} has been approved. Please ship the product back to our facility.`,
            'RETURN_REQUIRED': `Please dispatch the product back to our return warehouse address.`,
            'CUSTOMER_SHIPPED': `Thank you for sharing courier tracking details for #${returnId}. We are tracking your package.`,
            'RETURN_RECEIVED': `Your returned package for #${returnId} has arrived at our facility and is queued for quality inspection.`,
            'INSPECTION_PASSED': `Great news! Quality inspection for returned item #${returnId} has passed successfully.`,
            'INSPECTION_FAILED': `Inspection for returned item #${returnId} encountered an issue: ${extraData.notes || 'Condition does not match policy requirements'}.`,
            'EXCHANGE_SHIPPED': `Exciting news! Your replacement saree for #${returnId} has been packed and shipped via ${extraData.courierName || returnReq.exchange_courier_name || 'Courier'}.`,
            'REJECTED': `Regrettably, your ${type.toLowerCase()} request #${returnId} could not be approved. Reason: ${extraData.reason || returnReq.rejection_reason || 'Policy criteria not met'}.`,
            'CANCELLED': `Your return request #${returnId} has been cancelled.`
        };

        const title = statusTitles[status] || `Return Update: ${status}`;
        const desc = statusDescriptions[status] || `Status update for return #${returnId}: ${status}`;
        const logoAtt = getLogoAttachment();
        const attachments = logoAtt ? [logoAtt] : [];

        const mailOptions = {
            from: process.env.SMTP_FROM || '"Vaiyaaree Sarees" <returns@vaiyaaree.com>',
            to: recipientEmail,
            subject: `${title} - #${returnId} | Order #${orderId}`,
            attachments,
            html: `
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <title>${title} - Vaiyaaree Sarees</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 30px 10px;">
                        <tr>
                            <td align="center">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                                    <tr>
                                        <td>
                                            ${getHeaderHtml('Vaiyaaree Sarees', '', `${type} Request Status Update`)}
                                            
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 28px 24px;">
                                                <tr>
                                                    <td align="center" style="padding-bottom: 20px;">
                                                        <h2 style="color: #1e293b; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">${title}</h2>
                                                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">${desc}</p>
                                                    </td>
                                                </tr>

                                                <!-- STATUS & RETURN INFO BOX -->
                                                <tr>
                                                    <td style="padding-bottom: 20px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px;">
                                                            <tr>
                                                                <td width="50%" style="padding: 4px 0; color: #475569; font-size: 14px;"><strong>Return ID:</strong> <span style="font-family: monospace; font-weight: 700;">${returnId}</span></td>
                                                                <td width="50%" style="padding: 4px 0; text-align: right; color: #475569; font-size: 14px;"><strong>Order ID:</strong> <span style="font-weight: 700;">#${orderId}</span></td>
                                                            </tr>
                                                            <tr>
                                                                <td width="50%" style="padding: 4px 0; color: #475569; font-size: 14px;"><strong>Request Type:</strong> <span style="font-weight: 700; color: #4f46e5;">${type}</span></td>
                                                                <td width="50%" style="padding: 4px 0; text-align: right; color: #475569; font-size: 14px;"><strong>Current Status:</strong> ${getStatusBadgeHtml(status)}</td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>

                                                ${(extraData.trackingNumber || returnReq.exchange_tracking_number) ? `
                                                <!-- REPLACEMENT COURIER BOX -->
                                                <tr>
                                                    <td style="padding-bottom: 20px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 16px;">
                                                            <tr>
                                                                <td style="font-weight: 700; color: #1e40af; font-size: 15px; padding-bottom: 6px;"> Replacement Shipment Info</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #334155; font-size: 14px; padding: 3px 0;"><strong>Courier Partner:</strong> ${extraData.courierName || returnReq.exchange_courier_name || 'Courier Service'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #334155; font-size: 14px; padding: 3px 0;"><strong>Tracking Number:</strong> <span style="font-family: monospace; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 2px 6px; border-radius: 4px;">${extraData.trackingNumber || returnReq.exchange_tracking_number}</span></td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>` : ''}

                                            </table>

                                            ${getFooterHtml()}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        };

        return await sendEmail({
            to: recipientEmail,
            subject: mailOptions.subject,
            html: mailOptions.html,
            attachments: mailOptions.attachments || []
        });
    } catch (err) {
        console.error('[EMAIL-SERVICE] Error sending return email:', err);
        return { success: false, error: err.message };
    }
}

export async function sendRefundStatusEmail(refundReq, status, extraData = {}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EMAIL-SERVICE] Refund Email Skipped (SMTP not configured) - Status: ${status}, Refund ID: ${refundReq?.refund_id || refundReq?.id}`);
        return { success: true, logged: true };
    }

    try {
        const recipientEmail = refundReq.customers?.email || refundReq.orders?.customer_email || extraData.recipientEmail;
        if (!recipientEmail || recipientEmail.indexOf('@') === -1) {
            return { success: false, error: 'No valid recipient email address' };
        }

        const refundId = refundReq.refund_id || refundReq.id;
        const orderId = refundReq.order_id || 'N/A';
        const amount = refundReq.approved_amount || refundReq.requested_amount || 0;

        const statusTitles = {
            'REFUND_REQUESTED': 'Refund Request Submitted',
            'UNDER_REVIEW': 'Refund Under Verification',
            'APPROVED': 'Refund Request Approved',
            'RETURN_REQUIRED': 'Product Return Required for Refund',
            'CUSTOMER_SHIPPED': 'Return Shipment Tracked',
            'RETURN_RECEIVED': 'Returned Item Received',
            'REFUND_PROCESSING': 'Refund Processing Initiated',
            'REFUNDED': 'Refund Completed Successfully!',
            'REJECTED': 'Refund Request Declined',
            'CANCELLED': 'Refund Request Cancelled',
            'REFUND_FAILED': 'Refund Gateway Processing Failed'
        };

        const statusDescriptions = {
            'REFUND_REQUESTED': `Your refund request for Order #${orderId} of Γé╣${amount} has been logged.`,
            'APPROVED': `Your refund request #${refundId} for Γé╣${amount} has been approved by admin.`,
            'REFUND_PROCESSING': `We have initiated the refund transaction of Γé╣${amount} to your original payment method.`,
            'REFUNDED': `Great news! Your refund of Γé╣${amount} for Order #${orderId} has been completed successfully. Reference ID: ${extraData.razorpay_refund_id || refundReq.razorpay_refund_id || 'PROCESSED'}.`,
            'REJECTED': `Your refund request #${refundId} was declined. Reason: ${extraData.admin_note || refundReq.admin_note || 'Criteria not met'}.`
        };

        const title = statusTitles[status] || `Refund Update: ${status}`;
        const desc = statusDescriptions[status] || `Status update for refund #${refundId}: ${status}`;
        const logoAtt = getLogoAttachment();
        const attachments = logoAtt ? [logoAtt] : [];

        const mailOptions = {
            from: process.env.SMTP_FROM || '"Vaiyaaree Sarees" <refunds@vaiyaaree.com>',
            to: recipientEmail,
            subject: `${title} - Γé╣${amount} | Order #${orderId}`,
            attachments,
            html: `
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <title>${title} - Vaiyaaree Sarees</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 30px 10px;">
                        <tr>
                            <td align="center">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                                    <tr>
                                        <td>
                                            ${getHeaderHtml('Vaiyaaree Sarees', '', 'Refund Status Notification')}
                                            
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 28px 24px;">
                                                <tr>
                                                    <td align="center" style="padding-bottom: 20px;">
                                                        <h2 style="color: #1e293b; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">${title}</h2>
                                                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">${desc}</p>
                                                    </td>
                                                </tr>

                                                <!-- REFUND INFO CARD -->
                                                <tr>
                                                    <td style="padding-bottom: 20px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 16px;">
                                                            <tr>
                                                                <td width="50%" style="padding: 4px 0; color: #166534; font-size: 14px;"><strong>Refund ID:</strong> <span style="font-family: monospace; font-weight: 700;">${refundId}</span></td>
                                                                <td width="50%" style="padding: 4px 0; text-align: right; color: #166534; font-size: 14px;"><strong>Eligible Amount:</strong> <span style="font-size: 16px; font-weight: 800; color: #15803d;">Γé╣${amount}</span></td>
                                                            </tr>
                                                            <tr>
                                                                <td width="50%" style="padding: 4px 0; color: #166534; font-size: 14px;"><strong>Order ID:</strong> <span style="font-weight: 700;">#${orderId}</span></td>
                                                                <td width="50%" style="padding: 4px 0; text-align: right; color: #166534; font-size: 14px;"><strong>Status:</strong> ${getStatusBadgeHtml(status)}</td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>

                                            ${getFooterHtml()}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        };

        return await sendEmail({
            to: recipientEmail,
            subject: mailOptions.subject,
            html: mailOptions.html,
            attachments: mailOptions.attachments || []
        });
    } catch (err) {
        console.error('[EMAIL-SERVICE] Error sending refund email:', err);
        return { success: false, error: err.message };
    }
}

