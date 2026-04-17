'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';

// Map path → page title
const PAGE_TITLES = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/orders': 'Orders',
    '/admin/customers': 'Customers',
    '/admin/invoices': 'Invoices',
    '/admin/broadcast': 'Broadcast',
    '/admin/whatsapp': 'WhatsApp Funnel',
    '/admin/settings': 'Settings',
};

export default function AdminTopBar({ onMenuClick }) {
    const router = useRouter();
    const pathname = usePathname();
    const pageTitle = PAGE_TITLES[pathname] || 'Admin';

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.clear();
        router.push('/login');
    }

    return (
        <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 2rem',
            background: 'hsl(var(--bg-panel))',
            borderBottom: '1px solid hsl(var(--border-subtle))',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: 'blur(10px)',
        }}>
            {/* Left side — Toggle & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={onMenuClick}
                    className="mobile-menu-btn"
                    style={{
                        padding: '0.4rem', background: 'hsl(var(--bg-card))',
                        border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px',
                        display: 'none', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--text-main))'
                    }}
                >
                    <Menu size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="breadcrumb-prefix" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Admin /</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                        {pageTitle}
                    </span>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .mobile-menu-btn { display: flex !important; }
                    .breadcrumb-prefix { display: none; }
                }
            `}</style>

            {/* Right side — Logout */}
            <button
                onClick={handleLogout}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1.1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '9999px',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.22)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <LogOut size={15} />
                Logout
            </button>
        </div>
    );
}
