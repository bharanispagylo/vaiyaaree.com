import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sendAdminLoginOTP } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { ticket } = body;

        // Rate limiting: max 3 resend attempts per minute per ticket
        const rateLimitError = enforceRateLimit(req, 'admin_otp_resend', ticket || 'unknown_ticket', 3, 60000);
        if (rateLimitError) return rateLimitError;

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket is required to resend OTP.' }, { status: 400 });
        }

        const ticketKey = `admin_login_otp_${ticket}`;

        // 1. Fetch OTP record from app_settings
        const { data: record, error: fetchErr } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', ticketKey)
            .maybeSingle();

        if (fetchErr || !record || !record.value) {
            return NextResponse.json({ error: 'Verification session expired or not found. Please log in again.' }, { status: 401 });
        }

        let otpData;
        try {
            otpData = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
        } catch (e) {
            return NextResponse.json({ error: 'Corrupted OTP session. Please log in again.' }, { status: 500 });
        }

        // 2. Generate new OTP and reset expiration
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        otpData.otp = newOtp;
        otpData.expiresAt = newExpiresAt;
        otpData.updatedAt = new Date().toISOString();

        await mysqlClient.from('app_settings').upsert({
            key: ticketKey,
            value: JSON.stringify(otpData),
            updated_at: new Date().toISOString()
        });

        // 3. Send email
        await sendAdminLoginOTP(otpData.email, newOtp, otpData.fullName || otpData.username);

        return NextResponse.json({
            success: true,
            message: 'A new 6-digit verification code has been sent to your email.'
        });

    } catch (error) {
        console.error('Error resending admin login OTP:', error);
        return NextResponse.json({ error: 'Failed to resend code: ' + error.message }, { status: 500 });
    }
}
