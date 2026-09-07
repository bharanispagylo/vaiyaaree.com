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

        // 1. If signed token belongs to system master admin, resolve Super Admin
        if (auth.user?.userId === 'master_admin') {
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

        // 2. Identify user from cryptographically verified token payload (never unauthenticated headers)
        const reqUserId = auth.user?.userId;
        const reqUsername = auth.user?.username;

        if (reqUserId || reqUsername) {
            let query = mysqlClient
                .from('admin_users')
                .select('id, username, email, full_name, role, is_active');

            if (reqUserId) {
                query = query.eq('id', reqUserId);
            } else {
                query = query.eq('username', reqUsername);
            }

            const { data: dbUser } = await query.maybeSingle();

            if (dbUser) {
                if (!dbUser.is_active) {
                    return NextResponse.json({ success: false, error: 'Administrator account has been deactivated.' }, { status: 401 });
                }

                const resolvedRole = dbUser.role || 'admin';
                return NextResponse.json({
                    success: true,
                    admin: {
                        id: dbUser.id,
                        username: dbUser.username,
                        email: dbUser.email || '',
                        full_name: dbUser.full_name || dbUser.username,
                        role: formatAdminRole(resolvedRole),
                        rawRole: resolvedRole
                    }
                });
            }
        }

        // 3. If master static secret is explicitly used by background tasks, resolve Super Admin
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

        // 4. No valid user identified — Reject with 401 so client clears localStorage and redirects to /admin/login
        return NextResponse.json({ 
            success: false, 
            error: 'Session invalid or user not found. Please log in again.' 
        }, { status: 401 });

    } catch (error) {
        console.error('[VERIFY-SESSION ERROR]:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
