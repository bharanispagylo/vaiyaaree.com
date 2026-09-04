'use client';

import React from 'react';
import { Truck, Search, Package, CheckCircle, MapPin, Download } from 'lucide-react';
import { getOrderSourceBadge, getStatusIndex } from './profileHelpers';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

export default function TrackOrderTab({
    trackSearchId,
    setTrackSearchId,
    handleTrackSearch,
    loadingTrack,
    trackOrderData
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><Truck size={20} /> Track Orders</h3>
                    <p className={styles.sectionSubtitle}>Enter your Invoice ID to see real-time order & delivery status</p>
                </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="Enter Invoice ID (e.g. INV-0001)" 
                            value={trackSearchId}
                            onChange={(e) => setTrackSearchId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTrackSearch()}
                            style={{
                                width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem',
                                borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))',
                                fontSize: '0.9rem', fontWeight: 600, outline: 'none'
                            }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    </div>
                    <button 
                        onClick={() => handleTrackSearch()} 
                        disabled={loadingTrack}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem' }}
                    >
                        {loadingTrack ? 'Searching...' : 'Track My Order'}
                    </button>
                </div>
            </div>

            {trackOrderData ? (
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Header Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>INVOICE ID</div>
                            <h3 style={{ margin: '2px 0 0', fontSize: '1.35rem', color: 'hsl(var(--primary))', fontWeight: 800 }}>
                                {trackOrderData.invoice_no ? (trackOrderData.invoice_no.startsWith('#') ? trackOrderData.invoice_no : `#${trackOrderData.invoice_no}`) : `#${String(trackOrderData.id).replace(/^[A-Z]+-/, 'INV-')}`}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '6px' }}>
                                {getOrderSourceBadge(trackOrderData)}
                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                    Placed on {formatOrderDate(trackOrderData.created_at)}
                                </span>
                            </div>
                        </div>
                        <span className={`badge ${styles['status' + trackOrderData.status]}`} style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '20px' }}>
                            {trackOrderData.status}
                        </span>
                    </div>

                    {/* 4-Step Progress Timeline */}
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                        <h5 style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', fontWeight: 800 }}>Delivery Timeline</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', position: 'relative' }}>
                            {[
                                { stage: 'PLACED', label: 'Order Placed', icon: <Package size={18} /> },
                                { stage: 'CONFIRMED', label: 'Confirmed', icon: <CheckCircle size={18} /> },
                                { stage: 'SHIPPED', label: 'Shipped', icon: <Truck size={18} /> },
                                { stage: 'DELIVERED', label: 'Delivered', icon: <MapPin size={18} /> }
                            ].map((step, idx) => {
                                const sIdx = getStatusIndex(trackOrderData.status);
                                const isDelivered = (trackOrderData.status || '').toUpperCase() === 'DELIVERED';
                                const isDone = idx <= sIdx;
                                const stepText = isDelivered ? 'Completed' : (idx === sIdx ? 'In Progress' : (idx < sIdx ? 'Completed' : 'Pending'));
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: isDone ? 'hsl(var(--primary))' : '#e2e8f0',
                                            color: isDone ? '#ffffff' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: isDone ? '0 4px 10px hsl(var(--primary) / 0.3)' : 'none'
                                        }}>
                                            {step.icon}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDone ? 'hsl(var(--text-main))' : '#94a3b8' }}>{step.label}</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDone ? 'hsl(var(--primary))' : '#cbd5e1' }}>
                                            {stepText}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Shipping Carrier Card if exists */}
                    {trackOrderData.tracking_number && (
                        <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Shipment Details</div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#14532d', marginTop: '2px' }}>
                                    {trackOrderData.courier_name || 'BlueDart / Delhivery'} — {trackOrderData.tracking_number}
                                </div>
                            </div>
                            {trackOrderData.tracking_url && (
                                <a href={trackOrderData.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.825rem', borderRadius: '8px', textDecoration: 'none' }}>
                                    Track on Carrier Website
                                </a>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <a 
                            href={`/api/invoice/${trackOrderData.id}?phone=${trackOrderData.customer_phone}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.actionBtnOutline}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                        >
                            <Download size={16} /> Download Invoice
                        </a>
                    </div>

                    {/* Ordered Items Breakdown */}
                    <div>
                        <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: '0 0 0.85rem 0', fontWeight: 800 }}>Order Items Breakdown</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(trackOrderData.order_items || []).map(item => {
                                const rawImg = item.image_url || item.products?.image_url || '';
                                const imgUrl = rawImg ? rawImg.split(',')[0].trim() : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                return (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <img src={imgUrl} alt={item.product_name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'hsl(var(--text-main))' }}>{item.product_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Qty: {item.quantity || 1} • ₹{Number(item.price_at_time || item.price || 0).toLocaleString()} each</div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>₹{(Number(item.price_at_time || item.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <Truck size={48} style={{ opacity: 0.2 }} />
                    <p>Enter an Invoice ID above to track package status</p>
                </div>
            )}
        </section>
    );
}
