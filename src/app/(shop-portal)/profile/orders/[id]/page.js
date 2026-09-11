'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package, Truck, CheckCircle, MapPin, Download, ArrowLeft,
    XCircle, Tag, MessageCircle, RotateCcw, Globe, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from './order-detail.module.css';

function getStatusIndex(status) {
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

export default function OrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, mysqlClient, isSessionLoading, showToast } = useShop();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cancel modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Changed my mind');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchOrderDetails() {
            if (!id || !mysqlClient) return;
            setLoading(true);
            setError(null);

            try {
                const rawParam = decodeURIComponent(String(id)).trim();

                // 1. Query by primary id with joined order_items and products
                let { data: foundOrder, error: fetchErr } = await mysqlClient
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .eq('id', rawParam)
                    .maybeSingle();

                // 2. Fallback query by invoice_no if id is like INV-00123
                if (!foundOrder) {
                    const cleanInv = rawParam.replace(/^#/, '');
                    const { data: byInv } = await mysqlClient
                        .from('orders')
                        .select('*, order_items(*, products(*))')
                        .eq('invoice_no', cleanInv)
                        .maybeSingle();
                    if (byInv) foundOrder = byInv;
                }

                // 3. Hydrate missing product/variant images
                if (foundOrder && Array.isArray(foundOrder.order_items) && foundOrder.order_items.length > 0) {
                    const missingProdIds = foundOrder.order_items
                        .filter(i => !i.image_url && (!i.products || !i.products.image_url))
                        .map(i => i.product_id)
                        .filter(Boolean);

                    const variantIds = foundOrder.order_items
                        .map(i => i.variant_id)
                        .filter(Boolean);

                    let prodMap = {};
                    let varMap = {};

                    if (missingProdIds.length > 0) {
                        try {
                            const { data: prodData } = await mysqlClient
                                .from('products')
                                .select('id, name, image_url, images')
                                .in('id', missingProdIds);
                            (prodData || []).forEach(p => { prodMap[p.id] = p; });
                        } catch (e) {
                            console.error('Error fetching fallback product images:', e);
                        }
                    }

                    if (variantIds.length > 0) {
                        try {
                            const { data: varData } = await mysqlClient
                                .from('product_variants')
                                .select('id, product_id, name, image_url')
                                .in('id', variantIds);
                            (varData || []).forEach(v => { varMap[v.id] = v; });
                        } catch (e) {
                            console.error('Error fetching fallback variant images:', e);
                        }
                    }

                    foundOrder.order_items = foundOrder.order_items.map(item => {
                        const prod = item.products || prodMap[item.product_id] || null;
                        const variant = varMap[item.variant_id] || null;

                        let finalImg = item.image_url || variant?.image_url || prod?.image_url || '';
                        if (!finalImg && prod?.images) {
                            try {
                                const parsed = typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images;
                                if (Array.isArray(parsed) && parsed.length > 0) finalImg = parsed[0];
                            } catch (e) { }
                        }

                        return {
                            ...item,
                            image_url: finalImg,
                            products: prod
                        };
                    });
                }

                if (isMounted) {
                    if (foundOrder) {
                        setOrder(foundOrder);
                    } else {
                        setError('Order not found or access restricted.');
                    }
                }
            } catch (err) {
                console.error('[ORDER DETAIL PAGE] Error fetching order:', err);
                if (isMounted) setError(err.message || 'Failed to load order details');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchOrderDetails();

        return () => { isMounted = false; };
    }, [id, mysqlClient]);

    const handleCancelOrderSubmit = async (e) => {
        e.preventDefault();
        if (!order || cancelling) return;
        setCancelling(true);

        try {
            const res = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    customerId: user?.id,
                    customerPhone: user?.phone || order.customer_phone,
                    customerEmail: user?.email || order.customer_email,
                    reason: cancelReason,
                    requestedBy: user?.name || order.customer_name || 'Customer'
                })
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Order cancelled successfully', 'success');
                setOrder(prev => ({
                    ...prev,
                    status: 'CANCELLED',
                    refund_status: data.refund?.refundStatus || data.refundStatus || (data.isCod ? 'NOT_APPLICABLE' : 'REFUND_REQUESTED'),
                    refund_amount: data.refund?.refundAmount !== undefined ? data.refund.refundAmount : data.refundAmount,
                    razorpay_refund_id: data.refund?.razorpayRefundId || prev?.razorpay_refund_id
                }));
                setShowCancelModal(false);
            } else {
                showToast(data.error || 'Failed to cancel order', 'error');
            }
        } catch (err) {
            console.error('Cancel order error:', err);
            showToast(err.message || 'Error processing cancellation', 'error');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingSkeleton}>
                    <Loader2 size={36} className="spin" color="hsl(var(--primary))" />
                    <p style={{ fontWeight: 600, color: 'hsl(var(--text-muted))' }}>Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.container}>
                <div className={styles.notFoundBox}>
                    <Package size={54} color="#000000" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--text-main))' }}>Order Not Found</h2>
                    <p style={{ color: 'hsl(var(--text-muted))', margin: '0.5rem 0 1.5rem' }}>{error || "We couldn't find the requested order."}</p>
                    <Link href="/profile?tab=orders" className={styles.backBtn}>
                        <ArrowLeft size={16} /> Return to Orders
                    </Link>
                </div>
            </div>
        );
    }

    const sIdx = getStatusIndex(order.status);
    const isCancelled = ['CANCELLED', 'CANCELED', 'REFUNDED', 'CANCEL_REQUESTED'].includes((order.status || '').toUpperCase());
    const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
    const canCancel = !isCancelled && ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes((order.status || '').toUpperCase());

    const shipping = parseAddressObject(order.shipping_address) || parseAddressObject(order.billing_address) || {};

    const invoiceNo = order.invoice_no
        ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`)
        : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;

    const items = order.order_items || [];
    const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.price_at_time || it.price || 0) * (it.quantity || 1)), 0);
    const totalDiscount = Number(order.total_discount || order.cart_discount || order.product_discount || 0);
    const finalTotal = Number(order.total_amount || order.total || 0);

    const method = String(order.payment_method || '').toUpperCase();
    const isCod = method === 'COD' || method.includes('CASH ON DELIVERY');
    const codAdv = Number(order.advance_paid || order.cod_advance_required || 0);
    const codBal = Number(order.balance_amount !== undefined && order.balance_amount !== null ? order.balance_amount : Math.max(0, finalTotal - codAdv));
    const isCodWithAdvance = isCod && codAdv > 0;
    const isCodPure = isCod && codAdv === 0;

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
        <div className={styles.container}>
            {/* Top Navigation Bar */}
            <div className={styles.topBar}>
                <Link href="/profile?tab=orders" className={styles.backBtn}>
                    <ArrowLeft size={16} /> Back to My Orders
                </Link>

                <div className={styles.topActions}>
                    <a
                        href={`/api/invoice/${order.id}?phone=${order.customer_phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.invoiceBtn}
                    >
                        <Download size={16} /> Download Tax Invoice
                    </a>
                    <button
                        type="button"
                        onClick={handleWhatsAppHelp}
                        className={styles.whatsappBtn}
                    >
                        <MessageCircle size={16} /> Support
                    </button>
                </div>
            </div>

            {/* Main Order Card */}
            <div className={styles.orderCard}>
                {/* Header Banner */}
                <div className={styles.headerBanner}>
                    <div>
                        <div className={styles.orderRefLabel}>ORDER REFERENCE</div>
                        <h1 className={styles.invoiceNumber}>{invoiceNo}</h1>
                        <div className={styles.orderDate}>
                            Placed on {formatOrderDate(order.created_at)}
                        </div>
                    </div>

                    <div className={styles.statusBadgesGroup}>
                        <span style={{
                            padding: '0.45rem 1.25rem',
                            borderRadius: '99px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            background: isCancelled ? '#fef2f2' : (isDelivered ? '#f0fdf4' : '#eff6ff'),
                            color: isCancelled ? '#dc2626' : (isDelivered ? '#15803d' : '#1d4ed8'),
                            border: `1px solid ${isCancelled ? '#fecdd3' : (isDelivered ? '#bbf7d0' : '#bfdbfe')}`
                        }}>
                            {isCancelled ? 'CANCELED' : order.status}
                        </span>

                        {isCancelled ? (
                            <div style={{ textAlign: 'right', marginTop: '4px' }}>
                                <div className={styles.paymentInfo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                                    <span>Payment:</span>
                                    <strong style={{
                                        color: (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#16a34a' : (isCodPure ? '#64748b' : '#d97706'),
                                        textTransform: 'uppercase'
                                    }}>
                                        {isCodPure
                                            ? 'VOIDED (COD)'
                                            : (order.refund_status === 'REFUNDED' || order.razorpay_refund_id)
                                                ? 'REFUNDED'
                                                : (order.refund_status || 'REFUND PROCESSING')}
                                    </strong>
                                    <span style={{ color: '#64748b' }}>({isCod ? 'Cash on Delivery' : (order.payment_method || 'Online')})</span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    {isCodWithAdvance && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#dcfce7' : '#fef3c7', color: (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#15803d' : '#b45309', border: `1px solid ${(order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#bbf7d0' : '#fde68a'}` }}>
                                            💳 Advance Refund: ₹{(Number(order.refund_amount) || codAdv).toLocaleString('en-IN')} (Razorpay)
                                        </span>
                                    )}
                                    {!isCod && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#dcfce7' : '#fef3c7', color: (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#15803d' : '#b45309', border: `1px solid ${(order.refund_status === 'REFUNDED' || order.razorpay_refund_id) ? '#bbf7d0' : '#fde68a'}` }}>
                                            💳 Refunded: ₹{(Number(order.refund_amount) || finalTotal).toLocaleString('en-IN')} via Razorpay
                                        </span>
                                    )}
                                    {isCodPure && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                                            💵 COD Cancelled (No Payment Taken)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.paymentInfo}>
                                    Payment: <strong style={{ color: order.payment_status === 'PAID' ? '#16a34a' : (isCodWithAdvance ? '#2563eb' : 'inherit') }}>
                                        {isCodWithAdvance ? 'ADVANCE PAID' : (order.payment_status || 'PENDING')}
                                    </strong> ({isCod ? 'Cash on Delivery' : (order.payment_method || 'Online')})
                                </div>
                                {isCodWithAdvance && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                            ✓ Adv: ₹{codAdv.toLocaleString('en-IN')} (Paid)
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                            💵 Due: ₹{codBal.toLocaleString('en-IN')} (Cash)
                                        </span>
                                    </div>
                                )}
                                {isCodPure && (
                                    <div style={{ marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                            💵 ₹{finalTotal.toLocaleString('en-IN')} Cash Due on Delivery
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Cancellation & Refund Status Card for Cancelled Orders */}
                {isCancelled && (
                    <div style={{
                        background: order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '#f0fdf4' : (order.refund_status === 'REFUND_REQUESTED' ? '#fffbeb' : '#fef2f2'),
                        border: `1.5px solid ${order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '#bbf7d0' : (order.refund_status === 'REFUND_REQUESTED' ? '#fde68a' : '#fecdd3')}`,
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '#16a34a' : (order.refund_status === 'REFUND_REQUESTED' ? '#d97706' : '#dc2626'),
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem'
                            }}>
                                {order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '✓' : '✕'}
                            </span>
                            <h4 style={{
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: 800,
                                color: order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '#166534' : (order.refund_status === 'REFUND_REQUESTED' ? '#92400e' : '#991b1b')
                            }}>
                                {order.refund_status === 'REFUNDED' || order.razorpay_refund_id
                                    ? 'Order Cancelled & Payment Refunded'
                                    : (order.refund_status === 'REFUND_REQUESTED' ? 'Order Cancelled & Refund Initiated' : 'Order Cancelled')}
                            </h4>
                        </div>

                        <p style={{
                            margin: '0 0 10px 0',
                            fontSize: '0.88rem',
                            color: order.refund_status === 'REFUNDED' || order.razorpay_refund_id ? '#14532d' : (order.refund_status === 'REFUND_REQUESTED' ? '#78350f' : '#7f1d1d'),
                            lineHeight: 1.5
                        }}>
                            {(() => {
                                const refAmt = Number(order.refund_amount !== undefined && order.refund_amount !== null ? order.refund_amount : (isCodWithAdvance ? codAdv : finalTotal));
                                if (order.refund_status === 'REFUNDED' || order.razorpay_refund_id) {
                                    return (
                                        <>
                                            An automatic refund of <strong>₹{refAmt.toLocaleString('en-IN')}.00</strong> {isCodWithAdvance ? '(for your COD partial advance payment)' : ''} has been successfully sent to your original payment method via Razorpay{order.razorpay_refund_id ? <> (Refund ID: <strong style={{ fontFamily: 'monospace' }}>{order.razorpay_refund_id}</strong>)</> : ''}.
                                        </>
                                    );
                                }
                                if (order.refund_status === 'REFUND_REQUESTED' || (refAmt > 0 && !isCodPure)) {
                                    return (
                                        <>
                                            A refund of <strong>₹{refAmt.toLocaleString('en-IN')}.00</strong> {isCodWithAdvance ? '(for your COD partial advance payment)' : ''} has been initiated back to your original payment method and will be credited within 2-5 business days.
                                        </>
                                    );
                                }
                                return (
                                    <>
                                        This Cash on Delivery order has been cancelled. As no advance payment deduction was made, no refund was required.
                                    </>
                                );
                            })()}
                        </p>

                        {order.cancel_reason && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                                Reason: <em>{order.cancel_reason}</em>
                            </div>
                        )}
                    </div>
                )}

                {/* 4-Stage Delivery Tracker */}
                {!isCancelled && (
                    <div className={styles.timelineSection}>
                        <h4 className={styles.sectionHeaderTitle}>Delivery Status Tracker</h4>
                        <div className={styles.timelineGrid}>
                            {timelineSteps.map((step, idx) => {
                                const isDone = isDelivered || idx <= sIdx;
                                const isCurrent = !isDelivered && idx === sIdx;
                                const stepText = isDelivered ? 'Completed' : (isCurrent ? 'In Progress' : (idx < sIdx ? 'Completed' : 'Pending'));

                                return (
                                    <div key={idx} className={styles.timelineStep}>
                                        <div className={`${styles.stepIconWrap} ${isDone ? styles.stepDone : styles.stepPending}`}>
                                            {step.icon}
                                        </div>
                                        <div className={styles.stepLabel} style={{ color: isDone ? 'hsl(var(--text-main, #0f172a))' : '#000000' }}>
                                            {step.label}
                                        </div>
                                        <div className={styles.stepStatusText} style={{ color: isDone ? 'hsl(var(--primary, #5d0821))' : '#cbd5e1' }}>
                                            {stepText}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Carrier Tracking Banner */}
                {order.tracking_number && (
                    <div className={styles.trackingBanner}>
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Logistics Carrier & Tracking</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#14532d', marginTop: '2px' }}>
                                {order.courier_name || 'BlueDart / Delhivery'} — <strong>{order.tracking_number}</strong>
                            </div>
                        </div>
                        {order.tracking_url && (
                            <a
                                href={order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.trackCarrierBtn}
                            >
                                Track on Carrier Website
                            </a>
                        )}
                    </div>
                )}

                {/* Prominent COD Notice & Cash Collection Instructions */}
                {isCod && (
                    <div style={{
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
                    }}>
                        <div style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Truck size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>
                                    Cash on Delivery (COD) Summary & Instructions
                                </h4>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                                    {isCodWithAdvance ? 'PARTIAL ADVANCE RECEIVED' : 'PAY ON DELIVERY'}
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 10px', fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
                                {isCodWithAdvance ? (
                                    <>
                                        We have received your partial advance payment of <strong>₹{codAdv.toLocaleString('en-IN')}.00</strong> online via Razorpay. The remaining balance must be paid in cash or UPI to the delivery courier when your order arrives.
                                    </>
                                ) : (
                                    <>
                                        Your order is placed as Cash on Delivery. Please keep the exact amount ready in cash or UPI to hand over to the delivery executive.
                                    </>
                                )}
                            </p>
                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #fde68a',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount to Pay Delivery Partner</span>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309' }}>
                                        ₹{codBal.toLocaleString('en-IN')}.00
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#78350f', fontWeight: 600 }}>
                                    💡 Please keep cash or UPI ready at the time of delivery.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Itemized Products List */}
                <div>
                    <h4 className={styles.sectionHeaderTitle}>Ordered Items ({items.length})</h4>
                    <div className={styles.itemsList}>
                        {items.map(item => {
                            const rawImg = item.image_url || item.products?.image_url || '';
                            let imgUrl = rawImg ? rawImg.split(',')[0].trim() : '';
                            if (!imgUrl && item.products?.images) {
                                try {
                                    const parsedImgs = typeof item.products.images === 'string' ? JSON.parse(item.products.images) : item.products.images;
                                    if (Array.isArray(parsedImgs) && parsedImgs.length > 0) imgUrl = parsedImgs[0];
                                } catch (e) { }
                            }
                            const noImageSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="%2394a3b8">NO IMAGE</text></svg>';
                            if (imgUrl && imgUrl.includes('images.unsplash.com')) imgUrl = '';
                            if (!imgUrl) imgUrl = noImageSvg;

                            const itemPrice = Number(item.price_at_time || item.price || 0);
                            const itemQty = item.quantity || 1;
                            const itemLineTotal = itemPrice * itemQty;

                            return (
                                <div key={item.id} className={styles.itemRow}>
                                    <img
                                        src={imgUrl}
                                        alt={item.product_name}
                                        className={styles.itemImage}
                                        onError={(e) => { e.target.onerror = null; e.target.src = noImageSvg; }}
                                    />
                                    <div className={styles.itemDetails}>
                                        <div className={styles.itemName}>
                                            {item.product_name}
                                        </div>
                                        <div className={styles.itemMeta}>
                                            Qty: <strong>{itemQty}</strong> • ₹{itemPrice.toLocaleString()} each
                                            {item.variant_name && <span className={styles.variantTag}>{item.variant_name}</span>}
                                        </div>
                                    </div>
                                    <div className={styles.itemTotal}>
                                        ₹{itemLineTotal.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Financial Breakdown & Address Cards */}
                <div className={styles.gridTwoCol}>
                    {/* Bill Breakdown */}
                    <div className={styles.cardSection}>
                        <h4 className={styles.sectionHeaderTitle}>Financial Summary</h4>

                        <div className={styles.billRow}>
                            <span>Items Subtotal</span>
                            <span className={styles.billRowVal}>₹{(itemsSubtotal || finalTotal).toLocaleString()}.00</span>
                        </div>

                        {totalDiscount > 0 && (
                            <div className={styles.billRowDiscount}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Tag size={14} /> Discounts & Offers Applied
                                </span>
                                <span>-₹{totalDiscount.toLocaleString()}.00</span>
                            </div>
                        )}

                        {(() => {
                            // Tax type resolution: tax_type field → stored amounts → state heuristic
                            const taxType = order.tax_type || '';
                            const rawCgst = Number(order.cgst_amount || order.cgst || 0);
                            const rawSgst = Number(order.sgst_amount || order.sgst || 0);
                            const rawIgst = Number(order.igst_amount || order.igst || 0);
                            const totalTax = Number(order.tax_amount || 0);

                            let isIgst = false;
                            if (taxType === 'IGST' || taxType === 'IGST_INTERNATIONAL') {
                                isIgst = true;
                            } else if (taxType === 'CGST_SGST') {
                                isIgst = false;
                            } else {
                                // Fallback: use stored amounts
                                if (rawIgst > 0) isIgst = true;
                                else if (rawCgst > 0 || rawSgst > 0) isIgst = false;
                                else {
                                    // Last resort: state heuristic
                                    const deliveryState = (order.delivery_state || order.shipping_state || order.billing_state || '').trim().toLowerCase();
                                    isIgst = Boolean(deliveryState && deliveryState !== 'tamil nadu');
                                }
                            }

                            if (isIgst) {
                                const igstVal = rawIgst > 0 ? rawIgst : totalTax;
                                return (
                                    <div className={styles.billRow}>
                                        <span>IGST (5%)</span>
                                        <span className={styles.billRowVal}>₹{igstVal.toLocaleString()}.00</span>
                                    </div>
                                );
                            } else if (rawCgst > 0 || rawSgst > 0 || totalTax > 0) {
                                const cgstVal = rawCgst > 0 ? rawCgst : Math.round(totalTax / 2);
                                const sgstVal = rawSgst > 0 ? rawSgst : Math.round(totalTax / 2);
                                return (
                                    <>
                                        <div className={styles.billRow}>
                                            <span>CGST (2.5%)</span>
                                            <span className={styles.billRowVal}>₹{cgstVal.toLocaleString()}.00</span>
                                        </div>
                                        <div className={styles.billRow}>
                                            <span>SGST (2.5%)</span>
                                            <span className={styles.billRowVal}>₹{sgstVal.toLocaleString()}.00</span>
                                        </div>
                                    </>
                                );
                            }
                            return null;
                        })()}

                        <div className={styles.billRow}>
                            <span>Shipping Charges</span>
                            <span className={styles.billRowVal} style={{ color: Number(order.shipping_cost || 0) === 0 ? '#16a34a' : 'inherit' }}>
                                {Number(order.shipping_cost || 0) === 0 ? 'FREE' : `₹${Number(order.shipping_cost).toLocaleString()}.00`}
                            </span>
                        </div>

                        <div className={styles.billRow} style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                            <span>Total Order Value</span>
                            <span className={styles.billRowVal}>₹{finalTotal.toLocaleString()}.00</span>
                        </div>

                        {isCodWithAdvance ? (
                            <>
                                <div className={styles.billRow} style={{ color: '#15803d', fontWeight: 700 }}>
                                    <span>✓ Advance Paid (Online / Razorpay)</span>
                                    <span style={{ color: '#15803d' }}>-₹{codAdv.toLocaleString()}.00</span>
                                </div>
                                {isCancelled ? (
                                    <div className={styles.billTotalRow} style={{ color: '#15803d', borderTop: '2px solid #bbf7d0', background: '#f0fdf4', margin: '6px -10px 0', padding: '10px 12px', borderRadius: '10px' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.95rem' }}>Advance Refunded</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>
                                                {order.razorpay_refund_id ? `Razorpay Refund ID: ${order.razorpay_refund_id}` : 'Credited back via Razorpay'}
                                            </span>
                                        </div>
                                        <span style={{ color: '#15803d' }}>₹{(Number(order.refund_amount) || codAdv).toLocaleString()}.00</span>
                                    </div>
                                ) : (
                                    <div className={styles.billTotalRow} style={{ color: '#b45309', borderTop: '2px solid #fde68a', background: '#fffbeb', margin: '6px -10px 0', padding: '10px 12px', borderRadius: '10px' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.95rem' }}>Cash Due on Delivery</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Payable upon courier arrival</span>
                                        </div>
                                        <span style={{ color: '#b45309' }}>₹{codBal.toLocaleString()}.00</span>
                                    </div>
                                )}
                            </>
                        ) : isCodPure ? (
                            isCancelled ? (
                                <div className={styles.billTotalRow} style={{ color: '#64748b', borderTop: '2px solid #e2e8f0', background: '#f8fafc', margin: '6px -10px 0', padding: '10px 12px', borderRadius: '10px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.95rem' }}>Cash Due on Delivery</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Order Cancelled (No Cash Due)</span>
                                    </div>
                                    <span style={{ color: '#64748b', textDecoration: 'line-through' }}>₹{finalTotal.toLocaleString()}.00</span>
                                </div>
                            ) : (
                                <div className={styles.billTotalRow} style={{ color: '#b45309', borderTop: '2px solid #fde68a', background: '#fffbeb', margin: '6px -10px 0', padding: '10px 12px', borderRadius: '10px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.95rem' }}>Cash Due on Delivery</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Payable upon courier arrival</span>
                                    </div>
                                    <span style={{ color: '#b45309' }}>₹{finalTotal.toLocaleString()}.00</span>
                                </div>
                            )
                        ) : (
                            isCancelled ? (
                                <div className={styles.billTotalRow} style={{ color: '#15803d', borderTop: '2px solid #bbf7d0', background: '#f0fdf4', margin: '6px -10px 0', padding: '10px 12px', borderRadius: '10px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.95rem' }}>Amount Refunded</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>
                                            {order.razorpay_refund_id ? `Razorpay Refund ID: ${order.razorpay_refund_id}` : 'Credited back via Razorpay'}
                                        </span>
                                    </div>
                                    <span style={{ color: '#15803d' }}>₹{(Number(order.refund_amount) || finalTotal).toLocaleString()}.00</span>
                                </div>
                            ) : (
                                <div className={styles.billTotalRow}>
                                    <span>Total Paid (Online)</span>
                                    <span style={{ color: 'hsl(var(--primary, #5d0821))' }}>₹{finalTotal.toLocaleString()}.00</span>
                                </div>
                            )
                        )}
                    </div>

                    {/* Delivery Address Card */}
                    <div className={styles.cardSection}>
                        <h4 className={styles.sectionHeaderTitle}>Delivery Address</h4>

                        <div className={styles.addressContent}>
                            <div className={styles.addressName}>
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
                                <div className={styles.addressContact}>
                                    Phone: {shipping.phone || order.customer_phone}
                                </div>
                            )}
                            {(shipping.email || order.customer_email) && (
                                <div className={styles.addressContact}>
                                    Email: {shipping.email || order.customer_email}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cancellation / Return Actions Bar */}
                {((canCancel && !isCancelled) || isDelivered) && (
                    <div className={styles.actionsBar}>
                        <div>
                            {canCancel && !isCancelled && (
                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                                    🔒 Pre-dispatch cancellation is available before packing and shipping.
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {canCancel && !isCancelled && (
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(true)}
                                    className={styles.cancelActionBtn}
                                >
                                    <XCircle size={16} /> Cancel Order
                                </button>
                            )}

                            {isDelivered && (
                                <button
                                    type="button"
                                    onClick={() => router.push('/profile?tab=return')}
                                    className={styles.returnActionBtn}
                                >
                                    <RotateCcw size={16} /> Request Return / Exchange
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Order Modal */}
            {showCancelModal && (
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
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '2rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '1rem' }}>
                            <AlertTriangle size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Cancel Order #{invoiceNo}?</h3>
                        </div>

                        <form onSubmit={handleCancelOrderSubmit}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: '#334155' }}>
                                    SELECT CANCELLATION REASON *
                                </label>
                                <select
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                                        border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600, fontSize: '0.88rem'
                                    }}
                                >
                                    <option value="Changed my mind">Changed my mind / Want to re-order</option>
                                    <option value="Ordered by mistake">Ordered by mistake</option>
                                    <option value="Delivery time too long">Delivery time too long</option>
                                    <option value="Found better price elsewhere">Found better price elsewhere</option>
                                    <option value="Incorrect shipping address">Incorrect shipping address</option>
                                    <option value="Other">Other Reason</option>
                                </select>
                            </div>

                            {/* Cancellation Refund Notice */}
                            {isCodWithAdvance ? (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                                    <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💳 Automatic Advance Refund via Razorpay
                                    </div>
                                    Your partial advance payment of <strong>₹{codAdv.toLocaleString('en-IN')}</strong> will be automatically refunded back to your original payment method via Razorpay upon cancellation.
                                </div>
                            ) : (order.payment_status === 'PAID' || order.payment_method === 'Razorpay' || order.payment_method === 'RAZORPAY') ? (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                                    <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💳 Automatic Instant Razorpay Refund
                                    </div>
                                    A full refund of <strong>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</strong> will be automatically credited back to your original payment method (UPI / Bank Account / Card) via Razorpay.
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
                                    ℹ️ Cash on Delivery Order. No advance payment was made, so no refund is required.
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(false)}
                                    style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Keep Order
                                </button>
                                <button
                                    type="submit"
                                    disabled={cancelling}
                                    style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    {cancelling ? 'Cancelling...' : 'Confirm Cancel Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
