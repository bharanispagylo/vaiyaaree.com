'use client';

import { Trophy, Package as PackageIcon } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export default function ProductAnalytics({
    timeRange,
    setTimeRange,
    analyticsData
}) {
    return (
        <div className="animate-enter">
            {/* Time Filters */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '1.5rem',
                background: 'hsl(var(--bg-card))',
                padding: '4px',
                borderRadius: '12px',
                width: 'fit-content',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => setTimeRange(r)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                            color: timeRange === r ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Grid 2: Best Sellers & Stock Health */}
            <div className="admin-grid-2" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Best Sellers */}
                <div className="card shadow-premium" style={{ padding: '1.5rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={18} color="#f59e0b" /> Best Sellers ({timeRange})
                    </h3>
                    <div style={{ height: '300px' }}>
                        {analyticsData.topSellers && analyticsData.topSellers.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.topSellers}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                    <Tooltip contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={34} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                No sales data recorded for this period.
                            </div>
                        )}
                    </div>
                </div>

                {/* Stock Health Monitor */}
                <div className="card shadow-premium" style={{ padding: '1.5rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PackageIcon size={18} color="hsl(var(--success))" /> Stock Health Monitor
                    </h3>
                    <div style={{ height: '300px' }}>
                        {analyticsData.inventoryStatus && analyticsData.inventoryStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analyticsData.inventoryStatus}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analyticsData.inventoryStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                No inventory data available.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collection Distribution */}
            <div className="card shadow-premium" style={{ padding: '1.5rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Collection Distribution</h3>
                <div style={{ height: '300px' }}>
                    {analyticsData.categoryValue && analyticsData.categoryValue.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.categoryValue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--text-muted))' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--text-muted))' }} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                            No category data available.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
