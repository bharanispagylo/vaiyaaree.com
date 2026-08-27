import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/mysql';
import { hashPassword } from '@/lib/hash';
import { sendText } from '@/services/whatsappService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePhone(input) {
    if (!input) return null;
    const digits = input.toString().replace(/\D/g, '');
    if (digits.length === 10) {
        return `91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits;
    }
    if (digits.length > 10) {
        return digits.slice(-10).padStart(12, '91');
    }
    return digits;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, phone, email, identifier, otp, newPassword } = body;

        const rawTarget = (phone || identifier || email || '').trim();
        if (!rawTarget) {
            return NextResponse.json({ error: 'Please enter your WhatsApp Mobile Number.' }, { status: 400 });
        }

        const isEmail = rawTarget.includes('@');
        let customer = null;
        let cleanPhone = null;

        if (isEmail) {
            const normalizedEmail = rawTarget.toLowerCase();
            const [rows] = await pool.query(
                'SELECT id, name, phone, email FROM `customers` WHERE LOWER(TRIM(`email`)) = ? LIMIT 1',
                [normalizedEmail]
            );
            if (rows.length === 0) {
                return NextResponse.json({ 
                    error: 'No account found with this email address. Please check your credentials or create an account.' 
                }, { status: 404 });
            }
            customer = rows[0];
            cleanPhone = normalizePhone(customer.phone);
            if (!cleanPhone) {
                return NextResponse.json({ 
                    error: 'No valid phone number linked to this account to send WhatsApp OTP. Please contact support.' 
                }, { status: 400 });
            }
        } else {
            cleanPhone = normalizePhone(rawTarget);
            if (!cleanPhone || cleanPhone.length < 10) {
                return NextResponse.json({ error: 'Please enter a valid 10-digit WhatsApp Mobile Number.' }, { status: 400 });
            }

            const phone10 = cleanPhone.slice(-10);
            const phone12 = `91${phone10}`;

            const [rows] = await pool.query(
                'SELECT id, name, phone, email FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1',
                [phone10, phone12]
            );

            if (rows.length === 0) {
                return NextResponse.json({ 
                    error: 'No account found with this WhatsApp number. Please check your mobile number or create an account.' 
                }, { status: 404 });
            }
            customer = rows[0];
        }

        const phone10 = cleanPhone.slice(-10);
        const phone12 = `91${phone10}`;
        const maskedPhone = `+91 ${phone10.slice(0, 2)}******${phone10.slice(-2)}`;

        // ═════════════════════════════════════════════════════════════════════
        // STEP 1: SEND WHATSAPP OTP
        // ═════════════════════════════════════════════════════════════════════
        if (action === 'send-otp') {
            // Check cooldown (45 seconds)
            const [lastOtpRows] = await pool.query(
                'SELECT `created_at` FROM `otps` WHERE `phone` IN (?, ?) ORDER BY `created_at` DESC LIMIT 1',
                [phone10, phone12]
            );

            if (lastOtpRows.length > 0) {
                const lastSent = new Date(lastOtpRows[0].created_at).getTime();
                const diffSeconds = (Date.now() - lastSent) / 1000;
                if (diffSeconds < 45) {
                    return NextResponse.json({ 
                        error: `Please wait ${Math.ceil(45 - diffSeconds)}s before requesting a new OTP.` 
                    }, { status: 429 });
                }
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpId = crypto.randomUUID ? crypto.randomUUID() : `otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            // Remove existing OTPs for both 10-digit and 12-digit formats
            await pool.query('DELETE FROM `otps` WHERE `phone` IN (?, ?)', [phone10, phone12]);

            // Save new OTP with 10 minute expiry
            await pool.query(
                'INSERT INTO `otps` (`id`, `phone`, `code`, `expires_at`, `created_at`) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())',
                [otpId, phone12, otpCode]
            );

            // Send via WhatsApp
            const waMessage = 
                `🌸 *Password Reset Verification — Vaiyaaree*\n\n` +
                `Hello *${customer.name || 'Valued Customer'}*,\n\n` +
                `Your verification code to reset your password is:\n\n` +
                `*${otpCode}*\n\n` +
                `⏳ This OTP is valid for *10 minutes*. Please do not share this code with anyone.\n\n` +
                `_Vaiyaaree Sarees — Timeless Tradition_`;

            try {
                await sendText(phone12, waMessage);
            } catch (waErr) {
                console.error('[RESET-PASSWORD] Failed to send WhatsApp message:', waErr);
            }

            return NextResponse.json({
                success: true,
                phone: phone12,
                maskedPhone,
                message: `Verification code sent to your WhatsApp number (${maskedPhone})`
            });
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 2: VERIFY OTP
        // ═════════════════════════════════════════════════════════════════════
        if (action === 'verify-otp') {
            const normalizedOtp = String(otp || '').trim();
            if (!normalizedOtp || normalizedOtp.length !== 6) {
                return NextResponse.json({ error: 'Please enter the 6-digit Verification OTP.' }, { status: 400 });
            }

            const [rows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at` FROM `otps` WHERE `phone` IN (?, ?) AND `expires_at` >= NOW() ORDER BY `created_at` DESC LIMIT 1',
                [phone10, phone12]
            );

            if (rows.length === 0) {
                return NextResponse.json({ error: 'Verification OTP is invalid or has expired. Please request a new code.' }, { status: 400 });
            }

            const otpRecord = rows[0];

            if (String(otpRecord.code).trim() !== normalizedOtp) {
                return NextResponse.json({ error: 'Invalid verification OTP code. Please check and try again.' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                verified: true,
                message: 'WhatsApp OTP verified successfully! Please set your new password.'
            });
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 3: UPDATE PASSWORD
        // ═════════════════════════════════════════════════════════════════════
        if (action === 'update-password') {
            const normalizedOtp = String(otp || '').trim();
            if (!normalizedOtp) {
                return NextResponse.json({ error: 'Verification OTP is required.' }, { status: 400 });
            }
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
            }

            const [rows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at` FROM `otps` WHERE `phone` IN (?, ?) AND `expires_at` >= NOW() ORDER BY `created_at` DESC LIMIT 1',
                [phone10, phone12]
            );

            if (rows.length === 0) {
                return NextResponse.json({ error: 'Session has expired. Please start the password reset again.' }, { status: 400 });
            }

            const otpRecord = rows[0];

            if (String(otpRecord.code).trim() !== normalizedOtp) {
                return NextResponse.json({ error: 'Invalid verification OTP code.' }, { status: 400 });
            }

            // Update customer password hash
            const hashedPassword = hashPassword(newPassword);
            const notesPayload = JSON.stringify({ pwd: hashedPassword });

            await pool.query(
                'UPDATE `customers` SET `admin_notes` = ?, `updated_at` = NOW() WHERE `id` = ?',
                [notesPayload, customer.id]
            );

            // Delete OTP records
            await pool.query('DELETE FROM `otps` WHERE `phone` IN (?, ?)', [phone10, phone12]);

            // Send confirmation WhatsApp message
            try {
                const confirmMsg = 
                    `✅ *Password Changed Successfully — Vaiyaaree*\n\n` +
                    `Hello *${customer.name || 'Valued Customer'}*,\n\n` +
                    `Your account password has been updated successfully. You can now login using your new password.\n\n` +
                    `If you did not make this change, please contact customer support immediately.\n\n` +
                    `_Vaiyaaree Sarees — Timeless Tradition_`;
                await sendText(phone12, confirmMsg);
            } catch (confErr) {
                console.error('[RESET-PASSWORD] Failed to send confirmation WhatsApp message:', confErr);
            }

            return NextResponse.json({
                success: true,
                message: 'Password updated successfully! Redirecting to login...'
            });
        }

        return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });

    } catch (error) {
        console.error('[RESET-PASSWORD-ERROR]', error);
        return NextResponse.json({ error: 'Failed to process request: ' + error.message }, { status: 500 });
    }
}
