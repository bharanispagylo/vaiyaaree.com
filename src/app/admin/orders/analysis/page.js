'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { mysqlClient } from '@/lib/mysqlClient';
import { 
    ArrowLeft, IndianRupee, Trophy, Truck, ShoppingCart, 
    Package, RefreshCw, CheckCircle, Calendar, TrendingUp, BarChart3 
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function OrderAnalysisPage() {
    const [timeRange, setTimeRange] = useState('ALL'); // 'DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        deliveredOrders: 0
    });

    const [analyticsData, setAnalyticsData] = useState({
        revenueTrend: [],
        channelData: [],
        statusData: [],
        courierData: [],
        topProducts: []
    });

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('orders')
                .select('id, created_at, status, total_amount, source, courier_name')
                .neq('status', 'DRAFT');
            if (error) throw error;
            const allOrders = data || [];

            const now = new Date();
            let filteredOrders = allOrders;

            // 1. Time Filtering Logic
            if (timeRange === 'DAILY') {
                filteredOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
            } else if (timeRange === 'MONTHLY') {
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            } else if (timeRange === 'QUARTERLY') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === now.getFullYear();
                });
            }

            // Summary Stats Calculation
            const validOrders = filteredOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
            const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const totalOrdersCount = filteredOrders.length;
            const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / (validOrders.length || 1)) : 0;
            const deliveredCount = filteredOrders.filter(o => o.status === 'DELIVERED').length;

            setStats({
                totalOrders: totalOrdersCount,
                totalRevenue: totalRevenue,
                averageOrderValue: avgOrderValue,
                deliveredOrders: deliveredCount
            });

            // 2. Revenue Trend
            const trendMap = {};
            if (timeRange === 'DAILY') {
                for (let i = 0; i < 24; i++) trendMap[`${i}:00`] = 0;
                filteredOrders.forEach(o => {
                    if (o.status !== 'CANCELLED') trendMap[`${new Date(o.created_at).getHours()}:00`] += (o.total_amount || 0);
                });
            } else {
                const daysToFetch = timeRange === 'MONTHLY' ? 30 : timeRange === 'QUARTERLY' ? 90 : 30;
                for (let i = daysToFetch; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    trendMap[d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = 0;
                }
                allOrders.forEach(o => {
                    if (o.status === 'CANCELLED') return;
                    const ds = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    if (trendMap[ds] !== undefined) trendMap[ds] += (o.total_amount || 0);
                });
            }
            const revenueTrend = Object.entries(trendMap).map(([date, amount]) => ({ date, amount }));

            // 3. Channel Data
            const channels = { WEBSITE: 0, WHATSAPP: 0, MANUAL: 0 };
            filteredOrders.forEach(o => {
                const src = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : o.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                channels[src] = (channels[src] || 0) + 1;
            });
            const channelData = [
                { name: 'Website', value: channels.WEBSITE || 0, color: 'hsl(195 85% 40%)' },
                { name: 'WhatsApp', value: channels.WHATSAPP || 0, color: 'hsl(142 71% 45%)' },
                { name: 'Manual', value: (channels.MANUAL || 0) + (channels.ADMIN_MANUAL || 0), color: 'hsl(38 92% 50%)' }
            ].filter(c => c.value > 0);

            // 4. Status Data
            const statusCountsMap = {};
            filteredOrders.forEach(o => { statusCountsMap[o.status] = (statusCountsMap[o.status] || 0) + 1; });
            const statusData = Object.entries(statusCountsMap).map(([name, value]) => ({ name, value }));

            // 5. Courier Analysis
            const couriers = {};
            filteredOrders.forEach(o => {
                if (o.courier_name) couriers[o.courier_name] = (couriers[o.courier_name] || 0) + 1;
            });
            const courierData = Object.entries(couriers).map(([name, value]) => ({ name, value }));

            // 6. Top Products
            const orderIds = filteredOrders.map(o => o.id);
            let topProducts = [];
            if (orderIds.length > 0) {
                const { data: items } = await mysqlClient.from('order_items').select('product_name, quantity').in('order_id', orderIds);
                const prodMap = {};
                items?.forEach(i => { prodMap[i.product_name] = (prodMap[i.product_name] || 0) + i.quantity; });
                topProducts = Object.entries(prodMap).map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value).slice(0, 5);
            }

            setAnalyticsData({ revenueTrend, channelData, statusData, courierData, topProducts });
        } catch (err) {
            console.error('Orders Analytics Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <Link href="/admin/orders" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'hsl(var(--text-main))' }}>Order Analytics</h1>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>Comprehensive sales performance, revenue metrics, and channel breakdown</p>
                    </div>
                </div>

                {/* Time Range Filter Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(var(--bg-card))', padding: '6px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                    {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => setTimeRange(r)} 
                            style={{
                                padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, transition: 'all 0.2s',
                                background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overall Metric Stats Grid */}
            <div className="admin-grid-4" style={{ marginBottom: '2rem' }}>
                {[
                    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: 'hsl(var(--primary))' },
                    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'hsl(var(--success))' },
                    { label: 'Average Order Value', value: `₹${stats.averageOrderValue.toLocaleString()}`, icon: TrendingUp, color: '#f59e0b' },
                    { label: 'Delivered Orders', value: stats.deliveredOrders.toLocaleString(), icon: CheckCircle, color: '#10b981' }
                ].map((stat, i) => (
                    <div key={i} className="card shadow-premium" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
                        </div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `hsl(from ${stat.color} h s l / 0.1)`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <stat.icon size={22} color={stat.color} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Primary Charts Row */}
            <div className="admin-grid-2" style={{ marginBottom: '2rem' }}>
                {/* Revenue Trend */}
                <div className="card shadow-premium" style={{ padding: '1.75rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IndianRupee size={20} color="hsl(var(--success))" /> {timeRange} Revenue Trend
                    </h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData.revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevPage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                <Area type="monotone" dataKey="amount" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorRevPage)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Best Selling Products */}
                <div className="card shadow-premium" style={{ padding: '1.75rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="#f59e0b" /> Top Selling Products ({timeRange})
                    </h3>
                    <div style={{ height: '320px' }}>
                        {analyticsData.topProducts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={analyticsData.topProducts} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border-subtle))" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                                No product data available for this range
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Distribution Charts Row */}
            <div className="admin-grid-3">
                {/* Courier Distribution */}
                <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={18} color="#10b981" /> Courier Partners
                    </h3>
                    <div style={{ height: '260px' }}>
                        {analyticsData.courierData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={analyticsData.courierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={5}>
                                        {analyticsData.courierData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                No courier data assigned
                            </div>
                        )}
                    </div>
                </div>

                {/* Channel Distribution */}
                <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={18} color="hsl(var(--primary))" /> Order Sources
                    </h3>
                    <div style={{ height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analyticsData.channelData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                                    {analyticsData.channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} color="hsl(var(--accent))" /> Order Status Breakdown
                    </h3>
                    <div style={{ height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
