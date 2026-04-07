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
    const [topProductsFallback, setTopProductsFallback] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const today = new Date().toISOString().split('T')[0];
            setLoading(true);
            try {
                const [
                    totalRes,
                    activeRes,
                    pendingRes,
                    shippedRes,
                    deliveredRes,
                    todayRes,
                    productsRes,
                    itemsRes,
                    customerRes
                ] = await Promise.all([
                    supabase.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'DRAFT'),
                    supabase.from('orders').select('total_amount').neq('status', 'DRAFT').neq('status', 'CANCELLED'),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'PLACED', 'AWAITING_PAYMENT', 'AWAITING PAYMENT', 'awaiting_payment']),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'SHIPPED'),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'DELIVERED'),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
                    supabase.from('products').select('id, name, stock, image_url, price').order('stock', { ascending: true }).limit(20),
                    supabase.from('order_items').select('product_name, quantity, price_at_time').limit(2000),
                    supabase.from('orders').select('customer_phone', { count: 'exact', head: true })
                ]);

                // Calculate Revenue
                const totalRevenue = (activeRes.data || []).reduce((s, o) => s + (o.total_amount || 0), 0);

                // Recent orders
                const recentOrdersRes = await supabase.from('orders')
                    .select('id, status, total_amount, customer_phone, customer_name, created_at')
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false })
                    .limit(6);

                const lowStock = (productsRes.data || []).filter(p => p.stock < 5).slice(0, 5);

                // Build top selling from order_items
                const orderItemsData = itemsRes.data || [];
                let topSelling = [];
                let isFallback = false;

                if (orderItemsData.length > 0) {
                    const productSales = {};
                    orderItemsData.forEach(item => {
                        const key = item.product_name;
                        if (!key) return;
                        if (!productSales[key]) {
                            productSales[key] = { name: key, sold: 0, revenue: 0 };
                        }
                        productSales[key].sold += (item.quantity || 1);
                        productSales[key].revenue += ((item.price_at_time || 0) * (item.quantity || 1));
                    });
                    topSelling = Object.values(productSales)
                        .sort((a, b) => b.sold - a.sold)
                        .slice(0, 5);
                }

                // Fallback: no order data → show top 5 products by price
                if (topSelling.length === 0) {
                    isFallback = true;
                    const allProducts = (productsRes.data || []);
                    topSelling = allProducts
                        .filter(p => p.name)
                        .sort((a, b) => (b.price || 0) - (a.price || 0))
                        .slice(0, 5)
                        .map(p => ({ name: p.name, sold: 0, revenue: p.price || 0 }));
                }

                const newStats = {
                    revenue: totalRevenue,
                    orders: totalRes.count || 0,
                    customers: customerRes.count || 0,
                    pending: pendingRes.count || 0,
                    shipped: shippedRes.count || 0,
                    delivered: deliveredRes.count || 0,
                    todayOrders: todayRes.count || 0
                };

                setStats(newStats);
                setRecentOrders(recentOrdersRes.data || []);
                setLowStockProducts(lowStock);
                setTopProducts(topSelling);
                setTopProductsFallback(isFallback);
            } catch (error) {
                console.error('Dashboard error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

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
            case 'PLACED': case 'PENDING': case 'AWAITING_PAYMENT': case 'PACKING': return 'badge-placed';
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
                                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.875rem' }}>All products are well stocked</div>
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
                                Restock Inventory
                            </Link>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Trophy size={18} color="hsl(var(--primary))" />
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Top Selling</h3>
                            </div>
                            {topProductsFallback && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', background: 'hsl(var(--bg-app))', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    FEATURED PRODUCTS
                                </span>
                            )}
                        </div>
                        <div style={{ padding: '0 1.5rem 1.5rem' }}>
                            {topProducts.length === 0 ? (
                                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.875rem' }}>No products found</div>
                            ) : (
                                topProducts.map((p, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 0',
                                        borderBottom: i < topProducts.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                background: i === 0 ? 'hsl(var(--primary))' : i === 1 ? 'hsl(var(--secondary))' : '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 800,
                                                color: i < 2 ? 'white' : 'hsl(var(--text-muted))',
                                                border: i < 2 ? 'none' : '1px solid hsl(var(--border-subtle))',
                                                flexShrink: 0
                                            }}>#{i + 1}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--text-main))', lineHeight: 1.3 }}>{p.name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{(p.revenue || 0).toLocaleString()}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                {topProductsFallback ? 'base price' : `${p.sold} sold`}
                                            </div>
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
