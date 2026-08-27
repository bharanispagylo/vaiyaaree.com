'use client';
import { Users, IndianRupee, RefreshCw, ShoppingBag, UserCheck } from 'lucide-react';

export default function CustomerStats({ stats }) {
    const statCards = [
        { 
            label: 'Total Customers', 
            value: stats?.totalCustomers || 0, 
            icon: Users, 
            color: 'hsl(var(--primary))',
            subtext: 'Registered collection'
        },
        { 
            label: 'Average Spend', 
            value: `₹${(stats?.averageSpend || 0).toLocaleString()}`, 
            icon: IndianRupee, 
            color: 'hsl(var(--success))',
            subtext: 'Per registered customer'
        },
        { 
            label: 'Repeat Buyers', 
            value: stats?.repeatCustomers || 0, 
            icon: RefreshCw, 
            color: 'hsl(var(--warning))',
            subtext: 'Placed 2+ orders'
        },
        { 
            label: 'Active Buyers', 
            value: `${stats?.orderedCustomers || 0} / ${stats?.totalCustomers || 0}`, 
            icon: ShoppingBag, 
            color: '#6366f1',
            subtext: `${stats?.unorderedCustomers || 0} non-ordering leads`
        }
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
        }}>
            {statCards.map((stat, i) => (
                <div 
                    key={i} 
                    className="card shadow-premium" 
                    style={{
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '16px',
                        background: '#ffffff',
                        border: '1px solid hsl(var(--border-subtle))',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                >
                    <div>
                        <div style={{ 
                            fontSize: '0.72rem', 
                            color: 'hsl(var(--text-muted))', 
                            fontWeight: 800, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.06em' 
                        }}>
                            {stat.label}
                        </div>
                        <div style={{ 
                            fontSize: '1.75rem', 
                            fontWeight: 800, 
                            marginTop: '0.4rem', 
                            color: '#0f172a',
                            letterSpacing: '-0.02em'
                        }}>
                            {stat.value}
                        </div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'hsl(var(--text-muted))', 
                            marginTop: '0.25rem' 
                        }}>
                            {stat.subtext}
                        </div>
                    </div>

                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: `hsl(from ${stat.color} h s l / 0.12)`,
                        color: stat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <stat.icon size={22} color={stat.color} />
                    </div>
                </div>
            ))}
        </div>
    );
}
