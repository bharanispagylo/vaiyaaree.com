'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, MessageSquare, LogOut, Megaphone, Facebook, Clock, Truck, TrendingUp, Trophy, Image as ImageIcon, Layout, CreditCard, RefreshCcw, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';


const menuItems = [
    { 
        name: 'Dashboard', 
        icon: TrendingUp, 
        children: [
            { name: 'Dashboard', href: '/admin' },
            { name: 'Analytics', href: '/admin/analytics' }
        ]
    },
    { name: 'Products', href: '/admin/products', icon: ShoppingCart },
    { name: 'Orders', href: '/admin/orders', icon: Package },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { 
        name: 'Invoices', 
        icon: FileText, 
        children: [
            { name: 'Invoices', href: '/admin/invoices' },
            { name: 'Invoice Report', href: '/admin/invoices/report' }
        ]
    },
    { name: 'Refunds', href: '/admin/refunds', icon: RefreshCcw },
    { name: 'Shipping', href: '/admin/shipping', icon: Truck },
    { 
        name: 'Social Media', 
        icon: Megaphone, 
        children: [
            { name: 'Broadcast', href: '/admin/broadcast' },
            { name: 'WhatsApp Funnel', href: '/admin/whatsapp' },
            { name: 'Schedule Post', href: '/admin/schedule' },
            { name: 'Meta Connect', href: '/admin/facebook' }
        ]
    },
    { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
    { name: 'Payment Gateway', href: '/admin/payments', icon: CreditCard },
    { name: 'CMS', href: '/admin/cms', icon: Layout },
    { name: 'Shop Settings', href: '/admin/shop-settings', icon: Settings },
];

export default function AdminSidebar({ isOpen }) {
    const pathname = usePathname();
    const router = useRouter();
    const [logo, setLogo] = useState('/images/cp-logo.png');
    const [openSubMenus, setOpenSubMenus] = useState([]); // Start collapsed, let useEffect expand the active one
    const getLogoUrl = (url) => {
        if (!url) return '/images/cp-logo.png';
        if (url.startsWith('http') || url.startsWith('/')) return url;
        return `/images/${url}`;
    };
    useEffect(() => {
        async function fetchLogo() {
            try {
                const { data } = await supabase.from('app_settings').select('value').eq('key', 'shop_logo').single();
                if (data?.value) setLogo(getLogoUrl(data.value));
            } catch (err) {
                console.error('Fetch Logo Error:', err);
                setLogo('/images/cp-logo.png');
            }
        }
        fetchLogo();
    }, []);

    // Auto-manage sub-menus based on the current page path
    useEffect(() => {
        const activeSubMenu = menuItems.find(item => 
            item.children && item.children.some(child => child.href === pathname)
        );
        if (activeSubMenu) {
            // Only update if it's not already open or if we're moving between groups
            setOpenSubMenus([activeSubMenu.name]);
        } else {
            // If we're on a top-level page, we could close others, 
            // but usually it's better to keep the last one open until another group is picked.
            // However, the user specifically asked for it to NOT show when going to next one.
            setOpenSubMenus([]);
        }
    }, [pathname]);

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.clear(); // Clean up everything
        router.push('/login');
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Brand */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0 0.5rem 2rem', marginBottom: '1.5rem',
                borderBottom: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '40px', height: '40px',
                    filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))'
                }}>
                    <img src={logo} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} 
                        alt="Logo" 
                        onError={(e) => { e.target.src = '/images/cp-logo.png'; }}
                    />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', fontFamily: 'var(--font-roboto)' }}>CAST PRINTZ</h2>
                    <p style={{
                        fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.8)', margin: 0,
                        textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800,
                        fontFamily: 'var(--font-roboto)'
                    }}>Executive Dashboard</p>
                </div>
            </div>

            {/* WhatsApp Status */}
            <div style={{
                margin: '0 0 1.5rem', padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', alignItems: 'center', gap: '0.85rem'
            }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--success))' }} />
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: 'hsl(var(--success))', opacity: 0.3, animation: 'pulse 2s infinite' }} />
                </div>
                <div>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', display: 'block' }}>WhatsApp Active</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', display: 'block' }}>Bot is online</span>
                </div>
            </div>

            {/* Navigation — takes up available space */}
            <nav style={{ flex: 1 }}>
                {menuItems.map((item) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isSubMenuOpen = openSubMenus.includes(item.name);
                    const isActive = pathname === item.href || (hasChildren && item.children.some(child => child.href === pathname));

                    if (hasChildren) {
                        return (
                            <div key={item.name} style={{ display: 'flex', flexDirection: 'column' }}>
                                <button
                                    onClick={() => {
                                        setOpenSubMenus(prev => 
                                            prev.includes(item.name) ? [] : [item.name]
                                        );
                                    }}
                                    className={isActive ? 'active' : ''}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        width: '100%', padding: '0.8rem 1rem',
                                        background: 'transparent', border: 'none',
                                        color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                                        fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        borderRadius: '10px',
                                        fontFamily: 'var(--font-roboto)'
                                    }}
                                >
                                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                                    <ChevronDown 
                                        size={14} 
                                        style={{ 
                                            transform: isSubMenuOpen ? 'rotate(180deg)' : 'rotate(0)', 
                                            transition: 'transform 0.2s',
                                            opacity: 0.5
                                        }} 
                                    />
                                </button>
                                {isSubMenuOpen && (
                                    <div style={{ marginLeft: '1.5rem', marginTop: '0.25rem', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {item.children.map(child => {
                                            const isChildActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={isChildActive ? 'active' : ''}
                                                    style={{
                                                        padding: '0.6rem 1rem',
                                                        fontSize: '0.85rem',
                                                        opacity: isChildActive ? 1 : 0.6,
                                                        fontWeight: isChildActive ? 700 : 400,
                                                        fontFamily: 'var(--font-roboto)'
                                                    }}
                                                >
                                                    {child.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive ? 'active' : ''}
                            onClick={() => {
                                if (isActive) {
                                    window.dispatchEvent(new Event('resetAdminView'));
                                }
                            }}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ─── LOGOUT BUTTON — always visible at bottom ─── */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1rem' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.8rem 1rem',
                        background: 'hsl(var(--danger) / 0.15)',
                        border: '1px solid hsl(var(--danger) / 0.3)',
                        borderRadius: '10px',
                        color: 'hsl(var(--text-on-primary))',
                        fontSize: '0.9rem', fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        letterSpacing: '0.01em',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'hsl(var(--danger) / 0.3)';
                        e.currentTarget.style.borderColor = 'hsl(var(--danger) / 0.5)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'hsl(var(--danger) / 0.15)';
                        e.currentTarget.style.borderColor = 'hsl(var(--danger) / 0.3)';
                    }}
                >
                    <LogOut size={16} />
                    Logout
                </button>

                {/* Admin label */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Logged in as <strong style={{ color: 'hsl(var(--text-on-primary))' }}>Admin</strong>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
            `}</style>
        </aside>
    );
}
