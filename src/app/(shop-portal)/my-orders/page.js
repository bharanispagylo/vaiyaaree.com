'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Tag, MessageCircle, ChevronRight, Search, ChevronLeft, Download, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './orders.module.css';

export default function MyOrdersPage() {
    const { user, supabase } = useShop();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });

    useEffect(() => {
        if (user?.phone) {
            fetchUserOrders();
        }
    }, [user]);

    async function fetchUserOrders() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('customer_phone', user.phone)
                .order('created_at', { ascending: false });

            if (data) setOrders(data);
        } catch (err) {
            console.error('Fetch Orders Error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDownloadInvoice(order) {
        if (order.invoice_url) {
            window.open(order.invoice_url, '_blank');
            return;
        }

        setGeneratingId(order.id);
        try {
            await fetch('/api/orders/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id })
            });

            const interval = setInterval(async () => {
                const { data } = await supabase.from('orders').select('invoice_url').eq('id', order.id).single();
                if (data?.invoice_url) {
                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, invoice_url: data.invoice_url } : o));
                    setGeneratingId(null);
                    clearInterval(interval);
                    window.open(data.invoice_url, '_blank');
                }
            }, 3000);

            setTimeout(() => {
                clearInterval(interval);
                if (generatingId === order.id) setGeneratingId(null);
            }, 30000);

        } catch (err) {
            console.error('Failed to trigger invoice generation:', err);
            setGeneratingId(null);
        }
    }

    function handleCancelClick(order) {
        const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
        if (!cancellableStatuses.includes(order.status)) {
            setAlertModal({ show: true, title: 'Cannot Cancel', message: 'This order cannot be cancelled. It may already be shipped or delivered.' });
            return;
        }
        setSelectedOrder(order);
        setShowCancelModal(true);
        setOtpSent(false);
        setOtp('');
        setGeneratedOtp(null);
    }

    async function sendOtp() {
        if (!selectedOrder || !user?.phone) return;
        
        // Generate 6-digit OTP
        const otpValue = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otpValue);
        setOtpSent(true);
        
        try {
            // Send OTP via WhatsApp
            const response = await fetch('/api/whatsapp/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.phone,
                    otp: otpValue,
                    orderId: selectedOrder.id
                })
            });
            
            if (!response.ok) {
                console.error('Failed to send OTP');
                setAlertModal({ show: true, title: 'OTP Failed', message: 'Failed to send OTP. Please try again.' });
            }
        } catch (err) {
            console.error('Error sending OTP:', err);
            // Fallback: just show OTP in console for development
            console.log(`OTP for ${selectedOrder.id}: ${otpValue}`);
        }
    }

    async function confirmCancel() {
        if (!selectedOrder) return;
        
        // Verify OTP
        if (!otpSent || otp !== generatedOtp) {
            setAlertModal({ show: true, title: 'Invalid OTP', message: 'Please enter the correct OTP sent to your WhatsApp.' });
            return;
        }
        
        setCancellingId(selectedOrder.id);
        setShowCancelModal(false);
        
        try {
            // Restore stock first
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', selectedOrder.id);
            
            if (items) {
                for (const item of items) {
                    if (item.variant_id) {
                        const { data: variant } = await supabase
                            .from('product_variants')
                            .select('stock')
                            .eq('id', item.variant_id)
                            .single();
                        if (variant) {
                            await supabase
                                .from('product_variants')
                                .update({ stock: variant.stock + item.quantity })
                                .eq('id', item.variant_id);
                        }
                    } else {
                        const { data: product } = await supabase
                            .from('products')
                            .select('stock')
                            .eq('id', item.product_id)
                            .single();
                        if (product) {
                            await supabase
                                .from('products')
                                .update({ stock: product.stock + item.quantity })
                                .eq('id', item.product_id);
                        }
                    }
                }
            }
            
            // Update order status
            await supabase
                .from('orders')
                .update({ 
                    status: 'CANCELLED',
                    admin_notes: `Order cancelled by customer via website on ${new Date().toLocaleString()}`
                })
                .eq('id', selectedOrder.id);
            
            // Add status history (both tables for compatibility)
            await supabase.from('order_status_history').insert({
                order_id: selectedOrder.id,
                status_from: selectedOrder.status,
                status_to: 'CANCELLED',
                changed_by: 'customer',
                notes: 'Order cancelled by customer via website'
            });
            
            // Also add to order_status_logs which is what the admin panel reads
            await supabase.from('order_status_logs').insert({
                order_id: selectedOrder.id,
                status: 'CANCELLED',
                notes: 'Order cancelled by customer via website',
                created_at: new Date().toISOString()
            });
            
            // Refresh orders
            await fetchUserOrders();

            // If order was paid, create a refund request entry
            if (['PAID', 'AWAITING_PAYMENT'].includes(selectedOrder.status)) {
                await supabase.from('refunds').insert({
                    order_id: selectedOrder.id,
                    amount: selectedOrder.total_amount,
                    status: 'REQUESTED',
                    reason: 'Order cancelled by customer via website',
                    created_at: new Date().toISOString()
                });
            }

        } catch (err) {
            console.error('Cancel Order Error:', err);
            setAlertModal({ show: true, title: 'Cancellation Failed', message: 'Failed to cancel order. Please try again or contact support.' });
        } finally {
            setCancellingId(null);
            setSelectedOrder(null);
        }
    }

    const filteredOrders = orders.filter(o => 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (status) => {
        switch(status) {
            case 'DELIVERED': return <CheckCircle size={16} className={styles.statusIconDelivered} />;
            case 'CANCELLED': return <XCircle size={16} className={styles.statusIconCancelled} />;
            case 'SHIPPED': return <Package size={16} className={styles.statusIconShipped} />;
            default: return <Clock size={16} className={styles.statusIconPending} />;
        }
    };

    const canCancel = (status) => ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes(status);

    if (!user) {
        return (
            <div className={styles.loginPrompt}>
                <Package size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                <h3>Login to View Orders</h3>
                <p>Track your saree orders and history by logging in.</p>
                <Link href="/login" className={styles.btnPrimary}>Login Now</Link>
            </div>
        );
    }

    return (
        <div className={styles.ordersContainer}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <ChevronLeft size={20} /> Back
            </button>
            
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>My Orders</h2>
                    <p>{orders.length} orders total</p>
                </div>
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by Order ID or status..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Global Alert Modal */}
            {alertModal.show && (
                <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
                    <div className={styles.modal} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ background: '#fee2e2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                                <AlertTriangle size={30} color="#dc2626" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '0.5rem', fontWeight: 700 }}>{alertModal.title}</h3>
                            <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                {alertModal.message}
                            </p>
                        </div>
                        <button 
                            onClick={() => setAlertModal({ show: false, title: '', message: '' })} 
                            className={styles.btnPrimary} 
                            style={{ width: '100%', padding: '0.875rem' }}
                        >
                            Okay, Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {showCancelModal && selectedOrder && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <AlertTriangle size={24} color="#f59e0b" />
                            <h3>Confirm Cancellation</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Are you sure you want to cancel order <strong>#{selectedOrder.id}</strong>?</p>
                            <div className={styles.modalDetails}>
                                <span>Amount: ₹{selectedOrder.total_amount?.toLocaleString()}</span>
                                <span>Status: {selectedOrder.status}</span>
                            </div>
                            <p className={styles.modalWarning}>
                                This action cannot be undone. Stock will be restored and if you have paid, refund will be processed within 5-7 business days.
                            </p>
                            
                            {!otpSent ? (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                        For security, please verify your identity with an OTP sent to your WhatsApp.
                                    </p>
                                    <button onClick={sendOtp} className={styles.btnPrimary} style={{ width: '100%' }}>
                                        Send OTP
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Enter the 6-digit OTP sent to your WhatsApp:
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            fontSize: '1.25rem',
                                            textAlign: 'center',
                                            letterSpacing: '0.3em',
                                            marginBottom: '1rem',
                                            fontWeight: '600',
                                            color: '#1f2937',
                                            background: '#f9fafb',
                                            transition: 'all 0.2s',
                                            outline: 'none'
                                        }}
                                        maxLength={6}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.background = 'white';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.background = '#f9fafb';
                                        }}
                                    />
                                    <button onClick={sendOtp} className={styles.btnSecondary} style={{ fontSize: '0.85rem' }}>
                                        Resend OTP
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => {
                                setShowCancelModal(false);
                                setOtpSent(false);
                                setOtp('');
                                setGeneratedOtp(null);
                            }} className={styles.btnSecondary}>
                                No, Keep Order
                            </button>
                            <button 
                                onClick={confirmCancel} 
                                className={styles.btnDanger}
                                disabled={!otpSent || otp.length !== 6}
                            >
                                Yes, Cancel Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.loadingState}>
                    <Package className={styles.spin} />
                    <p>Loading your orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className={styles.emptyOrders}>
                    <Package size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>No orders found</h3>
                    <p>You haven't placed any orders yet.</p>
                    <Link href="/shop" className={styles.btnPrimary}>Start Shopping</Link>
                </div>
            ) : (
                <div className={styles.ordersTableContainer}>
                    <table className={styles.ordersTable}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr 
                                    key={order.id} 
                                    className={`${order.status === 'CANCELLED' ? styles.cancelledRow : ''} ${styles.clickableRow}`}
                                    onClick={() => router.push(`/track-order?id=${order.id}`)}
                                >
                                    <td className={styles.orderIdCell}>
                                        <span className={styles.orderId}>#{order.id}</span>
                                    </td>
                                    <td className={styles.dateCell}>
                                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className={styles.itemsCell}>
                                        {order.order_items?.length || 0} item(s)
                                        <div className={styles.itemPreview}>
                                            {order.order_items?.slice(0, 2).map((item, i) => (
                                                <span key={i} className={styles.itemName}>
                                                    {item.product_name}{item.variant_name && ` (${item.variant_name})`}
                                                    {i < (order.order_items.length > 2 ? 1 : order.order_items.length - 1) && ', '}
                                                </span>
                                            ))}
                                            {order.order_items?.length > 2 && '...'}
                                        </div>
                                    </td>
                                    <td className={styles.totalCell}>
                                        ₹{order.total_amount?.toLocaleString()}
                                    </td>
                                    <td className={styles.statusCell}>
                                        <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.actionButtons}>
                                            <button
                                                onClick={() => handleDownloadInvoice(order)}
                                                className={`${styles.actionBtn} ${generatingId === order.id ? styles.pulsing : ''}`}
                                                disabled={generatingId !== null}
                                                title="Download Invoice"
                                            >
                                                <Download size={16} />
                                            </button>
                                            
                                            {canCancel(order.status) && (
                                                <button
                                                    onClick={() => handleCancelClick(order)}
                                                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                                    disabled={cancellingId === order.id}
                                                    title="Cancel Order"
                                                >
                                                    {cancellingId === order.id ? (
                                                        <Clock size={16} className={styles.spin} />
                                                    ) : (
                                                        <XCircle size={16} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
