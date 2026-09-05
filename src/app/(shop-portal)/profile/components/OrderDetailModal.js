'use client';

import { 
    Package, Truck, CheckCircle, MapPin, Download, ArrowLeft,
    XCircle, Tag, MessageCircle, RotateCcw, Globe
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

function getInternalStatusIndex(status) {
    const s = String(status || '').toUpperCase();
    if (['PLACED', 'PENDING', 'PAID', 'AWAITING_PAYMENT'].includes(s)) return 0;
    if (['CONFIRMED', 'PROCESSING', 'PACKED', 'PACKING'].includes(s)) return 1;
    if (['SHIPPED', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s)) return 2;
    if (['DELIVERED', 'COMPLETED'].includes(s)) return 3;
    return 0;
}

function parseAddressObject(raw) {
    if (!raw) return null;
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                return { address: trimmed };
            }
        }
        return { address: trimmed };
    }
    return null;
}

export default function OrderDetailModal({
    order,
    onClose,
    onCancelOrder,
    onRequestReturn,
    getStatusIndex,
    getOrderSourceBadge
}) {
    if (!order) return null;

    const sIdx = typeof getStatusIndex === 'function' ? getStatusIndex(order.status) : getInternalStatusIndex(order.status);
    const isCancelled = ['CANCELLED', 'REFUNDED', 'CANCEL_REQUESTED'].includes((order.status || '').toUpperCase());
    const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
    
    // Strict Pre-Fulfillment guard for cancellation
    const canCancel = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes((order.status || '').toUpperCase());

    // Robust Address Parsing
    const shipping = parseAddressObject(order.shipping_address) || parseAddressObject(order.billing_address) || {};

    const invoiceNo = order.invoice_no 
        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
        : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;

    const items = order.order_items || [];
    const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.price_at_time || it.price || 0) * (it.quantity || 1)), 0);
    const totalDiscount = Number(order.total_discount || order.cart_discount || order.product_discount || 0);
    const finalTotal = Number(order.total_amount || order.total || 0);

    const timelineSteps = [
        { stage: 'PLACED', label: 'Order Placed', icon: <Package size={18} /> },
        { stage: 'CONFIRMED', label: 'Confirmed / Processing', icon: <CheckCircle size={18} /> },
        { stage: 'SHIPPED', label: 'Shipped', icon: <Truck size={18} /> },
        { stage: 'DELIVERED', label: 'Delivered', icon: <MapPin size={18} /> }
    ];

    const handleWhatsAppHelp = () => {
        const msg = encodeURIComponent(`Hi Vaiyaaree Team, I have a query regarding my Order ${invoiceNo}.`);
        const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem'
            }}>
                <div
                    style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header Navigation Bar */}
                    <div style={{
                        padding: '1.25rem 1.75rem',
                        borderBottom: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#fafbfc',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '0.5rem 0.9rem',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Orders
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <a
                                href={`/api/invoice/${order.id}?phone=${order.customer_phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    padding: '0.5rem 0.9rem',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: 'hsl(var(--text-main, #0f172a))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none'
                                }}
                            >
                                <Download size={15} /> Invoice
                            </a>
                            <button
                                type="button"
                                onClick={handleWhatsAppHelp}
                                style={{
                                    background: '#25D366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0.5rem 0.9rem',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <MessageCircle size={15} /> Support
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Invoice ID & Order Info Banner */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            background: '#f8fafc',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            border: '1px solid hsl(var(--border-subtle, #e2e8f0))'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--text-muted, #64748b))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ORDER REFERENCE</div>
                                <h2 style={{ margin: '2px 0 6px', fontSize: '1.5rem', color: 'hsl(var(--primary, #5d0821))', fontWeight: 900 }}>{invoiceNo}</h2>
                                <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted, #64748b))', fontWeight: 600 }}>
                                    Placed on {formatOrderDate(order.created_at)}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`} style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '20px' }}>
                                    {order.status}
                                </span>
                                <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted, #64748b))', fontWeight: 700 }}>
                                    Payment: <strong style={{ color: order.payment_status === 'PAID' ? '#16a34a' : 'inherit' }}>{order.payment_status || 'PENDING'}</strong> ({order.payment_method || 'Online'})
                                </div>
                            </div>
                        </div>

                        {/* Timeline Progress */}
                        {!isCancelled && (
                            <div style={{
                                padding: '1.5rem',
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted, #64748b))', fontWeight: 800 }}>Delivery Timeline</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                    {timelineSteps.map((step, idx) => {
                                        const isDone = isDelivered || idx <= sIdx;
                                        const isCurrent = !isDelivered && idx === sIdx;
                                        const stepText = isDelivered ? 'Completed' : (isCurrent ? 'In Progress' : (idx < sIdx ? 'Completed' : 'Pending'));

                                        return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.4rem' }}>
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '50%',
                                                    background: isDone ? 'hsl(var(--primary, #5d0821))' : '#f1f5f9',
                                                    color: isDone ? '#ffffff' : '#94a3b8',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: isDone ? '0 4px 10px rgba(93, 8, 33, 0.3)' : 'none',
                                                    transition: 'all 0.3s'
                                                }}>
                                                    {step.icon}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDone ? 'hsl(var(--text-main, #0f172a))' : '#94a3b8' }}>{step.label}</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDone ? 'hsl(var(--primary, #5d0821))' : '#cbd5e1' }}>{stepText}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Carrier Tracking Box if Shipped */}
                        {order.tracking_number && (
                            <div style={{
                                padding: '1.15rem 1.35rem',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Carrier & Tracking Info</div>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#14532d', marginTop: '2px' }}>
                                        {order.courier_name || 'BlueDart / Delhivery'} — <strong>{order.tracking_number}</strong>
                                    </div>
                                </div>
                                {order.tracking_url && (
                                    <a
                                        href={order.tracking_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            background: '#15803d',
                                            color: '#ffffff',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            textDecoration: 'none'
                                        }}
                                    >
                                        Track on Carrier Website
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Items List */}
                        <div>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted, #64748b))', margin: '0 0 0.85rem', fontWeight: 800 }}>Items Ordered ({items.length})</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {items.map(item => {
                                    const rawImg = item.image_url || item.products?.image_url || '';
                                    let imgUrl = rawImg ? rawImg.split(',')[0].trim() : '';
                                    if (!imgUrl && item.products?.images) {
                                        try {
                                            const parsedImgs = typeof item.products.images === 'string' ? JSON.parse(item.products.images) : item.products.images;
                                            if (Array.isArray(parsedImgs) && parsedImgs.length > 0) imgUrl = parsedImgs[0];
                                        } catch (e) {}
                                    }
                                    if (!imgUrl) imgUrl = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                    const itemPrice = Number(item.price_at_time || item.price || 0);
                                    const itemQty = item.quantity || 1;
                                    const itemLineTotal = itemPrice * itemQty;

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '1rem',
                                                background: '#f8fafc',
                                                borderRadius: '14px',
                                                border: '1px solid hsl(var(--border-subtle, #e2e8f0))'
                                            }}
                                        >
                                            <img
                                                src={imgUrl}
                                                alt={item.product_name}
                                                style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'hsl(var(--text-main, #0f172a))' }}>
                                                    {item.product_name}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted, #64748b))', marginTop: '2px' }}>
                                                    Qty: <strong>{itemQty}</strong> • ₹{itemPrice.toLocaleString()} each
                                                    {item.variant_name && <span style={{ marginLeft: '6px', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{item.variant_name}</span>}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'hsl(var(--text-main, #0f172a))' }}>
                                                ₹{itemLineTotal.toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Financial Bill & Address Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                            {/* Bill Breakdown */}
                            <div style={{
                                padding: '1.25rem',
                                background: '#fafbfc',
                                borderRadius: '16px',
                                border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem'
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted, #64748b))', fontWeight: 800 }}>Payment Summary</h4>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                                    <span>Items Subtotal</span>
                                    <span style={{ fontWeight: 700, color: 'hsl(var(--text-main, #0f172a))' }}>₹{(itemsSubtotal || finalTotal).toLocaleString()}.00</span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Tag size={13} /> Discounts & Offers Applied
                                        </span>
                                        <span>-₹{totalDiscount.toLocaleString()}.00</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                                    <span>Shipping Charges</span>
                                    <span style={{ fontWeight: 700, color: Number(order.shipping_cost || 0) === 0 ? '#16a34a' : 'hsl(var(--text-main, #0f172a))' }}>
                                        {Number(order.shipping_cost || 0) === 0 ? 'FREE' : `₹${Number(order.shipping_cost).toLocaleString()}.00`}
                                    </span>
                                </div>

                                {(() => {
                                    const rawCgst = Number(order.cgst || order.cgst_amount || 0);
                                    const rawSgst = Number(order.sgst || order.sgst_amount || 0);
                                    const rawIgst = Number(order.igst || order.igst_amount || 0);
                                    const totalTax = Number(order.tax_amount || 0);
                                    const deliveryState = (order.delivery_state || order.shipping_state || order.billing_state || '').trim().toLowerCase();

                                    const isIgst = rawIgst > 0 || (rawCgst === 0 && rawSgst === 0 && totalTax > 0 && deliveryState && deliveryState !== 'tamil nadu');

                                    if (isIgst) {
                                        const igstVal = rawIgst > 0 ? rawIgst : totalTax;
                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                                                <span>IGST (5%)</span>
                                                <span style={{ fontWeight: 700, color: 'hsl(var(--text-main, #0f172a))' }}>₹{igstVal.toLocaleString()}.00</span>
                                            </div>
                                        );
                                    } else if (rawCgst > 0 || rawSgst > 0 || totalTax > 0) {
                                        const cgstVal = rawCgst > 0 ? rawCgst : Math.round(totalTax / 2);
                                        const sgstVal = rawSgst > 0 ? rawSgst : Math.round(totalTax / 2);
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                                                    <span>CGST (2.5%)</span>
                                                    <span style={{ fontWeight: 700, color: 'hsl(var(--text-main, #0f172a))' }}>₹{cgstVal.toLocaleString()}.00</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                                                    <span>SGST (2.5%)</span>
                                                    <span style={{ fontWeight: 700, color: 'hsl(var(--text-main, #0f172a))' }}>₹{sgstVal.toLocaleString()}.00</span>
                                                </div>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}

                                <div style={{
                                    borderTop: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                    paddingTop: '0.75rem',
                                    marginTop: '0.35rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '1.1rem',
                                    fontWeight: 900,
                                    color: 'hsl(var(--text-main, #0f172a))'
                                }}>
                                    <span>Total Paid</span>
                                    <span style={{ color: 'hsl(var(--primary, #5d0821))' }}>₹{finalTotal.toLocaleString()}.00</span>
                                </div>
                            </div>

                            {/* Delivery Address Card */}
                            <div style={{
                                padding: '1.25rem',
                                background: '#fafbfc',
                                borderRadius: '16px',
                                border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}>
                                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted, #64748b))', fontWeight: 800 }}>Delivery Address</h4>
                                
                                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#334155' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>
                                        {shipping.name || order.customer_name || 'Valued Customer'}
                                    </div>
                                    {shipping.address && <div>{shipping.address}</div>}
                                    <div>
                                        {[
                                            shipping.city,
                                            shipping.pincode ? `- ${shipping.pincode}` : '',
                                            shipping.state ? `(${shipping.state}${shipping.country ? `, ${shipping.country}` : ''})` : ''
                                        ].filter(Boolean).join(' ')}
                                    </div>
                                    {(shipping.phone || order.customer_phone) && (
                                        <div style={{ marginTop: '4px', color: '#64748b' }}>
                                            Phone: {shipping.phone || order.customer_phone}
                                        </div>
                                    )}
                                    {(shipping.email || order.customer_email) && (
                                        <div style={{ color: '#64748b' }}>
                                            Email: {shipping.email || order.customer_email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Cancellation / Return Actions Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                            paddingTop: '1.25rem',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div>
                                {canCancel && (
                                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                                        Orders can be cancelled before warehouse packing / dispatch.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {canCancel && onCancelOrder && (
                                    <button
                                        type="button"
                                        onClick={() => onCancelOrder(order)}
                                        style={{
                                            background: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fecdd3',
                                            borderRadius: '10px',
                                            padding: '0.65rem 1.15rem',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <XCircle size={15} /> Cancel Order
                                    </button>
                                )}

                                {isDelivered && onRequestReturn && (
                                    <button
                                        type="button"
                                        onClick={() => onRequestReturn(order)}
                                        style={{
                                            background: '#f0fdf4',
                                            color: '#15803d',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '10px',
                                            padding: '0.65rem 1.15rem',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <RotateCcw size={15} /> Request Return / Exchange
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
