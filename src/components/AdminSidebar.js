'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, MessageSquare, LogOut, Megaphone, Facebook, Clock, Truck, TrendingUp, Trophy, Image as ImageIcon, Layout, CreditCard } from 'lucide-react';

const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: TrendingUp },
    { name: 'Products', href: '/admin/products', icon: ShoppingCart },
    { name: 'Orders', href: '/admin/orders', icon: Package },
    { name: 'Payment Gateway', href: '/admin/payments', icon: CreditCard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: Trophy },
    { name: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
    { name: 'WhatsApp Funnel', href: '/admin/whatsapp', icon: MessageSquare },
    { name: 'Invoices', href: '/admin/invoices', icon: FileText },
    { name: 'Invoice Report', href: '/admin/invoices/report', icon: FileText },
    { name: 'Meta Connect', href: '/admin/facebook', icon: Facebook },
    { name: 'Schedule Post', href: '/admin/schedule', icon: Clock },
    { name: 'Shipping', href: '/admin/shipping', icon: Truck },
    { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
    { name: 'CMS', href: '/admin/cms', icon: Layout },
    { name: 'Shop Settings', href: '/admin/shop-settings', icon: Settings },
];

export default function AdminSidebar({ isOpen }) {
    const pathname = usePathname();
    const router = useRouter();

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
                    fontSize: '2rem',
                    filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))'
                }}>
                    💮
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>CAST PRINTZ</h2>
                    <p style={{
                        fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.8)', margin: 0,
                        textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800
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
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive ? 'active' : ''}
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
