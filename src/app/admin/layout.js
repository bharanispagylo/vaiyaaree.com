'use client';
import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopBar from '@/components/AdminTopBar';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/forgot-password';

    if (isLoginPage) {
        return <div className="admin-root-scope" style={{ fontFamily: 'var(--font-admin)' }}>{children}</div>;
    }

    return (
        <div className="admin-root-scope" style={{ fontFamily: 'var(--font-admin)' }}>
            <ProtectedAdminLayout pathname={pathname}>{children}</ProtectedAdminLayout>
        </div>
    );
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

function ProtectedAdminLayout({ children, pathname }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Initial and Route-change Authentication Check
    useEffect(() => {
        setMounted(true);
        
        const checkAuth = async () => {
            const isAdminToken = typeof window !== 'undefined' ? localStorage.getItem('cast_prince_admin') : null;
            if (!isAdminToken) {
                setIsAuthorized(false);
                router.push('/admin/login');
                return;
            }

            // Check if existing session was already marked idle
            const lastActiveStr = localStorage.getItem('cast_prince_admin_last_active');
            if (lastActiveStr) {
                const idleTime = Date.now() - Number(lastActiveStr);
                if (idleTime > IDLE_TIMEOUT_MS) {
                    console.warn('[ADMIN-AUTH] Session expired due to inactivity.');
                    localStorage.removeItem('cast_prince_admin');
                    localStorage.removeItem('cast_prince_admin_user');
                    localStorage.removeItem('cast_prince_admin_last_active');
                    setIsAuthorized(false);
                    router.push('/admin/login?reason=idle_timeout');
                    return;
                }
            } else {
                localStorage.setItem('cast_prince_admin_last_active', String(Date.now()));
            }

            try {
                const headers = { 'Authorization': `Bearer ${isAdminToken}` };
                const res = await fetch('/api/admin/verify-session', { headers });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.admin) {
                        // Keep local profile in sync with verified database role
                        localStorage.setItem('cast_prince_admin_user', JSON.stringify({
                            id: data.admin.id,
                            username: data.admin.username,
                            role: data.admin.role,
                            rawRole: data.admin.rawRole,
                            email: data.admin.email,
                            full_name: data.admin.full_name,
                            login_at: Date.now()
                        }));
                        setIsAuthorized(true);
                        return;
                    }
                }
                
                console.warn('[ADMIN-AUTH] Session invalid or expired');
                localStorage.removeItem('cast_prince_admin');
                localStorage.removeItem('cast_prince_admin_user');
                localStorage.removeItem('cast_prince_admin_last_active');
                setIsAuthorized(false);
                router.push('/admin/login?reason=session_expired');
            } catch (err) {
                console.error('[ADMIN-AUTH] Check failed:', err);
                localStorage.removeItem('cast_prince_admin');
                localStorage.removeItem('cast_prince_admin_user');
                localStorage.removeItem('cast_prince_admin_last_active');
                setIsAuthorized(false);
                router.push('/admin/login?reason=session_expired');
            }
        };

        checkAuth();
        setSidebarOpen(false);
    }, [pathname, router]);

    // Idle Inactivity Detection & Heartbeat Timer
    useEffect(() => {
        let lastRecorded = Date.now();
        const updateActivity = () => {
            const now = Date.now();
            if (now - lastRecorded > 10000) { // Throttle localStorage writes to once every 10s
                lastRecorded = now;
                try {
                    localStorage.setItem('cast_prince_admin_last_active', String(now));
                } catch (_) {}
            }
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

        const timer = setInterval(() => {
            try {
                const token = localStorage.getItem('cast_prince_admin');
                if (!token) return;

                const lastActiveStr = localStorage.getItem('cast_prince_admin_last_active');
                const lastActive = lastActiveStr ? Number(lastActiveStr) : Date.now();
                if (Date.now() - lastActive > IDLE_TIMEOUT_MS) {
                    console.warn('[ADMIN-AUTH] Idle timeout reached (30 minutes of inactivity). Redirecting to login.');
                    localStorage.removeItem('cast_prince_admin');
                    localStorage.removeItem('cast_prince_admin_user');
                    localStorage.removeItem('cast_prince_admin_last_active');
                    setIsAuthorized(false);
                    router.push('/admin/login?reason=idle_timeout');
                }
            } catch (_) {}
        }, 10000);

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(timer);
        };
    }, [router]);

    if (!mounted || !isAuthorized) return null;

    return (
        <div className="admin-layout" style={{ fontFamily: 'var(--font-admin)' }}>
            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        zIndex: 999, backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            <div className="admin-main-wrapper">
                <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="main-content" style={{ overflow: 'visible' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
