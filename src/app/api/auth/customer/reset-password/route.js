import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { hashPassword } from '@/lib/hash';
import { sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, email, otp, newPassword } = body;

        if (!email || !email.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid Email Address.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Verify customer exists
        const { data: customer, error: fetchErr } = await mysqlClient
            .from('customers')
            .select('id, name, email')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (fetchErr || !customer) {
            return NextResponse.json({ error: 'No account found with this email address. Please check your email or Create an Account.' }, { status: 404 });
        }

        // STEP 1: SEND OTP
        if (action === 'send-otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

            const otpPayload = JSON.stringify({
                code: otpCode,
                expires_at: expiresAt,
                email: normalizedEmail
            });

            const settingKey = `customer_reset_otp_${normalizedEmail}`;

            await mysqlClient.from('app_settings').upsert({
                key: settingKey,
                value: otpPayload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            // Send Email OTP
            try {
                const subject = `Password Reset Verification Code - Vaiyaaree`;
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; borderRadius: 10px;">
                        <h2 style="color: #5d0821; text-align: center;">Vaiyaaree</h2>
                        <h3 style="color: #333;">Password Reset Request</h3>
                        <p>Hello <strong>${customer.name || 'Valued Customer'}</strong>,</p>
                        <p>Your verification code for resetting your password is:</p>
                        <div style="background: #f8f4ee; border: 1px solid #5d0821; color: #5d0821; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            ${otpCode}
                        </div>
                        <p style="color: #666; font-size: 13px;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: center;">Vaiyaaree Sarees — Timeless Tradition</p>
                    </div>
                `;
                await sendEmail({ to: normalizedEmail, subject, html });
            } catch (mailErr) {
                console.error('[RESET-PASSWORD] Failed to send email:', mailErr);
            }

            return NextResponse.json({
                success: true,
                message: `Verification code sent to ${normalizedEmail}`
            });
        }

        // STEP 2: VERIFY OTP
        if (action === 'verify-otp') {
            if (!otp || !otp.trim()) {
                return NextResponse.json({ error: 'Please enter the 6-digit Verification OTP.' }, { status: 400 });
            }

            const settingKey = `customer_reset_otp_${normalizedEmail}`;
            const { data: otpData } = await mysqlClient.from('app_settings').select('value').eq('key', settingKey).maybeSingle();

            if (!otpData || !otpData.value) {
                return NextResponse.json({ error: 'No active OTP request found. Please click "Resend Code".' }, { status: 400 });
            }

            let storedOtpObj;
            try {
                storedOtpObj = JSON.parse(otpData.value);
            } catch (e) {
                return NextResponse.json({ error: 'Invalid OTP session.' }, { status: 400 });
            }

            if (storedOtpObj.code !== otp.trim()) {
                return NextResponse.json({ error: 'Invalid verification OTP code. Please check and try again.' }, { status: 400 });
            }

            if (Date.now() > storedOtpObj.expires_at) {
                return NextResponse.json({ error: 'Verification OTP has expired. Please request a new code.' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                verified: true,
                message: 'OTP verified successfully!'
            });
        }

        // STEP 3: UPDATE PASSWORD
        if (action === 'update-password') {
            if (!otp || !otp.trim()) {
                return NextResponse.json({ error: 'Verification OTP is required.' }, { status: 400 });
            }
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
            }

            const settingKey = `customer_reset_otp_${normalizedEmail}`;
            const { data: otpData } = await mysqlClient.from('app_settings').select('value').eq('key', settingKey).maybeSingle();

            if (!otpData || !otpData.value) {
                return NextResponse.json({ error: 'Session expired. Please start password reset again.' }, { status: 400 });
            }

            let storedOtpObj;
            try {
                storedOtpObj = JSON.parse(otpData.value);
            } catch (e) {
                return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });
            }

            if (storedOtpObj.code !== otp.trim()) {
                return NextResponse.json({ error: 'Invalid verification OTP code.' }, { status: 400 });
            }

            if (Date.now() > storedOtpObj.expires_at) {
                return NextResponse.json({ error: 'OTP has expired. Please start password reset again.' }, { status: 400 });
            }

            // Update customer password hash
            const hashedPassword = hashPassword(newPassword);
            const notesPayload = JSON.stringify({ pwd: hashedPassword });

            const { error: updateErr } = await mysqlClient
                .from('customers')
                .update({ admin_notes: notesPayload })
                .eq('id', customer.id);

            if (updateErr) {
                console.error('[RESET-PASSWORD] Update error:', updateErr);
                return NextResponse.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
            }

            // Delete OTP session
            await mysqlClient.from('app_settings').delete().eq('key', settingKey);

            return NextResponse.json({
                success: true,
                message: 'Password updated successfully!'
            });
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    } catch (error) {
        console.error('[CUSTOMER-RESET-PASSWORD] Fatal error:', error);
        return NextResponse.json({ error: 'Server error. Please try again later.' }, { status: 500 });
    }
}
