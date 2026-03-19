'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Tag, MessageCircle, ChevronRight, Search, ChevronLeft, Download } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './orders.module.css';

export default function MyOrdersPage() {
    const { user, supabase } = useShop();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null); // ID of the order being generated

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

        // Trigger generation if missing
        setGeneratingId(order.id);
        try {
            await fetch('/api/orders/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id })
            });

            // Start polling for this specific order
            const interval = setInterval(async () => {
                const { data } = await supabase.from('orders').select('invoice_url').eq('id', order.id).single();
                if (data?.invoice_url) {
                    // Update the order in local state
                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, invoice_url: data.invoice_url } : o));
                    setGeneratingId(null);
                    clearInterval(interval);
                    window.open(data.invoice_url, '_blank');
                }
            }, 3000);

            // Timeout after 30s
            setTimeout(() => {
                clearInterval(interval);
                if (generatingId === order.id) setGeneratingId(null);
            }, 30000);

        } catch (err) {
            console.error('Failed to trigger invoice generation:', err);
            setGeneratingId(null);
        }
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
                    <h2>Order History</h2>
                    <p>Total {orders.length} orders placed</p>
                </div>
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input type="text" placeholder="Search order ID..." />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <Package className={styles.spin} />
                    <p>Fetching your order history...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className={styles.emptyOrders}>
                    <Package size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>No orders found</h3>
                    <p>You haven't placed any orders with this phone number yet.</p>
                    <Link href="/shop" className={styles.btnPrimary}>Explore Sarees</Link>
                </div>
            ) : (
                <div className={styles.orderGrid}>
                    {orders.map(order => (
                        <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <div className={styles.orderMeta}>
                                    <span className={styles.orderId}>Order #{order.id}</span>
                                    <span className={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className={styles.orderContent}>
                                <div className={styles.itemsList}>
                                    {order.order_items?.map(item => (
                                        <div key={item.id} className={styles.orderItem}>
                                            <div className={styles.itemName}>
                                                <strong>{item.product_name}</strong>
                                                {item.variant_name && <span className={styles.variantTag}>{item.variant_name}</span>}
                                            </div>
                                            <div className={styles.itemMeta}>
                                                Qty: {item.quantity} × ₹{item.price_at_time.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.orderDetails}>
                                    <div className={styles.detailItem}>
                                        <Tag size={16} />
                                        <div className={styles.taxList}>
                                            <div className={styles.taxSummaryRow}>
                                                <span>Subtotal:</span>
                                                <span>₹{(order.subtotal || (order.total_amount - (order.shipping_cost || 0) - (order.tax_amount || 0))).toLocaleString()}</span>
                                            </div>
                                            {order.shipping_cost > 0 && (
                                                <div className={styles.taxSummaryRow}>
                                                    <span>Shipping:</span>
                                                    <span>₹{order.shipping_cost.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {order.cgst > 0 && (
                                                <div className={styles.taxSummaryRow}>
                                                    <span>CGST (2.5%):</span>
                                                    <span>₹{order.cgst.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {order.sgst > 0 && (
                                                <div className={styles.taxSummaryRow}>
                                                    <span>SGST (2.5%):</span>
                                                    <span>₹{order.sgst.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {order.igst > 0 && (
                                                <div className={styles.taxSummaryRow}>
                                                    <span>IGST (5%):</span>
                                                    <span>₹{order.igst.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className={`${styles.taxSummaryRow} ${styles.grandTotalRow}`}>
                                                <span>Total:</span>
                                                <span>₹{order.total_amount?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <MapPin size={16} />
                                        <span>{order.delivery_address || 'Address not listed'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Clock size={16} />
                                        <span>Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            <Link href={`/track-order?id=${order.id}`} className={styles.trackBtn}>
                                Track Status <ChevronRight size={16} />
                            </Link>

                            <button
                                onClick={() => handleDownloadInvoice(order)}
                                className={`${styles.downloadBtn} ${generatingId === order.id ? styles.pulsing : ''}`}
                                disabled={generatingId !== null}
                            >
                                <Download size={16} /> {generatingId === order.id ? 'Generating...' : 'Invoice'}
                            </button>

                            <a
                                href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}?text=Hi, query about Order %23${order.id}`}
                                className={styles.supportLink}
                                target="_blank"
                            >
                                <MessageCircle size={16} /> Support
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
