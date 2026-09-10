'use client';

import React from 'react';
import { Tag, Trash2, Package } from 'lucide-react';
import { getItemImageUrl } from '../../utils/ordersHelpers';

export default function OrderItemsTable({
    orderItems = [],
    isEditingItems,
    allProducts = [],
    onUpdateItem,
    onRemoveItem
}) {
    const activeItems = orderItems.filter(item => (item.returned_quantity || 0) < item.quantity);
    const returnedItems = orderItems.filter(item => (item.returned_quantity || 0) >= item.quantity);

    return (
        <div className="card-sub" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid hsl(var(--border-subtle))',
            padding: '1.5rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ 
                    margin: 0,
                    fontSize: '0.9rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    color: 'hsl(var(--text-muted))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Package size={16} /> Order Items ({activeItems.length})
                </h3>
                {isEditingItems && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        Editing Quantities & Prices
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeItems.map((item, idx) => (
                    <div 
                        key={idx} 
                        style={{ 
                            display: 'flex', 
                            gap: '1.25rem', 
                            background: isEditingItems ? '#fafafa' : '#ffffff', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: `1px solid ${isEditingItems ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border-subtle))'}`,
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}
                    >
                        {/* Thumbnail */}
                        <div style={{ 
                            width: '80px', 
                            height: '100px', 
                            borderRadius: '10px', 
                            overflow: 'hidden', 
                            background: '#f1f5f9', 
                            border: '1px solid hsl(var(--border-subtle))', 
                            flexShrink: 0 
                        }}>
                            <img 
                                src={getItemImageUrl(item, allProducts) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'} 
                                alt={item.product_name || 'Product'} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                }}
                            />
                        </div>

                        {/* Product Information */}
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'hsl(var(--text-main))', lineHeight: 1.3 }}>
                                {item.product_name}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {item.variant_name ? (
                                    <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Tag size={11} /> {item.variant_name}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.72rem', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '5px', fontWeight: 600 }}>
                                        Standard Saree
                                    </span>
                                )}

                                {(item.variant?.sku || item.products?.sku || item.products?.product_no || item.product_id) && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '5px', fontFamily: 'monospace' }}>
                                        SKU: {item.variant?.sku || item.products?.sku || item.products?.product_no || item.product_id}
                                    </span>
                                )}

                                {item.products?.category && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '2px 6px', borderRadius: '5px' }}>
                                        {item.products.category}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Edit or Display Controls */}
                        {isEditingItems ? (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginBottom: '2px' }}>Qty</div>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={item.quantity}
                                        onChange={e => onUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                        style={{ width: '65px', padding: '0.4rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem' }} 
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginBottom: '2px' }}>Price (₹)</div>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        step="any"
                                        value={item.price_at_time}
                                        onChange={e => onUpdateItem(idx, 'price_at_time', parseFloat(e.target.value) || 0)}
                                        style={{ width: '95px', padding: '0.4rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem' }} 
                                    />
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'hsl(var(--success))', minWidth: '80px', textAlign: 'right' }}>
                                    ₹{((item.quantity * item.price_at_time) || 0).toLocaleString()}
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => onRemoveItem(idx)} 
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer' }}
                                    title="Remove Item"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'right', marginLeft: 'auto' }}>
                                <div>
                                    <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>
                                        {item.quantity} x ₹{(Number(item.price_at_time) || 0).toLocaleString()}
                                    </div>
                                    {item.returned_quantity > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                                            ({item.returned_quantity} returned)
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>
                                    ₹{(((item.quantity - (item.returned_quantity || 0)) * item.price_at_time) || 0).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Returned items note */}
                {returnedItems.length > 0 && (
                    <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        <h4 style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
                            Returned Items Archive
                        </h4>
                        {returnedItems.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>{item.product_name} x {item.quantity}</span>
                                <span style={{ fontWeight: 700, color: '#ef4444' }}>RETURNED</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
