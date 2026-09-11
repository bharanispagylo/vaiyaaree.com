'use client';

import React from 'react';
import { Truck, Search, Package, CheckCircle, MapPin, Download } from 'lucide-react';
import { getOrderSourceBadge, getStatusIndex, renderCodPaymentBadges } from './profileHelpers';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

export default function TrackOrderTab({
    trackSearchId,
    setTrackSearchId,
    handleTrackSearch,
    loadingTrack,
    trackOrderData,
    orders = [],
    activeOrders = [],
    onSelectOrder
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><Truck size={20} /> Track Orders</h3>
                    <p className={styles.sectionSubtitle}>Select an order or enter your Invoice ID to view real-time delivery status</p>
                </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Enter Order or Invoice ID (e.g. INV-0001 or WEB-0001)"
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
                        {loadingTrack ? 'Searching...' : 'Track Order'}
                    </button>
                </div>

                {orders && orders.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} /> Select Your Order to Track:
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {orders.slice(0, 6).map(o => {
                                const invDisplay = o.invoice_no || o.id;
                                const isSelected = trackOrderData && (trackOrderData.id === o.id || trackOrderData.invoice_no === o.invoice_no);
                                return (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => {
                                            if (onSelectOrder) onSelectOrder(o);
                                        }}
                                        style={{
                                            padding: '0.45rem 0.85rem',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid #5d0821' : '1px solid #cbd5e1',
                                            background: isSelected ? '#5d0821' : '#ffffff',
                                            color: isSelected ? '#ffffff' : '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{invDisplay}</span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                            color: isSelected ? '#ffffff' : '#64748b'
                                        }}>
                                            {o.status}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                            <div style={{ marginTop: '6px' }}>
                                {renderCodPaymentBadges(trackOrderData, true)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={`badge ${styles['status' + trackOrderData.status]}`} style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '20px' }}>
                                {trackOrderData.status}
                            </span>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                ₹{(trackOrderData.total_amount || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
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
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDone ? 'hsl(var(--text-main))' : '#000000' }}>{step.label}</div>
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
                                const noImageSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="%2394a3b8">NO IMAGE</text></svg>';
                                let cleanImg = rawImg ? rawImg.split(',')[0].trim() : '';
                                if (cleanImg.includes('images.unsplash.com')) cleanImg = '';
                                const imgUrl = cleanImg || noImageSvg;
                                return (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <img src={imgUrl} alt={item.product_name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = noImageSvg; }} />
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
