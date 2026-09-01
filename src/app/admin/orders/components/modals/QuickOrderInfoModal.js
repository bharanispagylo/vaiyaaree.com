'use client';

import React from 'react';
import { X, Tag, Truck, ExternalLink, Loader2 } from 'lucide-react';
import { 
    formatOrderInvoice, 
    toIST, 
    getStatusReference, 
    formatDisplayPhoneNumber, 
    getItemImageUrl, 
    parseCourierDetails 
} from '../../utils/ordersHelpers';

export default function QuickOrderInfoModal({ infoModalOrder, onClose, allProducts = [] }) {
    if (!infoModalOrder) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
            <div className="animate-enter card shadow-premium" style={{ padding: '0', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '16px' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Order {formatOrderInvoice(infoModalOrder)}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Placed on {toIST(infoModalOrder.created_at)}</div>
                    </div>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem' }}><X size={18} /></button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>Customer Overview</div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', wordBreak: 'break-word', color: 'hsl(var(--text-main))' }}>{infoModalOrder.customer_name || 'Guest'}</div>
                            <div style={{ fontSize: '0.85rem', marginTop: '6px', fontWeight: 500 }}>{formatDisplayPhoneNumber(infoModalOrder.customer_phone)}</div>
                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-all', marginTop: '2px' }}>{infoModalOrder.customer_email || 'No email provided'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 700, letterSpacing: '0.5px' }}>Order Status</div>
                            <div><span className={`badge ${getStatusReference(infoModalOrder.status)}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>{infoModalOrder.status}</span></div>
                            <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>Total Price :</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--success))' }}>₹{(infoModalOrder.total_amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>Payment Method :</div>
                                <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}>{infoModalOrder.payment_method || '—'}</div>
                            </div>
                        </div>
                    </div>
                    
                    {infoModalOrder.items ? (
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Order Items</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {infoModalOrder.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <img 
                                            src={getItemImageUrl(item, allProducts)} 
                                            alt={item.product_name || 'Product'} 
                                            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', flexShrink: 0 }} 
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=80';
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, wordBreak: 'break-word', color: 'hsl(var(--text-main))', lineHeight: '1.2' }}>{item.product_name}</div>
                                            {item.variant_name ? (
                                                <div style={{ marginTop: '4px' }}>
                                                    <span style={{ fontSize: '0.74rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                        <Tag size={11} /> Variant: {item.variant_name}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, flexShrink: 0, whiteSpace: 'nowrap', color: 'hsl(var(--success))' }}>{item.quantity} x ₹{Number(item.price_at_time || item.price || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                ))}
                                {infoModalOrder.items.length === 0 && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '1rem' }}>No items found.</div>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--text-muted))', margin: '0 auto' }} /></div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>Shipping Address</div>
                        <div style={{ fontSize: '0.9rem', wordBreak: 'break-word', color: 'hsl(var(--text-main))' }}>
                            {(() => {
                                let addr = infoModalOrder.shipping_address || infoModalOrder.delivery_address;
                                if (typeof addr === 'string' && addr.trim().startsWith('{')) {
                                    try { addr = JSON.parse(addr); } catch(e) {}
                                }
                                if (typeof addr === 'object' && addr !== null) {
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ fontWeight: 700 }}>{addr.name || infoModalOrder.customer_name}</div>
                                            {(addr.mobile || addr.phone) && <div style={{ fontSize: '0.85rem' }}>Mobile: {formatDisplayPhoneNumber(addr.mobile || addr.phone)}</div>}
                                            {addr.email && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-all' }}>{addr.email}</div>}
                                            <div style={{ marginTop: '0.5rem', lineHeight: '1.5', color: 'hsl(var(--text-main))' }}>
                                                {[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                                            </div>
                                        </div>
                                    );
                                }
                                return <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{String(addr || 'Same as billing')}</div>;
                            })()}
                        </div>
                    </div>

                    {(() => {
                        const courierInfo = parseCourierDetails(infoModalOrder);
                        if (!courierInfo.name && !courierInfo.trackingNumber) return null;
                        return (
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Logistics Details</div>
                                <div style={{ fontSize: '0.85rem', background: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '12px', border: '1px dashed hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ fontWeight: 700, color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Truck size={16} /> Courier: {courierInfo.name || 'Dispatched'}
                                        </div>
                                        {courierInfo.trackingUrl && (
                                            <a
                                                href={courierInfo.trackingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: '#ffffff',
                                                    background: 'hsl(var(--primary))',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <ExternalLink size={12} /> Track Package
                                            </a>
                                        )}
                                    </div>
                                    {courierInfo.trackingNumber && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>AWB Track ID:</span> 
                                            <span style={{ fontFamily: 'var(--font-roboto)', fontWeight: 800, background: 'hsl(var(--text-main))', color: 'white', padding: '3px 8px', borderRadius: '4px', letterSpacing: '1px', fontSize: '0.85rem' }}>
                                                {courierInfo.trackingNumber}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
