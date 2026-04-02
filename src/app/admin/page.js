'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { IndianRupee, ShoppingCart, Users, Package, TrendingUp, Loader2, ArrowUpRight, MessageCircle, Eye, Smartphone, AlertTriangle, Trophy, Truck } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, pending: 0, shipped: 0, delivered: 0, whatsappOrders: 0, todayOrders: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Parallel queries — only fetch required columns
                const [ordersRes, productsRes, itemsRes] = await Promise.all([
                    supabase
                        .from('orders')
                        .select('id, status, total_amount, customer_phone, customer_name, created_at, payment_method')
                        .neq('status', 'DRAFT')
                        .order('created_at', { ascending: false })
                        .limit(200), // cap at 200 for speed
                    supabase
                        .from('products')
                        .select('id, name, stock, image_url')
                        .order('stock', { ascending: true })
                        .limit(10),
                    supabase
                        .from('order_items')
                        .select('product_name, quantity, price_at_time')
                        .limit(500), // cap to avoid huge payloads
                ]);

                const orders = ordersRes.data || [];
                const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
                const today = new Date().toISOString().split('T')[0];

                const totalRevenue = activeOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
                const uniqueCustomers = new Set(activeOrders.map(o => o.customer_phone)).size;
                const pendingOrders = activeOrders.filter(o => ['PENDING', 'PLACED', 'AWAITING_PAYMENT'].includes(o.status)).length;
                const shippedOrders = activeOrders.filter(o => o.status === 'SHIPPED').length;
                const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED').length;
                const todayOrders = activeOrders.filter(o => o.created_at?.startsWith(today)).length;

                const lowStock = (productsRes.data || []).filter(p => p.stock < 5).slice(0, 5);

                // Aggregate top products
                const productSales = {};
                (itemsRes.data || []).forEach(item => {
                    if (!productSales[item.product_name]) {
                        productSales[item.product_name] = { name: item.product_name, sold: 0, revenue: 0 };
                    }
                    productSales[item.product_name].sold += item.quantity;
                    productSales[item.product_name].revenue += (item.price_at_time || 0) * item.quantity;
                });
                const topSelling = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 5);

                const newStats = { revenue: totalRevenue, orders: activeOrders.length, customers: uniqueCustomers, pending: pendingOrders, shipped: shippedOrders, delivered: deliveredOrders, todayOrders };
                const newRecent = orders.slice(0, 6);

                // Store in cache
                _dashCache = { stats: newStats, recentOrders: newRecent, lowStockProducts: lowStock, topProducts: topSelling };
                _dashCacheTs = Date.now();

                setStats(newStats);
                setRecentOrders(newRecent);
                setLowStockProducts(lowStock);
                setTopProducts(topSelling);
            } catch (error) {
                console.error('Dashboard error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Real-time: only refresh on new orders (force bypass cache)
        const channel = supabase
            .channel('dashboard_orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const getStatusReference = (status) => {
        switch (status) {
            case 'PLACED': case 'PENDING': return 'badge-placed';
            case 'PAID': return 'badge-paid';
            case 'SHIPPED': return 'badge-shipped';
            case 'DELIVERED': return 'badge-delivered';
            case 'CANCELLED': return 'badge-cancelled';
            default: return 'badge';
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '1.1rem' }}>Loading Dashboard...</span>
            </div>
        );
    }

    return (
        <div className="animate-enter">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
                    <p>Business Overview • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href="/admin/orders" className="btn btn-primary">
                        <Smartphone size={18} /> WhatsApp Orders
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="admin-grid-4" style={{ marginBottom: '3rem' }}>
                {[
                    {
                        title: 'Total Revenue',
                        value: `₹${stats.revenue.toLocaleString()}`,
                        icon: IndianRupee,
                        gradient: 'linear-gradient(135deg, hsl(var(--success)), hsl(152 76% 25%))',
                        color: 'hsl(152 76% 95%)',
                        glow: 'hsl(var(--success) / 0.3)'
                    },
                    {
                        title: 'Total Orders',
                        value: stats.orders,
                        icon: ShoppingCart,
                        gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                        color: 'hsl(222 47% 10%)',
                        sub: `${stats.todayOrders} today`,
                        glow: 'hsl(var(--primary) / 0.4)'
                    },
                    {
                        title: 'Pending & Active',
                        value: stats.pending,
                        icon: Package,
                        gradient: 'linear-gradient(135deg, hsl(var(--warning)), hsl(32 95% 40%))',
                        color: 'hsl(32 95% 95%)',
                        glow: 'hsl(var(--warning) / 0.3)'
                    },
                    {
                        title: 'Shipped',
                        value: stats.shipped,
                        icon: Truck,
                        gradient: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(265 50% 40%))',
                        color: 'hsl(265 50% 95%)',
                        glow: 'hsl(var(--secondary) / 0.3)'
                    },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{
                        position: 'relative',
                        padding: '1.5rem',
                        transition: 'transform 0.3s ease'
                    }}>
                        {/* Ambient Glow */}
                        <div style={{
                            position: 'absolute', top: '-40px', right: '-40px',
                            width: '140px', height: '140px', borderRadius: '50%',
                            background: stat.gradient, opacity: 0.12, filter: 'blur(50px)'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, gap: '1rem' }}>
                            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                    fontSize: '0.7rem', color: 'hsl(var(--text-muted))',
                                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {stat.title}
                                </div>
                                <div style={{
                                    fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem',
                                    letterSpacing: '-0.02em', color: 'hsl(var(--text-main))',
                                    fontFamily: 'var(--font-heading)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {stat.value}
                                </div>
                                {stat.sub && (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        fontSize: '0.75rem', color: 'hsl(var(--primary))',
                                        fontWeight: 600, marginTop: '0.5rem',
                                        background: 'hsl(var(--primary) / 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px'
                                    }}>
                                        <TrendingUp size={12} /> {stat.sub}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px',
                                background: 'hsl(var(--primary))', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 10px rgba(0,0,0,0.1)`,
                                color: '#ffffff',
                                flexShrink: 0,
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                position: 'relative'
                            }}>
                                {i === 0 ? <span style={{ display: 'inline-block' }}>₹</span> : <stat.icon size={22} strokeWidth={2.2} />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="admin-grid-2">

                {/* Recent Orders */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Recent Activity</h3>
                        <Link href="/admin/orders" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                            View All
                        </Link>
                    </div>

                    <table style={{ margin: 0 }}>
                        <thead style={{ background: '#f1f5f9' }}>
                            <tr style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ paddingLeft: '2rem' }}>Order</th>
                                <th>Customer</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders yet.</td></tr>
                            ) : (
                                recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td style={{ paddingLeft: '2rem' }}>
                                            <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>#{order.id}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'WhatsApp Customer'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{order.customer_phone}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                            ₹{(order.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                                            <span className={`badge ${getStatusReference(order.status)}`}>{order.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Low Stock */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertTriangle size={18} color="hsl(var(--warning))" />
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Low Stock Alert</h3>
                        </div>
                        <div style={{ padding: '0 1.5rem' }}>
                            {lowStockProducts.length === 0 ? (
                                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.875rem' }}>All products are well stocked ✓</div>
                            ) : (
                                lowStockProducts.map((p, index) => (
                                    <div key={p.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 0',
                                        borderBottom: index < lowStockProducts.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: 'var(--radius-sm)',
                                                overflow: 'hidden', background: '#f1f5f9',
                                                border: '1px solid hsl(var(--border-subtle))'
                                            }}>
                                                {p.image_url ?
                                                    <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={20} color="hsl(var(--text-muted))" />
                                                    </div>
                                                }
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--text-main))' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--danger))', fontWeight: 600 }}>Only {p.stock} left</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '1rem', textAlign: 'center' }}>
                            <Link href="/admin/products" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--primary))' }}>
                                Restock Inventory →
                            </Link>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Trophy size={18} color="hsl(var(--primary))" />
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Top Selling</h3>
                        </div>
                        <div style={{ padding: '0 1.5rem 1.5rem' }}>
                            {topProducts.length === 0 ? (
                                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.875rem' }}>Sales data pending...</div>
                            ) : (
                                topProducts.map((p, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 0',
                                        borderBottom: i < topProducts.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: i === 0 ? 'hsl(var(--primary))' : '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 700,
                                                color: i === 0 ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                                border: i === 0 ? 'none' : '1px solid hsl(var(--border-subtle))'
                                            }}>#{i + 1}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--text-main))' }}>{p.name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{p.revenue.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.sold} sold</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
