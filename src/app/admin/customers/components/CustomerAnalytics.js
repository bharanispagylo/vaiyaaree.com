'use client';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function CustomerAnalytics({ 
    analyticsData, 
    timeRange, 
    setTimeRange, 
    onBack 
}) {
    return (
        <div className="animate-enter" style={{ paddingBottom: '3rem' }}>
            {/* Analytics Header with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <button 
                    onClick={onBack} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Customer Analytics</h2>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                        Detailed insights into customer growth, acquisition, and lifetime retention
                    </p>
                </div>
            </div>

            {/* Time Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid hsl(var(--border-subtle))' }}>
                {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                    <button 
                        key={r} 
                        onClick={() => setTimeRange(r)} 
                        style={{
                            padding: '0.45rem 1.1rem', 
                            borderRadius: '8px', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                            color: timeRange === r ? 'white' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Growth Chart */}
            <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                    <TrendingUp size={18} color="hsl(var(--success))" /> New Customer Acquisition
                </h3>
                <div style={{ height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData?.growthData || []} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} 
                                interval={timeRange === 'DAILY' ? 'preserveStartEnd' : 0}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', color: '#ffffff', borderRadius: '10px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                                itemStyle={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}
                                labelStyle={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={timeRange === 'DAILY' ? 24 : 45} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
