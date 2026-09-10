'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { MessageCircle, ShoppingBag, Truck, CreditCard, ChevronLeft, Download, CheckCircle, Package, Clock, MapPin, Check, Tag, ShieldCheck, Loader2, X, Lock, Sparkles, Mail } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ModalPortal from '@/components/ModalPortal';
import Link from 'next/link';
import styles from './checkout.module.css';

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { cart, cartTotal, checkoutForm, setCheckoutForm, taxDetails, discountData, placeOrder, clearCartAfterSuccess, isSessionLoading, mysqlClient, showToast, user, appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon, activeDiscountRules, fetchShippingRates, isCartLoaded, isEmailOnly, isWhatsAppOnly, isHybridChannel, communicationChannel, supportEmail, supportPhone } = useShop();
    const [pageMounted, setPageMounted] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [isGuestMode, setIsGuestMode] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    useEffect(() => {
        setPageMounted(true);
        if (typeof window !== 'undefined') {
            const hasGuestParam = searchParams?.get('guest') === 'true';
            const hasGuestSession = sessionStorage.getItem('vaiyaaree_checkout_guest') === 'true';
            if (hasGuestParam || hasGuestSession) {
                setIsGuestMode(true);
            }
        }
    }, [searchParams]);

    // Refresh live shipping rates directly from DB on checkout mount
    useEffect(() => {
        if (typeof fetchShippingRates === 'function') {
            fetchShippingRates();
        }
    }, []);

    const availableCouponOffers = useMemo(() => {
        return (activeDiscountRules || []).filter(r => {
            const hasCode = Boolean(r.coupon_code && r.coupon_code.trim());
            const isActive = r.is_active === 1 || r.is_active === true || r.is_active === '1';
            return hasCode && isActive;
        });
    }, [activeDiscountRules]);
    const [paymentSettings, setPaymentSettings] = useState({
        razorpay_enabled: true,
        razorpay_key_id: '',
        razorpay_title: 'Pay Online (UPI, Credit/Debit Cards, NetBanking)',
        default_gateway: 'razorpay'
    });

    const isUserLoggedIn = Boolean(user && user.id);

    // Redirect to dedicated checkout auth page if not logged in and not guest
    useEffect(() => {
        if (!isSessionLoading && !isUserLoggedIn && !isGuestMode) {
            router.replace('/checkout/auth');
        }
    }, [isSessionLoading, isUserLoggedIn, isGuestMode, router]);

    // Fetch Payment Gateway Settings on mount
    useEffect(() => {
        const fetchGatewaySettings = async () => {
            try {
                const { data } = await mysqlClient.from('app_settings').select('*');
                if (data && Array.isArray(data)) {
                    const map = {};
                    data.forEach(s => { map[s.key] = s.value; });
                    const rzpEnabled = map.razorpay_enabled !== 'false';
                    const defGateway = map.default_gateway || (rzpEnabled ? 'razorpay' : 'cod');
                    setPaymentSettings({
                        razorpay_enabled: rzpEnabled,
                        razorpay_key_id: map.razorpay_key_id || '',
                        razorpay_title: map.razorpay_title || 'Pay Online (UPI, Cards, NetBanking)',
                        default_gateway: defGateway
                    });

                    // Set default payment method if not selected
                    setCheckoutForm(p => {
                        if (!p.paymentMethod) {
                            return { ...p, paymentMethod: defGateway === 'cod' || !rzpEnabled ? 'COD' : 'RAZORPAY' };
                        }
                        return p;
                    });
                }
            } catch (e) {
                console.error('Error loading gateway settings:', e);
            }
        };
        fetchGatewaySettings();
    }, []);

    // Automatically pre-fill previous customer billing & shipping address if fields are empty
    useEffect(() => {
        let isCancelled = false;

        async function populatePreviousAddress() {
            // Do not overwrite if user has already entered their billing address
            if (checkoutForm.billingAddress && checkoutForm.billingAddress.trim()) {
                return;
            }

            try {
                // 1. Try localStorage saved last address
                if (typeof window !== 'undefined') {
                    const rawLast = localStorage.getItem('vaiyaaree_last_billing_address');
                    if (rawLast) {
                        try {
                            const lastAddr = JSON.parse(rawLast);
                            if (lastAddr && lastAddr.billingAddress && lastAddr.billingAddress.trim()) {
                                setCheckoutForm(prev => {
                                    if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                    return {
                                        ...prev,
                                        billingName: prev.billingName || lastAddr.billingName || '',
                                        billingCountryCode: prev.billingCountryCode || lastAddr.billingCountryCode || '+91',
                                        billingPhone: prev.billingPhone || lastAddr.billingPhone || '',
                                        billingWhatsApp: prev.billingWhatsApp || lastAddr.billingWhatsApp || lastAddr.billingPhone || '',
                                        billingEmail: prev.billingEmail || lastAddr.billingEmail || '',
                                        billingAddress: lastAddr.billingAddress,
                                        billingCity: lastAddr.billingCity || prev.billingCity || '',
                                        billingState: lastAddr.billingState || prev.billingState || 'Tamil Nadu',
                                        billingCountry: lastAddr.billingCountry || prev.billingCountry || 'India',
                                        billingPincode: lastAddr.billingPincode || prev.billingPincode || '',
                                        shippingName: prev.shippingName || lastAddr.shippingName || lastAddr.billingName || '',
                                        shippingPhone: prev.shippingPhone || lastAddr.shippingPhone || lastAddr.billingPhone || '',
                                        shippingWhatsApp: prev.shippingWhatsApp || lastAddr.shippingWhatsApp || lastAddr.billingWhatsApp || lastAddr.billingPhone || '',
                                        shippingAddress: lastAddr.shippingAddress || lastAddr.billingAddress,
                                        shippingCity: lastAddr.shippingCity || lastAddr.billingCity || prev.shippingCity || '',
                                        shippingState: lastAddr.shippingState || lastAddr.billingState || prev.shippingState || 'Tamil Nadu',
                                        shippingCountry: lastAddr.shippingCountry || lastAddr.billingCountry || prev.shippingCountry || 'India',
                                        shippingPincode: lastAddr.shippingPincode || lastAddr.billingPincode || prev.shippingPincode || '',
                                        shippingEmail: prev.shippingEmail || lastAddr.shippingEmail || lastAddr.billingEmail || '',
                                        sameAsBilling: lastAddr.sameAsBilling !== undefined ? lastAddr.sameAsBilling : prev.sameAsBilling
                                    };
                                });
                                return;
                            }
                        } catch (e) {}
                    }
                }

                if (!mysqlClient) return;

                const phoneClean = (checkoutForm.billingPhone || user?.phone || '').replace(/^91/, '').replace(/\D/g, '').slice(-10);

                // 2. If user is logged in, query customer_addresses first
                if (user?.id) {
                    try {
                        const { data: addresses } = await mysqlClient
                            .from('customer_addresses')
                            .select('*')
                            .eq('customer_id', user.id)
                            .order('is_default', { ascending: false })
                            .limit(1);

                        if (!isCancelled && addresses && addresses.length > 0) {
                            const addr = addresses[0];
                            const cleanAddr = addr.address_line || addr.address || '';
                            if (cleanAddr && cleanAddr.trim()) {
                                const ph = addr.phone ? String(addr.phone).replace(/^91/, '').replace(/\D/g, '') : phoneClean;
                                const populated = {
                                    billingName: addr.name || user.name || '',
                                    billingCountryCode: addr.country_code || '+91',
                                    billingPhone: ph,
                                    billingWhatsApp: ph,
                                    billingEmail: user.email || '',
                                    billingAddress: cleanAddr,
                                    billingCity: addr.city || '',
                                    billingState: addr.state || 'Tamil Nadu',
                                    billingPincode: addr.pincode || '',
                                    billingCountry: addr.country || 'India',
                                    shippingName: addr.name || user.name || '',
                                    shippingPhone: ph,
                                    shippingWhatsApp: ph,
                                    shippingAddress: cleanAddr,
                                    shippingCity: addr.city || '',
                                    shippingState: addr.state || 'Tamil Nadu',
                                    shippingPincode: addr.pincode || '',
                                    shippingCountry: addr.country || 'India',
                                    shippingEmail: user.email || '',
                                    sameAsBilling: true
                                };

                                setCheckoutForm(prev => {
                                    if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                    return { ...prev, ...populated };
                                });

                                if (typeof window !== 'undefined') {
                                    localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(populated));
                                }
                                return;
                            }
                        }
                    } catch (addrErr) {
                        console.warn('[CHECKOUT] customer_addresses lookup error:', addrErr);
                    }

                    // 3. Query the customer's previous order from orders table
                    try {
                        const { data: previousOrders } = await mysqlClient
                            .from('orders')
                            .select('billing_address, shipping_address, customer_name, customer_phone, customer_email')
                            .eq('customer_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        if (!isCancelled && previousOrders && previousOrders.length > 0) {
                            const o = previousOrders[0];
                            let bAddr = o.billing_address;
                            let sAddr = o.shipping_address;
                            if (typeof bAddr === 'string' && bAddr.startsWith('{')) {
                                try { bAddr = JSON.parse(bAddr); } catch (e) {}
                            }
                            if (typeof sAddr === 'string' && sAddr.startsWith('{')) {
                                try { sAddr = JSON.parse(sAddr); } catch (e) {}
                            }

                            const validBillingAddr = bAddr?.address_line || bAddr?.address || sAddr?.address_line || sAddr?.address || '';
                            if (validBillingAddr && validBillingAddr.trim()) {
                                const bPhone = (bAddr?.phone || o.customer_phone || user.phone || phoneClean || '').replace(/^91/, '').replace(/\D/g, '');
                                const bWA = (bAddr?.whatsapp || bPhone).replace(/^91/, '').replace(/\D/g, '');
                                const sPhone = (sAddr?.phone || bPhone).replace(/^91/, '').replace(/\D/g, '');
                                const sWA = (sAddr?.whatsapp || sPhone).replace(/^91/, '').replace(/\D/g, '');

                                const populated = {
                                    billingName: bAddr?.name || o.customer_name || user.name || '',
                                    billingCountryCode: '+91',
                                    billingPhone: bPhone,
                                    billingWhatsApp: bWA,
                                    billingEmail: bAddr?.email || o.customer_email || user.email || '',
                                    billingAddress: validBillingAddr,
                                    billingCity: bAddr?.city || sAddr?.city || '',
                                    billingState: bAddr?.state || sAddr?.state || 'Tamil Nadu',
                                    billingPincode: bAddr?.pincode || sAddr?.pincode || '',
                                    billingCountry: bAddr?.country || sAddr?.country || 'India',
                                    shippingName: sAddr?.name || bAddr?.name || o.customer_name || user.name || '',
                                    shippingPhone: sPhone,
                                    shippingWhatsApp: sWA,
                                    shippingAddress: sAddr?.address_line || sAddr?.address || validBillingAddr,
                                    shippingCity: sAddr?.city || bAddr?.city || '',
                                    shippingState: sAddr?.state || bAddr?.state || 'Tamil Nadu',
                                    shippingPincode: sAddr?.pincode || bAddr?.pincode || '',
                                    shippingCountry: sAddr?.country || bAddr?.country || 'India',
                                    shippingEmail: bAddr?.email || o.customer_email || user.email || '',
                                    sameAsBilling: true
                                };

                                setCheckoutForm(prev => {
                                    if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                    return { ...prev, ...populated };
                                });

                                if (typeof window !== 'undefined') {
                                    localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(populated));
                                }
                                return;
                            }
                        }
                    } catch (ordErr) {
                        console.warn('[CHECKOUT] orders lookup error:', ordErr);
                    }

                    // 4. Query customers table
                    try {
                        const { data: custData } = await mysqlClient
                            .from('customers')
                            .select('address, city, state, pincode, name, phone, email')
                            .eq('id', user.id)
                            .maybeSingle();

                        if (!isCancelled && custData && custData.address && custData.address.trim()) {
                            const cPhone = (custData.phone || user.phone || phoneClean || '').replace(/^91/, '').replace(/\D/g, '');
                            const populated = {
                                billingName: custData.name || user.name || '',
                                billingCountryCode: '+91',
                                billingPhone: cPhone,
                                billingWhatsApp: cPhone,
                                billingEmail: custData.email || user.email || '',
                                billingAddress: custData.address,
                                billingCity: custData.city || '',
                                billingState: custData.state || 'Tamil Nadu',
                                billingPincode: custData.pincode || '',
                                billingCountry: 'India',
                                shippingName: custData.name || user.name || '',
                                shippingPhone: cPhone,
                                shippingWhatsApp: cPhone,
                                shippingAddress: custData.address,
                                shippingCity: custData.city || '',
                                shippingState: custData.state || 'Tamil Nadu',
                                shippingPincode: custData.pincode || '',
                                shippingCountry: 'India',
                                sameAsBilling: true
                            };

                            setCheckoutForm(prev => {
                                if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                return { ...prev, ...populated };
                            });

                            if (typeof window !== 'undefined') {
                                localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(populated));
                            }
                            return;
                        }
                    } catch (custErr) {
                        console.warn('[CHECKOUT] customers lookup error:', custErr);
                    }
                } else {
                    // Guest checkout: check previous order from localStorage recent orders
                    try {
                        const storedIds = JSON.parse(localStorage.getItem('vaiyaaree_recent_order_ids') || '[]');
                        if (Array.isArray(storedIds) && storedIds.length > 0) {
                            const cleanStored = storedIds.filter(id => id && typeof id === 'string' && id.length >= 3).slice(0, 5);
                            if (cleanStored.length > 0) {
                                const { data: guestOrders } = await mysqlClient
                                    .from('orders')
                                    .select('billing_address, shipping_address, customer_name, customer_phone, customer_email')
                                    .or(`id.in.(${cleanStored.join(',')})`)
                                    .order('created_at', { ascending: false })
                                    .limit(1);

                                if (!isCancelled && guestOrders && guestOrders.length > 0) {
                                    const o = guestOrders[0];
                                    let bAddr = o.billing_address;
                                    let sAddr = o.shipping_address;
                                    if (typeof bAddr === 'string' && bAddr.startsWith('{')) {
                                        try { bAddr = JSON.parse(bAddr); } catch (e) {}
                                    }
                                    if (typeof sAddr === 'string' && sAddr.startsWith('{')) {
                                        try { sAddr = JSON.parse(sAddr); } catch (e) {}
                                    }
                                    const validBillingAddr = bAddr?.address_line || bAddr?.address || sAddr?.address_line || sAddr?.address || '';
                                    if (validBillingAddr && validBillingAddr.trim()) {
                                        const bPhone = (bAddr?.phone || o.customer_phone || '').replace(/^91/, '').replace(/\D/g, '');
                                        const bWA = (bAddr?.whatsapp || bPhone).replace(/^91/, '').replace(/\D/g, '');
                                        const populated = {
                                            billingName: bAddr?.name || o.customer_name || '',
                                            billingCountryCode: '+91',
                                            billingPhone: bPhone,
                                            billingWhatsApp: bWA,
                                            billingEmail: bAddr?.email || o.customer_email || '',
                                            billingAddress: validBillingAddr,
                                            billingCity: bAddr?.city || '',
                                            billingState: bAddr?.state || 'Tamil Nadu',
                                            billingPincode: bAddr?.pincode || '',
                                            billingCountry: bAddr?.country || 'India',
                                            shippingName: sAddr?.name || bAddr?.name || o.customer_name || '',
                                            shippingPhone: (sAddr?.phone || bPhone).replace(/^91/, '').replace(/\D/g, ''),
                                            shippingWhatsApp: (sAddr?.whatsapp || bWA).replace(/^91/, '').replace(/\D/g, ''),
                                            shippingAddress: sAddr?.address_line || sAddr?.address || validBillingAddr,
                                            shippingCity: sAddr?.city || bAddr?.city || '',
                                            shippingState: sAddr?.state || bAddr?.state || 'Tamil Nadu',
                                            shippingPincode: sAddr?.pincode || bAddr?.pincode || '',
                                            shippingCountry: sAddr?.country || bAddr?.country || 'India',
                                            sameAsBilling: true
                                        };

                                        setCheckoutForm(prev => {
                                            if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                            return { ...prev, ...populated };
                                        });

                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(populated));
                                        }
                                        return;
                                    }
                                }
                            }
                        }
                    } catch (gErr) {}

                    // Lookup by phone if known and has 10 digits
                    if (phoneClean && phoneClean.length === 10) {
                        try {
                            const phoneVars = [phoneClean, `91${phoneClean}`, `+91${phoneClean}`];
                            const { data: phoneOrders } = await mysqlClient
                                .from('orders')
                                .select('billing_address, shipping_address, customer_name, customer_phone, customer_email')
                                .or(`customer_phone.in.(${phoneVars.join(',')})`)
                                .order('created_at', { ascending: false })
                                .limit(1);

                            if (!isCancelled && phoneOrders && phoneOrders.length > 0) {
                                const o = phoneOrders[0];
                                let bAddr = o.billing_address;
                                let sAddr = o.shipping_address;
                                if (typeof bAddr === 'string' && bAddr.startsWith('{')) {
                                    try { bAddr = JSON.parse(bAddr); } catch (e) {}
                                }
                                if (typeof sAddr === 'string' && sAddr.startsWith('{')) {
                                    try { sAddr = JSON.parse(sAddr); } catch (e) {}
                                }
                                const validBillingAddr = bAddr?.address_line || bAddr?.address || sAddr?.address_line || sAddr?.address || '';
                                if (validBillingAddr && validBillingAddr.trim()) {
                                    const bWA = (bAddr?.whatsapp || phoneClean).replace(/^91/, '').replace(/\D/g, '');
                                    const populated = {
                                        billingName: bAddr?.name || o.customer_name || '',
                                        billingCountryCode: '+91',
                                        billingPhone: phoneClean,
                                        billingWhatsApp: bWA,
                                        billingEmail: bAddr?.email || o.customer_email || '',
                                        billingAddress: validBillingAddr,
                                        billingCity: bAddr?.city || '',
                                        billingState: bAddr?.state || 'Tamil Nadu',
                                        billingPincode: bAddr?.pincode || '',
                                        billingCountry: bAddr?.country || 'India',
                                        shippingName: sAddr?.name || bAddr?.name || o.customer_name || '',
                                        shippingPhone: (sAddr?.phone || phoneClean).replace(/^91/, '').replace(/\D/g, ''),
                                        shippingWhatsApp: (sAddr?.whatsapp || bWA).replace(/^91/, '').replace(/\D/g, ''),
                                        shippingAddress: sAddr?.address_line || sAddr?.address || validBillingAddr,
                                        shippingCity: sAddr?.city || bAddr?.city || '',
                                        shippingState: sAddr?.state || bAddr?.state || 'Tamil Nadu',
                                        shippingPincode: sAddr?.pincode || bAddr?.pincode || '',
                                        shippingCountry: sAddr?.country || bAddr?.country || 'India',
                                        sameAsBilling: true
                                    };

                                    setCheckoutForm(prev => {
                                        if (prev.billingAddress && prev.billingAddress.trim()) return prev;
                                        return { ...prev, ...populated };
                                    });

                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(populated));
                                    }
                                }
                            }
                        } catch (pErr) {}
                    }
                }
            } catch (err) {
                console.warn('[CHECKOUT] Could not auto-populate previous billing address:', err);
            }
        }

        populatePreviousAddress();

        return () => { isCancelled = true; };
    }, [user?.id, user?.phone, user?.email, mysqlClient]);


    const states = ["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"];

    const isBillingIndia = (checkoutForm.billingCountry || 'India').toLowerCase() === 'india';
    const cleanBillingPhoneDigits = (checkoutForm.billingPhone || '').replace(/\D/g, '');
    const cleanWhatsAppDigits = (checkoutForm.billingWhatsApp || '').replace(/\D/g, '');

    const isBillingComplete = Boolean(
        checkoutForm.billingName?.trim() &&
        (isBillingIndia ? cleanBillingPhoneDigits.length === 10 : cleanBillingPhoneDigits.length >= 7) &&
        (isBillingIndia ? cleanWhatsAppDigits.length === 10 : cleanWhatsAppDigits.length >= 7) &&
        checkoutForm.billingEmail?.trim() &&
        checkoutForm.billingEmail?.includes('@') &&
        checkoutForm.billingAddress?.trim() &&
        checkoutForm.billingCity?.trim() &&
        checkoutForm.billingPincode?.trim()?.length >= (isBillingIndia ? 6 : 3)
    );

    const handlePlaceOrder = async () => {
        if (!checkoutForm.billingName?.trim()) {
            showToast('Please enter your Full Name', 'error');
            return;
        }

        const cleanPhone = (checkoutForm.billingPhone || '').replace(/\D/g, '');
        const cleanWA = (checkoutForm.billingWhatsApp || '').replace(/\D/g, '');

        if (isBillingIndia) {
            if (cleanPhone.length !== 10) {
                showToast('Please enter a valid 10-digit Phone Number', 'error');
                return;
            }
            if (cleanWA.length !== 10) {
                showToast('Please enter a valid 10-digit Billing WhatsApp Number', 'error');
                return;
            }
        } else {
            if (cleanPhone.length < 7 || cleanPhone.length > 15) {
                showToast('Please enter a valid Phone Number (7-15 digits)', 'error');
                return;
            }
            if (cleanWA.length < 7 || cleanWA.length > 15) {
                showToast('Please enter a valid Billing WhatsApp Number (7-15 digits)', 'error');
                return;
            }
        }

        if (!checkoutForm.billingEmail || !checkoutForm.billingEmail.includes('@')) {
            showToast('Please enter a valid Email Address', 'error');
            return;
        }
        if (!checkoutForm.billingAddress?.trim()) {
            showToast('Please enter your Billing Address', 'error');
            return;
        }
        if (!checkoutForm.billingCity?.trim()) {
            showToast('Please enter your City / Town', 'error');
            return;
        }
        if (!checkoutForm.billingPincode || (isBillingIndia && checkoutForm.billingPincode.trim().length < 6)) {
            showToast('Please enter a valid Pincode', 'error');
            return;
        }
        if (!checkoutForm.billingState?.trim()) {
            showToast('Please select your State', 'error');
            return;
        }

        // Validate shipping if different from billing
        if (!checkoutForm.sameAsBilling) {
            if (!checkoutForm.shippingName?.trim()) {
                showToast('Please enter recipient Full Name for shipping', 'error');
                return;
            }
            const cleanShipPhone = (checkoutForm.shippingPhone || '').replace(/\D/g, '');
            const cleanShipWA = (checkoutForm.shippingWhatsApp || '').replace(/\D/g, '');
            const isShippingIndia = (checkoutForm.shippingCountry || 'India').toLowerCase() === 'india';

            if (isShippingIndia) {
                if (cleanShipPhone.length !== 10) {
                    showToast('Please enter a valid 10-digit Shipping Phone Number', 'error');
                    return;
                }
                if (cleanShipWA.length !== 10) {
                    showToast('Please enter a valid 10-digit Shipping WhatsApp Number', 'error');
                    return;
                }
            } else {
                if (cleanShipPhone.length < 7 || cleanShipPhone.length > 15) {
                    showToast('Please enter a valid Shipping Phone Number (7-15 digits)', 'error');
                    return;
                }
                if (cleanShipWA.length < 7 || cleanShipWA.length > 15) {
                    showToast('Please enter a valid Shipping WhatsApp Number (7-15 digits)', 'error');
                    return;
                }
            }

            if (!checkoutForm.shippingAddress?.trim()) {
                showToast('Please enter recipient Address for shipping', 'error');
                return;
            }
            if (!checkoutForm.shippingCity?.trim()) {
                showToast('Please enter recipient City for shipping', 'error');
                return;
            }
            if (!checkoutForm.shippingPincode?.trim()) {
                showToast('Please enter recipient Pincode for shipping', 'error');
                return;
            }
            if (!checkoutForm.shippingState?.trim()) {
                showToast('Please select recipient State for shipping', 'error');
                return;
            }
        }

        // Validate product stock limits
        const unavailableItem = cart.find(i => i.stock !== undefined && i.stock !== null && (i.stock <= 0 || i.qty > i.stock));
        if (unavailableItem) {
            showToast(`Saree Not Available: "${unavailableItem.name}" exceeds available stock limit (${unavailableItem.stock ?? 0}). Please update cart.`, 'error');
            return;
        }

        const selectedMethod = checkoutForm.paymentMethod || 'COD';

        setPlacing(true);
        try {
            if (selectedMethod === 'RAZORPAY') {
                // Step 1: Create Order Record in MySQL
                const createdOrder = await placeOrder('RAZORPAY');
                if (!createdOrder || !createdOrder.orderId) {
                    throw new Error('Could not create order. Please try again.');
                }

                // Step 2: Create Razorpay Order via API
                const rzpRes = await fetch('/api/payment/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: createdOrder.orderId })
                });

                const rzpData = await rzpRes.json();
                if (!rzpRes.ok || rzpData.error) {
                    throw new Error(rzpData.error || 'Failed to initialize payment gateway');
                }

                // Step 3: Open Razorpay Payment Modal
                if (typeof window !== 'undefined' && window.Razorpay) {
                    const options = {
                        key: rzpData.keyId,
                        amount: rzpData.amount,
                        currency: rzpData.currency || 'INR',
                        name: 'Vaiyaaree Sarees',
                        description: `Order #${createdOrder.orderId}`,
                        order_id: rzpData.razorpayOrderId,
                        handler: async function (response) {
                            setPlacing(true);
                            try {
                                const verifyRes = await fetch('/api/payment/verify', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_signature: response.razorpay_signature,
                                        orderId: createdOrder.orderId
                                    })
                                });
                                const verifyData = await verifyRes.json();
                                if (verifyData.success) {
                                    clearCartAfterSuccess();
                                    setOrderData({
                                        ...createdOrder,
                                        payment_method: 'Razorpay',
                                        razorpay_payment_id: response.razorpay_payment_id
                                    });
                                    showToast('Payment Successful! Your order has been confirmed.', 'success');
                                } else {
                                    showToast(verifyData.error || 'Payment verification failed. Your cart is preserved.', 'error');
                                }
                            } catch (verifyErr) {
                                showToast('Verification Error: ' + verifyErr.message, 'error');
                            } finally {
                                setPlacing(false);
                            }
                        },
                        modal: {
                            ondismiss: function () {
                                setPlacing(false);
                                showToast('Payment window closed. Your cart and details are saved so you can retry.', 'info');
                            }
                        },
                        prefill: {
                            name: checkoutForm.billingName,
                            email: checkoutForm.billingEmail,
                            contact: checkoutForm.billingPhone
                        },
                        theme: { color: '#5d0821' }
                    };

                    const rzp = new window.Razorpay(options);
                    rzp.open();
                } else {
                    throw new Error('Razorpay SDK loading. Please refresh and try again.');
                }
            } else {
                // Cash on Delivery Flow
                const data = await placeOrder('COD');
                if (data) {
                    setOrderData({
                        ...data,
                        payment_method: 'Cash on Delivery (COD)'
                    });
                    showToast('Your Placed Order Confirmed!', 'success');
                }
            }
        } catch (err) {
            console.error('Checkout Error:', err);
            showToast(err.message || 'Failed to place order', 'error');
        } finally {
            if (selectedMethod !== 'RAZORPAY') {
                setPlacing(false);
            }
        }
    };

    const goToWhatsApp = (orderId) => {
        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);
        const bizPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
        window.open(`https://wa.me/${bizPhone}?text=${message}`, '_blank');
    };

    if ((!pageMounted || !isCartLoaded) && !orderData && !placing) {
        return (
            <div className={styles.emptyCheckout} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={36} className={`${styles.spinnerRing} animate-spin`} style={{ color: '#5d0821' }} />
            </div>
        );
    }

    if (cart.length === 0 && !orderData && !placing) {
        return (
            <div className={styles.emptyCheckout}>
                <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                <h3>Your cart is empty</h3>
                <p>Add some items before checking out.</p>
                <Link href="/shop" className={styles.primaryBtn}>Return to Shop</Link>
            </div>
        );
    }

    if (!isSessionLoading && !isUserLoggedIn && !isGuestMode && !orderData) {
        return (
            <div className={styles.emptyCheckout} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <Loader2 size={36} className={`${styles.spinnerRing} animate-spin`} style={{ color: '#5d0821' }} />
                <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Proceeding to authentication...</p>
            </div>
        );
    }

    return (
        <>
            <div className={styles.checkoutLayout}>
                <div className={styles.checkoutLeft}>
                    {/* GUEST BANNER */}
                    {!isUserLoggedIn && isGuestMode && (
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '12px 18px',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            <div style={{ fontSize: '0.88rem', color: '#334155' }}>
                                ⚡ Checking out as <strong>Guest</strong>.
                            </div>
                            <Link href="/checkout/auth" style={{ fontSize: '0.84rem', color: '#5d0821', fontWeight: 700, textDecoration: 'none' }}>
                                Log in or Register for live tracking →
                            </Link>
                        </div>
                    )}

                    {/* BILLING ADDRESS SECTION */}
                    <section className={styles.checkoutCard}>
                        <h3 className={styles.cardTitle}>Billing Details</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>FULL NAME <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingName || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} 
                                        placeholder="Enter your full name" 
                                        pattern="[a-zA-Z\s]+"
                                        title="Only letters and spaces are allowed"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>PHONE NUMBER <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="tel" 
                                        value={checkoutForm.billingPhone || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                            setCheckoutForm(p => ({
                                                ...p,
                                                billingPhone: val
                                            }));
                                        }} 
                                        placeholder="10-digit phone number" 
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        minLength="10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>
                                        WHATSAPP NUMBER <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <input 
                                        type="tel" 
                                        value={checkoutForm.billingWhatsApp || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingWhatsApp: val,
                                                ...(p.sameAsBilling ? { shippingWhatsApp: val } : {})
                                            }));
                                        }} 
                                        placeholder="10-digit WhatsApp number" 
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        minLength="10"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>EMAIL ADDRESS <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="email" 
                                        value={checkoutForm.billingEmail || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingEmail: val,
                                                ...(p.sameAsBilling ? { shippingEmail: val } : {})
                                            }));
                                        }} 
                                        placeholder="your@email.com" 
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                                <label>BILLING ADDRESS <span className={styles.requiredStar}>*</span></label>
                                <textarea 
                                    value={checkoutForm.billingAddress || ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setCheckoutForm(p => ({ 
                                            ...p, 
                                            billingAddress: val,
                                            ...(p.sameAsBilling ? { shippingAddress: val } : {})
                                        }));
                                    }} 
                                    placeholder="House No, Building, Street, Area..." 
                                    rows={2} 
                                    required
                                />
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>CITY / TOWN <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingCity || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingCity: val,
                                                ...(p.sameAsBilling ? { shippingCity: val } : {})
                                            }));
                                        }} 
                                        placeholder="City name" 
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>STATE <span className={styles.requiredStar}>*</span></label>
                                    {(checkoutForm.billingCountry || 'India') === 'India' ? (
                                        <select 
                                            value={checkoutForm.billingState || 'Tamil Nadu'} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setCheckoutForm(p => ({ 
                                                    ...p, 
                                                    billingState: val,
                                                    ...(p.sameAsBilling ? { shippingState: val } : {})
                                                }));
                                            }}
                                        >
                                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={checkoutForm.billingState || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setCheckoutForm(p => ({ 
                                                    ...p, 
                                                    billingState: val,
                                                    ...(p.sameAsBilling ? { shippingState: val } : {})
                                                }));
                                            }}
                                            placeholder="State / Province / Region"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>PINCODE (POSTAL CODE) <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingPincode || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9a-zA-Z\s-]/g, '').slice(0, 10);
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingPincode: val,
                                                ...(p.sameAsBilling ? { shippingPincode: val } : {})
                                            }));
                                        }} 
                                        placeholder="6-digit Pincode (e.g. 600001)" 
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>COUNTRY <span className={styles.requiredStar}>*</span></label>
                                    <select 
                                        value={checkoutForm.billingCountry || 'India'}
                                        onChange={e => {
                                            const newCountry = e.target.value;
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingCountry: newCountry,
                                                ...(p.sameAsBilling ? { shippingCountry: newCountry } : {})
                                            }));
                                        }}
                                    >
                                        <option value="India">India</option>
                                        <option value="USA">USA</option>
                                        <option value="UK">UK</option>
                                        <option value="UAE">UAE</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="Malaysia">Malaysia</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                {/* SHIPPING ADDRESS SECTION */}
                <section className={styles.checkoutCard} style={{ marginTop: '2rem' }}>
                            <h3 className={styles.cardTitle}>Shipping Details</h3>
                            
                            {/* Same as Billing Checkbox */}
                            <label className={styles.sameAsBillingCheckbox}>
                                <input 
                                    type="checkbox" 
                                    checked={checkoutForm.sameAsBilling || false}
                                    onChange={e => {
                                        const isChecked = e.target.checked;
                                        setCheckoutForm(p => ({ 
                                            ...p, 
                                            sameAsBilling: isChecked,
                                            ...(isChecked ? {
                                                shippingName: p.billingName,
                                                shippingPhone: p.billingPhone,
                                                shippingWhatsApp: p.billingWhatsApp,
                                                shippingEmail: p.billingEmail,
                                                shippingAddress: p.billingAddress,
                                                shippingCity: p.billingCity,
                                                shippingState: p.billingState,
                                                shippingPincode: p.billingPincode,
                                                shippingCountry: p.billingCountry || 'India'
                                            } : {})
                                        }));
                                    }}
                                />
                                <span className={styles.checkmark}></span>
                                <span className={styles.checkboxLabel}>Same as billing address</span>
                            </label>

                            {/* Shipping fields */}
                            <div className={styles.shippingFields} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING FULL NAME <span className={styles.requiredStar}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingName || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} 
                                            placeholder="Enter recipient full name" 
                                            pattern="[a-zA-Z\s]+"
                                            title="Only letters and spaces are allowed"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            required={!checkoutForm.sameAsBilling}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING PHONE NUMBER <span className={styles.requiredStar}>*</span></label>
                                        <input 
                                            type="tel" 
                                            value={checkoutForm.shippingPhone || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingPhone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))} 
                                            placeholder="10-digit phone number"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            pattern="[0-9]{10}"
                                            maxLength="10"
                                            minLength="10"
                                            required={!checkoutForm.sameAsBilling}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING WHATSAPP NUMBER <span className={styles.requiredStar}>*</span></label>
                                        <input 
                                            type="tel" 
                                            value={checkoutForm.shippingWhatsApp || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingWhatsApp: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))} 
                                            placeholder="10-digit WhatsApp number"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            pattern="[0-9]{10}"
                                            maxLength="10"
                                            minLength="10"
                                            required={!checkoutForm.sameAsBilling}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING EMAIL</label>
                                        <input 
                                            type="email" 
                                            value={checkoutForm.shippingEmail || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingEmail: e.target.value }))} 
                                            placeholder="recipient@email.com (optional)"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                                    <label>SHIPPING ADDRESS <span className={styles.requiredStar}>*</span></label>
                                    <textarea 
                                        value={checkoutForm.shippingAddress || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, shippingAddress: e.target.value }))} 
                                        placeholder="House No, Building, Street, Area..." 
                                        rows={2}
                                        disabled={checkoutForm.sameAsBilling}
                                        className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        required={!checkoutForm.sameAsBilling}
                                    />
                                </div>

                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>CITY / TOWN <span className={styles.requiredStar}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingCity || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingCity: e.target.value }))} 
                                            placeholder="City name"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            required={!checkoutForm.sameAsBilling}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>STATE <span className={styles.requiredStar}>*</span></label>
                                        {(checkoutForm.shippingCountry || 'India') === 'India' ? (
                                            <select 
                                                value={checkoutForm.shippingState || 'Tamil Nadu'} 
                                                onChange={e => setCheckoutForm(p => ({ ...p, shippingState: e.target.value }))}
                                                disabled={checkoutForm.sameAsBilling}
                                                className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            >
                                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={checkoutForm.shippingState || ''}
                                                onChange={e => setCheckoutForm(p => ({ ...p, shippingState: e.target.value }))}
                                                placeholder="State / Province / Region"
                                                disabled={checkoutForm.sameAsBilling}
                                                className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                                required={!checkoutForm.sameAsBilling}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING PINCODE <span className={styles.requiredStar}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingPincode || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingPincode: e.target.value }))} 
                                            placeholder="6-digit pincode"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            required={!checkoutForm.sameAsBilling}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>COUNTRY <span className={styles.requiredStar}>*</span></label>
                                        <select 
                                            value={checkoutForm.shippingCountry || 'India'}
                                            onChange={e => {
                                                const newCountry = e.target.value;
                                                setCheckoutForm(p => ({ 
                                                    ...p, 
                                                    shippingCountry: newCountry
                                                }));
                                            }}
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        >
                                            <option value="India">India</option>
                                            <option value="USA">USA</option>
                                            <option value="UK">UK</option>
                                            <option value="UAE">UAE</option>
                                            <option value="Singapore">Singapore</option>
                                            <option value="Malaysia">Malaysia</option>
                                            <option value="Australia">Australia</option>
                                            <option value="Canada">Canada</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                <p className={styles.privacyNote}>
                    Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
                </p>
            </div>

            <aside className={styles.checkoutRight}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryHeader}>
                        <h3>Your order</h3>
                    </div>
                    <div className={styles.summaryBody}>
                        <div className={styles.tableHeader}>
                            <span>PRODUCT</span>
                            <span>SUBTOTAL</span>
                        </div>
                        <div className={styles.itemList}>
                            {cart.map((item, i) => (
                                <div key={i} className={styles.summaryItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{item.name} <strong>× {item.qty}</strong></div>
                                        {item.variantName && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                                    Variant: {item.variantName}
                                                </span>
                                                {item.variantSku && (
                                                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                        ({item.variantSku})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>₹{(item.price * item.qty).toLocaleString()}.00</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.summaryDivider} />

                        {/* COUPON PROMO INPUT BOX */}
                        <div className="coupon-box-section">
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Have a Coupon / Promo Code?</label>
                            {appliedCoupon ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                                        <Tag size={14} />
                                        <span>{appliedCoupon.couponCode}</span>
                                        {appliedCoupon.couponDiscount > 0 && <small style={{ fontWeight: 700 }}>(Save ₹{appliedCoupon.couponDiscount.toLocaleString('en-IN')})</small>}
                                    </div>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontWeight: 800, fontSize: '11px', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', marginLeft: 'auto' }}>
                                        <Check size={12} strokeWidth={2.5} /> Applied
                                    </span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter code (e.g. WELCOME10)"
                                        value={couponInput}
                                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}
                                    />
                                    <button
                                        type="button"
                                        disabled={applyingCoupon || !couponInput.trim()}
                                        onClick={async () => {
                                            setApplyingCoupon(true);
                                            await applyCoupon(couponInput);
                                            setApplyingCoupon(false);
                                        }}
                                        style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        {applyingCoupon ? '...' : 'Apply'}
                                    </button>
                                </div>
                            )}
                            {couponError && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, margin: '-6px 0 8px' }}>{couponError}</p>}
                            {couponMessage && <p style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600, margin: '-6px 0 8px' }}>{couponMessage}</p>}

                            {/* Available Offers in Checkout */}
                            {availableCouponOffers.length > 0 && !appliedCoupon && (
                                <div style={{ marginBottom: '12px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Sparkles size={12} color="#f59e0b" /> Available Offers
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {availableCouponOffers.map(offer => {
                                            const offerSavings = offer.discount_type === 'FREE_SHIPPING'
                                                ? 'Free Delivery'
                                                : (offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`);
                                            return (
                                                <div key={offer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Tag size={12} color="#64748b" />
                                                        <strong style={{ color: '#0f172a' }}>{offer.coupon_code}</strong>
                                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>({offerSavings})</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={applyingCoupon}
                                                        onClick={async () => {
                                                            setApplyingCoupon(true);
                                                            await applyCoupon(offer.coupon_code);
                                                            setApplyingCoupon(false);
                                                        }}
                                                        style={{ background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>₹{Number(cartTotal || 0).toLocaleString('en-IN')}.00</span>
                        </div>

                        {discountData?.totalDiscount > 0 && (() => {
                            const appliedRules = discountData.appliedRules || [];
                            const singleRule = appliedRules.length === 1 ? appliedRules[0] : null;
                            const singleRuleName = singleRule ? (singleRule.name || singleRule.ruleName || (singleRule.couponCode ? `Coupon ${singleRule.couponCode}` : 'Promotion')) : '';

                            return (
                                <>
                                    <div className={styles.summaryRow} style={{ color: '#16a34a', fontWeight: 700, alignItems: 'flex-start' }}>
                                        <div>
                                            <span>Discount</span>
                                            {singleRuleName && (
                                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginTop: '2px' }}>
                                                    ({singleRuleName})
                                                </span>
                                            )}
                                        </div>
                                        <span>-₹{Math.round(discountData.totalDiscount).toLocaleString('en-IN')}.00</span>
                                    </div>
                                    {appliedRules.length > 1 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '-4px 0 10px', padding: '6px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.78rem', color: '#15803d' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                                                Offers Applied (Breakdown):
                                            </span>
                                            {appliedRules.map((r, idx) => {
                                                const ruleDisplayName = r.name || r.ruleName || (r.couponCode ? `Coupon ${r.couponCode}` : 'Promotion');
                                                const savingsText = r.discountType === 'FREE_SHIPPING'
                                                    ? 'Free Shipping'
                                                    : `-₹${Math.round(r.discountAmount || 0).toLocaleString('en-IN')}.00`;
                                                return (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 600 }}>• {ruleDisplayName}</span>
                                                        <span style={{ fontWeight: 700 }}>{savingsText}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {taxDetails.cgst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>CGST (2.5%)</span>
                                <span>₹{taxDetails.cgst.toLocaleString('en-IN')}.00</span>
                            </div>
                        )}
                        {taxDetails.sgst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>SGST (2.5%)</span>
                                <span>₹{taxDetails.sgst.toLocaleString('en-IN')}.00</span>
                            </div>
                        )}
                        {taxDetails.igst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>IGST (5%)</span>
                                <span>₹{taxDetails.igst.toLocaleString('en-IN')}.00</span>
                            </div>
                        )}

                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span className={taxDetails.shipping === 0 ? styles.freeText : ''}>
                                {taxDetails.shipping === 0 ? 'FREE' : `₹${taxDetails.shipping.toLocaleString('en-IN')}.00`}
                            </span>
                        </div>

                        <div className={styles.summaryTotalRow}>
                            <span>Total</span>
                            <span className={styles.totalPrice}>
                                ₹{Math.max(0, Math.round(taxDetails.totalOrder)).toLocaleString('en-IN')}.00
                            </span>
                        </div>
                    </div>

                    <div className={styles.summaryPaymentWrapper}>
                        <div className={styles.summaryPaymentTitle}>Payment Method</div>
                        
                        {paymentSettings.razorpay_enabled && (
                            <div 
                                className={`${styles.summaryPaymentOption} ${checkoutForm.paymentMethod === 'RAZORPAY' ? styles.codSelected : ''}`}
                                onClick={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'RAZORPAY' }))}
                                role="button"
                                tabIndex={0}
                                style={{ marginBottom: '10px' }}
                            >
                                <div className={`${styles.customCheckbox} ${checkoutForm.paymentMethod === 'RAZORPAY' ? styles.checkboxChecked : ''}`}>
                                    {checkoutForm.paymentMethod === 'RAZORPAY' && <Check size={13} strokeWidth={3.5} />}
                                </div>
                                <CreditCard size={20} className={styles.truckIcon} color="#5d0821" />
                                <div className={styles.paymentTextGroup}>
                                    <div className={styles.paymentOptionTitle}>{paymentSettings.razorpay_title}</div>
                                    <div className={styles.paymentOptionDesc}>UPI (GPay/PhonePe/Paytm), Cards & NetBanking</div>
                                </div>
                            </div>
                        )}

                        <div 
                            className={`${styles.summaryPaymentOption} ${checkoutForm.paymentMethod === 'COD' ? styles.codSelected : ''}`}
                            onClick={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'COD' }))}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={`${styles.customCheckbox} ${checkoutForm.paymentMethod === 'COD' ? styles.checkboxChecked : ''}`}>
                                {checkoutForm.paymentMethod === 'COD' && <Check size={13} strokeWidth={3.5} />}
                            </div>
                            <Truck size={20} className={styles.truckIcon} />
                            <div className={styles.paymentTextGroup}>
                                <div className={styles.paymentOptionTitle}>Cash on Delivery (COD)</div>
                                <div className={styles.paymentOptionDesc}>Pay when you receive the product</div>
                            </div>
                        </div>
                    </div>

                    <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={placing}>
                        {placing ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Loader2 size={18} className={styles.spinnerRing} style={{ color: '#ffffff' }} />
                                {checkoutForm.paymentMethod === 'RAZORPAY' ? 'Processing...' : 'Placing Order...'}
                            </span>
                        ) : (
                            checkoutForm.paymentMethod === 'RAZORPAY' ? 'Pay Online & Place Order' : 'Place Order'
                        )}
                    </button>
                    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
                </div>
            </aside>
        </div>

        {/* Modal 1: Centered Order Placing / Processing Loading Modal */}
        {placing && !orderData && (
            <ModalPortal>
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalLoadingBadge}>
                            <Loader2 size={42} className={styles.spinnerRing} strokeWidth={2.5} />
                        </div>
                        <h2 className={styles.modalTitle}>
                            {checkoutForm.paymentMethod === 'RAZORPAY' ? 'Processing Payment...' : 'Placing Your Order...'}
                        </h2>
                        <p className={styles.modalSubtitle}>
                            {checkoutForm.paymentMethod === 'RAZORPAY'
                                ? 'Connecting to secure payment gateway. Please complete the transaction in the Razorpay window.'
                                : 'Please wait while we confirm your order details and reserve your items.'}
                        </p>

                        <div className={styles.loadingPulseBar} />

                        <div className={styles.modalSecurityNotice}>
                            <Lock size={14} color="#5d0821" />
                            <span>Please do not refresh or close this window</span>
                        </div>
                    </div>
                </div>
            </ModalPortal>
        )}

        {/* Modal 2: Centered Order Confirmed Pop-up Modal with Close Options */}
        {orderData && (
            <ModalPortal>
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        {/* Top-Right Close 'X' Button */}
                        <button 
                            className={styles.modalCloseBtn}
                            onClick={() => {
                                setOrderData(null);
                                router.push('/shop');
                            }}
                            title="Close"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>

                        <div className={styles.modalHeaderBadge}>
                            <CheckCircle size={46} color="#16a34a" strokeWidth={2.5} />
                        </div>
                        <h2 className={styles.modalTitle}>Your Placed Order Confirmed</h2>
                        <p className={styles.modalSubtitle}>
                            {isEmailOnly
                                ? 'Thank you for your purchase! A confirmation email with your order summary has been dispatched to your email address.'
                                : 'Thank you for your purchase! We have received your order and will process it shortly.'}
                        </p>

                        {/* Order Details Card */}
                        <div className={styles.modalOrderCard}>
                            <div className={styles.modalOrderRow}>
                                <span>Order Number</span>
                                <strong style={{ color: '#5d0821', letterSpacing: '0.02em', fontSize: '0.95rem' }}>
                                    #{orderData.orderId}
                                </strong>
                            </div>
                            <div className={styles.modalOrderRow}>
                                <span>Payment Method</span>
                                <strong>
                                    {orderData.payment_method || (checkoutForm.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment')}
                                </strong>
                            </div>
                            {orderData.total !== undefined && (
                                <div className={styles.modalOrderRow}>
                                    <span>Total Amount</span>
                                    <strong style={{ color: '#16a34a', fontSize: '1.05rem' }}>
                                        ₹{Number(orderData.total).toLocaleString()}.00
                                    </strong>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons with Close Options */}
                        <div className={styles.modalActions}>
                            <button onClick={() => router.push('/profile?tab=orders')} className={styles.modalPrimaryBtn}>
                                <Package size={18} />
                                <span>View My Orders</span>
                            </button>
                            
                            {isEmailOnly ? (
                                <a 
                                    href={`mailto:${supportEmail || 'support@vaiyaaree.com'}?subject=${encodeURIComponent(`Order #${orderData.orderId} Confirmation`)}&body=${encodeURIComponent(`Hi Vaiyaaree Team,\n\nI have placed Order #${orderData.orderId}. Please let me know if you need any additional details.\n\nThank you!`)}`} 
                                    className={styles.modalSecondaryBtn}
                                    style={{ textDecoration: 'none', background: '#0f172a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Mail size={18} />
                                    <span>Email Support</span>
                                </a>
                            ) : (
                                <button onClick={() => goToWhatsApp(orderData.orderId)} className={styles.modalWaBtn}>
                                    <MessageCircle size={18} />
                                    <span>Confirm on WhatsApp</span>
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    setOrderData(null);
                                    router.push('/shop');
                                }} 
                                className={styles.modalSecondaryBtn}
                            >
                                <ShoppingBag size={17} />
                                <span>Continue Shopping</span>
                            </button>
                        </div>
                    </div>
                </div>
            </ModalPortal>
        )}
        </>
    );
}
