'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    User, Mail, MapPin, Phone, MessageCircle, Save, 
    ShoppingBag, History, RotateCcw, IndianRupee, 
    CheckCircle, Clock, XCircle, Package, ArrowRight, FileText, Send, AlertCircle
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, setUser, showToast, supabase, isSessionLoading } = useShop();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Tab state (orders, history, account, refund, return)
    const initialTab = searchParams.get('tab') || 'orders';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Profile & Address state
    const [saving, setSaving] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [showAddressForm, setShowAddressForm] = useState(false);

    // Orders state
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    // Refund state
    const [refunds, setRefunds] = useState([]);
    const [loadingRefunds, setLoadingRefunds] = useState(false);
    const [refundForm, setRefundForm] = useState({
        orderItemKey: '',
        reason: 'Defective Product',
        otherReason: '',
        amount: ''
    });
    const [submittingRefund, setSubmittingRefund] = useState(false);

    // Return state
    const [returns, setReturns] = useState([]);
    const [loadingReturns, setLoadingReturns] = useState(false);
    const [returnForm, setReturnForm] = useState({
        orderItemKey: '',
        requestType: 'RETURN',
        reason: 'Wrong Item Delivered',
        otherReason: ''
    });
    const [submittingReturn, setSubmittingReturn] = useState(false);

    // Synchronize tab with URL query parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'orders') {
            router.replace('/my-orders');
        } else if (tab && ['history', 'account', 'refund', 'return'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams, router]);

    const handleTabChange = (tab) => {
        if (tab === 'orders') {
            router.push('/my-orders');
            return;
        }
        setActiveTab(tab);
        router.push(`/profile?tab=${tab}`, { scroll: false });
    };

    // Load data on user ready
    useEffect(() => {
        if (user?.id) {
            fetchUserOrders();
            fetchAddresses();
            fetchRefunds();
            fetchReturns();
        } else {
            setLoadingOrders(false);
            setLoadingAddresses(false);
        }
    }, [user]);

    // Fetch Customer Orders
    async function fetchUserOrders() {
        if (!user || !supabase) return;
        setLoadingOrders(true);
        try {
            const digits = (user.phone || '').replace(/\D/g, '');
            const phoneVariations = [];
            if (digits) {
                phoneVariations.push(digits);
                if (digits.length === 10) phoneVariations.push('91' + digits);
                else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));
            }

            let query = supabase
                .from('orders')
                .select('*, order_items(*, products(id, image_url, name))')
                .order('created_at', { ascending: false });

            if (user.id && phoneVariations.length > 0) {
                query = query.or(`customer_id.eq.${user.id},customer_phone.in.(${phoneVariations.join(',')})`);
            } else if (user.id) {
                query = query.eq('customer_id', user.id);
            } else if (phoneVariations.length > 0) {
                query = query.in('customer_phone', phoneVariations);
            }

            const { data, error } = await query;
            if (!error && data) {
                setOrders(data);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoadingOrders(false);
        }
    }

    // Fetch Saved Addresses
    async function fetchAddresses() {
        if (!user?.id || !supabase) return;
        setLoadingAddresses(true);
        try {
            const { data, error } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', user.id)
                .order('is_default', { ascending: false });
            if (!error && data) {
                setAddresses(data);
            }
        } catch (err) {
            console.error('Fetch addresses error:', err);
        } finally {
            setLoadingAddresses(false);
        }
    }

    // Fetch Refund Requests
    async function fetchRefunds() {
        if (!user?.id || !supabase) return;
        setLoadingRefunds(true);
        try {
            const { data, error } = await supabase
                .from('refunds')
                .select('*, orders:order_id(id, created_at)')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            if (!error && data) {
                setRefunds(data);
            }
        } catch (err) {
            console.error('Fetch refunds error:', err);
        } finally {
            setLoadingRefunds(false);
        }
    }

    // Fetch Return Requests
    async function fetchReturns() {
        if (!user?.id || !supabase) return;
        setLoadingReturns(true);
        try {
            const { data, error } = await supabase
                .from('return_requests')
                .select('*, products(id, name, image_url), orders:order_id(id, created_at)')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            if (!error && data) {
                setReturns(data);
            }
        } catch (err) {
            console.error('Fetch returns error:', err);
        } finally {
            setLoadingReturns(false);
        }
    }

    // Handle Profile Info Update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            const formData = new FormData(e.target);
            const updates = {
                name: formData.get('name'),
                email: formData.get('email'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
            };

            const { data, error } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            setUser(data);
            localStorage.setItem('cast_prince_user', JSON.stringify(data));
            showToast('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            showToast('Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Add Address Logic
    async function handleAddAddress(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            const newAddress = {
                customer_id: user.id,
                title: formData.get('title'),
                full_name: formData.get('full_name'),
                phone: formData.get('phone'),
                address_line: formData.get('address_line'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
                is_default: addresses.length === 0 || formData.get('is_default') === 'on'
            };

            if (newAddress.is_default && addresses.length > 0) {
                await supabase.from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', user.id);
            }

            const { error } = await supabase.from('customer_addresses').insert(newAddress);
            if (error) throw error;

            showToast('Address added successfully');
            setShowAddressForm(false);
            fetchAddresses();
        } catch (err) {
            console.error(err);
            showToast('Failed to add address', 'error');
        }
    }

    // Delete Address Logic
    async function deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) return;
        try {
            await supabase.from('customer_addresses').delete().eq('id', addressId);
            showToast('Address deleted');
            fetchAddresses();
        } catch (err) {
            console.error(err);
        }
    }

    // Submit Refund Request (Handwritten Feature 4)
    async function handleSubmitRefund(e) {
        e.preventDefault();
        if (!refundForm.orderItemKey) {
            showToast('Please select a product to request refund', 'error');
            return;
        }

        const [orderId, productId, itemPrice] = refundForm.orderItemKey.split('::');
        const finalReason = refundForm.reason === 'Other' ? refundForm.otherReason : refundForm.reason;

        if (!finalReason) {
            showToast('Please provide a reason for refund', 'error');
            return;
        }

        setSubmittingRefund(true);
        try {
            const refundPayload = {
                order_id: orderId,
                customer_id: user.id,
                product_id: productId && productId !== 'undefined' ? productId : null,
                amount: parseFloat(refundForm.amount) || parseFloat(itemPrice) || 0,
                reason: finalReason,
                status: 'REQUESTED'
            };

            const { error } = await supabase.from('refunds').insert(refundPayload);
            if (error) throw error;

            showToast('Refund request submitted successfully!');
            setRefundForm({ orderItemKey: '', reason: 'Defective Product', otherReason: '', amount: '' });
            fetchRefunds();
        } catch (err) {
            console.error('Error submitting refund:', err);
            showToast('Failed to submit refund request', 'error');
        } finally {
            setSubmittingRefund(false);
        }
    }

    // Submit Return Request (Handwritten Feature 5)
    async function handleSubmitReturn(e) {
        e.preventDefault();
        if (!returnForm.orderItemKey) {
            showToast('Please select a product to request return', 'error');
            return;
        }

        const [orderId, productId] = returnForm.orderItemKey.split('::');
        const finalReason = returnForm.reason === 'Other' ? returnForm.otherReason : returnForm.reason;

        if (!finalReason) {
            showToast('Please provide a reason for return', 'error');
            return;
        }

        setSubmittingReturn(true);
        try {
            const returnPayload = {
                order_id: orderId,
                customer_id: user.id,
                product_id: productId && productId !== 'undefined' ? productId : null,
                request_type: returnForm.requestType,
                reason: finalReason,
                status: 'PENDING'
            };

            const { error } = await supabase.from('return_requests').insert(returnPayload);
            if (error) throw error;

            showToast('Return request submitted successfully!');
            setReturnForm({ orderItemKey: '', requestType: 'RETURN', reason: 'Wrong Item Delivered', otherReason: '' });
            fetchReturns();
        } catch (err) {
            console.error('Error submitting return:', err);
            showToast('Failed to submit return request', 'error');
        } finally {
            setSubmittingReturn(false);
        }
    }

    if (isSessionLoading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.loginPrompt}>
                <div className={styles.promptContent}>
                    <User size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>Please Login</h3>
                    <p>You need to be logged in to view and edit your profile.</p>
                    <button onClick={() => window.location.href = '/login'} className={styles.btnPrimary}>Login / Sign Up</button>
                </div>
            </div>
        );
    }

    // Filter Active vs History Orders
    const activeOrders = orders.filter(o => ['PLACED', 'PAID', 'PROCESSING', 'SHIPPED'].includes(o.status));
    const historyOrders = orders.filter(o => ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status));

    // Products eligible for Refund & Return (From user orders)
    const eligibleRefundProducts = [];
    orders.forEach(o => {
        (o.order_items || []).forEach(item => {
            const priceVal = item.price_at_time || item.price || 0;
            eligibleRefundProducts.push({
                key: `${o.id}::${item.product_id}::${priceVal}`,
                orderId: o.id,
                productName: item.product_name,
                price: priceVal,
                orderDate: new Date(o.created_at).toLocaleDateString()
            });
        });
    });

    const eligibleReturnProducts = [];
    orders.filter(o => o.status === 'DELIVERED').forEach(o => {
        (o.order_items || []).forEach(item => {
            eligibleReturnProducts.push({
                key: `${o.id}::${item.product_id}`,
                orderId: o.id,
                productName: item.product_name,
                orderDate: new Date(o.created_at).toLocaleDateString()
            });
        });
    });

    return (
        <div className={styles.profileContainer}>
            {/* User Profile Header */}
            <div className={styles.profileHeader}>
                <div className={styles.headerMain}>
                    <div className={styles.avatarLarge}>{(user.name?.[0] || 'U').toUpperCase()}</div>
                    <div className={styles.headerInfo}>
                        <h2>{user.name}</h2>
                        <p className={styles.userPhone}>+{user.phone} • {user.email || 'No email specified'}</p>
                    </div>
                </div>

                <div className={styles.quickStats}>
                    <div className={styles.statBadge}>
                        <span className={styles.statNum}>{orders.length}</span>
                        <span className={styles.statLabel}>Total Orders</span>
                    </div>
                    <div className={styles.statBadge}>
                        <span className={styles.statNum}>{refunds.length}</span>
                        <span className={styles.statLabel}>Refunds</span>
                    </div>
                    <div className={styles.statBadge}>
                        <span className={styles.statNum}>{returns.length}</span>
                        <span className={styles.statLabel}>Returns</span>
                    </div>
                </div>
            </div>

            {/* Specification Tabs Navigation Bar */}
            <div className={styles.tabsContainer}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('orders')}
                >
                    <ShoppingBag size={18} />
                    <span>Orders</span>
                    {activeOrders.length > 0 && <span className={styles.tabBadge}>{activeOrders.length}</span>}
                </button>

                <button 
                    className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('history')}
                >
                    <History size={18} />
                    <span>History</span>
                </button>

                <button 
                    className={`${styles.tabBtn} ${activeTab === 'account' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('account')}
                >
                    <User size={18} />
                    <span>Account & Addresses</span>
                </button>

                <button 
                    className={`${styles.tabBtn} ${activeTab === 'refund' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('refund')}
                >
                    <IndianRupee size={18} />
                    <span>Refund</span>
                    {refunds.length > 0 && <span className={styles.tabBadge}>{refunds.length}</span>}
                </button>

                <button 
                    className={`${styles.tabBtn} ${activeTab === 'return' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('return')}
                >
                    <RotateCcw size={18} />
                    <span>Return</span>
                    {returns.length > 0 && <span className={styles.tabBadge}>{returns.length}</span>}
                </button>
            </div>

            {/* Profile Main Content Layout */}
            <div className={styles.profileLayout}>
                <div className={styles.profileMain}>

                    {/* TAB 1: ACTIVE ORDERS */}
                    {activeTab === 'orders' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><ShoppingBag size={20} /> Active Orders</h3>
                                    <p className={styles.sectionSubtitle}>View and track your ongoing order status</p>
                                </div>
                            </div>

                            {loadingOrders ? (
                                <div className={styles.loadingState}>Loading active orders...</div>
                            ) : activeOrders.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Package size={48} style={{ opacity: 0.2 }} />
                                    <p>No active orders right now</p>
                                    <span>When you place new orders, they will appear here.</span>
                                    <Link href="/shop" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>
                                        Explore Products
                                    </Link>
                                </div>
                            ) : (
                                <div className={styles.ordersList}>
                                    {activeOrders.map(order => (
                                        <div key={order.id} className={styles.orderCard}>
                                            <div className={styles.orderHeader}>
                                                <div className={styles.orderMeta}>
                                                    <span className={styles.orderId}>Order #{order.id}</span>
                                                    <span className={styles.orderDate}>Placed on {new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>

                                            <div className={styles.orderBody}>
                                                <div className={styles.orderItems}>
                                                    {(order.order_items || []).map(item => {
                                                        const itemPrice = Number(item.price_at_time || item.price || 0);
                                                        const itemQty = Number(item.quantity || 1);
                                                        const itemTotal = itemPrice * itemQty;
                                                        const rawImg = item.image_url || item.products?.image_url || '';
                                                        const itemImg = rawImg ? rawImg.split(',')[0].trim() : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';

                                                        return (
                                                            <div key={item.id} className={styles.orderItemRow}>
                                                                <img 
                                                                    src={itemImg} 
                                                                    alt={item.product_name} 
                                                                    className={styles.itemImage}
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                                                                />
                                                                <div className={styles.itemDetails}>
                                                                    <p className={styles.itemName}>{item.product_name}</p>
                                                                    <p className={styles.itemMeta}>Qty: {itemQty} • ₹{itemPrice.toLocaleString()}</p>
                                                                </div>
                                                                <div className={styles.itemPrice}>₹{itemTotal.toLocaleString()}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className={styles.orderFooter}>
                                                    <div className={styles.orderTotal}>Total Amount: ₹{order.total_amount}</div>
                                                    <div className={styles.orderActions}>
                                                        <Link href={`/track-order?orderId=${order.id}`} className={styles.actionBtnOutline}>
                                                            Track Order <ArrowRight size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 2: ORDER HISTORY */}
                    {activeTab === 'history' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><History size={20} /> Order History</h3>
                                    <p className={styles.sectionSubtitle}>Your past delivered and completed orders</p>
                                </div>
                            </div>

                            {loadingOrders ? (
                                <div className={styles.loadingState}>Loading order history...</div>
                            ) : historyOrders.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <History size={48} style={{ opacity: 0.2 }} />
                                    <p>No past order history</p>
                                    <span>Completed and delivered orders will be listed here.</span>
                                </div>
                            ) : (
                                <div className={styles.ordersList}>
                                    {historyOrders.map(order => (
                                        <div key={order.id} className={styles.orderCard}>
                                            <div className={styles.orderHeader}>
                                                <div className={styles.orderMeta}>
                                                    <span className={styles.orderId}>Order #{order.id}</span>
                                                    <span className={styles.orderDate}>Completed on {new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>

                                            <div className={styles.orderBody}>
                                                <div className={styles.orderItems}>
                                                    {(order.order_items || []).map(item => {
                                                        const itemPrice = Number(item.price_at_time || item.price || 0);
                                                        const itemQty = Number(item.quantity || 1);
                                                        const itemTotal = itemPrice * itemQty;
                                                        const rawImg = item.image_url || item.products?.image_url || '';
                                                        const itemImg = rawImg ? rawImg.split(',')[0].trim() : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';

                                                        return (
                                                            <div key={item.id} className={styles.orderItemRow}>
                                                                <img 
                                                                    src={itemImg} 
                                                                    alt={item.product_name} 
                                                                    className={styles.itemImage}
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                                                                />
                                                                <div className={styles.itemDetails}>
                                                                    <p className={styles.itemName}>{item.product_name}</p>
                                                                    <p className={styles.itemMeta}>Qty: {itemQty} • ₹{itemPrice.toLocaleString()}</p>
                                                                </div>
                                                                <div className={styles.itemPrice}>₹{itemTotal.toLocaleString()}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className={styles.orderFooter}>
                                                    <div className={styles.orderTotal}>Total Amount: ₹{order.total_amount}</div>
                                                    <div className={styles.orderActions}>
                                                        <button 
                                                            className={styles.actionBtnOutline}
                                                            onClick={() => handleTabChange('return')}
                                                        >
                                                            <RotateCcw size={14} /> Request Return
                                                        </button>
                                                        <button 
                                                            className={styles.actionBtnOutline}
                                                            onClick={() => handleTabChange('refund')}
                                                        >
                                                            <IndianRupee size={14} /> Request Refund
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 3: ACCOUNT & BILLING / SHIPPING ADDRESSES */}
                    {activeTab === 'account' && (
                        <>
                            <section className={styles.profileSection}>
                                <h3 className={styles.sectionTitle}><User size={20} /> Personal Information</h3>
                                <form onSubmit={handleUpdateProfile} className={styles.profileForm} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label><User size={14} /> FULL NAME</label>
                                            <input name="name" defaultValue={user.name} required placeholder="Your name" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label><Mail size={14} /> EMAIL</label>
                                            <input name="email" defaultValue={user.email} type="email" placeholder="email@example.com" />
                                        </div>
                                    </div>

                                    <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                                        <label><MapPin size={14} /> DEFAULT SHIPPING ADDRESS</label>
                                        <textarea name="address" defaultValue={user.address} rows={3} placeholder="Flat/House No, Street, Area..." />
                                    </div>

                                    <div className={styles.formGrid3} style={{ marginTop: '1.5rem' }}>
                                        <div className={styles.formGroup}>
                                            <label>CITY</label>
                                            <input name="city" defaultValue={user.city} placeholder="City" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>STATE</label>
                                            <input name="state" defaultValue={user.state} placeholder="State" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>PINCODE</label>
                                            <input name="pincode" defaultValue={user.pincode} placeholder="6-digit PIN" />
                                        </div>
                                    </div>

                                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                                        {saving ? 'Saving Changes...' : <><Save size={18} /> Save Account Info</>}
                                    </button>
                                </form>
                            </section>

                            <section className={styles.profileSection}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h3 className={styles.sectionTitle}><MapPin size={20} /> Billing & Shipping Address Book</h3>
                                        <p className={styles.sectionSubtitle}>Manage multiple saved delivery locations</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShowAddressForm(!showAddressForm)} 
                                        className={styles.addAddressBtn}
                                    >
                                        {showAddressForm ? 'Cancel' : '+ Add New Address'}
                                    </button>
                                </div>

                                {showAddressForm && (
                                    <form onSubmit={handleAddAddress} className={styles.addressForm}>
                                        <div className={styles.formGrid}>
                                            <div className={styles.formGroup}>
                                                <label>TITLE (e.g. Home, Office)</label>
                                                <input name="title" required placeholder="Home" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>FULL NAME</label>
                                                <input name="full_name" defaultValue={user.name} required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PHONE</label>
                                                <input name="phone" defaultValue={user.phone} required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PINCODE</label>
                                                <input name="pincode" required />
                                            </div>
                                        </div>
                                        <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                                            <label>ADDRESS LINE</label>
                                            <textarea name="address_line" rows={2} required placeholder="Flat, Street, Area" />
                                        </div>
                                        <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
                                            <div className={styles.formGroup}>
                                                <label>CITY</label>
                                                <input name="city" required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>STATE</label>
                                                <input name="state" defaultValue="Tamil Nadu" required />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="checkbox" name="is_default" id="is_default" />
                                            <label htmlFor="is_default" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default address</label>
                                        </div>
                                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Address</button>
                                    </form>
                                )}

                                {loadingAddresses ? (
                                    <div className={styles.loadingState}>Loading addresses...</div>
                                ) : addresses.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <MapPin size={40} style={{ opacity: 0.3 }} />
                                        <p>No saved addresses yet.</p>
                                        <span>Add a billing or shipping address for faster checkout.</span>
                                    </div>
                                ) : (
                                    <div className={styles.addressGrid}>
                                        {addresses.map(addr => (
                                            <div key={addr.id} className={styles.addressCard}>
                                                {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                                                <h4 className={styles.addressTitle}>
                                                    <MapPin size={16} /> {addr.title}
                                                </h4>
                                                <p className={styles.addressName}>{addr.full_name}</p>
                                                <p className={styles.addressLine}>{addr.address_line}</p>
                                                <p className={styles.addressLocation}>{addr.city}, {addr.state} {addr.pincode}</p>
                                                <p className={styles.addressPhone}>📞 +{addr.phone}</p>
                                                <button type="button" onClick={() => deleteAddress(addr.id)} className={styles.deleteAddressBtn}>
                                                    Delete Address
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {/* TAB 4: REFUND REQUESTS & FORM (Matching Handwritten Note 4) */}
                    {activeTab === 'refund' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><IndianRupee size={20} /> Refund Requests</h3>
                                    <p className={styles.sectionSubtitle}>Request refund for products from your orders</p>
                                </div>
                            </div>

                            {/* Refund Request Form */}
                            <div className={styles.requestFormCard}>
                                <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Create New Refund Request</h4>
                                <form onSubmit={handleSubmitRefund}>
                                    <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                                        <label>CHOOSE PRODUCT *</label>
                                        <select 
                                            value={refundForm.orderItemKey}
                                            onChange={(e) => {
                                                const key = e.target.value;
                                                const price = key ? key.split('::')[2] : '';
                                                setRefundForm({ ...refundForm, orderItemKey: key, amount: price || '' });
                                            }}
                                            required
                                        >
                                            <option value="">-- Select Product from Orders --</option>
                                            {eligibleRefundProducts.map(p => (
                                                <option key={p.key} value={p.key}>
                                                    Order #{p.orderId} - {p.productName} (₹{p.price}) [{p.orderDate}]
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.formGrid} style={{ marginBottom: '1.25rem' }}>
                                        <div className={styles.formGroup}>
                                            <label>REASON *</label>
                                            <select 
                                                value={refundForm.reason} 
                                                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                            >
                                                <option value="Defective Product">Defective / Damaged Item</option>
                                                <option value="Wrong Product Received">Wrong Product Received</option>
                                                <option value="Order Cancelled">Order Cancelled</option>
                                                <option value="Billing / Payment Error">Billing / Payment Error</option>
                                                <option value="Other">Other Reason</option>
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>REFUND AMOUNT (₹)</label>
                                            <input 
                                                type="number" 
                                                placeholder="Amount" 
                                                value={refundForm.amount} 
                                                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    {refundForm.reason === 'Other' && (
                                        <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                                            <label>SPECIFY REASON *</label>
                                            <textarea 
                                                rows={3} 
                                                placeholder="Please specify details regarding your refund request..."
                                                value={refundForm.otherReason}
                                                onChange={(e) => setRefundForm({ ...refundForm, otherReason: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    <button type="submit" className={styles.formSubmitBtn} disabled={submittingRefund}>
                                        <Send size={16} />
                                        {submittingRefund ? 'Submitting...' : 'Submit Refund Request'}
                                    </button>
                                </form>
                            </div>

                            {/* Refund Requests Table (Matching Handwritten Table Layout) */}
                            <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800 }}>Submitted Refund Requests History</h4>
                            {loadingRefunds ? (
                                <div className={styles.loadingState}>Loading refund requests...</div>
                            ) : refunds.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <IndianRupee size={40} style={{ opacity: 0.2 }} />
                                    <p>No refund requests submitted yet.</p>
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Refund ID</th>
                                                <th>Order ID</th>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {refunds.map(r => (
                                                <tr key={r.id}>
                                                    <td><strong>#{String(r.id).substring(0, 8)}</strong></td>
                                                    <td>#{r.order_id}</td>
                                                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                                    <td><strong>₹{r.amount}</strong></td>
                                                    <td>{r.reason || 'N/A'}</td>
                                                    <td>
                                                        <span className={styles['badge' + (r.status || 'REQUESTED')]}>
                                                            {r.status || 'REQUESTED'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 5: RETURN REQUESTS & FORM (Matching Handwritten Note 5) */}
                    {activeTab === 'return' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><RotateCcw size={20} /> Return & Exchange Requests</h3>
                                    <p className={styles.sectionSubtitle}>Submit product return or exchange requests</p>
                                </div>
                            </div>

                            {/* Return Request Form */}
                            <div className={styles.requestFormCard}>
                                <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Create New Return Request</h4>
                                <form onSubmit={handleSubmitReturn}>
                                    <div className={styles.formGrid} style={{ marginBottom: '1.25rem' }}>
                                        <div className={styles.formGroup}>
                                            <label>REQUEST TYPE *</label>
                                            <select 
                                                value={returnForm.requestType} 
                                                onChange={(e) => setReturnForm({ ...returnForm, requestType: e.target.value })}
                                            >
                                                <option value="RETURN">Return Product</option>
                                                <option value="EXCHANGE">Exchange Product</option>
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>CHOOSE PRODUCT *</label>
                                            <select 
                                                value={returnForm.orderItemKey}
                                                onChange={(e) => setReturnForm({ ...returnForm, orderItemKey: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select Delivered Product --</option>
                                                {eligibleReturnProducts.length > 0 ? (
                                                    eligibleReturnProducts.map(p => (
                                                        <option key={p.key} value={p.key}>
                                                            Order #{p.orderId} - {p.productName} [{p.orderDate}]
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>No delivered products eligible for return</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                                        <label>REASON *</label>
                                        <select 
                                            value={returnForm.reason} 
                                            onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                        >
                                            <option value="Wrong Item Delivered">Wrong Item / Size Received</option>
                                            <option value="Defective / Damaged">Defective or Damaged Product</option>
                                            <option value="Quality Not as Expected">Quality Not as Expected</option>
                                            <option value="Changed Mind">Changed Mind</option>
                                            <option value="Other">Other Reason</option>
                                        </select>
                                    </div>

                                    {returnForm.reason === 'Other' && (
                                        <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                                            <label>SPECIFY REASON *</label>
                                            <textarea 
                                                rows={3} 
                                                placeholder="Please specify details regarding your return request..."
                                                value={returnForm.otherReason}
                                                onChange={(e) => setReturnForm({ ...returnForm, otherReason: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    <button type="submit" className={styles.formSubmitBtn} disabled={submittingReturn}>
                                        <Send size={16} />
                                        {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                                    </button>
                                </form>
                            </div>

                            {/* Return Requests Table (Matching Handwritten Table Layout) */}
                            <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800 }}>Submitted Return Requests History</h4>
                            {loadingReturns ? (
                                <div className={styles.loadingState}>Loading return requests...</div>
                            ) : returns.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <RotateCcw size={40} style={{ opacity: 0.2 }} />
                                    <p>No return requests submitted yet.</p>
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Return ID</th>
                                                <th>Order ID</th>
                                                <th>Product</th>
                                                <th>Type</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returns.map(r => (
                                                <tr key={r.id}>
                                                    <td><strong>#{String(r.id).substring(0, 8)}</strong></td>
                                                    <td>#{r.order_id}</td>
                                                    <td>{r.products?.name || 'Order Item'}</td>
                                                    <td><strong>{r.request_type || 'RETURN'}</strong></td>
                                                    <td>{r.reason}</td>
                                                    <td>
                                                        <span className={styles['badge' + (r.status || 'PENDING')]}>
                                                            {r.status || 'PENDING'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                </div>

                {/* Profile Sidebar */}
                <aside className={styles.profileSidebar}>
                    <div className={styles.sidebarCard}>
                        <div className={styles.helpIconWrapper}>
                            <MessageCircle size={24} />
                        </div>
                        <h4>Need Assistance?</h4>
                        <p>If you have any questions regarding your orders, returns, or refunds, chat directly with our customer support.</p>
                        <a 
                            href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '919876543210'}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.supportBtn}
                        >
                            <MessageCircle size={18} />
                            <span>WhatsApp Support</span>
                        </a>
                    </div>
                </aside>
            </div>
        </div>
    );
}
