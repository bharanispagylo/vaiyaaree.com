'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    User, ShoppingBag, History, RotateCcw, IndianRupee, Truck, MessageCircle 
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { formatOrderDate } from '@/lib/dateUtils';
import { formatPhoneDisplay } from './components/profileHelpers';
import ActiveOrdersTab from './components/ActiveOrdersTab';
import TrackOrderTab from './components/TrackOrderTab';
import OrderHistoryTab from './components/OrderHistoryTab';
import AccountTab from './components/AccountTab';
import RefundsTab from './components/RefundsTab';
import ReturnsTab from './components/ReturnsTab';
import CancelOrderModal from './components/CancelOrderModal';
import ProfileSupportCard from './components/ProfileSupportCard';
import { sanitizeCustomerSession } from '@/lib/authSanitizer';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, setUser, showToast, mysqlClient, isSessionLoading } = useShop();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Tab state (orders, track, history, account, refund, return)
    const initialTab = searchParams.get('tab') || 'orders';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Profile & Address state
    const [saving, setSaving] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressFormType, setAddressFormType] = useState('shipping'); // 'billing' or 'shipping'

    // Orders state & pagination
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [activeOrdersPage, setActiveOrdersPage] = useState(1);
    const [historyOrdersPage, setHistoryOrdersPage] = useState(1);
    const ORDERS_PER_PAGE = 5;

    // Refund state
    const [refunds, setRefunds] = useState([]);
    const [loadingRefunds, setLoadingRefunds] = useState(false);
    const [refundForm, setRefundForm] = useState({
        orderItemKey: '',
        reason: 'Defective Product',
        otherReason: '',
        amount: '',
        upiId: '',
        image_url: '',
        uploadingImage: false
    });
    const [submittingRefund, setSubmittingRefund] = useState(false);

    // Return state
    const [returns, setReturns] = useState([]);
    const [loadingReturns, setLoadingReturns] = useState(false);

    // Track Order State
    const [trackSearchId, setTrackSearchId] = useState('');
    const [trackOrderData, setTrackOrderData] = useState(null);
    const [loadingTrack, setLoadingTrack] = useState(false);

    // Order cancellation modal state
    const [cancelModalOrder, setCancelModalOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState('Changed my mind');
    const [cancellingOrder, setCancellingOrder] = useState(false);

    // Synchronize tab with URL query parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        const trackId = searchParams.get('id') || searchParams.get('orderId');
        if (tab && ['orders', 'track', 'history', 'account', 'refund', 'return'].includes(tab)) {
            setActiveTab(tab);
        }
        if (trackId) {
            const formattedInv = String(trackId).replace(/^[A-Z]+-/, 'INV-');
            setTrackSearchId(formattedInv);
            handleTrackSearch(trackId);
        }
    }, [searchParams]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        router.push(`/profile?tab=${tab}`, { scroll: false });
    };

    async function handleTrackSearch(searchIdToUse) {
        const idToSearch = searchIdToUse || trackSearchId;
        if (!idToSearch) return;
        setLoadingTrack(true);
        setTrackOrderData(null);
        try {
            const cleanId = String(idToSearch).trim().toUpperCase().replace(/^#/, '');
            const numMatch = cleanId.match(/(\d+)/);
            const numStr = numMatch ? numMatch[1] : '';
            const padded4 = numStr ? numStr.padStart(4, '0') : '';

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
                .select('*, order_items(*, products(id, image_url, name))')
                .or(searchOr);

            if (matches && matches.length > 0) {
                const o = matches[0];
                if (!o.invoice_no && o.id) {
                    o.invoice_no = String(o.id).replace(/^[A-Z]+-/, 'INV-');
                }
                setTrackOrderData(o);
            } else {
                showToast('No order found matching this Invoice ID', 'error');
            }
        } catch (err) {
            console.error('Track error:', err);
        } finally {
            setLoadingTrack(false);
        }
    }

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
        if (!user || !mysqlClient) return;
        setLoadingOrders(true);
        try {
            const digits = (user.phone || '').replace(/\D/g, '');
            const phoneVariations = [];
            if (digits) {
                phoneVariations.push(digits);
                if (digits.length === 10) phoneVariations.push('91' + digits);
                else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));
            }

            let query = mysqlClient
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
                const formattedOrders = data.map(o => ({
                    ...o,
                    invoice_no: o.invoice_no 
                        ? (o.invoice_no.startsWith('#') ? o.invoice_no : `#${o.invoice_no}`)
                        : `#${String(o.id).replace(/^[A-Z]+-/, 'INV-')}`
                }));
                setOrders(formattedOrders);

                const userOrderIds = data.map(o => o.id);
                fetchRefunds(userOrderIds);
                fetchReturns(userOrderIds);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoadingOrders(false);
        }
    }

    // Fetch Saved Addresses
    async function fetchAddresses() {
        if (!user?.id || !mysqlClient) return;
        setLoadingAddresses(true);
        try {
            const { data, error } = await mysqlClient
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', user.id)
                .order('is_default', { ascending: false });
            
            if (!error && data && data.length > 0) {
                setAddresses(data);
            } else {
                const phone = user.phone || '';
                const { data: custData } = await mysqlClient
                    .from('customers')
                    .select('*')
                    .or(`id.eq.${user.id},phone.eq.${phone}`)
                    .limit(1)
                    .maybeSingle();

                if (custData && (custData.address || custData.city || custData.state || custData.pincode)) {
                    const newAddr = {
                        id: `addr-${Date.now()}`,
                        customer_id: user.id,
                        name: custData.name || user.name || 'Default Address',
                        phone: custData.phone || user.phone || '',
                        address: custData.address || '',
                        address_line: custData.address || '',
                        city: custData.city || '',
                        state: custData.state || '',
                        pincode: custData.pincode || '',
                        country: 'India',
                        is_default: 1
                    };
                    await mysqlClient.from('customer_addresses').insert(newAddr);
                    setAddresses([newAddr]);
                } else {
                    setAddresses(data || []);
                }
            }
        } catch (err) {
            console.error('Fetch addresses error:', err);
        } finally {
            setLoadingAddresses(false);
        }
    }

    // Fetch Refund Requests
    async function fetchRefunds(userOrderIds = []) {
        if (!user || !mysqlClient) return;
        setLoadingRefunds(true);
        try {
            let orderIds = Array.isArray(userOrderIds) && userOrderIds.length > 0 ? userOrderIds : [];
            if (orderIds.length === 0) {
                const digits = (user.phone || '').replace(/\D/g, '');
                const phoneVariations = [];
                if (digits) {
                    phoneVariations.push(digits);
                    if (digits.length === 10) phoneVariations.push('91' + digits);
                    else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));
                }

                let oQuery = mysqlClient.from('orders').select('id');
                if (user.id && phoneVariations.length > 0) {
                    oQuery = oQuery.or(`customer_id.eq.${user.id},customer_phone.in.(${phoneVariations.join(',')})`);
                } else if (user.id) {
                    oQuery = oQuery.eq('customer_id', user.id);
                } else if (phoneVariations.length > 0) {
                    oQuery = oQuery.in('customer_phone', phoneVariations);
                }
                const { data: oData } = await oQuery;
                orderIds = (oData || []).map(o => o.id);
            }

            if (orderIds.length === 0) {
                setRefunds([]);
                return;
            }

            const { data, error } = await mysqlClient
                .from('refund_requests')
                .select('*, orders:order_id(id, created_at, customer_phone, invoice_no), refund_shipments(*)')
                .in('order_id', orderIds)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setRefunds(data);
            } else if (error) {
                const { data: legacyData } = await mysqlClient
                    .from('refunds')
                    .select('*, orders:order_id(id, created_at, customer_phone)')
                    .in('order_id', orderIds)
                    .order('created_at', { ascending: false });
                setRefunds(legacyData || []);
            }
        } catch (err) {
            console.error('Fetch refunds error:', err);
        } finally {
            setLoadingRefunds(false);
        }
    }

    // Fetch Return Requests
    async function fetchReturns(userOrderIds = []) {
        if (!user || !mysqlClient) return;
        setLoadingReturns(true);
        try {
            let orderIds = Array.isArray(userOrderIds) && userOrderIds.length > 0 ? userOrderIds : [];
            if (orderIds.length === 0) {
                const digits = (user.phone || '').replace(/\D/g, '');
                const phoneVariations = [];
                if (digits) {
                    phoneVariations.push(digits);
                    if (digits.length === 10) phoneVariations.push('91' + digits);
                    else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));
                }

                let oQuery = mysqlClient.from('orders').select('id');
                if (user.id && phoneVariations.length > 0) {
                    oQuery = oQuery.or(`customer_id.eq.${user.id},customer_phone.in.(${phoneVariations.join(',')})`);
                } else if (user.id) {
                    oQuery = oQuery.eq('customer_id', user.id);
                } else if (phoneVariations.length > 0) {
                    oQuery = oQuery.in('customer_phone', phoneVariations);
                }
                const { data: oData } = await oQuery;
                orderIds = (oData || []).map(o => o.id);
            }

            let query = mysqlClient
                .from('return_requests')
                .select('*, products(id, name, image_url), orders:order_id(id, created_at)')
                .order('created_at', { ascending: false });

            if (user.id && orderIds.length > 0) {
                query = query.or(`customer_id.eq.${user.id},order_id.in.(${orderIds.map(i => `"${i}"`).join(',')})`);
            } else if (user.id) {
                query = query.eq('customer_id', user.id);
            } else if (orderIds.length > 0) {
                query = query.in('order_id', orderIds);
            }

            const { data, error } = await query;
            if (!error && data) {
                setReturns(data);
            } else if (error) {
                console.error('Fetch returns query error:', error);
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
            const nameVal = (formData.get('name') || '').trim();

            if (!nameVal || /[^a-zA-Z\s]/.test(nameVal)) {
                showToast('Full Name can only contain letters and spaces', 'error');
                setSaving(false);
                return;
            }

            const updates = {
                name: nameVal,
                email: formData.get('email'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
            };

            const { data, error } = await mysqlClient
                .from('customers')
                .update(updates)
                .eq('id', user.id)
                .select('id, name, email, phone, country_code, address, city, state, pincode, role, is_verified')
                .single();

            if (error) throw error;

            const safeUser = sanitizeCustomerSession({ ...user, ...data });
            setUser(safeUser);
            localStorage.setItem('cast_prince_user', JSON.stringify(safeUser));
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
            const fullNameVal = (formData.get('full_name') || '').trim();
            if (!fullNameVal || /[^a-zA-Z\s]/.test(fullNameVal)) {
                showToast('Full Name can only contain letters and spaces', 'error');
                return;
            }

            const newAddress = {
                customer_id: user.id,
                title: formData.get('title'),
                full_name: fullNameVal,
                phone: formData.get('phone'),
                address_line: formData.get('address_line'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
                is_default: addresses.length === 0 || formData.get('is_default') === 'on'
            };

            if (newAddress.is_default && addresses.length > 0) {
                await mysqlClient.from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', user.id);
            }

            const { error } = await mysqlClient.from('customer_addresses').insert(newAddress);
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
            await mysqlClient.from('customer_addresses').delete().eq('id', addressId);
            showToast('Address deleted');
            fetchAddresses();
        } catch (err) {
            console.error(err);
        }
    }

    // Damaged product photo upload handler for refund request
    async function handleDamagedImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
            showToast('Invalid file format. Please upload JPG, PNG or WEBP image.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast('File size is too large. Max 10MB allowed.', 'error');
            return;
        }

        setRefundForm(prev => ({ ...prev, uploadingImage: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/refund-requests/upload-image', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload damaged product image');
            }

            setRefundForm(prev => ({ ...prev, image_url: data.url, uploadingImage: false }));
            showToast('Damaged product photo uploaded successfully!');
        } catch (err) {
            console.error('Damaged image upload error:', err);
            showToast(err?.message || 'Image upload failed', 'error');
            setRefundForm(prev => ({ ...prev, uploadingImage: false }));
        }
    }

    // Submit Refund Request
    async function handleSubmitRefund(e) {
        e.preventDefault();
        if (!refundForm.orderItemKey) {
            showToast('Please select a product to request refund', 'error');
            return;
        }

        const [orderId, productId] = refundForm.orderItemKey.split('::');
        const finalReason = refundForm.reason === 'Other' ? refundForm.otherReason : refundForm.reason;

        if (!finalReason) {
            showToast('Please provide a reason for refund', 'error');
            return;
        }

        setSubmittingRefund(true);
        try {
            const res = await fetch('/api/refund-requests/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    order_item_id: productId && productId !== 'undefined' ? productId : null,
                    customer_id: user.id,
                    reason: finalReason,
                    customer_note: refundForm.otherReason || null,
                    image_url: refundForm.image_url || null
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit refund request');
            }

            showToast('Refund request submitted successfully!');
            setRefundForm({ orderItemKey: '', reason: 'Defective Product', otherReason: '', amount: '', upiId: '', image_url: '', uploadingImage: false });
            fetchRefunds();
        } catch (err) {
            console.error('Error submitting refund:', err?.message || err);
            showToast(err?.message || 'Failed to submit refund request', 'error');
        } finally {
            setSubmittingRefund(false);
        }
    }

    // Cancel Active Order Handler
    async function handleCancelOrderSubmit(e) {
        e.preventDefault();
        if (!cancelModalOrder) return;

        setCancellingOrder(true);
        try {
            const res = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: cancelModalOrder.id,
                    customerId: user.id,
                    reason: cancelReason
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to cancel order');
            }

            showToast('Order cancelled successfully!');
            setCancelModalOrder(null);
            setCancelReason('Changed my mind');
            await fetchUserOrders();
        } catch (err) {
            console.error('Cancel order error:', err);
            showToast(err?.message || 'Failed to cancel order', 'error');
        } finally {
            setCancellingOrder(false);
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
    const pastOrders = orders.filter(o => ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status));

    const totalActivePages = Math.ceil(activeOrders.length / ORDERS_PER_PAGE);
    const paginatedActiveOrders = activeOrders.slice((activeOrdersPage - 1) * ORDERS_PER_PAGE, activeOrdersPage * ORDERS_PER_PAGE);

    const totalHistoryPages = Math.ceil(pastOrders.length / ORDERS_PER_PAGE);
    const paginatedHistoryOrders = pastOrders.slice((historyOrdersPage - 1) * ORDERS_PER_PAGE, historyOrdersPage * ORDERS_PER_PAGE);

    // Separate Billing & Shipping Addresses
    const billingAddresses = addresses.filter(a => (a.title || '').toLowerCase().includes('billing'));
    const shippingAddresses = addresses.filter(a => !(a.title || '').toLowerCase().includes('billing'));

    // Products eligible for Refund (From user orders, excluding already requested/non-rejected products)
    const eligibleRefundProducts = [];
    orders.forEach(o => {
        const displayInv = o.invoice_no ? (o.invoice_no.startsWith('#') ? o.invoice_no : `#${o.invoice_no}`) : `#${String(o.id).replace(/^[A-Z]+-/, 'INV-')}`;
        (o.order_items || []).forEach(item => {
            const alreadyRefunded = refunds.some(ref => 
                String(ref.order_id) === String(o.id) && 
                (String(ref.product_id) === String(item.product_id) || !ref.product_id) &&
                ref.status !== 'REJECTED'
            );

            if (!alreadyRefunded) {
                const priceVal = item.price_at_time || item.price || 0;
                eligibleRefundProducts.push({
                    key: `${o.id}::${item.product_id}::${priceVal}`,
                    orderId: displayInv,
                    productName: item.product_name || 'Product Item',
                    price: priceVal,
                    orderDate: formatOrderDate(o.created_at, { includeTime: false })
                });
            }
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
                        <p className={styles.userPhone}>{formatPhoneDisplay(user.phone, user.country_code)} • {user.email || 'No email specified'}</p>
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
                    className={`${styles.tabBtn} ${activeTab === 'track' ? styles.tabBtnActive : ''}`} 
                    onClick={() => handleTabChange('track')}
                >
                    <Truck size={18} />
                    <span>Track Orders</span>
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
                    {activeTab === 'orders' && (
                        <ActiveOrdersTab
                            loadingOrders={loadingOrders}
                            activeOrders={activeOrders}
                            paginatedActiveOrders={paginatedActiveOrders}
                            activeOrdersPage={activeOrdersPage}
                            setActiveOrdersPage={setActiveOrdersPage}
                            totalActivePages={totalActivePages}
                            ORDERS_PER_PAGE={ORDERS_PER_PAGE}
                            setCancelModalOrder={setCancelModalOrder}
                            setCancelReason={setCancelReason}
                            setTrackSearchId={setTrackSearchId}
                            handleTabChange={handleTabChange}
                            handleTrackSearch={handleTrackSearch}
                        />
                    )}

                    {activeTab === 'track' && (
                        <TrackOrderTab
                            trackSearchId={trackSearchId}
                            setTrackSearchId={setTrackSearchId}
                            handleTrackSearch={handleTrackSearch}
                            loadingTrack={loadingTrack}
                            trackOrderData={trackOrderData}
                        />
                    )}

                    {activeTab === 'history' && (
                        <OrderHistoryTab
                            loadingOrders={loadingOrders}
                            pastOrders={pastOrders}
                            paginatedHistoryOrders={paginatedHistoryOrders}
                            historyOrdersPage={historyOrdersPage}
                            setHistoryOrdersPage={setHistoryOrdersPage}
                            totalHistoryPages={totalHistoryPages}
                            ORDERS_PER_PAGE={ORDERS_PER_PAGE}
                            setTrackSearchId={setTrackSearchId}
                            handleTabChange={handleTabChange}
                            handleTrackSearch={handleTrackSearch}
                        />
                    )}

                    {activeTab === 'account' && (
                        <AccountTab
                            user={user}
                            handleUpdateProfile={handleUpdateProfile}
                            saving={saving}
                            showAddressForm={showAddressForm}
                            setShowAddressForm={setShowAddressForm}
                            addressFormType={addressFormType}
                            setAddressFormType={setAddressFormType}
                            handleAddAddress={handleAddAddress}
                            loadingAddresses={loadingAddresses}
                            billingAddresses={billingAddresses}
                            shippingAddresses={shippingAddresses}
                            deleteAddress={deleteAddress}
                        />
                    )}

                    {activeTab === 'refund' && (
                        <RefundsTab
                            eligibleRefundProducts={eligibleRefundProducts}
                            refundForm={refundForm}
                            setRefundForm={setRefundForm}
                            handleSubmitRefund={handleSubmitRefund}
                            handleDamagedImageUpload={handleDamagedImageUpload}
                            submittingRefund={submittingRefund}
                            loadingRefunds={loadingRefunds}
                            refunds={refunds}
                            fetchRefunds={fetchRefunds}
                        />
                    )}

                    {activeTab === 'return' && (
                        <ReturnsTab
                            user={user}
                            mysqlClient={mysqlClient}
                            addresses={addresses}
                            orders={orders}
                            returns={returns}
                            fetchReturns={fetchReturns}
                        />
                    )}
                </div>

                {/* Profile Sidebar */}
                <aside className={styles.profileSidebar}>
                    <ProfileSupportCard />
                </aside>
            </div>

            {/* Cancel Order Confirmation Modal */}
            <CancelOrderModal
                cancelModalOrder={cancelModalOrder}
                setCancelModalOrder={setCancelModalOrder}
                cancelReason={cancelReason}
                setCancelReason={setCancelReason}
                handleCancelOrderSubmit={handleCancelOrderSubmit}
                cancellingOrder={cancellingOrder}
            />
        </div>
    );
}
