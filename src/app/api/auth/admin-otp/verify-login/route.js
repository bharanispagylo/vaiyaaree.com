import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { ticket, otp } = body;

        // Rate limiting: max 5 OTP verification attempts per minute per ticket/IP
        const rateLimitError = enforceRateLimit(req, 'admin_otp_verify', ticket || 'unknown_ticket', 5, 60000);
        if (rateLimitError) return rateLimitError;

        if (!ticket || !otp) {
            return NextResponse.json({ error: 'Ticket and OTP code are required.' }, { status: 400 });
        }

        const cleanOtp = String(otp).trim();
        const ticketKey = `admin_login_otp_${ticket}`;

        // 1. Fetch OTP record from app_settings
        const { data: record, error: fetchErr } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', ticketKey)
            .maybeSingle();

        if (fetchErr || !record || !record.value) {
            return NextResponse.json({ error: 'Invalid or expired verification session. Please log in again.' }, { status: 401 });
        }

        let otpData;
        try {
            otpData = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
        } catch (e) {
            return NextResponse.json({ error: 'Corrupted OTP session. Please try logging in again.' }, { status: 500 });
        }

        // 2. Check expiration
        if (!otpData.expiresAt || Date.now() > Number(otpData.expiresAt)) {
            // Delete expired record
            await mysqlClient.from('app_settings').delete().eq('key', ticketKey);
            return NextResponse.json({ error: 'Verification code has expired. Please request a new code or log in again.' }, { status: 401 });
        }

        // 3. Verify OTP code
        if (cleanOtp !== String(otpData.otp).trim()) {
            return NextResponse.json({ error: 'Incorrect 6-digit verification code. Please check your email and try again.' }, { status: 401 });
        }

        // 4. Cleanup used OTP ticket
        await mysqlClient.from('app_settings').delete().eq('key', ticketKey);

        // 5. Update last_login in admin_users
        if (otpData.userId) {
            await mysqlClient
                .from('admin_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', otpData.userId);
        }

        const token = process.env.ADMIN_API_SECRET || 'fallback_secret_change_me';

        return NextResponse.json({
            success: true,
            role: otpData.role || 'Admin',
            username: otpData.username,
            email: otpData.email || '',
            full_name: otpData.fullName || otpData.username || 'Admin User',
            token,
            source: 'db_users_2fa'
        });

    } catch (error) {
        console.error('Error verifying admin login OTP:', error);
        return NextResponse.json({ error: 'Verification server error: ' + error.message }, { status: 500 });
    }
}
