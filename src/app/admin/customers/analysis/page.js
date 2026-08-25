'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { mysqlClient } from '@/lib/mysqlClient';
import { 
    ArrowLeft, Users, IndianRupee, RefreshCw, TrendingUp, 
    Award, Crown, Star, Medal, Calendar, ShoppingCart, Loader2 
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, 
    Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from 'recharts';

const TIER_COLORS = {
    VIP: '#8b5cf6',      // Purple
    GOLD: '#f59e0b',     // Amber
    SILVER: '#64748b',   // Slate
    REGULAR: '#3b82f6'   // Blue
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CustomerAnalysisPage() {
    const [timeRange, setTimeRange] = useState('ALL'); // 'DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'
    const [loading, setLoading] = useState(true);
    
    const [stats, setStats] = useState({
        totalCustomers: 0,
        averageSpend: 0,
        repeatCustomers: 0,
        repeatRate: 0,
        vipCount: 0,
        totalRevenue: 0
    });

    const [analyticsData, setAnalyticsData] = useState({
        growthData: [],
        tierData: [],
        repeatRatioData: [],
        topSpenders: []
    });

    useEffect(() => {
        fetchAnalyticsData();
    }, [timeRange]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const { data: allCustomers, error: custErr } = await mysqlClient.from('customers').select('*');
            const { data: allOrders, error: ordErr } = await mysqlClient.from('orders').select('*').neq('status', 'DRAFT');

            if (custErr) console.warn('Customers fetch warning:', custErr);
            if (ordErr) console.warn('Orders fetch warning:', ordErr);

            const normalizePhone = (p) => {
                if (!p) return '';
                const clean = p.replace(/\D/g, '');
                return clean.startsWith('91') ? clean : (clean.length === 10 ? `91${clean}` : clean);
            };

            const customerMap = {};

            (allCustomers || []).forEach(cust => {
                const normPhone = normalizePhone(cust.phone);
                if (normPhone) {
                    customerMap[normPhone] = {
                        phone: normPhone,
                        name: cust.name || 'WhatsApp Customer',
                        totalOrders: 0,
                        totalSpent: 0,
                        lastOrder: cust.created_at,
                        orders: []
                    };
                }
            });

            (allOrders || []).forEach(order => {
                const normPhone = normalizePhone(order.customer_phone);
                if (normPhone) {
                    if (!customerMap[normPhone]) {
                        customerMap[normPhone] = {
                            phone: normPhone,
                            name: order.customer_name || 'User',
                            totalOrders: 0,
                            totalSpent: 0,
                            lastOrder: order.created_at,
                            orders: []
                        };
                    }
                    customerMap[normPhone].totalOrders++;
                    customerMap[normPhone].totalSpent += order.total_amount || 0;
                    customerMap[normPhone].orders.push(order);
                }
            });

            const customerList = Object.values(customerMap);
            const now = new Date();

            const filteredCustomers = customerList.filter(c => {
                let joinedDate = c.lastOrder ? new Date(c.lastOrder) : new Date();
                if (c.orders && c.orders.length > 0) {
                    c.orders.forEach(o => {
                        const oDate = new Date(o.created_at);
                        if (oDate < joinedDate) joinedDate = oDate;
                    });
                }
                c._firstDate = joinedDate;

                if (timeRange === 'DAILY') {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    return joinedDate >= thirtyDaysAgo;
                } else if (timeRange === 'MONTHLY') {
                    const twelveMonthsAgo = new Date();
                    twelveMonthsAgo.setMonth(now.getMonth() - 12);
                    return joinedDate >= twelveMonthsAgo;
                } else if (timeRange === 'QUARTERLY') {
                    const twoYearsAgo = new Date();
                    twoYearsAgo.setFullYear(now.getFullYear() - 2);
                    return joinedDate >= twoYearsAgo;
                }
                return true; // ALL
            });

            // 1. Calculate Growth Data
            const growthMap = new Map();
            filteredCustomers.forEach(c => {
                const d = c._firstDate;
                let label = '';

                if (timeRange === 'DAILY') {
                    label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (timeRange === 'QUARTERLY') {
                    const q = Math.floor(d.getMonth() / 3) + 1;
                    label = `Q${q} ${d.getFullYear()}`;
                } else {
                    label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }

                growthMap.set(label, (growthMap.get(label) || 0) + 1);
            });

            const growthData = Array.from(growthMap.entries()).map(([name, value]) => ({ name, value }));

            // 2. Calculate Tier Data
            let vipCount = 0;
            let goldCount = 0;
            let silverCount = 0;
            let regularCount = 0;

            filteredCustomers.forEach(c => {
                if (c.totalSpent >= 10000) {
                    c.tier = 'VIP';
                    vipCount++;
                } else if (c.totalSpent >= 5000) {
                    c.tier = 'GOLD';
                    goldCount++;
                } else if (c.totalSpent >= 2000) {
                    c.tier = 'SILVER';
                    silverCount++;
                } else {
                    c.tier = 'REGULAR';
                    regularCount++;
                }
            });

            const tierData = [
                { name: 'VIP (≥₹10k)', value: vipCount, color: TIER_COLORS.VIP },
                { name: 'Gold (≥₹5k)', value: goldCount, color: TIER_COLORS.GOLD },
                { name: 'Silver (≥₹2k)', value: silverCount, color: TIER_COLORS.SILVER },
                { name: 'Regular (<₹2k)', value: regularCount, color: TIER_COLORS.REGULAR }
            ].filter(t => t.value > 0);

            // 3. Calculate Repeat vs One-Time Ratio
            const repeatCount = filteredCustomers.filter(c => c.totalOrders > 1).length;
            const oneTimeCount = Math.max(0, filteredCustomers.length - repeatCount);

            const repeatRatioData = [
                { name: 'Repeat Customers', value: repeatCount, color: '#10b981' },
                { name: 'One-Time Customers', value: oneTimeCount, color: '#6366f1' }
            ];

            // 4. Calculate Top Spenders (Top 8)
            const topSpenders = [...filteredCustomers]
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 8);

            // 5. Calculate Metrics
            const totalCust = filteredCustomers.length;
            const totalRev = filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
            const avgSpend = totalCust > 0 ? Math.round(totalRev / totalCust) : 0;
            const repeatRate = totalCust > 0 ? Math.round((repeatCount / totalCust) * 100) : 0;

            setStats({
                totalCustomers: totalCust,
                averageSpend: avgSpend,
                repeatCustomers: repeatCount,
                repeatRate,
                vipCount,
                totalRevenue: totalRev
            });

            setAnalyticsData({
                growthData,
                tierData,
                repeatRatioData,
                topSpenders
            });
        } catch (err) {
            console.error('Customer Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            {/* Header with Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <Link
                        href="/admin/customers"
                        className="btn btn-secondary"
                        style={{ padding: '0.6rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))' }}
                        title="Back to Customers"
                    >
                        <ArrowLeft size={18} color="hsl(var(--text-main))" />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Customer Analysis</h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>In-depth insights into customer acquisition, tier segments, and retention</p>
                    </div>
                </div>

                {/* Time Range Selector Buttons */}
                <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                    {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            style={{
                                padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                fontSize: '0.78rem', fontWeight: 800, transition: 'all 0.2s',
                                background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                            }}
                        >
                            {r === 'ALL' ? 'ALL TIME' : r}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '6rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <Loader2 size={26} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading Customer Analytics...
                </div>
            ) : (
                <>
                    {/* KPI Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Customers</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>{stats.totalCustomers}</div>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} />
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--success))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Spend</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'hsl(var(--success))', fontFamily: 'var(--font-heading)' }}>₹{stats.averageSpend.toLocaleString()}</div>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'hsl(142 70% 45% / 0.1)', color: 'hsl(142 70% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IndianRupee size={20} />
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--warning))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repeat Customers</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'hsl(var(--warning))', fontFamily: 'var(--font-heading)' }}>
                                    {stats.repeatCustomers} <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600 }}>({stats.repeatRate}%)</span>
                                </div>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'hsl(38 92% 50% / 0.1)', color: 'hsl(38 92% 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw size={20} />
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VIP Customers</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: '#8b5cf6', fontFamily: 'var(--font-heading)' }}>{stats.vipCount}</div>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Crown size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Chart Row 1: Acquisition Growth Chart */}
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="hsl(var(--success))" /> Customer Growth & Acquisition Trend
                        </h3>
                        <div style={{ height: '320px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.growthData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ background: '#1e293b', color: '#ffffff', borderRadius: '10px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} 
                                        itemStyle={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}
                                        labelStyle={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}
                                    />
                                    <Bar dataKey="value" name="New Customers" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
