'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    User, Mail, MapPin, Phone, MessageCircle, Save, 
    ShoppingBag, History, RotateCcw, IndianRupee, 
    CheckCircle, Clock, XCircle, Package, ArrowRight, FileText, Send, AlertCircle,
    Truck, Search, Globe, Download, RefreshCw, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './profile.module.css';
import ReturnWizard from '@/components/ReturnWizard';

function formatPhoneDisplay(phone, countryCode) {
    if (!phone) return '';
    const clean = String(phone).trim();
    const digits = clean.replace(/\D/g, '');
    const code = countryCode ? (countryCode.startsWith('+') ? countryCode : `+${countryCode}`) : null;
    
    if (code) {
        return `${code} ${digits.startsWith(code.replace('+', '')) ? digits.slice(code.replace('+', '').length) : digits}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
        return `+91 ${digits.slice(2)}`;
    }
    if (digits.length === 10) {
        return `+91 ${digits}`;
    }
    if (clean.startsWith('+')) {
        return clean.replace(/^\+(\d{1,3})(\d+)/, '+$1 $2');
    }
    return digits ? `+91 ${digits}` : clean;
}

function ProductSelectDropdown({ products, selectedKey, onSelect, placeholder = "-- Select Product --" }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedProduct = products.find(p => p.key === selectedKey);

    const handleOptionClick = (productKey) => {
        if (selectedKey === productKey) {
            // Deselect on second click
            onSelect(null);
        } else {
            const item = products.find(p => p.key === productKey);
            onSelect(item);
        }
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'hsl(var(--text-main) / 0.03)',
                    border: isOpen ? '1.5px solid hsl(var(--primary))' : '1px solid hsl(var(--text-main) / 0.12)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    color: 'hsl(var(--text-main))',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 3px hsl(var(--primary) / 0.15)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedProduct ? 'hsl(var(--primary))' : '#94a3b8' }}>
                        {selectedProduct ? '' : ''}
                    </span>
                    <span style={{ fontWeight: selectedProduct ? 700 : 500, color: selectedProduct ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))' }}>
                        {selectedProduct 
                            ? `Order #${selectedProduct.orderId} - ${selectedProduct.productName}${selectedProduct.price ? ` (₹${Number(selectedProduct.price).toLocaleString('en-IN')})` : ''}` 
                            : placeholder}
                    </span>
                </div>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'hsl(var(--text-muted))', flexShrink: 0 }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: '#ffffff',
                    border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.4rem'
                }}>
                    {products.length === 0 ? (
                        <div style={{ padding: '0.85rem', color: 'hsl(var(--text-muted))', fontSize: '0.88rem', textAlign: 'center' }}>
                            No eligible products available
                        </div>
                    ) : (
                        <>
                            <div 
                                onClick={() => { onSelect(null); setIsOpen(false); }}
                                style={{
                                    padding: '0.65rem 0.9rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    color: 'hsl(var(--text-muted))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    borderBottom: '1px solid #f1f5f9',
                                    marginBottom: '0.25rem',
                                    fontWeight: 500
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}></span>
                                <span>{placeholder}</span>
                            </div>

                            {products.map(p => {
                                const isSelected = selectedKey === p.key;
                                return (
                                    <div
                                        key={p.key}
                                        onClick={() => handleOptionClick(p.key)}
                                        style={{
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            background: isSelected ? '#f1f5f9' : 'transparent',
                                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--text-main))',
                                            fontWeight: isSelected ? 700 : 500,
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isSelected ? 'hsl(var(--primary))' : '#cbd5e1' }}>
                                            {isSelected ? '' : ''}
                                        </span>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.9rem', color: isSelected ? 'hsl(var(--primary))' : '#0f172a' }}>
                                                Order #{p.orderId} - {p.productName}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {p.price ? `Price: ₹${Number(p.price).toLocaleString('en-IN')} • ` : ''}Date: {p.orderDate}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                                Click to Deselect
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProfilePage() {
    const { user, setUser, showToast, mysqlClient, isSessionLoading } = useShop();
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
        upiId: ''
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

    // Track Order State
    const [trackSearchId, setTrackSearchId] = useState('');
    const [trackOrderData, setTrackOrderData] = useState(null);
    const [loadingTrack, setLoadingTrack] = useState(false);

    const getOrderSourceBadge = (order) => {
        const src = (order.source || '').toUpperCase();
        const idStr = String(order.id || '').toUpperCase();
        
        if (src === 'WEBSITE' || src === 'WEB' || idStr.startsWith('WEB-')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Globe size={12} /> Web Store
                </span>
            );
        }
        if (src === 'MANUAL' || src === 'MAN' || idStr.startsWith('MAN-')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fce7f3', color: '#9d174d', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <ShoppingBag size={12} /> Direct Store
                </span>
            );
        }
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <MessageCircle size={12} /> WhatsApp
            </span>
        );
    };

    const getStatusIndex = (status) => {
        switch (status) {
            case 'PLACED': case 'PENDING': case 'AWAITING_PAYMENT': return 0;
            case 'CONFIRMED': case 'PACKING': case 'PAID': return 1;
            case 'SHIPPED': return 2;
            case 'DELIVERED': return 3;
            default: return 0;
        }
    };

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

                // Instantly pass order IDs to fetchRefunds and fetchReturns for exact customer data loading
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
                // Fallback: Check if address exists in customers table and populate customer_addresses
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
                // Fallback to legacy refunds table if refund_requests fails
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

    // Submit Refund Request (Handwritten Feature 4)
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
                    customer_note: refundForm.otherReason || null
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit refund request');
            }

            showToast('Refund request submitted successfully!');
            setRefundForm({ orderItemKey: '', reason: 'Defective Product', otherReason: '', amount: '', upiId: '' });
            fetchRefunds();
        } catch (err) {
            console.error('Error submitting refund:', err?.message || err);
            showToast(err?.message || 'Failed to submit refund request', 'error');
        } finally {
            setSubmittingRefund(false);
        }
    }

    // Submit Refund Shipping Details (When status === 'RETURN_REQUIRED')
    async function handleRefundShippingSubmit(refundRequestId, shippingData) {
        try {
            const res = await fetch('/api/refund-requests/submit-shipping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refundRequestId,
                    ...shippingData
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit shipping details');
            }

            showToast('Shipping details submitted successfully!');
            fetchRefunds();
        } catch (err) {
            console.error('Error submitting shipping details:', err?.message || err);
            showToast(err?.message || 'Failed to submit shipping details', 'error');
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

            const { data: insertedReturn, error } = await mysqlClient.from('return_requests').insert(returnPayload).select().single();
            if (error) throw error;

            // Trigger WhatsApp confirmation to customer
            if (insertedReturn?.id) {
                fetch('/api/returns/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId: insertedReturn.id, status: 'PENDING' })
                }).catch(err => console.error('WA Notify Error:', err));
            }

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
    const pastOrders = orders.filter(o => ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status));
    const historyOrders = pastOrders;

    const totalActivePages = Math.ceil(activeOrders.length / ORDERS_PER_PAGE);
    const paginatedActiveOrders = activeOrders.slice((activeOrdersPage - 1) * ORDERS_PER_PAGE, activeOrdersPage * ORDERS_PER_PAGE);

    const totalHistoryPages = Math.ceil(pastOrders.length / ORDERS_PER_PAGE);
    const paginatedHistoryOrders = pastOrders.slice((historyOrdersPage - 1) * ORDERS_PER_PAGE, historyOrdersPage * ORDERS_PER_PAGE);

    // Separate Billing & Shipping Addresses
    const billingAddresses = addresses.filter(a => (a.title || '').toLowerCase().includes('billing'));
    const shippingAddresses = addresses.filter(a => !(a.title || '').toLowerCase().includes('billing'));

    // Products eligible for Refund & Return (From user orders, excluding already requested/non-rejected products)
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
                    orderDate: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                });
            }
        });
    });

    const eligibleReturnProducts = [];
    orders.filter(o => o.status === 'DELIVERED').forEach(o => {
        const displayInv = o.invoice_no ? (o.invoice_no.startsWith('#') ? o.invoice_no : `#${o.invoice_no}`) : `#${String(o.id).replace(/^[A-Z]+-/, 'INV-')}`;
        (o.order_items || []).forEach(item => {
            const alreadyReturned = returns.some(ret => 
                String(ret.order_id) === String(o.id) && 
                (String(ret.product_id) === String(item.product_id) || !ret.product_id) &&
                ret.status !== 'REJECTED'
            );

            if (!alreadyReturned) {
                eligibleReturnProducts.push({
                    key: `${o.id}::${item.product_id}`,
                    orderId: displayInv,
                    productName: item.product_name || 'Product Item',
                    orderDate: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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
                <div className={styles.profileMain}>                    {/* TAB 1: ACTIVE ORDERS */}
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
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>INVOICE NO</th>
                                                <th>DATE</th>
                                                <th>ITEMS</th>
                                                <th>TOTAL</th>
                                                <th>SOURCE</th>
                                                <th>STATUS</th>
                                                <th style={{ textAlign: 'right' }}>ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedActiveOrders.map(order => {
                                                const displayInv = order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;
                                                const itemsList = order.order_items || [];
                                                const firstItemName = itemsList[0]?.product_name || 'Item';
                                                const totalItems = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);

                                                return (
                                                    <tr key={order.id}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))', fontFamily: 'monospace, sans-serif' }}>{displayInv}</div>
                                                        </td>
                                                        <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{totalItems} item(s)</span>
                                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={firstItemName}>
                                                                    {firstItemName}{itemsList.length > 1 ? ` +${itemsList.length - 1} more` : ''}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap' }}>
                                                            ₹{(order.total_amount || 0).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            {getOrderSourceBadge(order)}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`} style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const inv = order.invoice_no ? order.invoice_no : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                                                                    setTrackSearchId(inv);
                                                                    handleTabChange('track');
                                                                    handleTrackSearch(order.id);
                                                                }}
                                                                className={styles.actionBtnOutline}
                                                                style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                            >
                                                                Track Order <ArrowRight size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle, #e2e8f0))', flexWrap: 'wrap', gap: '0.75rem', background: '#fafafa' }}>
                                        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                            Showing <strong>{activeOrders.length === 0 ? 0 : (activeOrdersPage - 1) * ORDERS_PER_PAGE + 1}</strong> to <strong>{Math.min(activeOrdersPage * ORDERS_PER_PAGE, activeOrders.length)}</strong> of <strong>{activeOrders.length}</strong> orders
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setActiveOrdersPage(p => Math.max(1, p - 1))}
                                                disabled={activeOrdersPage === 1}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage === 1 ? '#f1f5f9' : '#ffffff', color: activeOrdersPage === 1 ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: activeOrdersPage === 1 ? 'not-allowed' : 'pointer' }}
                                            >
                                                <ChevronLeft size={15} /> Previous
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {Array.from({ length: Math.max(1, totalActivePages) }, (_, i) => i + 1).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setActiveOrdersPage(p)}
                                                        style={{ minWidth: '32px', height: '32px', borderRadius: '6px', border: activeOrdersPage === p ? 'none' : '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage === p ? 'hsl(var(--primary))' : '#ffffff', color: activeOrdersPage === p ? '#ffffff' : 'hsl(var(--text-main))', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setActiveOrdersPage(p => Math.min(Math.max(1, totalActivePages), p + 1))}
                                                disabled={activeOrdersPage >= Math.max(1, totalActivePages)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage >= Math.max(1, totalActivePages) ? '#f1f5f9' : '#ffffff', color: activeOrdersPage >= Math.max(1, totalActivePages) ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: activeOrdersPage >= Math.max(1, totalActivePages) ? 'not-allowed' : 'pointer' }}
                                            >
                                                Next <ChevronRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 2: TRACK ORDERS */}
                    {activeTab === 'track' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><Truck size={20} /> Track Orders</h3>
                                    <p className={styles.sectionSubtitle}>Enter your Invoice ID to see real-time order & delivery status</p>
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Enter Invoice ID (e.g. INV-0001)" 
                                            value={trackSearchId}
                                            onChange={(e) => setTrackSearchId(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleTrackSearch()}
                                            style={{
                                                width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem',
                                                borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))',
                                                fontSize: '0.9rem', fontWeight: 600, outline: 'none'
                                            }}
                                        />
                                        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                    </div>
                                    <button 
                                        onClick={() => handleTrackSearch()} 
                                        disabled={loadingTrack}
                                        className="btn btn-primary"
                                        style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem' }}
                                    >
                                        {loadingTrack ? 'Searching...' : 'Track My Order'}
                                    </button>
                                </div>
                            </div>

                            {trackOrderData ? (
                                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Header Summary */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>INVOICE ID</div>
                                            <h3 style={{ margin: '2px 0 0', fontSize: '1.35rem', color: 'hsl(var(--primary))', fontWeight: 800 }}>
                                                {trackOrderData.invoice_no ? (trackOrderData.invoice_no.startsWith('#') ? trackOrderData.invoice_no : `#${trackOrderData.invoice_no}`) : `#${String(trackOrderData.id).replace(/^[A-Z]+-/, 'INV-')}`}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '6px' }}>
                                                {getOrderSourceBadge(trackOrderData)}
                                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                                    Placed on {new Date(trackOrderData.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`badge ${styles['status' + trackOrderData.status]}`} style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '20px' }}>
                                            {trackOrderData.status}
                                        </span>
                                    </div>

                                    {/* 4-Step Progress Timeline */}
                                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <h5 style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', fontWeight: 800 }}>Delivery Timeline</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', position: 'relative' }}>
                                            {[
                                                { stage: 'PLACED', label: 'Order Placed', icon: <Package size={18} /> },
                                                { stage: 'CONFIRMED', label: 'Confirmed', icon: <CheckCircle size={18} /> },
                                                { stage: 'SHIPPED', label: 'Shipped', icon: <Truck size={18} /> },
                                                { stage: 'DELIVERED', label: 'Delivered', icon: <MapPin size={18} /> }
                                            ].map((step, idx) => {
                                                const sIdx = getStatusIndex(trackOrderData.status);
                                                const isDelivered = (trackOrderData.status || '').toUpperCase() === 'DELIVERED';
                                                const isDone = idx <= sIdx;
                                                const stepText = isDelivered ? 'Completed' : (idx === sIdx ? 'In Progress' : (idx < sIdx ? 'Completed' : 'Pending'));
                                                return (
                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '50%',
                                                            background: isDone ? 'hsl(var(--primary))' : '#e2e8f0',
                                                            color: isDone ? '#ffffff' : '#64748b',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: isDone ? '0 4px 10px hsl(var(--primary) / 0.3)' : 'none'
                                                        }}>
                                                            {step.icon}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDone ? 'hsl(var(--text-main))' : '#94a3b8' }}>{step.label}</div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDone ? 'hsl(var(--primary))' : '#cbd5e1' }}>
                                                            {stepText}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Shipping Carrier Card if exists */}
                                    {trackOrderData.tracking_number && (
                                        <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Shipment Details</div>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#14532d', marginTop: '2px' }}>
                                                    {trackOrderData.courier_name || 'BlueDart / Delhivery'} — {trackOrderData.tracking_number}
                                                </div>
                                            </div>
                                            {trackOrderData.tracking_url && (
                                                <a href={trackOrderData.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.825rem', borderRadius: '8px', textDecoration: 'none' }}>
                                                    Track on Carrier Website
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <a 
                                            href={`/api/invoice/${trackOrderData.id}?phone=${trackOrderData.customer_phone}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className={styles.actionBtnOutline}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                                        >
                                            <Download size={16} /> Download Invoice
                                        </a>
                                    </div>

                                    {/* Ordered Items Breakdown */}
                                    <div>
                                        <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: '0 0 0.85rem 0', fontWeight: 800 }}>Order Items Breakdown</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {(trackOrderData.order_items || []).map(item => {
                                                const rawImg = item.image_url || item.products?.image_url || '';
                                                const imgUrl = rawImg ? rawImg.split(',')[0].trim() : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                                return (
                                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                        <img src={imgUrl} alt={item.product_name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'hsl(var(--text-main))' }}>{item.product_name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Qty: {item.quantity || 1} • ₹{Number(item.price_at_time || item.price || 0).toLocaleString()} each</div>
                                                        </div>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>₹{(Number(item.price_at_time || item.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Truck size={48} style={{ opacity: 0.2 }} />
                                    <p>Enter an Invoice ID above to track package status</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 3: ORDER HISTORY */}
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
                            ) : pastOrders.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <History size={48} style={{ opacity: 0.2 }} />
                                    <p>No past order history</p>
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>INVOICE NO</th>
                                                <th>DATE</th>
                                                <th>ITEMS</th>
                                                <th>TOTAL</th>
                                                <th>SOURCE</th>
                                                <th>STATUS</th>
                                                <th style={{ textAlign: 'right' }}>ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedHistoryOrders.map(order => {
                                                const displayInv = order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;
                                                const itemsList = order.order_items || [];
                                                const firstItemName = itemsList[0]?.product_name || 'Item';
                                                const totalItems = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);

                                                return (
                                                    <tr key={order.id}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))', fontFamily: 'monospace, sans-serif' }}>{displayInv}</div>
                                                        </td>
                                                        <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{totalItems} item(s)</span>
                                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={firstItemName}>
                                                                    {firstItemName}{itemsList.length > 1 ? ` +${itemsList.length - 1} more` : ''}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap' }}>
                                                            ₹{(order.total_amount || 0).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            {getOrderSourceBadge(order)}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`} style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    const inv = order.invoice_no ? order.invoice_no : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                                                                    setTrackSearchId(inv);
                                                                    handleTabChange('track');
                                                                    handleTrackSearch(order.id);
                                                                }}
                                                                className={styles.actionBtnOutline}
                                                                style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                            >
                                                                Track Order <ArrowRight size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle, #e2e8f0))', flexWrap: 'wrap', gap: '0.75rem', background: '#fafafa' }}>
                                        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                            Showing <strong>{pastOrders.length === 0 ? 0 : (historyOrdersPage - 1) * ORDERS_PER_PAGE + 1}</strong> to <strong>{Math.min(historyOrdersPage * ORDERS_PER_PAGE, pastOrders.length)}</strong> of <strong>{pastOrders.length}</strong> orders
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setHistoryOrdersPage(p => Math.max(1, p - 1))}
                                                disabled={historyOrdersPage === 1}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage === 1 ? '#f1f5f9' : '#ffffff', color: historyOrdersPage === 1 ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: historyOrdersPage === 1 ? 'not-allowed' : 'pointer' }}
                                            >
                                                <ChevronLeft size={15} /> Previous
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {Array.from({ length: Math.max(1, totalHistoryPages) }, (_, i) => i + 1).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setHistoryOrdersPage(p)}
                                                        style={{ minWidth: '32px', height: '32px', borderRadius: '6px', border: historyOrdersPage === p ? 'none' : '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage === p ? 'hsl(var(--primary))' : '#ffffff', color: historyOrdersPage === p ? '#ffffff' : 'hsl(var(--text-main))', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setHistoryOrdersPage(p => Math.min(Math.max(1, totalHistoryPages), p + 1))}
                                                disabled={historyOrdersPage >= Math.max(1, totalHistoryPages)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage >= Math.max(1, totalHistoryPages) ? '#f1f5f9' : '#ffffff', color: historyOrdersPage >= Math.max(1, totalHistoryPages) ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: historyOrdersPage >= Math.max(1, totalHistoryPages) ? 'not-allowed' : 'pointer' }}
                                            >
                                                Next <ChevronRight size={15} />
                                            </button>
                                        </div>
                                    </div>
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
                                            <input 
                                                name="name" 
                                                defaultValue={user.name} 
                                                required 
                                                placeholder="Your name"
                                                onInput={(e) => {
                                                    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                }}
                                                pattern="[a-zA-Z\s]+"
                                                title="Only letters and spaces are allowed"
                                            />
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

                            {/* CARD 2: Billing Address Book */}
                            <section className={styles.profileSection}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h3 className={styles.sectionTitle}><FileText size={20} /> Billing Address Book</h3>
                                        <p className={styles.sectionSubtitle}>Manage saved billing locations and tax billing addresses</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (showAddressForm && addressFormType === 'billing') {
                                                setShowAddressForm(false);
                                            } else {
                                                setAddressFormType('billing');
                                                setShowAddressForm(true);
                                            }
                                        }} 
                                        className={styles.addAddressBtn}
                                    >
                                        {showAddressForm && addressFormType === 'billing' ? 'Cancel' : '+ Add Billing Address'}
                                    </button>
                                </div>

                                {showAddressForm && addressFormType === 'billing' && (
                                    <form onSubmit={handleAddAddress} className={styles.addressForm}>
                                        <div className={styles.formGrid}>
                                            <div className={styles.formGroup}>
                                                <label>TITLE (e.g. GST Billing, Office Billing)</label>
                                                <input name="title" defaultValue="Billing Address" required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>FULL NAME / COMPANY NAME</label>
                                                <input 
                                                    name="full_name" 
                                                    defaultValue={user.name} 
                                                    required 
                                                    placeholder="Full Name"
                                                    onInput={(e) => {
                                                        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    }}
                                                    pattern="[a-zA-Z\s]+"
                                                    title="Only letters and spaces are allowed"
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PHONE</label>
                                                <input name="phone" defaultValue={user.phone} required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PINCODE</label>
                                                <input name="pincode" required placeholder="6-digit PIN" />
                                            </div>
                                        </div>
                                        <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                                            <label>BILLING ADDRESS LINE</label>
                                            <textarea name="address_line" rows={2} required placeholder="Flat/Building No, Street, Area" />
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
                                            <input type="checkbox" name="is_default" id="is_default_billing" />
                                            <label htmlFor="is_default_billing" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default billing address</label>
                                        </div>
                                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Billing Address</button>
                                    </form>
                                )}

                                {loadingAddresses ? (
                                    <div className={styles.loadingState}>Loading billing addresses...</div>
                                ) : billingAddresses.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <FileText size={40} style={{ opacity: 0.3 }} />
                                        <p>No saved billing addresses yet.</p>
                                        <span>Add a billing address for tax invoices and billing records.</span>
                                    </div>
                                ) : (
                                    <div className={styles.addressGrid}>
                                        {billingAddresses.map(addr => (
                                            <div key={addr.id} className={styles.addressCard}>
                                                {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                                                <h4 className={styles.addressTitle}>
                                                    <FileText size={16} /> {addr.title}
                                                </h4>
                                                <p className={styles.addressName}>{addr.full_name}</p>
                                                <p className={styles.addressLine}>{addr.address_line}</p>
                                                <p className={styles.addressLocation}>{addr.city}, {addr.state} {addr.pincode}</p>
                                                <p className={styles.addressPhone}>{formatPhoneDisplay(addr.phone)}</p>
                                                <button type="button" onClick={() => deleteAddress(addr.id)} className={styles.deleteAddressBtn}>
                                                    Delete Address
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* CARD 3: Shipping Address Book */}
                            <section className={styles.profileSection}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h3 className={styles.sectionTitle}><Truck size={20} /> Shipping Address Book</h3>
                                        <p className={styles.sectionSubtitle}>Manage saved delivery locations and shipping addresses</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (showAddressForm && addressFormType === 'shipping') {
                                                setShowAddressForm(false);
                                            } else {
                                                setAddressFormType('shipping');
                                                setShowAddressForm(true);
                                            }
                                        }} 
                                        className={styles.addAddressBtn}
                                    >
                                        {showAddressForm && addressFormType === 'shipping' ? 'Cancel' : '+ Add Shipping Address'}
                                    </button>
                                </div>

                                {showAddressForm && addressFormType === 'shipping' && (
                                    <form onSubmit={handleAddAddress} className={styles.addressForm}>
                                        <div className={styles.formGrid}>
                                            <div className={styles.formGroup}>
                                                <label>TITLE (e.g. Home, Office, Work)</label>
                                                <input name="title" defaultValue="Home Shipping" required placeholder="Home" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>RECIPIENT NAME</label>
                                                <input 
                                                    name="full_name" 
                                                    defaultValue={user.name} 
                                                    required 
                                                    placeholder="Recipient Full Name"
                                                    onInput={(e) => {
                                                        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    }}
                                                    pattern="[a-zA-Z\s]+"
                                                    title="Only letters and spaces are allowed"
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PHONE</label>
                                                <input name="phone" defaultValue={user.phone} required />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>PINCODE</label>
                                                <input name="pincode" required placeholder="6-digit PIN" />
                                            </div>
                                        </div>
                                        <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                                            <label>DELIVERY ADDRESS LINE</label>
                                            <textarea name="address_line" rows={2} required placeholder="Flat/House No, Street, Area" />
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
                                            <input type="checkbox" name="is_default" id="is_default_shipping" />
                                            <label htmlFor="is_default_shipping" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default shipping address</label>
                                        </div>
                                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Shipping Address</button>
                                    </form>
                                )}

                                {loadingAddresses ? (
                                    <div className={styles.loadingState}>Loading shipping addresses...</div>
                                ) : shippingAddresses.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <Truck size={40} style={{ opacity: 0.3 }} />
                                        <p>No saved shipping addresses yet.</p>
                                        <span>Add a delivery address for faster checkout.</span>
                                    </div>
                                ) : (
                                    <div className={styles.addressGrid}>
                                        {shippingAddresses.map(addr => (
                                            <div key={addr.id} className={styles.addressCard}>
                                                {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                                                <h4 className={styles.addressTitle}>
                                                    <Truck size={16} /> {addr.title}
                                                </h4>
                                                <p className={styles.addressName}>{addr.full_name}</p>
                                                <p className={styles.addressLine}>{addr.address_line}</p>
                                                <p className={styles.addressLocation}>{addr.city}, {addr.state} {addr.pincode}</p>
                                                <p className={styles.addressPhone}>{formatPhoneDisplay(addr.phone)}</p>
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

                    {/* TAB 4: REFUND REQUESTS & FORM */}
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
                                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            CHOOSE PRODUCT *
                                        </label>
                                        <ProductSelectDropdown 
                                            products={eligibleRefundProducts}
                                            selectedKey={refundForm.orderItemKey}
                                            placeholder="-- Select Product for Refund --"
                                            onSelect={(item) => {
                                                if (!item) {
                                                    setRefundForm({ ...refundForm, orderItemKey: '', amount: '' });
                                                } else {
                                                    setRefundForm({ ...refundForm, orderItemKey: item.key, amount: String(item.price) });
                                                }
                                            }}
                                        />
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
                                            <label>ELIGIBLE REFUND AMOUNT (₹)</label>
                                            <input 
                                                type="text" 
                                                readOnly
                                                value={refundForm.amount ? `₹${Number(refundForm.amount).toLocaleString('en-IN')}` : 'Select a product to view amount'} 
                                                disabled
                                                style={{ background: 'hsl(var(--text-main) / 0.05)', cursor: 'not-allowed', color: 'hsl(var(--primary))', fontWeight: 700 }}
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

                            {/* Submitted Refund Requests History */}
                            <h4 style={{ margin: '1.5rem 0 1rem 0', fontWeight: 800 }}>Submitted Refund Requests History</h4>
                            {loadingRefunds ? (
                                <div className={styles.loadingState}>Loading refund requests...</div>
                            ) : refunds.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <IndianRupee size={40} style={{ opacity: 0.2 }} />
                                    <p>No refund requests submitted yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {refunds.map(r => {
                                        const displayOrderInv = r.orders?.invoice_no 
                                            ? (r.orders.invoice_no.startsWith('#') ? r.orders.invoice_no : `#${r.orders.invoice_no}`)
                                            : `#${String(r.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                                        const refundIdDisplay = r.refund_id || `RF-${String(r.id).substring(0, 8)}`;
                                        const refStatus = (r.refund_status || r.status || 'REFUND_REQUESTED').toUpperCase();
                                        const retStatus = (r.return_status || 'RETURN_REQUIRED').toUpperCase();
                                        const amountDisplay = r.approved_amount || r.requested_amount || r.amount || 0;

                                        let badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Refund Requested' };
                                        if (refStatus === 'UNDER_REVIEW') badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Under Review' };
                                        else if (refStatus === 'APPROVED') badgeColor = { bg: '#dbeafe', text: '#1e40af', label: 'Approved' };
                                        else if (refStatus === 'RETURN_REQUIRED') badgeColor = { bg: '#fff7ed', text: '#c2410c', label: 'Return Required' };
                                        else if (refStatus === 'CUSTOMER_SHIPPED') badgeColor = { bg: '#e0e7ff', text: '#3730a3', label: 'Customer Shipped' };
                                        else if (refStatus === 'RETURN_RECEIVED') badgeColor = { bg: '#f0fdf4', text: '#15803d', label: 'Return Received' };
                                        else if (refStatus === 'REFUND_PROCESSING') badgeColor = { bg: '#fef9c3', text: '#854d0e', label: 'Refund Processing' };
                                        else if (refStatus === 'REFUNDED') badgeColor = { bg: '#dcfce7', text: '#166534', label: 'Refunded' };
                                        else if (refStatus === 'REJECTED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' };
                                        else if (refStatus === 'CANCELLED') badgeColor = { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' };
                                        else if (refStatus === 'REFUND_FAILED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Refund Failed' };

                                        const shipment = Array.isArray(r.refund_shipments) ? r.refund_shipments[0] : (r.refund_shipments || null);

                                        return (
                                            <div key={r.id} style={{
                                                background: '#ffffff', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                                padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                            }}>
                                                {/* Card Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>
                                                            {refundIdDisplay}
                                                        </span>
                                                        <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                                                            Invoice: {displayOrderInv}
                                                        </h4>
                                                        <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                                                            Requested on {new Date(r.created_at || r.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                        <span style={{
                                                            fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '20px',
                                                            background: badgeColor.bg, color: badgeColor.text
                                                        }}>
                                                            {badgeColor.label}
                                                        </span>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                                            ₹{Number(amountDisplay).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.85rem' }}>
                                                    <strong>Reason:</strong> {r.reason || 'N/A'}
                                                    {r.customer_note && (
                                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                                            Note: {r.customer_note}
                                                        </div>
                                                    )}
                                                    {r.admin_note && (
                                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#1e40af', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                                            Admin Note: {r.admin_note}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Section for RETURN_REQUIRED (Customer needs to ship saree) */}
                                                {(refStatus === 'RETURN_REQUIRED' || refStatus === 'APPROVED') && (
                                                    <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#c2410c', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Truck size={16} /> Return Address & Shipping Required
                                                        </h5>
                                                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#9a3412' }}>
                                                            Please ship your product to our return address below and submit courier details:
                                                        </p>
                                                        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.84rem', color: '#1e293b', marginBottom: '1rem', fontWeight: 600 }}>
                                                            🏢 <strong>VAIYAAREE Returns Dept.</strong><br />
                                                            16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015
                                                        </div>

                                                        {/* Shipping Submission Form */}
                                                        <form onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const fd = new FormData(e.target);
                                                            let receiptUrl = '';
                                                            const file = fd.get('receipt_file');
                                                            if (file && file.name && file.size > 0) {
                                                                const upFd = new FormData();
                                                                upFd.append('file', file);
                                                                try {
                                                                    const upRes = await fetch('/api/refund-requests/upload-receipt', { method: 'POST', body: upFd });
                                                                    const upData = await upRes.json();
                                                                    if (upData.url) receiptUrl = upData.url;
                                                                } catch (err) {
                                                                    console.error('Receipt upload error:', err);
                                                                }
                                                            }
                                                            handleRefundShippingSubmit(r.id, {
                                                                courierCompany: fd.get('courier_company'),
                                                                trackingNumber: fd.get('tracking_number'),
                                                                shippingDate: fd.get('shipping_date'),
                                                                shippingCost: fd.get('shipping_cost'),
                                                                receiptUrl,
                                                                customerNotes: fd.get('customer_notes')
                                                            });
                                                        }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '4px' }}>COURIER COMPANY *</label>
                                                                    <input name="courier_company" required placeholder="e.g. DTDC, BlueDart" style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.85rem' }} />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '4px' }}>TRACKING / AWB NO *</label>
                                                                    <input name="tracking_number" required placeholder="Tracking Number" style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.85rem' }} />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '4px' }}>SHIPPING DATE</label>
                                                                    <input type="date" name="shipping_date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.85rem' }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '4px' }}>UPLOAD RECEIPT (OPTIONAL)</label>
                                                                    <input type="file" name="receipt_file" accept="image/*,.pdf" style={{ fontSize: '0.8rem' }} />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', display: 'block', marginBottom: '4px' }}>NOTES</label>
                                                                    <input name="customer_notes" placeholder="Optional notes..." style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.85rem' }} />
                                                                </div>
                                                            </div>
                                                            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, background: '#c2410c', border: 'none', borderRadius: '8px' }}>
                                                                Submit Courier Details
                                                            </button>
                                                        </form>
                                                    </div>
                                                )}

                                                {/* Section for CUSTOMER_SHIPPED */}
                                                {shipment && (
                                                    <div style={{ background: '#e0e7ff', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        <div>
                                                            <strong>Courier:</strong> {shipment.courier_company || 'N/A'} • <strong>Tracking:</strong> {shipment.tracking_number || 'N/A'}
                                                            {shipment.shipping_date && <span> • <strong>Date:</strong> {shipment.shipping_date}</span>}
                                                        </div>
                                                        {shipment.receipt_url && (
                                                            <a href={shipment.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3730a3', fontWeight: 700, textDecoration: 'underline' }}>
                                                                View Receipt
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Section for REFUNDED */}
                                                {refStatus === 'REFUNDED' && (
                                                    <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                                                        ✅ Refund Completed! ₹{Number(amountDisplay).toLocaleString('en-IN')} has been returned to your original payment method.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB 5: RETURN REQUESTS — ReturnWizard component */}
                    {activeTab === 'return' && (
                        <section className={styles.profileSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h3 className={styles.sectionTitle}><RotateCcw size={20} /> Return & Exchange Requests</h3>
                                    <p className={styles.sectionSubtitle}>Submit a return or exchange for delivered products</p>
                                </div>
                            </div>
                            <ReturnWizard
                                user={user}
                                mysqlClient={ mysqlClient }
                                addresses={addresses}
                                orders={orders}
                                returns={returns}
                                onSuccess={fetchReturns}
                            />
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
