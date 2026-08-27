'use client';

import { Package, Layers, IndianRupee, AlertTriangle } from 'lucide-react';

export default function ProductStats({ totalProducts = 0, totalStock = 0, totalValue = 0, lowStockCount = 0 }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
        }}>
            {/* Total Products */}
            <div className="card shadow-premium" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'hsl(var(--primary) / 0.08)',
                    color: 'hsl(var(--primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Package size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Products
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--text-main))', marginTop: '2px' }}>
                        {Number(totalProducts).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Total Stock Units */}
            <div className="card shadow-premium" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'hsl(var(--accent) / 0.1)',
                    color: 'hsl(var(--accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Layers size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Stock Units
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--text-main))', marginTop: '2px' }}>
                        {Number(totalStock).toLocaleString()} pcs
                    </div>
                </div>
            </div>

            {/* Total Inventory Value */}
            <div className="card shadow-premium" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'hsl(var(--success) / 0.1)',
                    color: 'hsl(var(--success))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IndianRupee size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Inventory Valuation
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--text-main))', marginTop: '2px' }}>
                        ₹{Number(totalValue).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="card shadow-premium" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: lowStockCount > 0 ? 'hsl(var(--danger) / 0.1)' : 'hsl(var(--success) / 0.1)',
                    color: lowStockCount > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Low Stock Alerts
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: lowStockCount > 0 ? 'hsl(var(--danger))' : 'hsl(var(--text-main))', marginTop: '2px' }}>
                        {Number(lowStockCount).toLocaleString()} items
                    </div>
                </div>
            </div>
        </div>
    );
}
