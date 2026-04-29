'use client';
import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopBar from '@/components/AdminTopBar';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const isAdminToken = localStorage.getItem('cast_prince_admin');
        const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/forgot-password';
        
        const checkAuth = async () => {
            if (!isAdminToken) {
                if (!isLoginPage) router.push('/admin/login');
                return;
            }

            try {
                const res = await fetch('/api/admin/verify-session', {
                    headers: { 'Authorization': `Bearer ${isAdminToken}` }
                });
                
                if (res.ok) {
                    setIsAuthorized(true);
                } else {
                    console.warn('[ADMIN-AUTH] Session invalid or expired');
                    localStorage.removeItem('cast_prince_admin');
                    if (!isLoginPage) router.push('/admin/login');
                }
            } catch (err) {
                console.error('[ADMIN-AUTH] Check failed:', err);
                // On network error, we might want to allow offline access if they were already auth'd,
                // but for maximum security, we redirect.
                if (!isLoginPage) router.push('/admin/login');
            }
        };

        checkAuth();
        setSidebarOpen(false);
    }, [pathname, router]);

    if (!mounted) return null;

    const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/forgot-password';

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!isAuthorized) return null;

    return (
        <div className="admin-layout" style={{ fontFamily: 'var(--font-roboto)' }}>
            <AdminSidebar isOpen={isSidebarOpen} />

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

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="main-content" style={{ overflow: 'visible' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
