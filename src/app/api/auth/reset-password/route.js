import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAdminSettings } from '@/lib/settings';

export async function POST(req) {
    try {
        const { pin, newPassword } = await req.json();
        const { admin_recovery_pin } = await getAdminSettings();

        if (!pin || pin !== admin_recovery_pin) {
            return NextResponse.json({ error: 'Invalid recovery PIN.' }, { status: 401 });
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        // Update admin_password in app_settings table
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'admin_password',
                value: newPassword,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Reset error:', err);
        return NextResponse.json({ error: 'Failed to update password. Try again.' }, { status: 500 });
    }
}
