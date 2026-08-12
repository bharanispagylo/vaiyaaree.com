import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAdminSettings } from '@/lib/settings';
import { sendAdminPasswordResetOTP } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { identifier } = await req.json();

        if (!identifier || !identifier.trim()) {
            return NextResponse.json({ error: 'Please enter your admin username or email.' }, { status: 400 });
        }

        const cleanId = identifier.trim();
        let targetEmail = null;
        let targetUsername = cleanId;

        // 1. First check if specific user exists in admin_users table with an email
        try {
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('username, email')
                .or(`username.eq.${cleanId},email.eq.${cleanId}`)
                .maybeSingle();

            if (adminUser) {
                if (adminUser.email) targetEmail = adminUser.email;
                if (adminUser.username) targetUsername = adminUser.username;
            }
        } catch (dbErr) {
            console.error('Error querying admin_users:', dbErr);
        }

        // 2. Fallback to Shop Settings admin email or env variable
        if (!targetEmail) {
            const settings = await getAdminSettings();
            targetEmail = settings.admin_email || process.env.ADMIN_EMAIL;
        }

        if (!targetEmail) {
            return NextResponse.json({ 
                error: 'No email address found for this administrator. Please set an Admin Email in User Management or Shop Settings.' 
            }, { status: 400 });
        }

        // 3. Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // 4. Store OTP in app_settings table under key 'admin_reset_otp'
        const otpData = JSON.stringify({
            code: otp,
            email: targetEmail,
            username: targetUsername,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        });

        const { error: dbError } = await supabase
            .from('app_settings')
            .upsert({
                key: 'admin_reset_otp',
                value: otpData,
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Error saving admin OTP to DB:', dbError);
            return NextResponse.json({ error: 'Failed to generate verification OTP.' }, { status: 500 });
        }

        // 5. Send email to the specified admin email
        await sendAdminPasswordResetOTP(targetEmail, otp);

        // Mask email for security display (e.g. a***n@domain.com)
        const parts = targetEmail.split('@');
        const maskedName = parts[0].length > 2 
            ? parts[0][0] + '***' + parts[0][parts[0].length - 1] 
            : parts[0][0] + '***';
        const maskedEmail = `${maskedName}@${parts[1]}`;

        return NextResponse.json({
            success: true,
            message: `Verification OTP sent to specified admin email (${maskedEmail})`,
            maskedEmail,
            email: targetEmail
        });
    } catch (err) {
        console.error('Error in send-admin-otp:', err);
        return NextResponse.json({ error: err.message || 'Failed to send OTP.' }, { status: 500 });
    }
}
