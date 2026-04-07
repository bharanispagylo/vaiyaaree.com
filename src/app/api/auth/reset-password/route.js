import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAdminSettings } from '@/lib/settings';

export async function POST(req) {
    try {
        const { username, pin, newPassword } = await req.json();
        const { admin_recovery_pin } = await getAdminSettings();

        if (!pin || pin !== admin_recovery_pin) {
            return NextResponse.json({ error: 'Invalid recovery PIN.' }, { status: 401 });
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        // 1. Update specific user in admin_users table
        if (username) {
            const { error: userError } = await supabase
                .from('admin_users')
                .update({ 
                    password: newPassword,
                    updated_at: new Date().toISOString()
                })
                .eq('username', username);
            
            if (userError) throw userError;
        }

        // 2. Also keep the fallback in app_settings updated for backwards compatibility
        const { error: settingsError } = await supabase
            .from('app_settings')
            .upsert({
                key: 'admin_password',
                value: newPassword,
                updated_at: new Date().toISOString()
            });

        if (settingsError) throw settingsError;

        return NextResponse.json({ success: true, message: 'Password updated successfully across all systems!' });
    } catch (err) {
        console.error('Reset error:', err);
        return NextResponse.json({ error: 'Failed to update password. Try again.' }, { status: 500 });
    }
}
