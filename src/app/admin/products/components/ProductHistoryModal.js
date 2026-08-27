'use client';

import { BarChart3, Loader2 } from 'lucide-react';

export default function ProductHistoryModal({
    product,
    historyData = [],
    historyLoading = false,
    onClose
}) {
    if (!product) return null;

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                padding: 0,
                border: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                background: '#ffffff'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid hsl(var(--border-subtle))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={20} color="hsl(var(--primary))" /> Stock History
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>
                            {product.name}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        ← Back to Products
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                    {/* Processed vs Sold KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                {product.total_added || product.stock || 0}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Processed
                            </div>
                        </div>
                        <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--success))' }}>
                                {product.total_sold || 0}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Sold
                            </div>
                        </div>
                    </div>

                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
                        Recent Activity Log
                    </h3>

                    {historyLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <Loader2 className="animate-spin" size={24} />
                        </div>
                    ) : historyData.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: 'hsl(var(--text-muted))',
                            background: '#f1f5f9',
                            borderRadius: '12px',
                            border: '1px dashed hsl(var(--border-subtle))'
                        }}>
                            No history records found for this product.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {historyData.map((h, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        background: '#f1f5f9',
                                        borderRadius: '14px',
                                        border: '1px solid hsl(var(--border-subtle))'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: h.change_type === 'SALE' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                            color: h.change_type === 'SALE' ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: '0.7rem'
                                        }}>
                                            {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                {h.reason || (h.change_type === 'SALE' ? 'Customer Purchase' : 'Inventory Update')}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                {new Date(h.created_at).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>
                                            NEW STOCK
                                        </div>
                                        <div style={{ fontWeight: 800 }}>
                                            {h.new_stock}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
