'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import { IndianRupee, ShoppingCart, Users, Package, TrendingUp, Loader2, ArrowUpRight, MessageCircle, Eye, Smartphone, AlertTriangle, Trophy, Truck, Calendar, RotateCcw } from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const formatDisplayPhoneNumber = (phone) => {
        if (!phone) return '';
        let cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            const part1 = cleaned.substring(2, 7);
            const part2 = cleaned.substring(7);
            return `+91 ${part1} ${part2}`;
        } else if (cleaned.length === 10) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `+91 ${part1} ${part2}`;
        } else if (cleaned.startsWith('91') && cleaned.length > 10) {
            return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
        } else if (cleaned.length > 5) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `${part1} ${part2}`;
        }
        return phone;
    };

    // Filter & raw dataset states
    const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'CUSTOM'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [allOrders, setAllOrders] = useState([]);
    const [allOrderItems, setAllOrderItems] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allReturnRequests, setAllReturnRequests] = useState([]);
    const [customerCount, setCustomerCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [
                ordersRes,
                productsRes,
                itemsRes,
                customerRes,
                returnsRes
            ] = await Promise.all([
                mysqlClient.from('orders')
                    .select('id, invoice_no, total_amount, subtotal, shipping_cost, refund_amount, status, created_at, source, customer_name, customer_phone')
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false }),
                mysqlClient.from('products')
                    .select('id, name, stock, image_url, price, alert_threshold')
                    .order('stock', { ascending: true }),
                mysqlClient.from('order_items')
                    .select('product_name, quantity, price_at_time, order_id')
                    .limit(2000),
                mysqlClient.from('orders')
                    .select('customer_phone', { count: 'exact', head: true }),
                mysqlClient.from('return_requests')
                    .select('id, order_id, status, created_at')
            ]);

            setAllOrders(ordersRes.data || []);
            setAllProducts(productsRes.data || []);
            setAllOrderItems(itemsRes.data || []);
            setAllReturnRequests(returnsRes.data || []);
            setCustomerCount(customerRes.count || 0);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        const channel = mysqlClient
            .channel('dashboard_orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => mysqlClient.removeChannel(channel);
    }, []);

    // Date filtering helper
    const isOrderInDateRange = (dateStr, filter, startStr, endStr) => {
        if (filter === 'ALL') return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        const now = new Date();
        if (filter === 'TODAY') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return d >= startOfToday && d <= endOfToday;
        }
        if (filter === '7D') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return d >= sevenDaysAgo && d <= now;
        }
        if (filter === 'THIS_MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            return d >= startOfMonth && d <= now;
        }
        if (filter === 'CUSTOM') {
            if (startStr) {
                const start = new Date(startStr + 'T00:00:00');
                if (d < start) return false;
            }
            if (endStr) {
                const end = new Date(endStr + 'T23:59:59.999');
                if (d > end) return false;
            }
            return true;
        }
        return true;
    };

    // Calculate metrics reactively based on active date filter
    const { stats, recentOrders, topProducts, topProductsFallback, lowStockProducts } = useMemo(() => {
        const filteredOrders = allOrders.filter(o => isOrderInDateRange(o.created_at, dateFilter, customStartDate, customEndDate));

        let grossRevenue = 0;
        let refundTotal = 0;
        let shippingTotal = 0;
        let netRevenue = 0;

        let pending = 0;
        let shipped = 0;
        let delivered = 0;
        let refunded = 0;
        let returned = 0;
        let cancelled = 0;
        let todayOrders = 0;
        let whatsappOrders = 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const pendingStatuses = new Set(['PENDING', 'PLACED', 'AWAITING_PAYMENT', 'AWAITING PAYMENT', 'awaiting_payment', 'PACKING']);
        const activeOrderIds = new Set();

        filteredOrders.forEach(o => {
            const status = String(o.status || '').toUpperCase();
            const orderTotal = Number(o.total_amount) || 0;
            const orderRefund = Number(o.refund_amount) || 0;
            const orderShipping = Number(o.shipping_cost) || 0;

            const orderDate = new Date(o.created_at);
            if (!isNaN(orderDate.getTime()) && orderDate >= startOfToday && orderDate <= endOfToday) {
                todayOrders++;
            }

            if (o.source === 'WHATSAPP') {
                whatsappOrders++;
            }

            if (pendingStatuses.has(status)) {
                pending++;
            } else if (status === 'SHIPPED') {
                shipped++;
            } else if (status === 'DELIVERED') {
                delivered++;
            } else if (status === 'REFUNDED') {
                refunded++;
            } else if (status === 'CANCELLED') {
                cancelled++;
            } else if (status.includes('RETURN')) {
                returned++;
            }

            // Active orders: exclude CANCELLED, REFUNDED, RETURNED, and DRAFT
            if (status !== 'CANCELLED' && status !== 'REFUNDED' && !status.includes('RETURN') && status !== 'DRAFT') {
                activeOrderIds.add(o.id);
                grossRevenue += orderTotal;
                refundTotal += orderRefund;
                shippingTotal += orderShipping;
                // Net sales revenue deducts refunds and shipping pass-through
                const orderNet = Math.max(0, orderTotal - orderRefund - orderShipping);
                netRevenue += orderNet;
            } else if (status === 'REFUNDED' || status.includes('RETURN')) {
                refundTotal += (orderRefund > 0 ? orderRefund : orderTotal);
            }
        });

        const dateFilteredReturns = (allReturnRequests || []).filter(r => isOrderInDateRange(r.created_at, dateFilter, customStartDate, customEndDate));
        const totalReturns = Math.max(returned, dateFilteredReturns.length);

        const computedStats = {
            totalRevenue: netRevenue,
            revenue: netRevenue, // backwards compatible
            netRevenue,
            grossRevenue,
            refundTotal,
            shippingTotal,
            orders: filteredOrders.length,
            customers: customerCount,
            pending,
            shipped,
            delivered,
            refunded,
            returned: totalReturns,
            cancelled,
            todayOrders,
            whatsappOrders
        };

        // Top Selling products for active orders in this period
        let topSelling = [];
        let isFallback = false;

        if (allOrderItems.length > 0 && activeOrderIds.size > 0) {
            const productSales = {};
            allOrderItems.forEach(item => {
                if (!activeOrderIds.has(item.order_id)) return;
                const key = item.product_name;
                if (!key) return;
                if (!productSales[key]) {
                    productSales[key] = { name: key, sold: 0, revenue: 0 };
                }
                productSales[key].sold += (Number(item.quantity) || 1);
                productSales[key].revenue += ((Number(item.price_at_time) || 0) * (Number(item.quantity) || 1));
            });

            topSelling = Object.values(productSales)
                .sort((a, b) => b.sold - a.sold)
                .slice(0, 5);
        }

        // Fallback: if no sales data in selected range, show top products by price
        if (topSelling.length === 0) {
            isFallback = true;
            topSelling = (allProducts || [])
                .filter(p => p.name)
                .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
                .slice(0, 5)
                .map(p => ({ name: p.name, sold: 0, revenue: Number(p.price) || 0 }));
        }

        const lowStock = (allProducts || []).filter(p => (Number(p.stock) || 0) <= (Number(p.alert_threshold) || 5));

        return {
            stats: computedStats,
            recentOrders: filteredOrders.slice(0, 6),
            topProducts: topSelling,
            topProductsFallback: isFallback,
            lowStockProducts: lowStock
        };
    }, [allOrders, allOrderItems, allProducts, allReturnRequests, customerCount, dateFilter, customStartDate, customEndDate]);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
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

            {/* Date Filter Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.85rem',
                marginBottom: '2rem',
                padding: '0.85rem 1.25rem',
                background: 'hsl(var(--bg-card))',
                border: '1px solid hsl(var(--border-subtle))',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'hsl(var(--text-muted))',
                        marginRight: '0.25rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <Calendar size={15} /> Period:
                    </span>
                    {[
                        { id: 'ALL', label: 'All Time' },
                        { id: 'TODAY', label: 'Today' },
                        { id: '7D', label: 'Last 7 Days' },
                        { id: 'THIS_MONTH', label: 'This Month' },
                        { id: 'CUSTOM', label: 'Custom Range' }
                    ].map(filter => {
                        const isActive = dateFilter === filter.id;
                        return (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setDateFilter(filter.id)}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: isActive ? 700 : 500,
                                    borderRadius: '8px',
                                    border: isActive ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                    background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--bg-app))',
                                    color: isActive ? '#ffffff' : 'hsl(var(--text-main))',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                </div>

                {dateFilter === 'CUSTOM' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>From:</label>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            style={{
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                border: '1px solid hsl(var(--border-subtle))',
                                background: 'hsl(var(--bg-app))',
                                color: 'hsl(var(--text-main))'
                            }}
                        />
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>To:</label>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            style={{
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                border: '1px solid hsl(var(--border-subtle))',
                                background: 'hsl(var(--bg-app))',
                                color: 'hsl(var(--text-main))'
                            }}
                        />
                        {(customStartDate || customEndDate) && (
                            <button
                                type="button"
                                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                                style={{
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid hsl(var(--border-subtle))',
                                    background: 'transparent',
                                    color: 'hsl(var(--text-muted))',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1.25rem',
                marginBottom: '3rem'
            }}>
                {[
                    {
                        title: 'Total Revenue',
                        value: `₹${(stats.totalRevenue ?? stats.revenue ?? 0).toLocaleString()}`,
                        icon: IndianRupee,
                        gradient: 'linear-gradient(135deg, hsl(var(--success)), hsl(152 76% 25%))',
                        color: 'hsl(152 76% 95%)',
                        glow: 'hsl(var(--success) / 0.3)',
                        sub: (stats.refundTotal > 0 || stats.shippingTotal > 0)
                            ? `Net Sales (Gross: ₹${(stats.grossRevenue || 0).toLocaleString()})`
                            : null
                    },
                    {
                        title: 'Total Orders',
                        value: stats.orders,
                        icon: ShoppingCart,
                        gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                        color: 'hsl(222 47% 10%)',
                        glow: 'hsl(var(--primary) / 0.4)',
                        sub: stats.todayOrders > 0 ? `${stats.todayOrders} placed today` : null
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
                        glow: 'hsl(var(--secondary) / 0.3)',
                        sub: stats.delivered > 0 ? `${stats.delivered} delivered` : null
                    },
                    {
                        title: 'Returns & Refunds',
                        value: stats.returned + stats.refunded,
                        icon: RotateCcw,
                        gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        color: '#fef2f2',
                        glow: 'rgba(239, 68, 68, 0.3)',
                        sub: stats.refundTotal > 0 ? `₹${stats.refundTotal.toLocaleString()} refunded` : (stats.returned > 0 ? `${stats.returned} returns` : null)
                    }
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
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '2rem' }}>Invoice No</th>
                                <th>Customer</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>{dateFilter === 'ALL' ? 'No orders yet.' : 'No orders found for this period.'}</td></tr>
                            ) : (
                                recentOrders.map(order => {
                                    const displayInvoiceNo = order.invoice_no 
                                        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
                                        : (order.id ? `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}` : '#INV-0001');

                                    return (
                                        <tr key={order.id} onClick={() => router.push(`/admin/orders?id=${order.id}`)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ paddingLeft: '2rem' }}>
                                                <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{displayInvoiceNo}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'WhatsApp Customer'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(order.customer_phone)}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                                ₹{(order.total_amount || 0).toLocaleString()}
                                            </td>
                                            <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                                                <span className={`badge ${getStatusReference(order.status)}`}>{order.status}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>



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

                    {/* Low Stock Alert */}
                    <div className="card" style={{ padding: 0, border: lowStockProducts.length > 0 ? '1px solid hsl(var(--danger) / 0.3)' : undefined }}>
                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: lowStockProducts.length > 0 ? 'hsl(var(--danger) / 0.04)' : undefined
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'hsl(var(--danger) / 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={16} color="hsl(var(--danger))" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Low Stock Alert</h3>
                                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Products below alert threshold</span>
                                </div>
                            </div>
                            {lowStockProducts.length > 0 && (
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 800,
                                    color: 'hsl(var(--danger))',
                                    background: 'hsl(var(--danger) / 0.1)',
                                    padding: '13px', borderRadius: '20px',
                                    border: '1px solid hsl(var(--danger) / 0.2)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1
                                }}>
                                    {lowStockProducts.length} ITEM{lowStockProducts.length > 1 ? 'S' : ''}
                                </span>
                            )}
                        </div>
                        <div style={{ padding: '0 1.5rem 1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {lowStockProducts.length === 0 ? (
                                <div style={{
                                    padding: '2rem 0', textAlign: 'center',
                                    color: 'hsl(var(--success))', fontSize: '0.875rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <Package size={24} />
                                    <span>All products are well stocked!</span>
                                </div>
                            ) : (
                                lowStockProducts.map((p, i) => {
                                    const threshold = p.alert_threshold || 5;
                                    const stockColor = p.stock === 0
                                        ? 'hsl(0 84% 60%)'
                                        : p.stock <= Math.floor(threshold * 0.3)
                                            ? 'hsl(25 95% 53%)'
                                            : 'hsl(45 93% 47%)';
                                    const stockBg = p.stock === 0
                                        ? 'hsl(0 84% 60% / 0.1)'
                                        : p.stock <= Math.floor(threshold * 0.3)
                                            ? 'hsl(25 95% 53% / 0.1)'
                                            : 'hsl(45 93% 47% / 0.1)';

                                    return (
                                        <div key={p.id || i} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.85rem 0',
                                            borderBottom: i < lowStockProducts.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                                <div style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    background: stockColor, flexShrink: 0,
                                                    boxShadow: p.stock === 0 ? `0 0 8px ${stockColor}` : 'none',
                                                    animation: p.stock === 0 ? 'pulse-dot 1.5s ease-in-out infinite' : 'none'
                                                }} />
                                                <div style={{
                                                    fontWeight: 600, fontSize: '0.875rem',
                                                    color: 'hsl(var(--text-main))',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {p.name}
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', fontWeight: 700,
                                                color: stockColor, background: stockBg,
                                                padding: '0.2rem 0.6rem', borderRadius: '4px',
                                                flexShrink: 0, marginLeft: '0.75rem',
                                                border: `1px solid ${stockColor}20`
                                            }}>
                                                {p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} left`}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {lowStockProducts.length > 0 && (
                            <div style={{
                                padding: '0.75rem 1.5rem',
                                borderTop: '1px solid hsl(var(--border-subtle))',
                                background: 'hsl(var(--bg-app))'
                            }}>
                                <Link href="/admin/products" style={{
                                    fontSize: '0.8rem', fontWeight: 600,
                                    color: 'hsl(var(--primary))',
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    textDecoration: 'none'
                                }}>
                                    Manage Inventory <ArrowUpRight size={14} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
            `}</style>
        </div>
    );
}
