'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, ShoppingCart, Users, Package, Trophy, Truck, Calendar, Filter, RefreshCw, BarChart3, PieChart as PieChartIcon, ChevronRight, ArrowUpRight, ArrowDownRight, IndianRupee, MapPin, Search } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AnalyticsHub() {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('MONTHLY'); // DAILY, MONTHLY, QUARTERLY, ALL
    const [data, setData] = useState({
        summary: {},
        salesTrends: [],
        topProducts: [],
        courierData: [],
        statusData: [],
        channelData: [],
        categoryData: [],
        locationData: []
    });

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [
                { data: orders },
                { data: products },
                { data: customers },
                { data: orderItems }
            ] = await Promise.all([
                supabase.from('orders').select('*').order('created_at', { ascending: true }),
                supabase.from('products').select('*'),
                supabase.from('customers').select('*'),
                supabase.from('order_items').select('*')
            ]);

            processAnalytics(orders || [], products || [], customers || [], orderItems || [], timeRange);
        } catch (err) {
            console.error('Analytics Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const processAnalytics = (orders, products, customers, orderItems, range) => {
        const now = new Date();
        let filteredOrders = orders;

        // Filter orders based on range for growth calculations
        if (range === 'DAILY') {
            filteredOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                return d.toDateString() === now.toDateString();
            });
        } else if (range === 'MONTHLY') {
            filteredOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (range === 'QUARTERLY') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            filteredOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === now.getFullYear();
            });
        }

        // 1. Summary Stats
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? (o.total_amount || 0) : 0), 0);
        const avgOrderValue = filteredOrders.length ? (totalRevenue / filteredOrders.length) : 0;

        // 2. Sales Trend (Dynamic based on range)
        const trendMap = {};
        let trendData = [];

        if (range === 'DAILY') {
            // Hours of the day
            for (let i = 0; i < 24; i++) trendMap[`${i}:00`] = 0;
            filteredOrders.forEach(o => {
                if (o.status === 'CANCELLED') return;
                const hour = new Date(o.created_at).getHours();
                trendMap[`${hour}:00`] += o.total_amount;
            });
            trendData = Object.entries(trendMap).map(([label, value]) => ({ label, value }));
        } else if (range === 'MONTHLY' || range === 'QUARTERLY' || range === 'ALL') {
            // Group by month
            orders.forEach(o => {
                if (o.status === 'CANCELLED') return;
                const d = new Date(o.created_at);
                const month = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                trendMap[month] = (trendMap[month] || 0) + o.total_amount;
            });
            trendData = Object.entries(trendMap).map(([label, value]) => ({ label, value }));
        }

        // 3. Top Products (By Quantity)
        const prodSalesMap = {};
        orderItems.forEach(item => {
            prodSalesMap[item.product_name] = (prodSalesMap[item.product_name] || 0) + item.quantity;
        });
        const topProducts = Object.entries(prodSalesMap)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 8);

        // 4. Courier Analysis
        const courierMap = {};
        orders.forEach(o => {
            if (!o.courier_name) return;
            courierMap[o.courier_name] = (courierMap[o.courier_name] || 0) + 1;
        });
        const courierData = Object.entries(courierMap).map(([name, value]) => ({ name, value }));

        // 5. Channel/Source Data
        const channels = { WEBSITE: 0, WHATSAPP: 0, MANUAL: 0 };
        orders.forEach(o => {
            const src = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
            channels[src] = (channels[src] || 0) + 1;
        });
        const channelData = Object.entries(channels).map(([name, value]) => ({ name, value }));

        // 6. Locations (States)
        const stateMap = {};
        orders.forEach(o => {
            const state = o.shipping_state || 'Other';
            stateMap[state] = (stateMap[state] || 0) + 1;
        });
        const locationData = Object.entries(stateMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        setData({
            summary: {
                revenue: totalRevenue,
                orders: filteredOrders.length,
                customers: customers.length,
                products: products.length,
                aov: avgOrderValue
            },
            salesTrends: trendData,
            topProducts,
            courierData,
            channelData,
            locationData,
            statusData: Object.entries(orders.reduce((acc, o) => {
                acc[o.status] = (acc[o.status] || 0) + 1;
                return acc;
            }, {})).map(([name, value]) => ({ name, value }))
        });
    };

    useEffect(() => {
        fetchAllData();
    }, [timeRange]);

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="card animate-enter" style={{ padding: '1.5rem', borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0', color: 'hsl(var(--text-main))' }}>{value}</h2>
                    {trend && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trend > 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(trend)}% vs last period
                        </span>
                    )}
                </div>
                <div style={{ padding: '0.75rem', background: `${color}15`, borderRadius: '12px', color: color }}>
                    <Icon size={24} />
                </div>
            </div>
            {/* Subtle background pattern */}
            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03 }}>
                <Icon size={120} />
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Analytics Hub</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Complete cross-platform business intelligence</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                    {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
                                background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Stats */}
            <div className="admin-grid-4">
                <StatCard title="Revenue" value={`₹${(data.summary.revenue || 0).toLocaleString()}`} icon={IndianRupee} color="#6366f1" />
                <StatCard title="Orders" value={data.summary.orders || 0} icon={ShoppingCart} color="#10b981" />
                <StatCard title="Customers" value={data.summary.customers || 0} icon={Users} color="#f59e0b" />
                <StatCard title="Avg. Order" value={`₹${Math.round(data.summary.aov || 0).toLocaleString()}`} icon={TrendingUp} color="#ec4899" />
            </div>

            <div className="admin-grid-2">
                {/* Sales Trend */}
                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="hsl(var(--primary))" /> Sales Performance Trend
                        </h3>
                        <RefreshCw size={16} color="hsl(var(--text-muted))" style={{ cursor: 'pointer' }} onClick={fetchAllData} />
                    </div>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.salesTrends}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                <Tooltip
                                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '2rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={20} color="#f59e0b" /> Best Selling Products
                    </h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={data.topProducts}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border-subtle))" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--text-main))' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }} />
                                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="admin-grid-3">
                {/* Courier Distribution */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={18} color="#10b981" /> Shipping Partners
                    </h3>
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.courierData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {data.courierData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Channels */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={18} color="#6366f1" /> Order Sources
                    </h3>
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                    {data.channelData.map((entry, index) => <Cell key={index} fill={index === 0 ? '#6366f1' : 'hsl(var(--primary))'} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Geography */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={18} color="#ef4444" /> Top Ship-to States
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {data.locationData.map((loc, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px', background: `${COLORS[i]}15`,
                                    color: COLORS[i], display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 800
                                }}>
                                    {i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                        <span>{loc.name}</span>
                                        <span>{loc.value} orders</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
                                        <div style={{ width: `${(loc.value / data.locationData[0].value) * 100}%`, height: '100%', background: COLORS[i], borderRadius: '2px' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
