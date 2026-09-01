'use client';
import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopBar from '@/components/AdminTopBar';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/forgot-password';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return <ProtectedAdminLayout pathname={pathname}>{children}</ProtectedAdminLayout>;
}

function ProtectedAdminLayout({ children, pathname }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const isAdminToken = localStorage.getItem('cast_prince_admin');
        
        const checkAuth = async () => {
            if (!isAdminToken) {
                setIsAuthorized(false);
                router.push('/admin/login');
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
                    setIsAuthorized(false);
                    router.push('/admin/login');
                }
            } catch (err) {
                console.error('[ADMIN-AUTH] Check failed:', err);
                router.push('/admin/login');
            }
        };

        checkAuth();
        setSidebarOpen(false);
    }, [pathname]);

    if (!mounted || !isAuthorized) return null;

    return (
        <div className="admin-layout" style={{ fontFamily: 'var(--font-roboto)' }}>
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
