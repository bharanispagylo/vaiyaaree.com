import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { hashPassword } from '@/lib/hash';
import { sendEmail } from '@/lib/emailService';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { randomUUID, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePhone(input) {
    if (!input) return '';
    const digits = input.toString().replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return digits.slice(-10).padStart(12, '91');
    return digits;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action = 'set-password', id, phone, email, newPassword, sendEmail: shouldSendEmail = true, sendWhatsApp: shouldSendWhatsApp = true, expiryHours = 24 } = body;

        if (!id && !phone && !email) {
            return NextResponse.json({ error: 'Customer ID, Phone Number or Email is required.' }, { status: 400 });
        }

        // 1. Find Customer in Database
        let customer = null;
        if (id) {
            const [rows] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `country_code`, `admin_notes` FROM `customers` WHERE `id` = ? LIMIT 1', [id]);
            if (rows.length > 0) customer = rows[0];
        }

        if (!customer && email) {
            const [rows] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `country_code`, `admin_notes` FROM `customers` WHERE LOWER(TRIM(`email`)) = LOWER(TRIM(?)) LIMIT 1', [email]);
            if (rows.length > 0) customer = rows[0];
        }

        if (!customer && phone) {
            const norm = normalizePhone(phone);
            const phone10 = norm.slice(-10);
            const phone12 = `91${phone10}`;
            const [rows] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `country_code`, `admin_notes` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1', [phone10, phone12]);
            if (rows.length > 0) customer = rows[0];
        }

        if (!customer) {
            return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
        }

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://vaiyaaree.com').trim().replace(/\/$/, '');
        const loginUrl = `${appUrl}/login`;
        const customerName = customer.name || 'Valued Customer';
        const customerEmail = customer.email ? customer.email.trim() : '';
        const rawPhone = (customer.phone || '').replace(/\D/g, '');
        const cleanPhone = rawPhone.slice(-10);
        const countryCode = customer.country_code || '+91';
        const fullPhone = cleanPhone ? `${countryCode} ${cleanPhone}` : '';

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 1: SET / GENERATE NEW PASSWORD
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'set-password') {
            if (!newPassword || newPassword.trim().length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
            }

            const cleanPassword = newPassword.trim();
            const hashedPassword = hashPassword(cleanPassword);
            const notesPayload = JSON.stringify({ pwd: hashedPassword });

            // Update customer password in DB
            await pool.query(
                'UPDATE `customers` SET `admin_notes` = ?, `is_verified` = 1, `updated_at` = NOW() WHERE `id` = ?',
                [notesPayload, customer.id]
            );

            let emailSent = false;
            let whatsappSent = false;
            const notificationLogs = [];

            // 1. Dispatch Email with new credentials
            if (shouldSendEmail && customerEmail) {
                try {
                    const subject = `Your New Account Password - Vaiyaaree`;
                    const html = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #f0e6df; border-radius: 16px; background: #ffffff;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <h1 style="color: #5d0821; font-size: 26px; font-weight: 800; margin: 0 0 4px;">Vaiyaaree</h1>
                                <p style="color: #888; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Timeless Saree Collection</p>
                            </div>
                            
                            <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px;">Hello ${customerName},</h2>
                            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                                An administrator has generated a new password for your Vaiyaaree account. You can now use these credentials to log in to your account.
                            </p>

                            <div style="background: #fdfbf7; border: 1px solid #e7dcd3; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                                <h3 style="color: #5d0821; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px; font-weight: 700;">Your Login Credentials</h3>
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    ${customerEmail ? `<tr><td style="padding: 6px 0; color: #666; width: 120px;">Email:</td><td style="padding: 6px 0; color: #111; font-weight: 600;">${customerEmail}</td></tr>` : ''}
                                    ${cleanPhone ? `<tr><td style="padding: 6px 0; color: #666; width: 120px;">Mobile:</td><td style="padding: 6px 0; color: #111; font-weight: 600;">${fullPhone}</td></tr>` : ''}
                                    <tr>
                                        <td style="padding: 6px 0; color: #666;">New Password:</td>
                                        <td style="padding: 6px 0;">
                                            <span style="background: #5d0821; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 15px; letter-spacing: 1px;">
                                                ${cleanPassword}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin: 28px 0 20px;">
                                <a href="${loginUrl}" style="background: #5d0821; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(93, 8, 33, 0.2);">
                                    Login to Your Account →
                                </a>
                            </div>

                            <p style="color: #777; font-size: 12px; line-height: 1.5; border-top: 1px solid #f0e6df; padding-top: 16px; margin: 20px 0 0;">
                                🔒 For security, we recommend changing your password after logging in. If you did not request this change, please contact our support team immediately.
                            </p>
                        </div>
                    `;
                    const mailRes = await sendEmail({ to: customerEmail, subject, html });
                    emailSent = !mailRes?.error;
                    if (emailSent) notificationLogs.push(`Email sent to ${customerEmail}`);
                } catch (e) {
                    console.error('[ADMIN-PASSWORD-EMAIL-ERROR]', e);
                }
            }

            // 2. Dispatch WhatsApp message with new credentials
            if (shouldSendWhatsApp && cleanPhone) {
                try {
                    const waText = [
                        `✨ *Vaiyaaree Account Password Updated*`,
                        ``,
                        `Hello *${customerName}*,`,
                        `An administrator has updated the password for your Vaiyaaree customer account.`,
                        ``,
                        `🔑 *Your Login Credentials:*`,
                        customerEmail ? `• *Email:* ${customerEmail}` : null,
                        `• *Mobile:* ${fullPhone}`,
                        `• *New Password:* *${cleanPassword}*`,
                        ``,
                        `👉 *Login Here:* ${loginUrl}`,
                        ``,
                        `_For security, you can change your password anytime from your profile._`,
                        `— Team Vaiyaaree`
                    ].filter(Boolean).join('\n');

                    const waRes = await sendWhatsAppText(cleanPhone, waText);
                    whatsappSent = Boolean(waRes?.success);
                    if (whatsappSent) notificationLogs.push(`WhatsApp sent to ${fullPhone}`);
                } catch (e) {
                    console.error('[ADMIN-PASSWORD-WHATSAPP-ERROR]', e);
                }
            }

            const sentSummary = notificationLogs.length > 0 ? ` (${notificationLogs.join(', ')})` : '';

            return NextResponse.json({
                success: true,
                message: `Password updated successfully for "${customerName}"${sentSummary}.`,
                emailSent,
                whatsappSent,
                customer: {
                    id: customer.id,
                    name: customerName,
                    email: customerEmail,
                    phone: cleanPhone
                }
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 2: GENERATE & SEND PASSWORD RESET LINK
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'send-reset-link') {
            const token = randomBytes(24).toString('hex');
            const otpId = randomUUID();
            const identifier = customerEmail || cleanPhone;
            const expiry = Number(expiryHours) || 24;

            // Remove existing reset tokens for this customer
            await pool.query(
                'DELETE FROM `otps` WHERE `phone` IN (?, ?, ?)',
                [customerEmail || '__NO_EMAIL__', cleanPhone || '__NO_PHONE__', `91${cleanPhone}`]
            );

            // Store new reset token with expiration in otps table
            await pool.query(
                `INSERT INTO \`otps\` (\`id\`, \`phone\`, \`code\`, \`expires_at\`, \`created_at\`)
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NOW())`,
                [otpId, identifier, token, expiry]
            );

            const resetUrl = `${appUrl}/forgot-password?token=${token}&identifier=${encodeURIComponent(identifier)}`;

            let emailSent = false;
            let whatsappSent = false;
            const notificationLogs = [];

            // 1. Dispatch Email with Reset Link
            if (shouldSendEmail && customerEmail) {
                try {
                    const subject = `Password Reset Link - Vaiyaaree`;
                    const html = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #f0e6df; border-radius: 16px; background: #ffffff;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <h1 style="color: #5d0821; font-size: 26px; font-weight: 800; margin: 0 0 4px;">Vaiyaaree</h1>
                                <p style="color: #888; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Timeless Saree Collection</p>
                            </div>
                            
                            <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px;">Hello ${customerName},</h2>
                            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                                You or an administrator requested a link to reset your Vaiyaaree account password. Click the button below to choose your new password.
                            </p>

                            <div style="text-align: center; margin: 28px 0;">
                                <a href="${resetUrl}" style="background: #5d0821; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(93, 8, 33, 0.2);">
                                    Set New Password →
                                </a>
                            </div>

                            <p style="color: #666; font-size: 13px; margin: 20px 0 10px;">Or copy and paste this link in your browser:</p>
                            <div style="background: #f8f4ee; border: 1px solid #e7dcd3; border-radius: 8px; padding: 10px 14px; font-size: 12px; word-break: break-all; color: #5d0821; font-family: monospace;">
                                ${resetUrl}
                            </div>

                            <p style="color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #f0e6df; padding-top: 14px;">
                                ⏱️ This password reset link is valid for ${expiry} hours. If you did not expect this message, you can safely ignore it.
                            </p>
                        </div>
                    `;
                    const mailRes = await sendEmail({ to: customerEmail, subject, html });
                    emailSent = !mailRes?.error;
                    if (emailSent) notificationLogs.push(`Email sent to ${customerEmail}`);
                } catch (e) {
                    console.error('[ADMIN-RESET-LINK-EMAIL-ERROR]', e);
                }
            }

            // 2. Dispatch WhatsApp message with Reset Link
            if (shouldSendWhatsApp && cleanPhone) {
                try {
                    const waText = [
                        `🔐 *Vaiyaaree Password Reset Request*`,
                        ``,
                        `Hello *${customerName}*,`,
                        `A password reset link has been created for your Vaiyaaree account.`,
                        ``,
                        `👉 *Click the link below to set your new password:*`,
                        `${resetUrl}`,
                        ``,
                        `⏱️ _This link is valid for ${expiry} hours._`,
                        `— Team Vaiyaaree`
                    ].join('\n');

                    const waRes = await sendWhatsAppText(cleanPhone, waText);
                    whatsappSent = Boolean(waRes?.success);
                    if (whatsappSent) notificationLogs.push(`WhatsApp sent to ${fullPhone}`);
                } catch (e) {
                    console.error('[ADMIN-RESET-LINK-WHATSAPP-ERROR]', e);
                }
            }

            const sentSummary = notificationLogs.length > 0 ? ` (${notificationLogs.join(', ')})` : '';

            return NextResponse.json({
                success: true,
                message: `Password reset link generated and sent successfully to "${customerName}"${sentSummary}.`,
                resetUrl,
                emailSent,
                whatsappSent,
                customer: {
                    id: customer.id,
                    name: customerName,
                    email: customerEmail,
                    phone: cleanPhone
                }
            });
        }

        return NextResponse.json({ error: `Unsupported action: "${action}"` }, { status: 400 });

    } catch (error) {
        console.error('[ADMIN-CUSTOMER-PASSWORD-ERROR]', error);
        return NextResponse.json({ error: 'Failed to process customer password request: ' + error.message }, { status: 500 });
    }
}
