import { NextResponse } from 'next/server';
import { verifyAdmin, formatAdminRole } from '@/lib/auth';
import { getAdminSettings } from '@/lib/settings';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        
        if (!auth.authorized) {
            return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        // 1. Identify which username or userId is being verified
        const reqUsername = request.headers.get('x-admin-username') || 
                            request.headers.get('X-Admin-Username') || 
                            auth.user?.username;

        const reqUserId = auth.user?.userId;

        // 2. Query admin_users table for the specific identified user
        if (reqUserId || reqUsername) {
            let query = mysqlClient
                .from('admin_users')
                .select('id, username, email, full_name, role, is_active');

            if (reqUserId) {
                query = query.eq('id', reqUserId);
            } else {
                query = query.or(`username.eq.${reqUsername},email.eq.${reqUsername}`);
            }

            const { data: dbUser } = await query.maybeSingle();

            if (dbUser) {
                if (!dbUser.is_active) {
                    return NextResponse.json({ success: false, error: 'Administrator account has been deactivated.' }, { status: 401 });
                }

                return NextResponse.json({
                    success: true,
                    admin: {
                        id: dbUser.id,
                        username: dbUser.username,
                        email: dbUser.email || '',
                        full_name: dbUser.full_name || dbUser.username,
                        role: formatAdminRole(dbUser.role),
                        rawRole: dbUser.role || 'admin'
                    }
                });
            }
        }

        // 3. If master secret is used without specific user context, resolve system super admin
        if (auth.isMasterSecret) {
            const settings = await getAdminSettings();
            const masterUsername = settings.admin_username || process.env.ADMIN_USERNAME || 'vaiyaaree';
            const masterEmail = settings.admin_email || process.env.ADMIN_EMAIL || 'vaiyaaree@gmail.com';

            return NextResponse.json({
                success: true,
                admin: {
                    id: 'master_admin',
                    username: masterUsername,
                    email: masterEmail,
                    full_name: 'Super Admin',
                    role: 'Super Admin',
                    rawRole: 'super_admin'
                }
            });
        }

        // 4. No valid user identified — Reject with 401 so client redirects to /admin/login
        return NextResponse.json({ 
            success: false, 
            error: 'Session invalid or user not found. Please log in again.' 
        }, { status: 401 });

    } catch (error) {
        console.error('[VERIFY-SESSION ERROR]:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
