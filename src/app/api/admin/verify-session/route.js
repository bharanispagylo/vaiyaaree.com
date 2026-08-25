import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAdminSettings } from '@/lib/settings';
import { mysqlClient } from '@/lib/mysqlClient';

export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        
        if (auth.authorized) {
            // Check if username was passed in headers from client session
            const reqUsername = request.headers.get('x-admin-username') || request.headers.get('X-Admin-Username');
            
            if (reqUsername) {
                const { data: dbUser } = await mysqlClient
                    .from('admin_users')
                    .select('username, email, full_name, role')
                    .or(`username.eq.${reqUsername},email.eq.${reqUsername}`)
                    .eq('is_active', true)
                    .maybeSingle();

                if (dbUser) {
                    return NextResponse.json({
                        success: true,
                        admin: {
                            username: dbUser.username,
                            email: dbUser.email || '',
                            full_name: dbUser.full_name || dbUser.username,
                            role: dbUser.role || 'Admin'
                        }
                    });
                }
            }

            // Fallback to latest active logged-in admin from admin_users table
            const { data: latestAdmin } = await mysqlClient
                .from('admin_users')
                .select('username, email, full_name, role')
                .eq('is_active', true)
                .order('last_login', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestAdmin) {
                return NextResponse.json({
                    success: true,
                    admin: {
                        username: latestAdmin.username,
                        email: latestAdmin.email || '',
                        full_name: latestAdmin.full_name || latestAdmin.username,
                        role: latestAdmin.role || 'Admin'
                    }
                });
            }

            const settings = await getAdminSettings();
            return NextResponse.json({
                success: true,
                admin: {
                    username: settings.admin_username || 'dhanush',
                    email: settings.admin_email || 'kawasakilover57@gmail.com',
                    full_name: 'Dhanush Kumar',
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
