'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Tag, MessageCircle, ChevronRight, Search, ChevronLeft, Download, XCircle, AlertTriangle, CheckCircle, Globe } from 'lucide-react';
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
        if (user?.phone) {
            fetchUserOrders();
        }
    }, [user]);

    async function fetchUserOrders() {
        setLoading(true);
        try {
            const digits = (user.phone || '').replace(/\D/g, '');
            const phoneVariations = [digits];
            if (digits.length === 10) {
                phoneVariations.push('91' + digits);
            } else if (digits.length === 12 && digits.startsWith('91')) {
                phoneVariations.push(digits.substring(2));
            }

            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .in('customer_phone', phoneVariations)
                .order('created_at', { ascending: false });

            if (data) {
                setOrders(data);
                const orderIds = data.map(o => o.id);
                const { data: reqs } = await supabase
                    .from('return_requests')
                    .select('*')
                    .in('order_id', orderIds);
                setReturnRequests(reqs || []);
            }
        } catch (err) {
            console.error('Fetch Orders Error:', err);
        } finally {
            setLoading(false);
        }
    }

    const [currentPage, setCurrentPage] = useState(1);
    const ORDERS_PER_PAGE = 8;

    const filteredOrders = orders.filter(o => 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'DELIVERED': return <CheckCircle size={16} className={styles.statusIconDelivered} />;
            case 'CANCELLED': return <XCircle size={16} className={styles.statusIconCancelled} />;
            case 'SHIPPED': return <Package size={16} className={styles.statusIconShipped} />;
            default: return <Clock size={16} className={styles.statusIconPending} />;
        }
    };

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
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            </div>

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
                <>
                    <div className={styles.ordersTableContainer}>
                        <table className={styles.ordersTable}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        className={`${order.status === 'CANCELLED' ? styles.cancelledRow : ''} ${styles.clickableRow}`}
                                        onClick={() => router.push(`/track-order?id=${order.id}`)}
                                    >
                                        <td className={styles.orderIdCell}>
                                            <span className={styles.orderId}>#{order.id}</span>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '4px', 
                                                fontSize: '0.65rem', 
                                                fontWeight: 700, 
                                                marginTop: '4px',
                                                textTransform: 'uppercase',
                                                color: order.source === 'WEBSITE' ? '#6366f1' : '#22c55e'
                                            }}>
                                                {order.source === 'WEBSITE' ? <Globe size={10} /> : <MessageCircle size={10} />}
                                                {order.source === 'WEBSITE' ? 'WEB ORDER' : 'WHATSAPP'}
                                            </div>
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
                                    </tr>
                                ))}
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
