'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Search, Package, MapPin, Truck, CheckCircle, Clock, ChevronLeft, 
    Download, XCircle, AlertTriangle, RefreshCw, MessageCircle, Globe, ShoppingBag 
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './track.module.css';

function TrackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderIdParam = searchParams.get('id') || searchParams.get('orderId') || '';

    useEffect(() => {
        if (orderIdParam) {
            router.replace(`/profile?tab=track&id=${orderIdParam}`);
        } else {
            router.replace('/profile?tab=track');
        }
    }, [router, orderIdParam]);

    const { mysqlClient, showToast, user } = useShop();
    const [orderId, setOrderId] = useState(orderIdParam);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Cancellation States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null);
    
    // Return/Exchange States
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnForm, setReturnForm] = useState({ type: 'RETURN', reason: '', productId: '' });
    const [returnRequests, setReturnRequests] = useState([]);
    const [isEligibleForReturn, setIsEligibleForReturn] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState(null);

    // Global Alert State
    const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });

    useEffect(() => {
        if (orderIdParam) {
            const formattedInvoiceNo = String(orderIdParam).replace(/^[A-Z]+-/, 'INV-');
            setOrderId(formattedInvoiceNo);
            fetchTrackingOrder(orderIdParam);
        }
    }, [orderIdParam]);

    async function fetchTrackingOrder(idToTrack) {
        const id = idToTrack || orderId;
        if (!id) return;
        setLoading(true);
        setOrder(null);
        try {
            const cleanId = String(id).trim().toUpperCase().replace(/^#/, '');
            let data = null;

            // Extract numeric sequence if present (e.g. INV-0001 -> 0001, WEB-0001 -> 0001, 1 -> 0001)
            const numMatch = cleanId.match(/(\d+)/);
            const numStr = numMatch ? numMatch[1] : '';
            const padded4 = numStr ? numStr.padStart(4, '0') : '';

            // Build search candidates for order id in DB (avoiding invoice_no DB column error)
            const candidates = new Set([cleanId]);
            if (numStr) {
                candidates.add(numStr);
                candidates.add(`WEB-${padded4}`);
                candidates.add(`ORD-${padded4}`);
                candidates.add(`MAN-${padded4}`);
                candidates.add(`WEB-${numStr}`);
                candidates.add(`ORD-${numStr}`);
                candidates.add(`MAN-${numStr}`);
                candidates.add(`INV-${padded4}`);
                candidates.add(`INV-${numStr}`);
                candidates.add(`#INV-${padded4}`);
                candidates.add(`#INV-${numStr}`);
            }

            const searchOr = Array.from(candidates).map(c => `id.eq.${c},id.ilike.%${c}%,invoice_no.eq.${c},invoice_no.ilike.%${c}%`).join(',');

            const { data: matches } = await mysqlClient
                .from('orders')
                .select('*, order_items(*)')
                .or(searchOr);

            if (matches && matches.length > 0) {
                data = matches[0];
            }

            if (data) {
                if (!data.invoice_no && data.id) {
                    data.invoice_no = String(data.id).replace(/^[A-Z]+-/, 'INV-');
                }

                setOrder(data);
                // Fetch existing return requests for this order
                const { data: reqs } = await mysqlClient
                    .from('return_requests')
                    .select('*')
                    .eq('order_id', data.id);
                setReturnRequests(reqs || []);

                // Check 10-day eligibility for delivered orders
                if (data.status === 'DELIVERED') {
                    const { data: log } = await mysqlClient
                        .from('order_status_logs')
                        .select('created_at')
                        .eq('order_id', data.id)
                        .eq('status', 'DELIVERED')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    const dDate = log ? new Date(log.created_at) : new Date(data.created_at);
                    setDeliveryDate(dDate);
                    const tenDaysAgo = new Date();
                    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
                    setIsEligibleForReturn(dDate >= tenDaysAgo);
                }
            } else {
                showToast('Order not found', 'error');
            }
        } catch (err) {
            console.error('Tracking Error:', err);
            showToast('Failed to track order', 'error');
        } finally {
            setLoading(false);
        }
    }

    // --- Cancellation Logic ---
    async function handleCancelClick() {
        if (!order) return;
        const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
        if (!cancellableStatuses.includes(order.status)) {
            setAlertModal({ 
                show: true, 
                title: 'Cannot Cancel', 
                message: 'This order cannot be cancelled. It may already be shipped or delivered.' 
            });
            return;
        }
        
        const customerPhone = order.customer_phone || (user?.phone);
        if (!customerPhone) {
            setAlertModal({ show: true, title: 'Phone Missing', message: 'No phone number associated with this order to send OTP.' });
            return;
        }

        setShowCancelModal(true);
        setOtpSent(false);
        setOtp('');
        setGeneratedOtp(null);
    }

    async function sendOtp() {
        const phone = order.customer_phone || user?.phone;
        if (!phone) return;
        
        try {
            const res = await fetch('/api/whatsapp/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: phone, orderId: order.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
            
            setOtpSent(true);
            showToast('Verification code sent to WhatsApp', 'info');
        } catch (err) {
            console.error('Error sending OTP:', err);
            showToast(err.message || 'Failed to send WhatsApp code', 'error');
        }
    }

    async function confirmCancel() {
        if (!order || !otp) {
            showToast('Please enter the verification code', 'error');
            return;
        }
        
        setCancellingId(order.id);
        
        try {
            const res = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, otp: otp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancellation failed');

            setShowCancelModal(false);
            showToast('Order cancelled successfully', 'success');
            fetchTrackingOrder(order.id);
        } catch (err) {
            console.error('Cancel Order Error:', err);
            showToast(err.message || 'Failed to cancel order', 'error');
        } finally {
            setCancellingId(null);
        }
    }

    // --- Return/Exchange Logic ---
    async function handleReturnSubmit() {
        if (!order || !returnForm.productId || !returnForm.reason.trim()) {
            showToast('Please provide a reason and select a product', 'error');
            return;
        }

        try {
            const isAllOrder = returnForm.productId === 'ALL_ORDER';
            const payload = {
                orderId: order.id,
                customerId: user?.id || null, 
                type: returnForm.type,
                reason: returnForm.reason,
                requestedFrom: 'website'
            };

            let itemsToTrack = [];

            if (isAllOrder) {
                const eligibleItems = order.order_items?.filter(item => {
                    return !returnRequests.some(r => r.product_id === item.product_id && r.status !== 'REJECTED');
                });
                
                if (!eligibleItems || eligibleItems.length === 0) {
                    showToast('No items left to return/exchange.', 'error');
                    return;
                }
                
                payload.items = eligibleItems.map(item => ({ product_id: item.product_id }));
                itemsToTrack = eligibleItems.map(item => ({ order_id: order.id, product_id: item.product_id, status: 'PENDING' }));
            } else {
                payload.productId = returnForm.productId;
                itemsToTrack = [{ order_id: order.id, product_id: returnForm.productId, status: 'PENDING' }];
            }

            const response = await fetch('/api/returns/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to submit request');
            }

            setReturnRequests(prev => [...prev, ...itemsToTrack]);
            showToast(`Your ${returnForm.type.toLowerCase()} request has been submitted successfully. Our team will review it and notify you.`, 'success');
            setShowReturnModal(false);
            setReturnForm({ type: 'RETURN', reason: '', productId: '' });
        } catch (err) {
            console.error('Return Request Error:', err);
            showToast(err.message || 'Failed to submit request', 'error');
        }
    }


    const getStatusIndex = (status) => {
        const s = (status || '').toUpperCase();
        if (['PLACED', 'PENDING', 'AWAITING_PAYMENT'].includes(s)) return 0;
        if (['PAID', 'CONFIRMED', 'PROCESSING'].includes(s)) return 1;
        if (['PACKING', 'SHIPPED', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s)) return 2;
        if (['DELIVERED'].includes(s)) return 3;
        return 0;
    };

    const statusIndex = order ? getStatusIndex(order.status) : -1;

    return (
        <div className={styles.trackContainer}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <ChevronLeft size={20} /> Back
            </button>
            <div className={styles.trackHeader}>
                <h1>Track Order</h1>
                <p>Enter your Invoice ID to see the latest status of your purchase.</p>

                <div className={styles.searchBar}>
                    <div className={styles.searchInputWrap}>
                        <Search size={22} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Enter Invoice ID (e.g. INV-0001)"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                        />
                    </div>
                    <button onClick={() => fetchTrackingOrder()} disabled={loading} className={styles.trackBtn}>
                        {loading ? 'Searching...' : 'Track My Order'}
                    </button>
                </div>
            </div>

            {order ? (
                <div className={styles.trackingResult}>
                    <div className={styles.orderSummary}>
                        <div className={styles.summaryTop}>
                            <div className={styles.orderIdentity}>
                                <span className={styles.idLabel}>INVOICE ID</span>
                                <h3 className={styles.idValue}>{order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
                                    {order.source === 'WEBSITE' ? (
                                        <>
                                            <Globe size={14} color="#6366f1" />
                                            <span>Order Source: <strong style={{ color: '#4338ca' }}>Web Store</strong></span>
                                        </>
                                    ) : order.source === 'MANUAL' ? (
                                        <>
                                            <ShoppingBag size={14} color="#ec4899" />
                                            <span>Order Source: <strong style={{ color: '#be185d' }}>Direct Store</strong></span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageCircle size={14} color="#22c55e" />
                                            <span>Order Source: <strong style={{ color: '#15803d' }}>WhatsApp Order</strong></span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles.orderStatusBadge}>
                                <span className={`${styles.badge} ${styles[`status${order.status}`]}`}>{order.status}</span>
                            </div>
                        </div>

                        <div className={styles.timeline}>
                            {[
                                { stage: 'PLACED', label: 'Order Placed', icon: <Package size={20} /> },
                                { stage: 'CONFIRMED', label: 'Confirmed', icon: <CheckCircle size={20} /> },
                                { stage: 'SHIPPED', label: 'Shipped', icon: <Truck size={20} /> },
                                { stage: 'DELIVERED', label: 'Delivered', icon: <MapPin size={20} /> }
                            ].map((step, idx) => {
                                const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
                                const stepText = isDelivered ? 'Completed' : (idx === statusIndex ? 'In Progress' : (idx < statusIndex ? 'Completed' : 'Pending'));
                                return (
                                    <div key={idx} className={`${styles.timelineStep} ${idx <= statusIndex ? styles.stepActive : ''}`}>
                                        <div className={styles.stepIcon}>{step.icon}</div>
                                        <div className={styles.stepInfo}>
                                            <div className={styles.stepLabel}>{step.label}</div>
                                            <div className={styles.stepDate}>{stepText}</div>
                                        </div>
                                        {idx < 3 && <div className={`${styles.timelineLine} ${idx < statusIndex ? styles.lineActive : ''}`} />}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Order Actions - EXCLUSIVELY ON THIS PAGE NOW */}
                        <div className={styles.summaryActions}>
                            <a 
                                href={`/api/invoice/${order.id}?phone=${order.customer_phone}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.actionBtn}
                            >
                                <Download size={18} /> Download Invoice
                            </a>
                            
                            {['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes(order.status) && (
                                <button 
                                    onClick={handleCancelClick} 
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    disabled={cancellingId === order.id}
                                >
                                    <XCircle size={18} /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                                </button>
                            )}

                            {order.status === 'DELIVERED' && (() => {
                                const allItemsReturned = order.order_items?.every(item => 
                                    returnRequests.some(r => r.product_id === item.product_id && r.status !== 'REJECTED')
                                );
                                
                                if (allItemsReturned) {
                                    return (
                                        <button className={styles.actionBtn} disabled style={{ opacity: 0.5 }}>
                                            <RefreshCw size={18} /> Request Submitted
                                        </button>
                                    );
                                }

                                return (
                                    <button 
                                        onClick={() => isEligibleForReturn ? setShowReturnModal(true) : setAlertModal({
                                            show: true,
                                            title: 'Deadline Passed',
                                            message: `This order was delivered on ${deliveryDate?.toLocaleDateString()} and is beyond the 10-day return window.`
                                        })} 
                                        className={`${styles.actionBtn} ${isEligibleForReturn ? styles.actionBtnPrimary : ''}`}
                                        style={!isEligibleForReturn ? { opacity: 0.5 } : {}}
                                    >
                                        <RefreshCw size={18} /> {isEligibleForReturn ? 'Return or Exchange' : 'Return Window Closed'}
                                    </button>
                                );
                            })()}
                        </div>

                        {order.tracking_number && (
                            <div className={styles.shippingSection} style={{ marginTop: '3rem' }}>
                                <h3>Shipping Information</h3>
                                <div className={styles.shippingGrid}>
                                    <div className={styles.shipInfoItem}>
                                        <strong>Carrier</strong>
                                        <span>{order.courier_name || 'BlueDart / Delhivery'}</span>
                                    </div>
                                    <div className={styles.shipInfoItem}>
                                        <strong>Tracking Number</strong>
                                        <span>{order.tracking_number}</span>
                                    </div>
                                </div>
                                {order.tracking_url && (
                                    <a href={order.tracking_url} target="_blank" className={styles.externalTrackLink}>
                                        Track on Carrier Website
                                    </a>
                                )}
                            </div>
                        )}

                        <div className={styles.orderItems}>
                            <h3>Order Items</h3>
                            <div className={styles.itemsList}>
                                {order.order_items?.filter(item => (item.returned_quantity || 0) < item.quantity).map(item => (
                                    <div key={item.id} className={styles.itemRow} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span>{item.product_name} x {item.quantity - (item.returned_quantity || 0)}</span>
                                            <span>₹{((item.quantity - (item.returned_quantity || 0)) * item.price_at_time).toLocaleString()}</span>
                                        </div>
                                        {item.returned_quantity > 0 && (
                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                                                ({item.returned_quantity} units already returned)
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {order.order_items?.filter(item => (item.returned_quantity || 0) >= item.quantity).length > 0 && (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', border: '1px dashed #fee2e2' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px', textTransform: 'uppercase' }}>Returned Items</div>
                                        {order.order_items.filter(item => (item.returned_quantity || 0) >= item.quantity).map(item => (
                                            <div key={item.id} style={{ fontSize: '0.8rem', color: '#991b1b', display: 'flex', justifyContent: 'space-between opacity: 0.6' }}>
                                                <span>{item.product_name} x {item.quantity}</span>
                                                <span style={{ fontWeight: 700 }}>RETURNED</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.summaryBreakdown}>
                                <div className={styles.summaryLine}>
                                    <span>Subtotal</span>
                                    <span>₹{(order.total_amount - (order.cgst || 0) - (order.sgst || 0) - (order.igst || 0) - (order.shipping_cost || 0)).toLocaleString('en-IN')}.00</span>
                                </div>
                                {order.cgst > 0 && (
                                    <div className={styles.summaryLine}>
                                        <span>CGST (2.5%)</span>
                                        <span>₹{order.cgst.toLocaleString('en-IN')}.00</span>
                                    </div>
                                )}
                                {order.sgst > 0 && (
                                    <div className={styles.summaryLine}>
                                        <span>SGST (2.5%)</span>
                                        <span>₹{order.sgst.toLocaleString('en-IN')}.00</span>
                                    </div>
                                )}
                                {order.igst > 0 && (
                                    <div className={styles.summaryLine}>
                                        <span>IGST (5%)</span>
                                        <span>₹{order.igst.toLocaleString('en-IN')}.00</span>
                                    </div>
                                )}
                                <div className={styles.summaryLine}>
                                    <span>Shipping</span>
                                    <span>{order.shipping_cost > 0 ? `₹${order.shipping_cost.toLocaleString('en-IN')}.00` : 'FREE'}</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>Grand Total</span>
                                    <span>₹{(order.total_amount || 0).toLocaleString('en-IN')}.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : !loading && orderIdParam && (
                <div className={styles.noOrderPlaceholder}>
                    <Package size={48} />
                    <p>Order not found. Please double-check your Invoice ID.</p>
                </div>
            )}

            {/* Modals from my-orders integrated here */}
            {showCancelModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <AlertTriangle size={24} color="#f59e0b" />
                            <h3>Confirm Cancellation</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Verify identity to cancel order <strong>{order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`}</strong></p>
                            
                            {/* Online Payment Refund Notice */}
                            {(order.status === 'PAID' || order.payment_method === 'Razorpay') && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#166534', textAlign: 'left' }}>
                                    💳 <strong>Razorpay Refund:</strong> ₹{Number(order.total_amount || 0).toLocaleString('en-IN')} will be refunded to your original payment method upon cancellation.
                                </div>
                            )}

                            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1.25rem' }}>
                                A verification code will be sent to <strong>{order.customer_phone?.replace(/(\d{2})(\d{6})(\d{4})/, '$1******$3') || 'your phone'}</strong>
                            </p>
                            {!otpSent ? (
                                <button onClick={sendOtp} className={styles.btnPrimary} style={{ width: '100%' }}>Send Verification Code</button>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className={styles.otpInput}
                                        maxLength={6}
                                    />
                                    <button onClick={sendOtp} className={styles.btnSecondary} style={{ width: '100%', marginBottom: '1rem' }}>Resend Code</button>
                                </>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowCancelModal(false)} className={styles.btnSecondary}>Keep Order</button>
                            <button onClick={confirmCancel} disabled={!otpSent || otp.length !== 6} className={styles.btnDanger}>Confirm Cancellation</button>
                        </div>
                    </div>
                </div>
            )}

            {showReturnModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <RefreshCw size={24} color="#3b82f6" />
                            <h3>Return or Exchange</h3>
                        </div>
                        <div className={styles.modalBody}>
                            {(() => {
                                const eligibleItems = order.order_items?.filter(item => {
                                    return !returnRequests.some(r => r.product_id === item.product_id && r.status !== 'REJECTED');
                                }) || [];

                                return (
                                    <>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Select Product</label>
                                        <select 
                                            className={styles.formSelect}
                                            value={returnForm.productId}
                                            onChange={(e) => setReturnForm({ ...returnForm, productId: e.target.value })}
                                        >
                                            <option value="" disabled>Select an item</option>
                                            {eligibleItems.map((item, idx) => (
                                                <option key={idx} value={item.product_id}>{item.product_name}</option>
                                            ))}
                                            {eligibleItems.length > 1 && <option value="ALL_ORDER">Return All Items</option>}
                                        </select>
                                    </>
                                );
                            })()}

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Request Type</label>
                            <select className={styles.formSelect} value={returnForm.type} onChange={(e) => setReturnForm({ ...returnForm, type: e.target.value })}>
                                <option value="RETURN">Return (Refund)</option>
                                <option value="EXCHANGE">Exchange (Replacement)</option>
                            </select>

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Reason</label>
                            <textarea 
                                className={styles.formTextarea}
                                value={returnForm.reason}
                                onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                placeholder="Explain your reason..."
                                rows={4}
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowReturnModal(false)} className={styles.btnSecondary}>Cancel</button>
                            <button onClick={handleReturnSubmit} className={styles.btnPrimary}>Submit Request</button>
                        </div>
                    </div>
                </div>
            )}

            {alertModal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
                        <h3 style={{ marginBottom: '1rem' }}>{alertModal.title}</h3>
                        <p style={{ marginBottom: '2rem' }}>{alertModal.message}</p>
                        <button onClick={() => setAlertModal({ show: false, title: '', message: '' })} className={styles.btnPrimary} style={{ width: '100%' }}>Understood</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TrackOrderPage() {
    return (
        <Suspense fallback={<div>Loading Tracking...</div>}>
            <TrackContent />
        </Suspense>
    );
}
