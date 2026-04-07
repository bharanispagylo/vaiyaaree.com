import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAdminSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { username, password } = body;
        
        // 1. Try to find in admin_users table (Modern approach)
        const { data: user, error: userError } = await supabase
            .from('admin_users')
            .select('role, password')
            .eq('username', username)
            .eq('is_active', true)
            .maybeSingle();

        if (user) {
            // User FOUND in table. Trust THIS result ONLY.
            if (user.password === password) {
                // Update last login
                await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('username', username);
                return NextResponse.json({ success: true, role: user.role || 'admin', source: 'db_users' });
            } else {
                // Wrong password for the DB user
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        // 2. Fallback to settings mechanism (Only if user NOT found in admin_users table)
        const { admin_username, admin_password } = await getAdminSettings();

        if (username === admin_username && password === admin_password) {
            return NextResponse.json({ success: true, role: 'admin', source: 'db_settings' });
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Fatal Login error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
