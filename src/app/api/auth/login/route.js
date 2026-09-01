import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { mysqlClient } from '@/lib/mysqlClient';
import { getAdminSettings } from '@/lib/settings';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sendAdminLoginOTP } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskEmail(email) {
    if (!email || !email.includes('@')) return email || '';
    const [name, domain] = email.split('@');
    const maskedName = name.length > 2 
        ? name[0] + '***' + name[name.length - 1] 
        : name[0] + '***';
    return `${maskedName}@${domain}`;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { username, password } = body;

        // Rate limiting: max 5 login attempts per minute per IP / username
        const rateLimitError = enforceRateLimit(req, 'admin_login', username || 'guest', 5, 60000);
        if (rateLimitError) return rateLimitError;

        if (!username || !username.trim() || !password) {
            return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
        }

        const cleanUsername = username.trim();
        
        // 1. Try to find in admin_users table
        const { data: user, error: userError } = await mysqlClient
            .from('admin_users')
            .select('*')
            .or(`username.eq.${cleanUsername},email.eq.${cleanUsername}`)
            .eq('is_active', true)
            .maybeSingle();

        if (user) {
            const isValid = verifyPassword(password, user.password);

            if (isValid) {
                // Lazy migration to PBKDF2 if password is using old hash or plaintext
                if (!user.password || !user.password.startsWith('pbkdf2:')) {
                    const newPbkdf2Hash = hashPassword(password);
                    await mysqlClient.from('admin_users').update({ 
                        password: newPbkdf2Hash,
                        updated_at: new Date().toISOString()
                    }).eq('id', user.id);
                    console.log(`[AUTH] Successfully migrated user ${cleanUsername} to PBKDF2 password hash.`);
                }

                // Check if 2FA Email OTP is enabled for this admin user
                if (Boolean(user.otp_enabled)) {
                    if (!user.email) {
                        return NextResponse.json({ 
                            error: 'Email OTP is enabled for your account, but no email address is linked. Please contact Super Admin.' 
                        }, { status: 400 });
                    }

                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    const ticket = crypto.randomUUID();
                    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

                    const otpPayload = JSON.stringify({
                        ticket,
                        userId: user.id,
                        username: user.username || cleanUsername,
                        email: user.email,
                        role: user.role || 'Admin',
                        fullName: user.full_name || user.username || 'Admin User',
                        otp,
                        expiresAt,
                        createdAt: new Date().toISOString()
                    });

                    await mysqlClient.from('app_settings').upsert({
                        key: `admin_login_otp_${ticket}`,
                        value: otpPayload,
                        updated_at: new Date().toISOString()
                    });

                    await sendAdminLoginOTP(user.email, otp, user.full_name || user.username);

                    return NextResponse.json({
                        success: true,
                        requires_otp: true,
                        ticket,
                        masked_email: maskEmail(user.email),
                        username: user.username || cleanUsername,
                        message: `A 6-digit verification code has been sent to ${maskEmail(user.email)}`
                    });
                }

                const token = process.env.ADMIN_API_SECRET || 'fallback_secret_change_me';
                await mysqlClient.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
                
                return NextResponse.json({
                    success: true,
                    role: user.role || 'Admin',
                    username: user.username || cleanUsername,
                    email: user.email || '',
                    full_name: user.full_name || user.username || 'Admin User',
                    token,
                    source: 'db_users'
                });
            } else {
                return NextResponse.json({ error: 'Invalid credentials. Please check your username and password.' }, { status: 401 });
            }
        }

        // 2. Fallback to settings mechanism
        const { admin_username, admin_password, admin_email } = await getAdminSettings();
        if ((cleanUsername === admin_username || (admin_email && cleanUsername === admin_email)) && password === admin_password) {
            const token = process.env.ADMIN_API_SECRET || 'fallback_secret_change_me';
            return NextResponse.json({
                success: true,
                role: 'Super Admin',
                username: admin_username || 'admin',
                email: admin_email || '',
                full_name: 'Administrator',
                token,
                source: 'db_settings'
            });
        }

        return NextResponse.json({ error: 'Invalid credentials. Please check your username and password.' }, { status: 401 });
    } catch (error) {
        console.error('Fatal Admin Login error:', error);
        return NextResponse.json({ error: 'Server error. Please try again later.' }, { status: 500 });
    }
}
