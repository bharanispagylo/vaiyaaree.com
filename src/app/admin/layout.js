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
        const isAdmin = localStorage.getItem('cast_prince_admin');
        const isLoginPage = pathname === '/admin/login';
        const isForgotPasswordPage = pathname === '/admin/login/forgot-password';
        
        if (!isAdmin && !isLoginPage && !isForgotPasswordPage) {
            router.push('/admin/login');
        } else {
            setIsAuthorized(true);
        }
        setSidebarOpen(false);
    }, [pathname, router]);

    if (!mounted || !isAuthorized) return null;

    if (pathname === '/admin/login' || pathname === '/admin/login/forgot-password') {
        return <>{children}</>;
    }

    return (
        <div className="admin-layout">
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

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
                <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="main-content" style={{ overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
