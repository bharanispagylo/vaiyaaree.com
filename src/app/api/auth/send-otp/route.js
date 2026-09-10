import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { sendText } from '@/services/whatsappService';
import { sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { phone, email, identifier, country_code } = body;

        const rawTarget = (email || phone || identifier || '').trim();
        if (!rawTarget) {
            return NextResponse.json({ error: 'Please enter your Mobile Number or Email address.' }, { status: 400 });
        }

        // Fetch current communication channel setting from app_settings
        const { data: channelSetting } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', 'communication_channel')
            .maybeSingle();

        const activeChannel = channelSetting?.value || 'whatsapp'; // 'whatsapp' | 'email' | 'both'
        const isEmailTarget = rawTarget.includes('@');

        // Check if store is set to Email Only but user tried phone
        if (activeChannel === 'email' && !isEmailTarget) {
            return NextResponse.json({
                error: 'The store is currently configured for Email verification. Please enter your email address to continue.',
                channel: 'email'
            }, { status: 400 });
        }

        // Check if store is set to WhatsApp Only but user tried email
        if (activeChannel === 'whatsapp' && isEmailTarget) {
            return NextResponse.json({
                error: 'The store is currently configured for WhatsApp verification. Please enter your WhatsApp mobile number to continue.',
                channel: 'whatsapp'
            }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // FLOW A: EMAIL OTP DISPATCH
        // ─────────────────────────────────────────────────────────────────────────────
        if (isEmailTarget) {
            const cleanEmail = rawTarget.toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
            }

            // Check if customer account exists and is locked
            const { data: customerCheck } = await mysqlClient
                .from('customers')
                .select('id, name, is_locked')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (customerCheck && Boolean(customerCheck.is_locked)) {
                return NextResponse.json({ 
                    error: 'Your account has been locked by administration. Please contact customer support.',
                    is_locked: true
                }, { status: 403 });
            }

            // 1. Generate 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            console.log(`[AUTH-EMAIL] Generating OTP ${otpCode} for email ${cleanEmail}`);

            // 2. Store OTP in DB
            const { error: dbError } = await mysqlClient
                .from('otps')
                .upsert({
                    phone: cleanEmail,
                    code: otpCode,
                    expires_at: expiresAt
                }, { onConflict: 'phone' });

            if (dbError) {
                console.error('[AUTH-EMAIL] DB OTP Error:', dbError);
                return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
            }

            // 3. Dispatch Email with branded HTML template
            const customerName = customerCheck?.name || 'Valued Customer';
            const subject = `${otpCode} is your Vaiyaaree Verification Code`;
            const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #f1e9e2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                    <div style="background: linear-gradient(135deg, #5d0821 0%, #3e0415 100%); padding: 28px 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.05em;">VAIYAAREE</h1>
                        <p style="color: #f7e6d4; margin: 6px 0 0; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">Authentic Heritage Sarees</p>
                    </div>
                    <div style="padding: 32px 28px; color: #2d3748;">
                        <h2 style="color: #1a202c; font-size: 20px; margin: 0 0 12px; font-weight: 700;">Verification Code</h2>
                        <p style="font-size: 15px; line-height: 1.5; color: #4a5568; margin: 0 0 20px;">
                            Hello <strong>${customerName}</strong>,<br>
                            Use the verification code below to complete your authentication.
                        </p>
                        <div style="background: #faf5f0; border: 2px dashed #5d0821; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                            <span style="font-size: 34px; font-weight: 800; color: #5d0821; letter-spacing: 8px; font-family: monospace;">${otpCode}</span>
                        </div>
                        <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0 0 16px;">
                            ⏱️ This code is valid for <strong>10 minutes</strong>. For your security, never share this code with anyone.
                        </p>
                        <p style="font-size: 13px; color: #a0aec0; margin: 0; border-top: 1px solid #edf2f7; padding-top: 16px;">
                            If you did not request this verification, you can safely ignore this email.
                        </p>
                    </div>
                    <div style="background: #f7fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
                        &copy; ${new Date().getFullYear()} Vaiyaaree. All rights reserved.
                    </div>
                </div>
            `;

            try {
                await sendEmail({ to: cleanEmail, subject, html });
            } catch (mailErr) {
                console.error('[AUTH-EMAIL] Mail send error:', mailErr);
                return NextResponse.json({ error: 'Failed to send verification email. Please try again or check SMTP settings.' }, { status: 500 });
            }

            return NextResponse.json({ 
                success: true, 
                message: `Verification code sent to ${cleanEmail}`,
                channel: 'email',
                target: cleanEmail
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // FLOW B: WHATSAPP OTP DISPATCH
        // ─────────────────────────────────────────────────────────────────────────────
        let cleanPhone = rawTarget.replace(/\s+/g, '').replace('+', '').replace(/\D/g, '');
        
        // Ensure 91 prefix for 10-digit Indian numbers
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        if (cleanPhone.length < 12) {
            return NextResponse.json({ error: 'Invalid mobile number format. Please enter a valid 10-digit number.' }, { status: 400 });
        }

        // Check if customer account exists and is locked
        const phone10 = cleanPhone.slice(-10);
        const { data: customerCheck } = await mysqlClient
            .from('customers')
            .select('is_locked')
            .or(`phone.eq.${phone10},phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`)
            .maybeSingle();

        if (customerCheck && Boolean(customerCheck.is_locked)) {
            return NextResponse.json({ 
                error: 'Your account has been locked by administration. Please contact customer support.',
                is_locked: true
            }, { status: 403 });
        }

        // 1. Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        console.log(`[AUTH-WA] Generating OTP ${otpCode} for ${cleanPhone}`);

        // 2. Store OTP in DB
        const { error: dbError } = await mysqlClient
            .from('otps')
            .upsert({
                phone: cleanPhone,
                code: otpCode,
                expires_at: expiresAt
            }, { onConflict: 'phone' });

        if (dbError) {
            console.error('[AUTH-WA] DB OTP Error:', dbError);
            return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
        }

        // 3. Send OTP via WhatsApp Service
        const message = `✨ *Vaiyaaree* ✨\n\nYour verification code is: *${otpCode}*\n\nThis code expires in 10 minutes. Please do not share it with anyone.`;

        const waResult = await sendText(cleanPhone, message);

        if (waResult?.error) {
            console.error('[AUTH-WA] WhatsApp Send Failed:', waResult.error);
            return NextResponse.json({ error: 'Failed to send WhatsApp message. Please check number or contact support.' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'OTP sent successfully via WhatsApp',
            channel: 'whatsapp',
            target: cleanPhone
        });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
