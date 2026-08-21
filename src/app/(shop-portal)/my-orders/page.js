'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Tag, MessageCircle, ChevronRight, Search, ChevronLeft, Download, XCircle, AlertTriangle, CheckCircle, Globe, ShoppingBag } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './orders.module.css';

export default function MyOrdersPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/profile?tab=orders');
    }, [router]);
    const { user, supabase, isSessionLoading } = useShop();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnForm, setReturnForm] = useState({ type: 'RETURN', reason: '', productId: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });
    const [returnRequests, setReturnRequests] = useState([]);

    useEffect(() => {
        if (!supabase) return;
        if (user) {
            fetchUserOrders();
        } else if (!isSessionLoading) {
            setLoading(false);
        }
    }, [user, supabase, isSessionLoading]);

    async function fetchUserOrders() {
        if (!supabase || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const digits = (user.phone || '').replace(/\D/g, '');
            const phoneVariations = [];
            if (digits) {
                phoneVariations.push(digits);
                if (digits.length === 10) {
                    phoneVariations.push('91' + digits);
                } else if (digits.length === 12 && digits.startsWith('91')) {
                    phoneVariations.push(digits.substring(2));
                }
            }

            let query = supabase
                .from('orders')
                .select('*, order_items(*)')
                .order('created_at', { ascending: false });

            if (user.id && phoneVariations.length > 0) {
                query = query.or(`customer_id.eq.${user.id},customer_phone.in.(${phoneVariations.join(',')})`);
            } else if (user.id) {
                query = query.eq('customer_id', user.id);
            } else if (phoneVariations.length > 0) {
                query = query.in('customer_phone', phoneVariations);
            } else {
                setLoading(false);
                return;
            }

            const { data, error } = await query;
            if (error) {
                console.error('Fetch Orders Query Error:', error);
            } else if (data) {
                const enrichedData = (data || []).map((o, idx) => ({
                    ...o,
                    invoice_no: o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : `INV-${String((data || []).length - idx).padStart(4, '0')}`)
                }));

                setOrders(enrichedData);
                const orderIds = enrichedData.map(o => o.id).filter(Boolean);
                if (orderIds.length > 0) {
                    const { data: reqs } = await supabase
                        .from('return_requests')
                        .select('*')
                        .in('order_id', orderIds);
                    setReturnRequests(reqs || []);
                }
            }
        } catch (err) {
            console.error('Fetch Orders Error:', err);
        } finally {
            setLoading(false);
        }
    }

    const [currentPage, setCurrentPage] = useState(1);
    const ORDERS_PER_PAGE = 8;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPage]);

    const filteredOrders = (orders || []).filter((o, idx) => {
        const seqNum = orders.length - idx;
        const invNo = `inv-${String(seqNum).padStart(4, '0')}`;
        const idStr = String(o?.id || '').toLowerCase();
        const statusStr = String(o?.status || '').toLowerCase();
        const search = (searchTerm || '').toLowerCase();
        return idStr.includes(search) || invNo.includes(search) || statusStr.includes(search);
    });

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'DELIVERED': return <CheckCircle size={14} className={styles.statusIconDelivered} />;
            case 'CANCELLED': return <XCircle size={14} className={styles.statusIconCancelled} />;
            case 'SHIPPED': return <Package size={14} className={styles.statusIconShipped} />;
            default: return <Clock size={14} className={styles.statusIconPending} />;
        }
    };

    const getOrderSource = (order) => {
        if (!order) return 'WEBSITE';
        const src = String(order.source || '').toUpperCase();
        if (src === 'WEBSITE' || src === 'WEB') return 'WEBSITE';
        if (src === 'MANUAL' || src === 'POS' || src === 'STORE') return 'MANUAL';
        if (src === 'WHATSAPP' || src === 'WA') return 'WHATSAPP';
        const id = String(order.id || '').toUpperCase();
        if (id.startsWith('WEB-')) return 'WEBSITE';
        if (id.startsWith('MAN-')) return 'MANUAL';
        return 'WHATSAPP';
    };

    if (isSessionLoading || loading) {
        return (
            <div className={styles.ordersContainer}>
                <div className={styles.loadingState} style={{ padding: '6rem 2rem' }}>
                    <Package className={styles.spin} size={36} />
                    <p style={{ marginTop: '1rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>Loading your orders...</p>
                </div>
            </div>
        );
    }

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
                            placeholder="Search by Invoice No, Order ID or status..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className={styles.emptyOrders}>
                    <Package size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>No orders found</h3>
                    <p>You haven't placed any orders yet.</p>
                    <Link href="/shop" className={styles.btnPrimary}>Start Shopping</Link>
                </div>
            ) : (
                <>
                    <div className={styles.ordersTableContainer}>
                        <table className={styles.ordersTable}>
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.map(order => {
                                    const invoiceNo = order.invoice_no ? `#${order.invoice_no}` : `#INV-${String(orders.length - orders.findIndex(o => o.id === order.id)).padStart(4, '0')}`;
                                    const orderSource = getOrderSource(order);

                                    return (
                                        <tr 
                                            key={order.id} 
                                            className={`${order.status === 'CANCELLED' ? styles.cancelledRow : ''} ${styles.clickableRow}`}
                                            onClick={() => router.push(`/track-order?id=${order.id}`)}
                                        >
                                            <td className={styles.orderIdCell}>
                                                <span className={styles.orderId}>{invoiceNo}</span>
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
                                            <td className={styles.sourceCell}>
                                                <span className={`${styles.sourceBadge} ${orderSource === 'WEBSITE' ? styles.sourceWeb : orderSource === 'MANUAL' ? styles.sourceManual : styles.sourceWhatsApp}`}>
                                                    {orderSource === 'WEBSITE' ? <Globe size={13} /> : orderSource === 'MANUAL' ? <ShoppingBag size={13} /> : <MessageCircle size={13} />}
                                                    {orderSource === 'WEBSITE' ? 'Web Store' : orderSource === 'MANUAL' ? 'Direct Store' : 'WhatsApp'}
                                                </span>
                                            </td>
                                            <td className={styles.statusCell}>
                                                <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className={styles.actionCell} onClick={e => e.stopPropagation()}>
                                                <div className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                                                    <a 
                                                        href={`/api/invoice/${order.id}?phone=${order.customer_phone || user?.phone || ''}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        title="Download PDF Invoice"
                                                        className={styles.actionBtn}
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                    <Link 
                                                        href={`/track-order?id=${order.id}`}
                                                        title="View Details"
                                                        className={styles.actionBtn}
                                                    >
                                                        <ChevronRight size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={styles.paginationBtn}
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>
                            <div className={styles.pageNumbers}>
                                {(() => {
                                    const pages = [];
                                    const range = 1; // Number of pages around current
                                    
                                    // Always show page 1
                                    pages.push(1);
                                    
                                    if (currentPage > range + 2) {
                                        pages.push('...');
                                    }
                                    
                                    // Pages around current page
                                    for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
                                        pages.push(i);
                                    }
                                    
                                    if (currentPage < totalPages - range - 1) {
                                        pages.push('...');
                                    }
                                    
                                    // Always show last page
                                    if (totalPages > 1) {
                                        pages.push(totalPages);
                                    }
                                    
                                    return pages.map((page, i) => (
                                        page === '...' ? (
                                            <span key={`dots-${i}`} className={styles.dots}>...</span>
                                        ) : (
                                            <button 
                                                key={page} 
                                                onClick={() => setCurrentPage(page)}
                                                className={`${styles.pageNumber} ${currentPage === page ? styles.activePage : ''}`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ));
                                })()}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={styles.paginationBtn}
                            >
                                Next
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Global Alert Modal at the bottom to ensure high z-index stacking */}
            {alertModal.show && (
                <div className={styles.modalOverlay} style={{ zIndex: 99999 }}>
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
        </div>
    );
}
