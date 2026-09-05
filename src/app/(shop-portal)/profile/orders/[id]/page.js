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
                            } catch (e) {}
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
                    payment_status: data.refundProcessed ? 'REFUNDED' : prev.payment_status
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
                    <Package size={54} color="#94a3b8" style={{ marginBottom: '1rem' }} />
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
    const isCancelled = ['CANCELLED', 'REFUNDED', 'CANCEL_REQUESTED'].includes((order.status || '').toUpperCase());
    const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
    const canCancel = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes((order.status || '').toUpperCase());

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
                            {order.status}
                        </span>
                        <div className={styles.paymentInfo}>
                            Payment: <strong style={{ color: order.payment_status === 'PAID' ? '#16a34a' : 'inherit' }}>{order.payment_status || 'PENDING'}</strong> ({order.payment_method || 'Online'})
                        </div>
                    </div>
                </div>

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
                                        <div className={styles.stepLabel} style={{ color: isDone ? 'hsl(var(--text-main, #0f172a))' : '#94a3b8' }}>
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
                                } catch (e) {}
                            }
                            if (!imgUrl) imgUrl = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';

                            const itemPrice = Number(item.price_at_time || item.price || 0);
                            const itemQty = item.quantity || 1;
                            const itemLineTotal = itemPrice * itemQty;

                            return (
                                <div key={item.id} className={styles.itemRow}>
                                    <img
                                        src={imgUrl}
                                        alt={item.product_name}
                                        className={styles.itemImage}
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
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

                        <div className={styles.billRow}>
                            <span>Shipping Charges</span>
                            <span className={styles.billRowVal} style={{ color: Number(order.shipping_cost || 0) === 0 ? '#16a34a' : 'inherit' }}>
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

                        <div className={styles.billTotalRow}>
                            <span>Total Paid</span>
                            <span style={{ color: 'hsl(var(--primary, #5d0821))' }}>₹{finalTotal.toLocaleString()}.00</span>
                        </div>
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
                <div className={styles.actionsBar}>
                    <div>
                        {canCancel && (
                            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                                🔒 Pre-dispatch cancellation is available before packing and shipping.
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {canCancel && (
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

                            {/* Razorpay Refund Notice for Paid Orders */}
                            {(order.payment_status === 'PAID' || order.payment_method === 'Razorpay' || order.payment_method === 'RAZORPAY') ? (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                                    <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💳 Instant Razorpay Refund
                                    </div>
                                    A full refund of <strong>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</strong> will be automatically credited back to your original payment method (UPI / Bank Account / Card) via Razorpay.
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
                                    ℹ️ Cash on Delivery / Unpaid Order. No payment deduction was made.
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
