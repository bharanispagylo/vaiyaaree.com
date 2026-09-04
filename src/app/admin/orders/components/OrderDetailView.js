'use client';

import React from 'react';
import { 
    Tag, Trash2, Truck, ExternalLink, Loader2, Download, 
    Send, AlertCircle, XCircle, CreditCard, ShieldAlert, FileText 
} from 'lucide-react';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import { 
    formatOrderInvoice, 
    toIST, 
    formatDisplayPhoneNumber, 
    parseStructuredAddress, 
    getItemImageUrl,
    STATUS_OPTIONS 
} from '../utils/ordersHelpers';

export default function OrderDetailView({
    selectedOrder,
    setSelectedOrder,
    orderItems = [],
    isEditingItems,
    setIsEditingItems,
    orderActivityLogs = [],
    loading = false,
    allProducts = [],
    onBack,
    onSaveEdits,
    onCancelEdit,
    onPrepareEditing,
    onUpdateItem,
    onRemoveItem,
    onReturnItemClick,
    onUpdateStatus,
    openCourierModal,
    onOpenSendInfo,
    onDeleteOrder,
    onResendEmail,
    onResendWhatsApp,
    statusConfirmModal,
    setStatusConfirmModal,
    showCancelModal,
    setShowCancelModal,
    cancelReason,
    setCancelReason,
    handleCancelOrder,
    notificationSelection,
    setNotificationSelection,
    notification,
    isUpdatingStatus = false
}) {
    if (!selectedOrder) return null;

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                width: '100%', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order Details {formatOrderInvoice(selectedOrder)}</h2>
                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span>Placed on {toIST(selectedOrder.created_at)}</span>
                            {isUpdatingStatus && (
                                <span style={{
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: 'hsl(var(--primary))',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <Loader2 size={12} className="animate-spin" /> Updating Status...
                                </span>
                            )}
                            {(() => {
                                const src = selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? 'WEBSITE' : selectedOrder.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                const badgeConfig = {
                                    WEBSITE: { label: 'Website Order', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
                                    MANUAL: { label: 'Manual Order', bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8' },
                                    WHATSAPP: { label: 'WhatsApp Order', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
                                };
                                const config = badgeConfig[src] || badgeConfig.WHATSAPP;
                                return (
                                    <span style={{
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        background: config.bg,
                                        border: `1px solid ${config.border}`,
                                        color: config.color,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {config.label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={onBack} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                            ← Back to Orders
                        </button>
                        {!isEditingItems ? (
                            <button 
                                type="button" 
                                onClick={() => { onPrepareEditing(); setIsEditingItems(true); }} 
                                className="btn btn-primary" 
                                style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                            >
                                Edit Order
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={onCancelEdit} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={onSaveEdits} 
                                    disabled={loading} 
                                    className="btn btn-primary" 
                                    style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </>
                        )}
                        <button 
                            type="button" 
                            onClick={async () => {
                                const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                const blob = new Blob([buf], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            }} 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.8rem' }}
                        >
                            <ExternalLink size={14} /> View Invoice
                        </button>
                        <button 
                            type="button" 
                            onClick={async () => {
                                const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                const blob = new Blob([buf], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Invoice_${selectedOrder.id}.pdf`;
                                a.click();
                            }} 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.8rem' }}
                        >
                            <Download size={14} /> Download
                        </button>
                    </div>
                </div>

                <div style={{ 
                    flex: 1, 
                    padding: '2rem', 
                    display: 'grid', 
                    gridTemplateColumns: isEditingItems ? '1fr' : '1fr 360px', 
                    gridTemplateRows: isEditingItems ? 'auto auto auto' : 'auto 1fr',
                    gap: '2rem',
                    gridTemplateAreas: isEditingItems 
                        ? '"info" "items" "others"' 
                        : '"items info" "items others"'
                }}>

                    {/* Left: Items */}
                    <div style={{ gridArea: 'items' }}>
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>Order Items</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {orderItems.filter(item => (item.returned_quantity || 0) < item.quantity).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: '12px', border: `1px solid ${isEditingItems ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border-subtle))'}` }}>
                                    <div style={{ width: '100px', height: '130px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', flexShrink: 0 }}>
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
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>{item.product_name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {item.variant_name ? (
                                                <span style={{ fontSize: '0.78rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Tag size={12} /> Variant: {item.variant_name}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '5px', fontWeight: 600 }}>
                                                    Simple Product
                                                </span>
                                            )}
                                            {(item.variant?.sku || item.products?.sku || item.products?.product_no || item.product_id) && (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 7px', borderRadius: '5px', fontFamily: 'monospace' }}>
                                                    SKU: {item.variant?.sku || item.products?.sku || item.products?.product_no || item.product_id}
                                                </span>
                                            )}
                                            {item.products?.category && (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '2px 7px', borderRadius: '5px' }}>
                                                    {item.products.category}
                                                </span>
                                            )}
                                            {item.products?.product_group && (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: '5px' }}>
                                                    Group: {item.products.product_group}
                                                </span>
                                            )}
                                        </div>
                                        {isEditingItems ? (
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Qty</div>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        value={item.quantity}
                                                        onChange={e => onUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                        style={{ width: '70px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} 
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Price (₹)</div>
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        value={item.price_at_time}
                                                        onChange={e => onUpdateItem(idx, 'price_at_time', parseFloat(e.target.value) || 0)}
                                                        style={{ width: '110px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} 
                                                    />
                                                </div>
                                                <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--success))' }}>
                                                    ₹{((item.quantity * item.price_at_time) || 0).toLocaleString()}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => onRemoveItem(idx)} 
                                                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>
                                                        {item.quantity} x ₹{(item.price_at_time || 0).toLocaleString()}
                                                    </div>
                                                    {item.returned_quantity > 0 && (
                                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                                                            ({item.returned_quantity} already returned)
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'hsl(var(--success))' }}>
                                                        ₹{(((item.quantity - (item.returned_quantity || 0)) * item.price_at_time) || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {orderItems.filter(item => (item.returned_quantity || 0) >= item.quantity).length > 0 && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <h4 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Successfully Returned Items</h4>
                                    {orderItems.filter(item => (item.returned_quantity || 0) >= item.quantity).map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span>{item.product_name} x {item.quantity}</span>
                                            <span style={{ fontWeight: 700 }}>FULL RETURN</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedOrder.tracking_number && (
                            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '15px', border: '1px dashed hsl(var(--primary) / 0.3)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--primary))', marginBottom: '1rem' }}>
                                    <Truck size={18} /> Shipping & Tracking Information
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Courier Partner</div>
                                        <div style={{ fontWeight: 700 }}>{selectedOrder.courier_name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Tracking Number</div>
                                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-roboto)', letterSpacing: '1px' }}>{selectedOrder.tracking_number}</div>
                                    </div>
                                </div>
                                {selectedOrder.tracking_url && (
                                    <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.8rem' }}>
                                        <ExternalLink size={14} /> Track Package Real-time
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Order Activity Log - Hidden during Edit */}
                        {!isEditingItems && (
                            <div className="card-sub" style={{ marginTop: '2.5rem', padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Order Activity Log</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {orderActivityLogs.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                            No activity recorded yet
                                        </div>
                                    ) : (
                                        orderActivityLogs.map((log, idx) => {
                                            const colors = {
                                                PLACED: { bg: 'hsl(210, 100%, 92%)', color: 'hsl(210, 100%, 35%)', border: 'hsl(210, 100%, 45%)', cardBg: 'hsl(45, 20%, 96%)' },
                                                PAID: { bg: 'hsl(150, 60%, 90%)', color: 'hsl(150, 80%, 25%)', border: 'hsl(150, 70%, 40%)', cardBg: 'hsl(90, 20%, 95%)' },
                                                DELIVERED: { bg: 'hsl(100, 60%, 90%)', color: 'hsl(100, 70%, 25%)', border: 'hsl(100, 60%, 40%)', cardBg: 'hsl(90, 20%, 95%)' },
                                                PACKING: { bg: 'hsl(40, 100%, 90%)', color: 'hsl(40, 100%, 35%)', border: 'hsl(40, 100%, 45%)', cardBg: '#fffdf5' },
                                                SHIPPED: { bg: 'hsl(200, 100%, 92%)', color: 'hsl(200, 100%, 40%)', border: 'hsl(200, 100%, 45%)', cardBg: '#f5fbff' },
                                                CANCELLED: { bg: 'hsl(0, 100%, 95%)', color: 'hsl(0, 100%, 40%)', border: 'hsl(0, 100%, 45%)', cardBg: '#fef5f5' }
                                            };
                                            const c = colors[log.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', cardBg: '#f8fafc' };

                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div style={{ flex: 1, padding: '0.85rem 1.25rem', background: c.cardBg, borderRadius: '8px', borderLeft: `4px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'hsl(var(--text-main))' }}>{log.status}</span>
                                                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                                                                {toIST(log.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </div>
                                                        {log.notes && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', fontWeight: 500, opacity: 0.85 }}>{log.notes}</div>}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top: Customer Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridArea: 'info' }}>
                        {isEditingItems ? (
                            <>
                                {/* Card 1: Shipping Details */}
                                <div>
                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', fontWeight: 700 }}>Shipping Details</h4>
                                    <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                                <input
                                                    placeholder="Full Name"
                                                    value={selectedOrder.shipping_name ?? (selectedOrder.customer_name || '')}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PHONE</label>
                                                <input
                                                    placeholder="Phone Number"
                                                    value={selectedOrder.shipping_phone ?? (selectedOrder.customer_phone || '')}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_phone: e.target.value, customer_phone: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CUSTOMER EMAIL</label>
                                                <input
                                                    placeholder="Customer Email"
                                                    value={selectedOrder.customer_email || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, customer_email: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PINCODE</label>
                                                <input
                                                    placeholder="Pincode"
                                                    value={selectedOrder.shipping_pincode || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_pincode: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ADDRESS LINE</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Flat, Street, Area"
                                                    value={selectedOrder.shipping_address_line || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_address_line: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CITY</label>
                                                <input
                                                    placeholder="City"
                                                    value={selectedOrder.shipping_city || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_city: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>STATE</label>
                                                <select
                                                    value={selectedOrder.shipping_state || 'Tamil Nadu'}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, shipping_state: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                                                >
                                                    {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Billing Details */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: 0, fontWeight: 700 }}>Billing Details</h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedOrder(prev => {
                                                    if (!prev) return prev;
                                                    const currentShip = parseStructuredAddress(
                                                        prev.shipping_address || prev.delivery_address, 
                                                        prev.customer_name, 
                                                        prev.customer_phone
                                                    );
                                                    const sName = prev.shipping_name || currentShip.name || prev.customer_name || '';
                                                    const sPhone = prev.shipping_phone || currentShip.phone || prev.customer_phone || '';
                                                    const sPincode = prev.shipping_pincode || currentShip.pincode || '';
                                                    const sAddressLine = prev.shipping_address_line || currentShip.address_line || '';
                                                    const sCity = prev.shipping_city || currentShip.city || '';
                                                    const sState = prev.shipping_state || currentShip.state || 'Tamil Nadu';

                                                    return {
                                                        ...prev,
                                                        shipping_name: sName,
                                                        shipping_phone: sPhone,
                                                        shipping_pincode: sPincode,
                                                        shipping_address_line: sAddressLine,
                                                        shipping_city: sCity,
                                                        shipping_state: sState,

                                                        billing_name: sName,
                                                        billing_phone: sPhone,
                                                        billing_pincode: sPincode,
                                                        billing_address_line: sAddressLine,
                                                        billing_city: sCity,
                                                        billing_state: sState
                                                    };
                                                });
                                            }}
                                            style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '5px', cursor: 'pointer', fontWeight: 700 }}
                                        >
                                            Same as Shipping Address
                                        </button>
                                    </div>
                                    <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                                <input
                                                    placeholder="Full Name"
                                                    value={selectedOrder.billing_name ?? (selectedOrder.customer_name || '')}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PHONE</label>
                                                <input
                                                    placeholder="Phone Number"
                                                    value={selectedOrder.billing_phone ?? (selectedOrder.customer_phone || '')}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_phone: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PINCODE</label>
                                                <input
                                                    placeholder="Pincode"
                                                    value={selectedOrder.billing_pincode || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_pincode: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CITY</label>
                                                <input
                                                    placeholder="City"
                                                    value={selectedOrder.billing_city || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_city: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ADDRESS LINE</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Flat, Street, Area"
                                                    value={selectedOrder.billing_address_line || ''}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_address_line: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>STATE</label>
                                                <select
                                                    value={selectedOrder.billing_state || 'Tamil Nadu'}
                                                    onChange={e => setSelectedOrder({ ...selectedOrder, billing_state: e.target.value })}
                                                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                                                >
                                                    {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '-0.5rem', fontWeight: 700 }}>Customer Info</h4>
                                <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>{selectedOrder.customer_name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '2px', fontWeight: 500 }}>{formatDisplayPhoneNumber(selectedOrder.customer_phone)}</div>
                                    {selectedOrder.customer_email && (
                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-word', marginTop: '2px' }}>{selectedOrder.customer_email}</div>
                                    )}

                                    <div style={{ marginTop: '1.25rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Billing Address</div>
                                        <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'hsl(var(--text-main))' }}>
                                            {(() => {
                                                let addr = selectedOrder.billing_address || selectedOrder.delivery_address || 'N/A';
                                                if (typeof addr === 'string' && addr.trim().startsWith('{')) { try { addr = JSON.parse(addr); } catch(e){} }
                                                if (typeof addr === 'object' && addr !== null) {
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ fontWeight: 600 }}>{addr.name || selectedOrder.customer_name}</div>
                                                            <div style={{ color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(addr.mobile || addr.phone || selectedOrder.customer_phone)}</div>
                                                            {(addr.email || selectedOrder.billing_email) && <div style={{ color: 'hsl(var(--text-muted))', wordBreak: 'break-word' }}>{addr.email || selectedOrder.billing_email}</div>}
                                                            <div style={{ marginTop: '4px' }}>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>
                                                        </div>
                                                    );
                                                }
                                                return <div style={{ whiteSpace: 'pre-line' }}>{String(addr)}</div>;
                                            })()}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.25rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Shipping Address</div>
                                        <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'hsl(var(--text-main))' }}>
                                            {(() => {
                                                let addr = selectedOrder.shipping_address || selectedOrder.delivery_address || 'Same as billing';
                                                if (typeof addr === 'string' && addr.trim().startsWith('{')) { try { addr = JSON.parse(addr); } catch(e){} }
                                                if (typeof addr === 'object' && addr !== null) {
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ fontWeight: 600 }}>{addr.name || selectedOrder.customer_name}</div>
                                                            <div style={{ color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(addr.mobile || addr.phone || selectedOrder.customer_phone)}</div>
                                                            {(addr.email || selectedOrder.shipping_email) && <div style={{ color: 'hsl(var(--text-muted))', wordBreak: 'break-word' }}>{addr.email || selectedOrder.shipping_email}</div>}
                                                            <div style={{ marginTop: '4px' }}>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>
                                                        </div>
                                                    );
                                                }
                                                return <div style={{ whiteSpace: 'pre-line' }}>{String(addr)}</div>;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom: Summary & Others */}
                    <div style={{ 
                        display: isEditingItems ? 'grid' : 'flex', 
                        flexDirection: 'column', 
                        gridTemplateColumns: isEditingItems ? '1fr 1fr' : 'auto',
                        gap: '1.5rem', 
                        gridArea: 'others' 
                    }}>
                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 2 : 1 }}>
                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', fontWeight: 700 }}>Order Summary</h4>
                            {(() => {
                                const rawDiscount = Number(
                                    selectedOrder.total_discount || 
                                    selectedOrder.discount_amount || 
                                    selectedOrder.coupon_discount || 
                                    selectedOrder.cart_discount || 
                                    0
                                );
                                const rawSubtotal = Number(selectedOrder.subtotal || 0);
                                const subtotalVal = rawSubtotal > 0 
                                    ? rawSubtotal 
                                    : (itemsTotal > 0 
                                        ? itemsTotal 
                                        : Math.max(0, Number(selectedOrder.total_amount || 0) - Number(selectedOrder.tax_amount || 0) - Number(selectedOrder.shipping_cost || 0) + rawDiscount));
                                
                                const rawCgst = Number(selectedOrder.cgst || selectedOrder.cgst_amount || 0);
                                const rawSgst = Number(selectedOrder.sgst || selectedOrder.sgst_amount || 0);
                                const rawIgst = Number(selectedOrder.igst || selectedOrder.igst_amount || 0);
                                const rawTax = Number(selectedOrder.tax_amount || 0);

                                let cgstVal = 0;
                                let sgstVal = 0;
                                if (rawCgst > 0 || rawSgst > 0) {
                                    cgstVal = rawCgst;
                                    sgstVal = rawSgst;
                                } else if (rawTax > 0) {
                                    cgstVal = rawTax / 2;
                                    sgstVal = rawTax / 2;
                                } else if (rawIgst > 0) {
                                    cgstVal = rawIgst / 2;
                                    sgstVal = rawIgst / 2;
                                } else if (subtotalVal > 0) {
                                    cgstVal = Math.round(subtotalVal * 0.025 * 100) / 100;
                                    sgstVal = Math.round(subtotalVal * 0.025 * 100) / 100;
                                }

                                const shippingVal = Number(selectedOrder.shipping_cost || selectedOrder.shipping_fee || 0);
                                const grandTotalVal = Number(selectedOrder.total_amount || 0);

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'hsl(var(--text-main))' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Subtotal:</span>
                                            <span style={{ fontWeight: 600 }}>₹{subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                            <span>CGST (2.5%):</span>
                                            <span>₹{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                            <span>SGST (2.5%):</span>
                                            <span>₹{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        {rawIgst > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                <span>IGST (5%):</span>
                                                <span>₹{rawIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                            <span>Shipping:</span>
                                            <span>{shippingVal > 0 ? `₹${shippingVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Free (₹0.00)'}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                            <span>Discount{selectedOrder.coupon_code ? ` (${selectedOrder.coupon_code})` : ''}:</span>
                                            <span style={{ color: rawDiscount > 0 ? '#dc2626' : 'inherit', fontWeight: rawDiscount > 0 ? 600 : 400 }}>
                                                {rawDiscount > 0 ? `- ₹${rawDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                                            </span>
                                        </div>

                                        <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.5rem 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                            <span>Grand Total:</span>
                                            <span>₹{grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Source & Channel Info Card */}
                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 3 : 1 }}>
                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', fontWeight: 700 }}>Source & Channel Info</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'hsl(var(--text-muted))' }}>Order Source:</span>
                                    {(() => {
                                        const src = selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? 'WEBSITE' : selectedOrder.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                        return (
                                            <span style={{ fontWeight: 800, color: src === 'WEBSITE' ? '#1d4ed8' : src === 'MANUAL' ? '#6b21a8' : '#047857' }}>
                                                {src === 'WEBSITE' ? 'Website Store' : src === 'MANUAL' ? 'Admin Manual Order' : 'WhatsApp Bot'}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'hsl(var(--text-muted))' }}>Payment Channel:</span>
                                    <span style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                        {selectedOrder.payment_method || (selectedOrder.id?.startsWith('WEB-') ? 'Online Payment / COD' : 'Cash / Direct Transfer')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'hsl(var(--text-muted))' }}>Order Type:</span>
                                    <span style={{ fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                                        {selectedOrder.id?.startsWith('WEB-') ? 'Web Cart Purchase' : selectedOrder.id?.startsWith('MAN-') ? 'Admin Panel Invoice' : 'WhatsApp Checkout'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 1 : 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: 0 }}>Actions</h4>
                                {isUpdatingStatus && (
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                                        <Loader2 size={13} className="animate-spin" /> Updating...
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <select
                                        value={selectedOrder.status}
                                        disabled={loading || isUpdatingStatus}
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            if (isUpdatingStatus) return;
                                            setStatusConfirmModal(null);

                                            if (newStatus === 'SHIPPED') {
                                                openCourierModal(selectedOrder, false);
                                            } else if (newStatus === 'CANCELLED') {
                                                setShowCancelModal(true);
                                            } else if (['PAID', 'PACKING', 'DELIVERED'].includes(newStatus)) {
                                                setStatusConfirmModal({
                                                    status: newStatus,
                                                    title: `Confirm ${newStatus}`,
                                                    message: `Change order status to ${newStatus}? This will automatically notify all relevant contacts via WhatsApp and Email.`,
                                                });
                                            } else {
                                                onUpdateStatus(selectedOrder.id, newStatus);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            paddingRight: isUpdatingStatus ? '2.5rem' : '0.75rem',
                                            borderRadius: '8px',
                                            background: isUpdatingStatus ? '#e2e8f0' : '#f1f5f9',
                                            border: isUpdatingStatus ? '1px solid hsl(var(--primary) / 0.5)' : '1px solid hsl(var(--border-subtle))',
                                            color: isUpdatingStatus ? '#64748b' : 'hsl(var(--text-main))',
                                            cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                            opacity: isUpdatingStatus ? 0.75 : 1
                                        }}
                                    >
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {isUpdatingStatus && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'hsl(var(--primary))',
                                            pointerEvents: 'none'
                                        }}>
                                            <Loader2 size={16} className="animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Status Confirmation Modal */}
                                {statusConfirmModal && (
                                    <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#f0f9ff', borderRadius: '10px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertCircle size={14} /> {statusConfirmModal.title}
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                                            {statusConfirmModal.message}
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                disabled={isUpdatingStatus}
                                                onClick={() => setStatusConfirmModal(null)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', opacity: isUpdatingStatus ? 0.6 : 1, cursor: isUpdatingStatus ? 'not-allowed' : 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isUpdatingStatus}
                                                onClick={async () => {
                                                    if (isUpdatingStatus) return;
                                                    await onUpdateStatus(selectedOrder.id, statusConfirmModal.status);
                                                    setStatusConfirmModal(null);
                                                }}
                                                className="btn btn-primary"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    opacity: isUpdatingStatus ? 0.75 : 1,
                                                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isUpdatingStatus ? <><Loader2 size={13} className="animate-spin" /> Updating...</> : 'Confirm'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Cancel Order Modal */}
                                {showCancelModal && (
                                    <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <XCircle size={14} /> Cancel Order
                                        </div>
                                        <textarea
                                            placeholder="Enter cancellation reason..."
                                            value={cancelReason}
                                            disabled={loading || isUpdatingStatus}
                                            onChange={e => setCancelReason(e.target.value)}
                                            rows={2}
                                            style={{ width: '100%', padding: '0.5rem', background: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.85rem', opacity: (loading || isUpdatingStatus) ? 0.7 : 1 }}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                disabled={loading || isUpdatingStatus}
                                                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', opacity: (loading || isUpdatingStatus) ? 0.6 : 1, cursor: (loading || isUpdatingStatus) ? 'not-allowed' : 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelOrder}
                                                disabled={!cancelReason.trim() || loading || isUpdatingStatus}
                                                className="btn btn-primary"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    background: '#ef4444',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    opacity: (!cancelReason.trim() || loading || isUpdatingStatus) ? 0.7 : 1,
                                                    cursor: (!cancelReason.trim() || loading || isUpdatingStatus) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {(loading || isUpdatingStatus) ? <><Loader2 size={13} className="animate-spin" /> Cancelling...</> : 'Confirm Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Shipping Actions Block */}
                                {['PLACED', 'PAID', 'PACKING', 'SHIPPED'].includes(selectedOrder.status) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button type="button" onClick={() => openCourierModal(selectedOrder, false)} className="btn btn-primary" style={{ width: '100%', background: '#0f172a' }}>
                                            <Truck size={16} /> {selectedOrder.courier_name ? 'Update Courier' : 'Select Courier'}
                                        </button>
                                        
                                        {selectedOrder.courier_name && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenSendInfo(selectedOrder, false)}
                                                disabled={loading}
                                                className="btn btn-primary"
                                                style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                            >
                                                {loading && notification?.type === 'info' ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Send Info</>}
                                            </button>
                                        )}

                                        {selectedOrder.tracking_url && (
                                            <a
                                                href={selectedOrder.tracking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary"
                                                style={{ width: '100%', background: '#f0f9ff', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                                            >
                                                <ExternalLink size={16} /> Track Package Real-time
                                            </a>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => onDeleteOrder([selectedOrder.id])}
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        marginTop: '0.5rem',
                                        background: 'hsl(var(--danger) / 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Trash2 size={15} /> Delete Order
                                </button>
                                
                                {!selectedOrder.courier_name && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => onOpenSendInfo(selectedOrder, false)}
                                            className="btn btn-secondary"
                                            style={{ width: '100%', gap: '8px', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)' }}
                                        >
                                            <Send size={16} /> Send Info
                                        </button>
                                    </div>
                                )}

                                {/* Notification Selection Modal (Multi-contact) */}
                                {notificationSelection && (
                                    <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Send size={14} />
                                            Select {notificationSelection.type === 'email' ? 'Email' : 'Phone'}
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                                            Multiple {notificationSelection.type}s found. Please select which one to use:
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => notificationSelection.type === 'email' ? onResendEmail(notificationSelection.billing) : onResendWhatsApp(notificationSelection.billing)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                            >
                                                <strong>Billing:</strong> {notificationSelection.billing}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => notificationSelection.type === 'email' ? onResendEmail(notificationSelection.shipping) : onResendWhatsApp(notificationSelection.shipping)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                            >
                                                <strong>Shipping:</strong> {notificationSelection.shipping}
                                            </button>
                                            <button type="button" onClick={() => setNotificationSelection(null)} className="btn" style={{ fontSize: '0.8rem', background: '#f1f5f9', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transaction ID & Payment Info */}
                        {(selectedOrder.transaction_id || selectedOrder.payment_gateway) && (
                            <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CreditCard size={14} /> Payment Info</h4>
                                {selectedOrder.transaction_id && (
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Transaction ID:</span>
                                        <span style={{ fontFamily: 'var(--font-roboto)', marginLeft: '0.5rem' }}>{selectedOrder.transaction_id}</span>
                                    </div>
                                )}
                                {selectedOrder.payment_gateway && (
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Gateway:</span>
                                        <span style={{ marginLeft: '0.5rem', textTransform: 'uppercase' }}>{selectedOrder.payment_gateway}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin Notes Display */}
                        {selectedOrder.admin_notes && (
                            <div className="card-sub" style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldAlert size={14} /> Admin Notes</h4>
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0 }}>{selectedOrder.admin_notes}</p>
                            </div>
                        )}

                        {/* Customer Notes */}
                        {selectedOrder.customer_notes && (
                            <div className="card-sub" style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} /> Customer Notes</h4>
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0 }}>{selectedOrder.customer_notes}</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
