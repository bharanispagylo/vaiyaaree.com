import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAdminSettings } from '@/lib/settings';

export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        
        if (auth.authorized) {
            const settings = await getAdminSettings();
            return NextResponse.json({
                success: true,
                admin: {
                    username: settings.admin_username || 'admin',
                    email: settings.admin_email || 'admin@vaiyaaree.com',
                    full_name: settings.admin_full_name || settings.admin_username || 'Admin',
                    role: 'Super Admin'
                }
            });
        } else {
            return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
