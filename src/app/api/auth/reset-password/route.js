import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { getAdminSettings } from '@/lib/settings';
import { sendAdminPasswordResetSuccessEmail } from '@/lib/emailService';
import { hashPassword } from '@/lib/hash';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { username, resolvedUsername, identifier, otp, newPassword } = await req.json();

        // Rate limiting: max 5 attempts per 1-minute window
        const rateLimitError = enforceRateLimit(req, 'admin_reset_password', username || resolvedUsername || identifier || 'guest', 5, 60000);
        if (rateLimitError) return rateLimitError;

        if (!otp) {
            return NextResponse.json({ error: 'Verification OTP is required.' }, { status: 400 });
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        // 1. Fetch stored OTP from app_settings
        const { data: otpSetting, error: otpError } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_reset_otp')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (otpError || !otpSetting || !otpSetting.value) {
            return NextResponse.json({ error: 'No active OTP request found. Please request a new code.' }, { status: 400 });
        }

        let storedOtp;
        try {
            storedOtp = typeof otpSetting.value === 'string' ? JSON.parse(otpSetting.value) : otpSetting.value;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid OTP data structure in system.' }, { status: 400 });
        }

        if (!storedOtp || !storedOtp.code) {
            return NextResponse.json({ error: 'No active OTP request found. Please request a new code.' }, { status: 400 });
        }

        // Check if OTP matches and is not expired
        if (storedOtp.code.trim() !== otp.trim()) {
            return NextResponse.json({ error: 'Invalid verification OTP code. Please check your email and try again.' }, { status: 401 });
        }

        if (Date.now() > storedOtp.expires_at) {
            return NextResponse.json({ error: 'Verification OTP has expired. Please click Resend Code to request a new code.' }, { status: 400 });
        }

        // 2. Hash password with PBKDF2
        const hashedPassword = hashPassword(newPassword);

        // 3. Resolve target administrator from request & stored OTP
        const candidates = [
            resolvedUsername,
            username,
            identifier,
            storedOtp.username,
            storedOtp.email
        ]
            .map(s => (s ? String(s).trim() : ''))
            .filter(Boolean);

        let targetAdminUser = null;
        for (const candidate of candidates) {
            try {
                const { data: foundUser } = await mysqlClient
                    .from('admin_users')
                    .select('id, username, email, role, is_active')
                    .or(`username.eq.${candidate},email.eq.${candidate}`)
                    .maybeSingle();

                if (foundUser) {
                    targetAdminUser = foundUser;
                    break;
                }
            } catch (queryErr) {
                console.warn('[RESET-PASSWORD] Candidate lookup warning:', candidate, queryErr?.message);
            }
        }

        let adminUserUpdated = false;

        // 4. Update specific user in admin_users table by primary ID
        if (targetAdminUser && targetAdminUser.id) {
            const { error: userError } = await mysqlClient
                .from('admin_users')
                .update({ 
                    password: hashedPassword,
                    updated_at: new Date().toISOString()
                })
                .eq('id', targetAdminUser.id);
            
            if (userError) {
                console.error('[RESET-PASSWORD] User update error in admin_users:', userError);
                throw userError;
            }
            adminUserUpdated = true;
            console.log(`[RESET-PASSWORD] Successfully updated password in admin_users for user ${targetAdminUser.username} (${targetAdminUser.id})`);
        }

        // 5. Check if settings-based master admin should also be updated
        const settings = await getAdminSettings();
        const masterUsername = settings.admin_username || process.env.ADMIN_USERNAME || 'vaiyaaree';
        const masterEmail = settings.admin_email || process.env.ADMIN_EMAIL || 'vaiyaaree@gmail.com';

        const isMasterAdmin = candidates.some(c => 
            c.toLowerCase() === masterUsername.toLowerCase() || 
            (masterEmail && c.toLowerCase() === masterEmail.toLowerCase())
        );

        // If neither admin_users nor master admin was matched, return an error
        if (!adminUserUpdated && !isMasterAdmin) {
            return NextResponse.json({ error: 'Administrator account not found. Please verify your credentials and try again.' }, { status: 404 });
        }

        // 6. Keep fallback in app_settings updated and invalidate OTP
        const settingsUpdates = [
            { key: 'admin_reset_otp', value: '', updated_at: new Date().toISOString() } // invalidate OTP
        ];

        if (isMasterAdmin || (targetAdminUser && targetAdminUser.username.toLowerCase() === masterUsername.toLowerCase())) {
            settingsUpdates.push({
                key: 'admin_password',
                value: newPassword,
                updated_at: new Date().toISOString()
            });
        }

        const { error: settingsError } = await mysqlClient
            .from('app_settings')
            .upsert(settingsUpdates);

        if (settingsError) throw settingsError;

        // 7. Send confirmation email to the user's verified email
        const targetEmail = storedOtp.email || targetAdminUser?.email || masterEmail;
        if (targetEmail) {
            try {
                await sendAdminPasswordResetSuccessEmail(targetEmail);
            } catch (mailErr) {
                console.warn('[RESET-PASSWORD] Failed to send confirmation email:', mailErr?.message);
            }
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Reset error:', err);
        return NextResponse.json({ error: 'Failed to update password. Try again.' }, { status: 500 });
    }
}
