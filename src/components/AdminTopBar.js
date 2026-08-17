'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu, User, ShieldCheck, ChevronDown, Mail, Settings, Users } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

// Map path → page title
const PAGE_TITLES = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/orders': 'Orders',
    '/admin/orders/analysis': 'Order Analysis',
    '/admin/customers': 'Customers',
    '/admin/invoices': 'Invoices',
    '/admin/broadcast': 'Broadcast',
    '/admin/whatsapp': 'WhatsApp Funnel',
    '/admin/settings': 'Settings',
    '/admin/shop-settings': 'Shop Settings',
    '/admin/users': 'User Management',
    '/admin/media': 'Media Gallery',
};

export default function AdminTopBar({ onMenuClick }) {
    const router = useRouter();
    const pathname = usePathname();
    const pageTitle = PAGE_TITLES[pathname] || 'Admin Portal';
    const { user } = useShop();

    // Default admin user state so profile is ALWAYS visible
    const [adminUser, setAdminUser] = useState({
        full_name: '',
        username: '',
        role: 'Super Admin',
        email: ''
    });
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // 1. Read stored admin profile from localStorage
        try {
            const adminStored = typeof window !== 'undefined' ? (localStorage.getItem('cast_prince_admin_user') || localStorage.getItem('cast_prince_user')) : null;
            if (adminStored) {
                const parsed = JSON.parse(adminStored);
                if (parsed && (parsed.full_name || parsed.username || parsed.role)) {
                    setAdminUser(prev => ({ ...prev, ...parsed }));
                }
            } else if (user && (user.full_name || user.username || user.role)) {
                setAdminUser(prev => ({ ...prev, ...user }));
            }
        } catch (e) {
            console.error('[AdminTopBar] Error reading stored admin profile:', e);
        }

        // 2. Fetch fresh session info from verify-session API
        const token = typeof window !== 'undefined' ? localStorage.getItem('cast_prince_admin') : null;
        if (token) {
            fetch('/api/admin/verify-session', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.admin) {
                        setAdminUser(prev => {
                            const newFullName = (data.admin.full_name && data.admin.full_name !== 'Administrator') 
                                ? data.admin.full_name 
                                : (prev.full_name && prev.full_name !== 'Administrator' ? prev.full_name : (data.admin.username || prev.username || ''));
                            return {
                                ...prev,
                                ...data.admin,
                                full_name: newFullName
                            };
                        });
                    }
                })
                .catch(err => console.error('[AdminTopBar] Verify session error:', err));
        }
    }, [user]);

    // Periodic background worker for scheduled posts (runs once on mount and every 60s)
    useEffect(() => {
        const runScheduleProcessor = () => {
            fetch('/api/schedule/process', { method: 'POST' }).catch(() => {});
        };
        runScheduleProcessor();
        const schedInterval = setInterval(runScheduleProcessor, 60000);
        return () => clearInterval(schedInterval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
        localStorage.removeItem('cast_prince_admin');
        localStorage.removeItem('cast_prince_admin_user');
        router.push('/admin/login');
    }

    const rawName = adminUser?.full_name || adminUser?.username || user?.full_name || user?.username;
    const displayName = (rawName && rawName !== 'Administrator') ? rawName : (adminUser?.username || user?.username || 'Admin');
    const displayUsername = adminUser?.username ? `@${adminUser.username}` : (user?.username ? `@${user.username}` : '@admin');
    const displayRole = adminUser?.role || user?.role || 'Super Admin';
    const displayEmail = adminUser?.email || user?.email || 'admin@vaiyaaree.com';
    const initial = displayName ? displayName.charAt(0).toUpperCase() : 'A';

    return (
        <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.75rem',
            background: 'hsl(var(--bg-panel))',
            borderBottom: '1px solid hsl(var(--border-subtle))',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: 'blur(12px)',
        }}>
            {/* Left side — Mobile Toggle & Breadcrumb Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={onMenuClick}
                    className="mobile-menu-btn"
                    style={{
                        padding: '0.45rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer'
                    }}
                >
                    <Menu size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="breadcrumb-prefix" style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
                        Admin /
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                        {pageTitle}
                    </span>
                </div>
            </div>

            {/* Right side — Admin Profile Display ONLY (No Standalone Logout Button) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }} ref={dropdownRef}>
                
                {/* ─── ADMIN PROFILE CARD / CHIP ─── */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.4rem 0.95rem 0.4rem 0.5rem',
                            background: showDropdown ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={e => {
                            if (!showDropdown) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        }}
                        onMouseLeave={e => {
                            if (!showDropdown) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }}
                    >
                        {/* Avatar badge */}
                        <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000000',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            flexShrink: 0
                        }}>
                            {initial}
                        </div>

                        {/* Admin Name & Role label */}
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
                                {displayName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                {displayRole}
                            </span>
                        </div>

                        <ChevronDown
                            size={14}
                            style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                transition: 'transform 0.2s',
                                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                marginLeft: '0.2rem',
                                flexShrink: 0
                            }}
                        />
                    </button>

                    {/* ─── DROPDOWN POPOVER MENU ─── */}
                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.6rem)',
                            right: 0,
                            width: '270px',
                            background: '#111827',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '16px',
                            padding: '1.1rem',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                            zIndex: 100,
                            backdropFilter: 'blur(16px)',
                            animation: 'fadeIn 0.15s ease-out'
                        }}>
                            {/* Profile Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingBottom: '0.9rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#000000',
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    flexShrink: 0
                                }}>
                                    {initial}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {displayName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 500 }}>
                                        {displayUsername}
                                    </div>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        background: 'rgba(99, 102, 241, 0.18)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#c7d2fe',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        <ShieldCheck size={11} color="#818cf8" /> {displayRole}
                                    </div>
                                </div>
                            </div>

                            {/* Email info */}
                            <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.78rem' }}>
                                <Mail size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{displayEmail}</span>
                            </div>

                            {/* Quick Navigation Links */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', margin: '0.4rem 0 0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                <button
                                    onClick={() => { setShowDropdown(false); router.push('/admin/users'); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                                        padding: '0.5rem 0.65rem', borderRadius: '8px',
                                        background: 'transparent', border: 'none',
                                        color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: 500,
                                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Users size={15} style={{ color: '#a5b4fc' }} /> User Management
                                </button>

                                <button
                                    onClick={() => { setShowDropdown(false); router.push('/admin/shop-settings'); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                                        padding: '0.5rem 0.65rem', borderRadius: '8px',
                                        background: 'transparent', border: 'none',
                                        color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: 500,
                                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Settings size={15} style={{ color: '#a5b4fc' }} /> Shop Settings
                                </button>
                            </div>

                            {/* Dropdown Sign Out action */}
                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    padding: '0.6rem',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    borderRadius: '10px',
                                    color: '#f87171',
                                    fontSize: '0.825rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                }}
                            >
                                <LogOut size={15} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .mobile-menu-btn { display: flex !important; }
                    .breadcrumb-prefix { display: none; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}


