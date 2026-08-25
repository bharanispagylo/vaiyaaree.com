import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { getAdminSettings } from '@/lib/settings';
import { verifyPassword, hashPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { username, password } = body;
        
        // 1. Try to find in admin_users table (Modern approach)
        const { data: user, error: userError } = await mysqlClient
            .from('admin_users')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .eq('is_active', true)
            .maybeSingle();

        if (user) {
            const isHashed = user.password && user.password.length === 64; // SHA-256 hex is 64 chars
            
            let isValid = false;
            if (isHashed) {
                isValid = verifyPassword(password, user.password);
            } else {
                // Legacy plaintext check
                isValid = user.password === password;
                
                // Lazy migration: hash the password for future use
                if (isValid) {
                    const newHash = hashPassword(password);
                    await mysqlClient.from('admin_users').update({ password: newHash }).eq('username', username);
                    console.log(`[AUTH] Migrated user ${username} to hashed password.`);
                }
            }

            if (isValid) {
                const token = process.env.ADMIN_API_SECRET || 'fallback_secret_change_me';
                await mysqlClient.from('admin_users').update({ last_login: new Date().toISOString() }).eq('username', username);
                return NextResponse.json({
                    success: true,
                    role: user.role || 'Admin',
                    username: user.username || username,
                    email: user.email || '',
                    full_name: user.full_name || user.username || 'Admin User',
                    token,
                    source: 'db_users'
                });
            } else {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        // 2. Fallback to settings mechanism
        const { admin_username, admin_password, admin_email } = await getAdminSettings();
        if ((username === admin_username || (admin_email && username === admin_email)) && password === admin_password) {
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

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Fatal Login error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
