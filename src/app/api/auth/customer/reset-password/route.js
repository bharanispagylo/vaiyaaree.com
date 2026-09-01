import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { hashPassword } from '@/lib/hash';
import { sendEmail } from '@/lib/emailService';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, email, phone, identifier: rawIdentifier, token, otp, newPassword } = body;

        // Rate limiting for password reset attempts: max 5 requests per 1-minute window
        const rateLimitError = enforceRateLimit(req, 'customer_reset_password', email || phone || rawIdentifier || token || 'guest', 5, 60000);
        if (rateLimitError) return rateLimitError;

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION A: VERIFY RESET TOKEN (FROM LINK)
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'verify-token') {
            const cleanToken = String(token || '').trim();
            if (!cleanToken) {
                return NextResponse.json({ error: 'Reset token is missing or invalid.' }, { status: 400 });
            }

            const [tokenRows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at`, (expires_at < NOW()) AS is_expired FROM `otps` WHERE `code` = ? LIMIT 1',
                [cleanToken]
            );

            if (!tokenRows || tokenRows.length === 0) {
                return NextResponse.json({ error: 'This password reset link is invalid or has already been used.' }, { status: 404 });
            }

            const tokenRecord = tokenRows[0];
            if (Boolean(tokenRecord.is_expired)) {
                return NextResponse.json({ error: 'This password reset link has expired. Please request a new one.' }, { status: 400 });
            }

            const storedIdentifier = tokenRecord.phone;
            let customer = null;

            if (storedIdentifier.includes('@')) {
                const [cust] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE LOWER(TRIM(`email`)) = LOWER(TRIM(?)) LIMIT 1', [storedIdentifier]);
                if (cust.length > 0) customer = cust[0];
            } else {
                const cleanPhone = storedIdentifier.replace(/\D/g, '').slice(-10);
                const [cust] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1', [cleanPhone, `91${cleanPhone}`]);
                if (cust.length > 0) customer = cust[0];
            }

            if (customer && Boolean(customer.is_locked)) {
                return NextResponse.json({ error: 'This account has been locked by administration. Password reset is disabled.' }, { status: 403 });
            }

            return NextResponse.json({
                success: true,
                verified: true,
                customer: {
                    name: customer?.name || 'Valued Customer',
                    email: customer?.email || '',
                    phone: customer?.phone || ''
                }
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION B: RESET PASSWORD WITH TOKEN (FROM LINK)
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'reset-with-token') {
            const cleanToken = String(token || '').trim();
            if (!cleanToken) {
                return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
            }

            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
            }

            const [tokenRows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at`, (expires_at < NOW()) AS is_expired FROM `otps` WHERE `code` = ? LIMIT 1',
                [cleanToken]
            );

            if (!tokenRows || tokenRows.length === 0) {
                return NextResponse.json({ error: 'Invalid or expired password reset link.' }, { status: 404 });
            }

            const tokenRecord = tokenRows[0];
            if (Boolean(tokenRecord.is_expired)) {
                return NextResponse.json({ error: 'This password reset link has expired. Please request a new link.' }, { status: 400 });
            }

            const storedIdentifier = tokenRecord.phone;
            let customer = null;

            if (storedIdentifier.includes('@')) {
                const [cust] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE LOWER(TRIM(`email`)) = LOWER(TRIM(?)) LIMIT 1', [storedIdentifier]);
                if (cust.length > 0) customer = cust[0];
            } else {
                const cleanPhone = storedIdentifier.replace(/\D/g, '').slice(-10);
                const [cust] = await pool.query('SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1', [cleanPhone, `91${cleanPhone}`]);
                if (cust.length > 0) customer = cust[0];
            }

            if (!customer) {
                return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
            }

            if (Boolean(customer.is_locked)) {
                return NextResponse.json({ error: 'This account has been locked by administration. Password reset is disabled.' }, { status: 403 });
            }

            const hashedPassword = hashPassword(newPassword.trim());
            const notesPayload = JSON.stringify({ pwd: hashedPassword });

            await pool.query(
                'UPDATE `customers` SET `admin_notes` = ?, `is_verified` = 1, `updated_at` = NOW() WHERE `id` = ?',
                [notesPayload, customer.id]
            );

            // Delete used token
            await pool.query('DELETE FROM `otps` WHERE `code` = ?', [cleanToken]);

            return NextResponse.json({
                success: true,
                message: 'Password reset successfully! You can now log in with your new password.'
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION C: OTP-BASED FLOW (EMAIL OR PHONE)
        // ─────────────────────────────────────────────────────────────────────────────
        const searchInput = (email || phone || rawIdentifier || '').trim();
        if (!searchInput) {
            return NextResponse.json({ error: 'Please enter your Email or Mobile Number.' }, { status: 400 });
        }

        const isEmailInput = searchInput.includes('@');
        let customer = null;
        let lookupKey = '';

        if (isEmailInput) {
            lookupKey = searchInput.toLowerCase();
            const [customerRows] = await pool.query(
                'SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE LOWER(TRIM(`email`)) = LOWER(TRIM(?)) LIMIT 1',
                [lookupKey]
            );
            if (customerRows.length > 0) customer = customerRows[0];
        } else {
            const rawDigits = searchInput.replace(/\D/g, '');
            const phone10 = rawDigits.slice(-10);
            lookupKey = phone10;
            const [customerRows] = await pool.query(
                'SELECT `id`, `name`, `email`, `phone`, `is_locked` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1',
                [phone10, `91${phone10}`]
            );
            if (customerRows.length > 0) customer = customerRows[0];
        }

        if (!customer) {
            return NextResponse.json({ error: 'No account found with this Email or Mobile Number. Please check and try again.' }, { status: 404 });
        }

        if (Boolean(customer.is_locked)) {
            return NextResponse.json({ error: 'This account has been locked by administration. Please contact customer support.' }, { status: 403 });
        }

        // ── STEP 1: SEND OTP ──────────────────────────────────────────────────
        if (action === 'send-otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const { randomUUID } = await import('crypto');
            const id = randomUUID();

            await pool.query('DELETE FROM `otps` WHERE `phone` = ?', [lookupKey]);

            await pool.query(
                'INSERT INTO `otps` (`id`, `phone`, `code`, `expires_at`, `created_at`) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())',
                [id, lookupKey, otpCode]
            );

            if (isEmailInput && customer.email) {
                try {
                    const subject = `Password Reset Verification Code - Vaiyaaree`;
                    const html = `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #5d0821; text-align: center;">Vaiyaaree</h2>
                            <h3 style="color: #333;">Password Reset Request</h3>
                            <p>Hello <strong>${customer.name || 'Valued Customer'}</strong>,</p>
                            <p>Your verification code for resetting your password is:</p>
                            <div style="background: #f8f4ee; border: 1px solid #5d0821; color: #5d0821; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                ${otpCode}
                            </div>
                            <p style="color: #666; font-size: 13px;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: center;">Vaiyaaree Sarees — Timeless Tradition</p>
                        </div>
                    `;
                    await sendEmail({ to: customer.email, subject, html });
                } catch (mailErr) {
                    console.error('[RESET-PASSWORD] Failed to send email:', mailErr);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Verification code sent to ${isEmailInput ? customer.email : lookupKey}`
            });
        }

        // ── STEP 2: VERIFY OTP ────────────────────────────────────────────────
        if (action === 'verify-otp') {
            const normalizedOtp = String(otp || '').trim();
            if (!normalizedOtp) {
                return NextResponse.json({ error: 'Please enter the 6-digit Verification OTP.' }, { status: 400 });
            }

            const [rows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at`, (expires_at < NOW()) AS is_expired FROM `otps` WHERE `phone` = ? ORDER BY `created_at` DESC LIMIT 1',
                [lookupKey]
            );

            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: 'No active OTP request found. Please click "Resend Code".' }, { status: 400 });
            }

            const otpRecord = rows[0];
            if (String(otpRecord.code).trim() !== normalizedOtp) {
                return NextResponse.json({ error: 'Invalid verification OTP code. Please check and try again.' }, { status: 400 });
            }

            if (Boolean(otpRecord.is_expired)) {
                return NextResponse.json({ error: 'Verification OTP has expired. Please request a new code.' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                verified: true,
                message: 'OTP verified successfully!'
            });
        }

        // ── STEP 3: UPDATE PASSWORD ───────────────────────────────────────────
        if (action === 'update-password') {
            const normalizedOtp = String(otp || '').trim();
            if (!normalizedOtp) {
                return NextResponse.json({ error: 'Verification OTP is required.' }, { status: 400 });
            }
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
            }

            const [rows] = await pool.query(
                'SELECT `id`, `phone`, `code`, `expires_at`, (expires_at < NOW()) AS is_expired FROM `otps` WHERE `phone` = ? ORDER BY `created_at` DESC LIMIT 1',
                [lookupKey]
            );

            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: 'Session expired. Please start password reset again.' }, { status: 400 });
            }

            const otpRecord = rows[0];
            if (String(otpRecord.code).trim() !== normalizedOtp) {
                return NextResponse.json({ error: 'Invalid verification OTP code.' }, { status: 400 });
            }

            if (Boolean(otpRecord.is_expired)) {
                return NextResponse.json({ error: 'OTP has expired. Please start password reset again.' }, { status: 400 });
            }

            const hashedPassword = hashPassword(newPassword.trim());
            const notesPayload = JSON.stringify({ pwd: hashedPassword });

            await pool.query(
                'UPDATE `customers` SET `admin_notes` = ?, `is_verified` = 1, `updated_at` = NOW() WHERE `id` = ?',
                [notesPayload, customer.id]
            );

            await pool.query('DELETE FROM `otps` WHERE `phone` = ?', [lookupKey]);

            return NextResponse.json({
                success: true,
                message: 'Password updated successfully!'
            });
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    } catch (error) {
        console.error('[CUSTOMER-RESET-PASSWORD] Fatal error:', error);
        return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
    }
}
