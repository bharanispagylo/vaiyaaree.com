import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAdminSettings } from '@/lib/settings';
import { sendAdminPasswordResetSuccessEmail } from '@/lib/emailService';
import { hashPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { username, otp, newPassword } = await req.json();

        if (!otp) {
            return NextResponse.json({ error: 'Verification OTP is required.' }, { status: 400 });
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        // 1. Fetch stored OTP from app_settings
        const { data: otpSetting, error: otpError } = await supabase
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

        // 2. Hash password if needed and update specific user in admin_users table
        const hashedPassword = hashPassword(newPassword);

        if (username) {
            const { error: userError } = await supabase
                .from('admin_users')
                .update({ 
                    password: hashedPassword,
                    updated_at: new Date().toISOString()
                })
                .or(`username.eq.${username},username.eq.admin`);
            
            if (userError) console.error('User update error in admin_users:', userError);
        } else {
            await supabase
                .from('admin_users')
                .update({ 
                    password: hashedPassword,
                    updated_at: new Date().toISOString()
                });
        }

        // 3. Keep fallback in app_settings updated
        const { error: settingsError } = await supabase
            .from('app_settings')
            .upsert([
                { key: 'admin_password', value: newPassword, updated_at: new Date().toISOString() },
                { key: 'admin_reset_otp', value: '', updated_at: new Date().toISOString() } // invalidate OTP
            ]);

        if (settingsError) throw settingsError;

        // Send confirmation email
        const settings = await getAdminSettings();
        const adminEmail = settings.admin_email || process.env.ADMIN_EMAIL;
        if (adminEmail) {
            await sendAdminPasswordResetSuccessEmail(adminEmail);
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Reset error:', err);
        return NextResponse.json({ error: 'Failed to update password. Try again.' }, { status: 500 });
    }
}
