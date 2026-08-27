'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { calculateDiscounts } from '@/services/discountService';

const defaultContextValue = {
    products: [], cart: [], loading: false, user: null, setUser: () => { }, isSessionLoading: true,
    shippingZones: [], zoneMappings: [], businessState: 'Tamil Nadu',
    checkoutForm: { 
        billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingCountry: 'India', billingPincode: '', billingEmail: '', billingWhatsApp: '',
        shippingName: '', shippingPhone: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingCountry: 'India', shippingPincode: '',
        sameAsBilling: true, paymentMethod: 'COD' 
    },
    setCheckoutForm: () => { }, addToCart: () => { }, removeFromCart: () => { }, updateQty: () => { },
    handleLogout: () => { }, showToast: () => { }, toast: { show: false, message: '', type: 'success' },
    cartTotal: 0, cartCount: 0, taxDetails: { cgst: 0, sgst: 0, igst: 0, shipping: 0, totalOrder: 0 },
    mysqlClient: null, placeOrder: () => { },
    isCartOpen: false, setIsCartOpen: () => { }, openCart: () => { }, closeCart: () => { }, toggleCart: () => { },
    comingSoonSettings: null, setComingSoonSettings: () => { }, fetchComingSoon: () => { }
};

const ShopContext = createContext(defaultContextValue);
const SESSION_EXPIRY_DAYS = 7; // Auto-logout after 7 days


export function ShopProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const [shippingZones, setShippingZones] = useState([]);
    const [zoneMappings, setZoneMappings] = useState([]);
    const [businessState, setBusinessState] = useState('Tamil Nadu');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasMounted, setHasMounted] = useState(false);
    const [isCartLoaded, setIsCartLoaded] = useState(false); // Guard for DB sync
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponMessage, setCouponMessage] = useState(null);
    const [couponError, setCouponError] = useState(null);
    const [discountData, setDiscountData] = useState({
        subtotal: 0,
        productDiscount: 0,
        cartDiscount: 0,
        couponDiscount: 0,
        shippingDiscount: 0,
        totalDiscount: 0,
        discountedItems: [],
        appliedRules: []
    });
    const [comingSoonSettings, setComingSoonSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('vaiyaaree_coming_soon');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return null;
    });

    const [checkoutForm, setCheckoutForm] = useState({
        // Billing fields
        billingName: '',
        billingPhone: '',
        billingAddress: '',
        billingCity: '',
        billingState: 'Tamil Nadu',
        billingCountry: 'India',
        billingPincode: '',
        billingEmail: '',
        // Shipping fields
        shippingName: '',
        shippingPhone: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: 'Tamil Nadu',
        shippingCountry: 'India',
        shippingPincode: '',
        shippingEmail: '',
        sameAsBilling: true,
        // Payment
        paymentMethod: 'COD'
    });

    const [dbCategories, setDbCategories] = useState([]);

    const fetchDbCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                setDbCategories(data.categories);
            }
        } catch (err) {
            console.error('[SHOP CONTEXT] Fetch db categories error:', err);
        }
    };

    //  EFFECTS 
    useEffect(() => {
        setHasMounted(true);
        // Execute initial data fetches concurrently for fast startup performance
        Promise.all([
            fetchProducts(),
            fetchBusinessState(),
            fetchShippingRates(),
            checkSession(),
            fetchComingSoon(),
            fetchDbCategories()
        ]).catch(err => console.error('[APP INIT] Startup fetch error:', err));
    }, []);

    const fetchComingSoon = async () => {
        try {
            const { data } = await mysqlClient
                .from('app_settings')
                .select('key, value')
                .in('key', [
                    'coming_soon_enabled',
                    'coming_soon_title',
                    'coming_soon_subtitle',
                    'coming_soon_launch_date',
                    'coming_soon_phone',
                    'coming_soon_email',
                    'coming_soon_whatsapp',
                    'coming_soon_instagram',
                    'coming_soon_facebook',
                    'shop_logo',
                    'shop_name'
                ]);

            if (data && data.length > 0) {
                const map = {};
                data.forEach(item => { map[item.key] = item.value; });
                const isEnabled = map.coming_soon_enabled === 'true' || map.coming_soon_enabled === '1' || map.coming_soon_enabled === true;
                const csObj = isEnabled ? {
                    enabled: true,
                    title: map.coming_soon_title || 'We Are Weaving Something Extraordinary',
                    subtitle: map.coming_soon_subtitle || 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.',
                    launch_date: map.coming_soon_launch_date || '',
                    phone: map.coming_soon_phone || '8667793292',
                    email: map.coming_soon_email || 'vaiyaaree@gmail.com',
                    whatsapp: map.coming_soon_whatsapp || '8667793292',
                    instagram: map.coming_soon_instagram || '',
                    facebook: map.coming_soon_facebook || '',
                    logo: map.shop_logo || '/images/vaiyaaree-logo.png',
                    shop_name: map.shop_name || 'Vaiyaaree Sarees'
                } : null;

                setComingSoonSettings(csObj);
                if (typeof window !== 'undefined') {
                    if (csObj) sessionStorage.setItem('vaiyaaree_coming_soon', JSON.stringify(csObj));
                    else sessionStorage.removeItem('vaiyaaree_coming_soon');
                }
            }
        } catch (e) {
            console.error('Fetch coming soon error:', e);
        }
    };

    //  CART PERSISTENCE 
    useEffect(() => {
        if (!hasMounted || !isCartLoaded) return; // Wait until we've loaded the real cart
        localStorage.setItem('cast_prince_cart', JSON.stringify(cart));

        const syncCart = async () => {
            if (user?.phone) {
                try {
                    const digits = user.phone.replace(/\D/g, '');
                    const primaryPhone = (digits.length === 10) ? '91' + digits : digits;
                    const phoneVariations = [digits];
                    if (digits.length === 10) phoneVariations.push('91' + digits);
                    else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));

                    // Clean existing cross-platform cart entries for this user
                    await mysqlClient.from('whatsapp_cart').delete().in('phone', phoneVariations);

                    // Sync current state explicitly up to DB
                    if (cart.length > 0) {
                        const inserts = cart.map(item => ({
                            phone: primaryPhone,
                            product_id: item.id,
                            product_name: item.name,
                            price: item.price,
                            quantity: item.qty,
                            image_url: item.image_url,
                            variant_id: item.variantId || null,
                            variant_name: item.variantName || null
                        }));
                        await mysqlClient.from('whatsapp_cart').insert(inserts);
                    }
                } catch (err) {
                    console.error('Cart sync error:', err);
                }
            }
        };

        const timer = setTimeout(syncCart, 1000);
        return () => clearTimeout(timer);
    }, [cart, user?.phone, hasMounted, isCartLoaded]);

    // Load cart from DB when user logs in or session is restored
    useEffect(() => {
        if (!hasMounted) return;

        const loadUserCart = async () => {
            if (user?.phone) {
                try {
                    const digits = user.phone.replace(/\D/g, '');
                    const phoneVariations = [digits];
                    if (digits.length === 10) phoneVariations.push('91' + digits);
                    else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));

                    const { data } = await mysqlClient.from('whatsapp_cart').select('*').in('phone', phoneVariations);
                    
                    setCart(prev => {
                        // Standardize DB items
                        const dbCart = (data || []).map(dbItem => ({
                            id: dbItem.product_id,
                            name: dbItem.product_name,
                            price: dbItem.price,
                            qty: dbItem.quantity,
                            image_url: dbItem.image_url,
                            variantId: dbItem.variant_id,
                            variantName: dbItem.variant_name
                        }));
                        
                        // If guest cart items exist in local state, DO NOT wipe them out!
                        // Preserve guest cart items and merge any extra DB items
                        if (prev && prev.length > 0) {
                            const merged = [...prev];
                            dbCart.forEach(dbItem => {
                                const exists = merged.find(m => (dbItem.variantId ? m.variantId === dbItem.variantId : m.id === dbItem.id));
                                if (!exists) {
                                    merged.push(dbItem);
                                }
                            });
                            return merged;
                        }
                        
                        return dbCart;
                    });
                } catch (err) {
                    console.error('Error loading WhatsApp cross-platform cart:', err);
                }
            }
            setIsCartLoaded(true); // Now we are safe to sync back to DB
        };

        loadUserCart();
    }, [user?.phone, hasMounted]);

    // Initial local cart load on mount
    useEffect(() => {
        const saved = localStorage.getItem('cast_prince_cart');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setCart(parsed);
            } catch (e) { }
        }
    }, []);

    async function checkSession() {
        if (typeof window === 'undefined') {
            setIsSessionLoading(false);
            return;
        }
        const storedUser = localStorage.getItem('cast_prince_user');
        if (!storedUser) {
            setIsSessionLoading(false);
            return;
        }

        try {
            const localUser = JSON.parse(storedUser);
            if (!localUser) {
                setIsSessionLoading(false);
                return;
            }

            // If stored user is an admin account, do not load it as a shop customer user
            if (localUser.role === 'admin' || localUser.role === 'Super Admin' || localUser.username || localUser.source === 'db_users' || localUser.source === 'db_settings') {
                localStorage.removeItem('cast_prince_user');
                setUser(null);
                setIsSessionLoading(false);
                return;
            }

            // Robust expiration check
            let loginTime = Date.now();
            if (localUser.login_at) {
                const parsed = typeof localUser.login_at === 'number' 
                    ? localUser.login_at 
                    : new Date(localUser.login_at).getTime();
                if (!isNaN(parsed) && parsed > 0) {
                    loginTime = parsed < 10000000000 ? parsed * 1000 : parsed;
                }
            } else {
                localUser.login_at = Date.now();
                localStorage.setItem('cast_prince_user', JSON.stringify(localUser));
            }

            const diff = Date.now() - loginTime;
            const days = diff / (1000 * 60 * 60 * 24);
            if (days > SESSION_EXPIRY_DAYS) {
                handleLogout();
                setIsSessionLoading(false);
                return;
            }

            // Set local user immediately so UI remains logged in on page refresh
            setUser(localUser);

            // Fetch latest user profile from DB to sync changes if valid ID exists
            if (localUser.id && localUser.id !== 'undefined') {
                try {
                    const { data: dbUser, error: dbError } = await mysqlClient
                        .from('customers')
                        .select('*')
                        .eq('id', localUser.id)
                        .maybeSingle();

                    if (!dbError && dbUser) {
                        const activeUser = { ...localUser, ...dbUser, login_at: localUser.login_at || Date.now() };
                        setUser(activeUser);
                        localStorage.setItem('cast_prince_user', JSON.stringify(activeUser));

                        setCheckoutForm(prev => ({
                            ...prev,
                            billingName: activeUser.name || prev.billingName || '',
                            billingPhone: activeUser.phone ? activeUser.phone.replace(/^91/, '') : (prev.billingPhone || ''),
                            billingWhatsApp: activeUser.phone ? activeUser.phone.replace(/^91/, '') : (prev.billingWhatsApp || ''),
                            billingEmail: activeUser.email || prev.billingEmail || '',
                            billingAddress: activeUser.address || prev.billingAddress || '',
                            billingCity: activeUser.city || prev.billingCity || '',
                            billingState: activeUser.state || prev.billingState || 'Tamil Nadu',
                            billingPincode: activeUser.pincode || prev.billingPincode || '',
                            shippingName: activeUser.name || prev.shippingName || '',
                            shippingPhone: activeUser.phone ? activeUser.phone.replace(/^91/, '') : (prev.shippingPhone || '')
                        }));
                    }
                } catch (dbErr) {
                    console.warn('[SESSION] Could not refresh customer profile from DB, retaining local session:', dbErr);
                }
            }
        } catch (error) {
            console.error('[SESSION] Error parsing stored user session:', error);
            localStorage.removeItem('cast_prince_user');
            setUser(null);
        } finally {
            setIsSessionLoading(false);
        }
    }

    // Auto-sync checkout form whenever logged in user profile updates
    useEffect(() => {
        if (user && user.id) {
            setCheckoutForm(prev => ({
                ...prev,
                billingName: user.name || prev.billingName || '',
                billingPhone: user.phone ? user.phone.replace(/^91/, '') : (prev.billingPhone || ''),
                billingWhatsApp: user.phone ? user.phone.replace(/^91/, '') : (prev.billingWhatsApp || ''),
                billingEmail: user.email || prev.billingEmail || '',
                billingAddress: user.address || prev.billingAddress || '',
                billingCity: user.city || prev.billingCity || '',
                billingState: user.state || prev.billingState || 'Tamil Nadu',
                billingPincode: user.pincode || prev.billingPincode || '',
                shippingName: user.name || prev.shippingName || '',
                shippingPhone: user.phone ? user.phone.replace(/^91/, '') : (prev.shippingPhone || '')
            }));
        }
    }, [user]);

    async function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cast_prince_user');
            localStorage.removeItem('cast_prince_cart');
        }
        setUser(null);
        setCart([]);
        setIsCartLoaded(true);
        setCheckoutForm({
            billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingPincode: '', billingEmail: '', billingWhatsApp: '',
            shippingName: '', shippingPhone: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingPincode: '', shippingEmail: '',
            sameAsBilling: true, paymentMethod: 'COD'
        });
        showToast('Logged out successfully');
    }

    //fetch shop products from mysql
    async function fetchProducts() {
        setLoading(true);
        try {
            const { data } = await mysqlClient
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (data) setProducts(data);
        } catch (err) {
            console.error('Fetch Error:', err);
            showToast('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchShippingRates() {
        try {
            const { data: zones } = await mysqlClient.from('shipping_zones').select('*');
            const { data: mappings } = await mysqlClient.from('shipping_zone_states').select('*');
            if (zones) setShippingZones(zones);
            if (mappings) setZoneMappings(mappings);
        } catch (err) {
            console.error('Shipping Rates Fetch Error:', err);
        }
    }

    async function fetchBusinessState() {
        const { data } = await mysqlClient.from('app_settings').select('value').eq('key', 'business_state').single();
        if (data) setBusinessState(data.value);
    }

    function showToast(message, type = 'success') {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }

    const [isCartOpen, setIsCartOpen] = useState(false);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen(prev => !prev);

    function addToCart(product, variant = null, quantity = 1) {
        const itemStock = variant ? (variant.stock ?? 0) : (product.stock ?? 0);
        if (itemStock <= 0) {
            showToast('Saree Not Available (Out of Stock)', 'error');
            return;
        }
        if (itemStock < quantity) {
            showToast(`Saree Not Available in requested quantity. Only ${itemStock} in stock.`, 'error');
            return;
        }

        let isBlocked = false;
        setCart(prev => {
            const existing = prev.find(i => (variant ? i.variantId === variant.id : i.id === product.id));
            if (existing) {
                const totalRequested = existing.qty + quantity;
                if (totalRequested > itemStock) {
                    showToast(`Saree Not Available for higher quantity. Maximum ${itemStock} in stock.`, 'error');
                    isBlocked = true;
                    return prev;
                }
                return prev.map(i => (variant ? i.variantId === variant.id : i.id === product.id) ? { ...i, qty: totalRequested, stock: itemStock } : i);
            }

            const newEntry = {
                ...product,
                price: variant ? variant.price : product.price,
                compare_price: variant ? (variant.compare_price || variant.original_price) : (product.compare_price || product.original_price),
                image_url: (variant && variant.image_url) ? variant.image_url : product.image_url,
                qty: quantity,
                stock: itemStock,
                variantId: variant?.id,
                variantName: variant?.name,
                variantSku: variant?.sku
            };
            return [...prev, newEntry];
        });

        if (!isBlocked) {
            setIsCartOpen(true);
            showToast(` ${quantity}x ${product.name}${variant ? ` (${variant.name})` : ''} added to cart!`);
        }
    }

    function updateQty(index, delta) {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            if (!item) return prev;

            const itemStock = item.stock !== undefined && item.stock !== null ? item.stock : 999;
            const targetQty = item.qty + delta;

            if (delta > 0 && targetQty > itemStock) {
                showToast(`Saree Not Available for higher quantity. Maximum ${itemStock} in stock.`, 'error');
                return prev;
            }

            const updatedItem = { ...item, qty: Math.max(0, targetQty) };

            if (updatedItem.qty > 0) {
                newCart[index] = updatedItem;
                return newCart;
            } else {
                return newCart.filter((_, i) => i !== index);
            }
        });
    }

    function removeFromCart(index) {
        setCart(prev => prev.filter((_, i) => i !== index));
    }

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);

    // Sync discounts whenever cart, coupon, or user changes
    useEffect(() => {
        async function syncDiscounts() {
            if (!cart || cart.length === 0) {
                setDiscountData({
                    subtotal: 0,
                    productDiscount: 0,
                    cartDiscount: 0,
                    couponDiscount: 0,
                    shippingDiscount: 0,
                    totalDiscount: 0,
                    discountedItems: [],
                    appliedRules: []
                });
                return;
            }

            try {
                const res = await calculateDiscounts({
                    cartItems: cart,
                    couponCode: appliedCoupon?.couponCode || null,
                    customer: user || null
                });
                setDiscountData(res || {
                    subtotal: cartTotal,
                    productDiscount: 0,
                    cartDiscount: 0,
                    couponDiscount: 0,
                    shippingDiscount: 0,
                    totalDiscount: 0,
                    discountedItems: [],
                    appliedRules: []
                });
            } catch (err) {
                console.error('Error calculating storewide discounts:', err);
            }
        }
        syncDiscounts();
    }, [cart, appliedCoupon, user]);

    const taxDetails = useMemo(() => {
        const subtotal = cartTotal;
        const totalDiscount = discountData?.totalDiscount || 0;
        const taxableSubtotal = Math.max(0, subtotal - totalDiscount);
        let cgst = 0, sgst = 0, igst = 0;
        
        // Helper to check if a shipping zone is international regardless of MySQL data type (boolean vs number vs string)
        const isZoneIntl = (z) => {
            if (!z) return false;
            return z.is_international === true || z.is_international === 1 || z.is_international === '1' || String(z.is_international).toLowerCase() === 'true';
        };

        const rawShippingCountry = checkoutForm.sameAsBilling ? (checkoutForm.billingCountry ?? 'India') : (checkoutForm.shippingCountry ?? 'India');
        const shippingCountry = String(rawShippingCountry || 'India').trim() || 'India';
        const isInternational = shippingCountry.toLowerCase() !== 'india' && shippingCountry.toLowerCase() !== 'in';
        const shippingState = checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState;
        const shippingCity = checkoutForm.sameAsBilling ? checkoutForm.billingCity : checkoutForm.shippingCity;
        
        // Calculate tax based on location & post-discount taxable amount
        const normalizedFormState = (shippingState || '').trim().toLowerCase();
        const normalizedBizState = (businessState || 'Tamil Nadu').trim().toLowerCase();
        
        if (isInternational) {
            igst = Math.round(taxableSubtotal * 0.05);
        } else if (normalizedFormState === normalizedBizState) {
            cgst = Math.round(taxableSubtotal * 0.025);
            sgst = Math.round(taxableSubtotal * 0.025);
        } else {
            igst = Math.round(taxableSubtotal * 0.05);
        }

        let shipping = 0;
        let activeZone = null;
        
        if (isInternational) {
            const intlZones = shippingZones.filter(z => isZoneIntl(z));
            const intlZoneIds = new Set(intlZones.map(z => z.id));

            // Try matching specific country mapping first
            const countryMapping = zoneMappings.find(m => 
                intlZoneIds.has(m.zone_id) &&
                m.state_name?.trim().toLowerCase() === shippingCountry.trim().toLowerCase()
            );

            if (countryMapping) {
                activeZone = intlZones.find(z => z.id === countryMapping.zone_id) || null;
            }
            if (!activeZone) {
                activeZone = intlZones[0] || null;
            }
        } else {
            const domesticZones = shippingZones.filter(z => !isZoneIntl(z));
            const domesticZoneIds = new Set(domesticZones.map(z => z.id));

            const districtMapping = zoneMappings.find(m => 
                domesticZoneIds.has(m.zone_id) &&
                m.state_name === shippingState && 
                m.district_name?.toLowerCase() === (shippingCity || '').trim().toLowerCase()
            );

            if (districtMapping) {
                activeZone = domesticZones.find(z => z.id === districtMapping.zone_id);
            } else {
                const stateMapping = zoneMappings.find(m => domesticZoneIds.has(m.zone_id) && m.state_name === shippingState && !m.district_name);
                if (stateMapping) {
                    activeZone = domesticZones.find(z => z.id === stateMapping.zone_id);
                } else {
                    activeZone = domesticZones[0] || null;
                }
            }
        }

        if (activeZone) {
            const rate = parseFloat(activeZone.rate || 0);
            const threshold = parseFloat(activeZone.free_threshold || 0);
            if (threshold > 0 && taxableSubtotal >= threshold) {
                shipping = 0;
            } else {
                shipping = rate;
            }
        } else {
            shipping = isInternational ? 1500 : 100;
        }

        // Apply Free Shipping discount rules or shipping discount if active
        const hasFreeShippingRule = (discountData?.appliedRules || []).some(r => r.discountType === 'FREE_SHIPPING');
        if (hasFreeShippingRule || (discountData?.shippingDiscount > 0)) {
            shipping = 0;
        }

        const totalOrder = taxableSubtotal + cgst + sgst + igst + shipping;
        return { cgst, sgst, igst, shipping, totalOrder, activeZone, isInternational, totalDiscount, taxableSubtotal };
    }, [cartTotal, discountData, checkoutForm.billingState, checkoutForm.shippingState, checkoutForm.billingCity, checkoutForm.shippingCity, checkoutForm.billingCountry, checkoutForm.shippingCountry, checkoutForm.sameAsBilling, businessState, shippingZones, zoneMappings]);

    async function placeOrder() {
        const shippingState = checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState;
        const shippingCity = checkoutForm.sameAsBilling ? checkoutForm.billingCity : checkoutForm.shippingCity;
        const shippingAddress = checkoutForm.sameAsBilling ? checkoutForm.billingAddress : checkoutForm.shippingAddress;
        const shippingPincode = checkoutForm.sameAsBilling ? checkoutForm.billingPincode : checkoutForm.shippingPincode;
        const shippingName = checkoutForm.sameAsBilling ? checkoutForm.billingName : checkoutForm.shippingName;
        const shippingPhone = checkoutForm.sameAsBilling ? checkoutForm.billingPhone : checkoutForm.shippingPhone;
        const shippingEmail = checkoutForm.sameAsBilling ? checkoutForm.billingEmail : checkoutForm.shippingEmail;

        const rawBillingCountry = checkoutForm.billingCountry ?? 'India';
        const rawShippingCountry = checkoutForm.sameAsBilling 
            ? (checkoutForm.billingCountry ?? 'India') 
            : (checkoutForm.shippingCountry ?? 'India');

        const billingCountry = String(rawBillingCountry || 'India').trim() || 'India';
        const shippingCountry = String(rawShippingCountry || 'India').trim() || 'India';

        if (!checkoutForm.billingName || !checkoutForm.billingPhone || !checkoutForm.billingAddress) {
            showToast('Please fill all required billing fields', 'error');
            return;
        }

        if (!checkoutForm.sameAsBilling && (!shippingName || !shippingPhone || !shippingAddress)) {
            showToast('Please fill all required shipping fields', 'error');
            return;
        }

        try {
            const cleanDigits = checkoutForm.billingPhone.replace(/\D/g, '').slice(-10);
            const fullPhone = `91${cleanDigits}`;
            
            // Build full addresses
            const fullBillingAddress = `${checkoutForm.billingAddress}, ${checkoutForm.billingCity} - ${checkoutForm.billingPincode} (${checkoutForm.billingState}, ${billingCountry})`.trim();
            const fullShippingAddress = `${shippingAddress}, ${shippingCity} - ${shippingPincode} (${shippingState}, ${shippingCountry})`.trim();

            // Create billing/shipping JSON objects with correct dynamic countries
            const billingAddressObj = {
                name: checkoutForm.billingName,
                phone: checkoutForm.billingPhone,
                email: checkoutForm.billingEmail || null,
                address: checkoutForm.billingAddress,
                city: checkoutForm.billingCity,
                state: checkoutForm.billingState,
                pincode: checkoutForm.billingPincode,
                country: billingCountry
            };
            
            const shippingAddressObj = {
                name: shippingName,
                phone: shippingPhone,
                email: shippingEmail || null,
                address: shippingAddress,
                city: shippingCity,
                state: shippingState,
                pincode: shippingPincode,
                country: shippingCountry
            };

            // GUEST CHECKOUT / AUTO-ACCOUNT CREATION LOGIC
            const userPhoneDigits = user?.phone ? user.phone.replace(/\D/g, '') : '';
            const checkoutPhoneDigits = fullPhone.replace(/\D/g, '');
            const isUserValidCustomer = user?.id && 
                user.role !== 'admin' && 
                user.role !== 'Super Admin' && 
                !user.username &&
                (userPhoneDigits === checkoutPhoneDigits || (userPhoneDigits.length === 10 && '91' + userPhoneDigits === checkoutPhoneDigits) || ('91' + userPhoneDigits === checkoutPhoneDigits));

            let customerId = isUserValidCustomer ? user.id : null;
            let currentCustomer = isUserValidCustomer ? user : null;

            if (!customerId) {
                // Check if customer exists by phone
                const { data: existingCustomer } = await mysqlClient
                    .from('customers')
                    .select('*')
                    .eq('phone', fullPhone)
                    .single();

                if (existingCustomer) {
                    if (checkoutForm.billingName && existingCustomer.name !== checkoutForm.billingName) {
                        const { data: updatedExisting } = await mysqlClient
                            .from('customers')
                            .update({
                                name: checkoutForm.billingName,
                                email: checkoutForm.billingEmail || existingCustomer.email,
                                address: fullBillingAddress,
                                city: checkoutForm.billingCity,
                                state: checkoutForm.billingState
                            })
                            .eq('id', existingCustomer.id)
                            .select()
                            .single();
                        currentCustomer = updatedExisting || existingCustomer;
                    } else {
                        currentCustomer = existingCustomer;
                    }
                    customerId = currentCustomer.id;
                } else {
                    // Create new customer
                    const { data: newCustomer, error: createError } = await mysqlClient
                        .from('customers')
                        .insert({
                            phone: fullPhone,
                            name: checkoutForm.billingName,
                            email: checkoutForm.billingEmail || null,
                            address: fullBillingAddress,
                            city: checkoutForm.billingCity,
                            state: checkoutForm.billingState,
                            role: 'user',
                            is_verified: false
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    customerId = newCustomer.id;
                    currentCustomer = newCustomer;
                }

                // Log the guest / newly created customer in locally so they see their correct profile immediately
                setUser(currentCustomer);
                localStorage.setItem('cast_prince_user', JSON.stringify(currentCustomer));
            } else {
                // User is logged in as valid customer: sync customer profile with latest billing details
                try {
                    const { data: updatedUser } = await mysqlClient.from('customers').update({
                        name: checkoutForm.billingName || user.name,
                        email: checkoutForm.billingEmail || user.email,
                        phone: checkoutForm.billingPhone || user.phone,
                        address: checkoutForm.shippingAddress || checkoutForm.billingAddress,
                        city: checkoutForm.shippingCity || checkoutForm.billingCity,
                        state: checkoutForm.shippingState || checkoutForm.billingState,
                        pincode: checkoutForm.shippingPincode || checkoutForm.billingPincode,
                        metadata: {
                            ...(user.metadata || {}),
                            last_billing_address: billingAddressObj,
                            last_shipping_address: shippingAddressObj
                        }
                    }).eq('id', user.id).select().single();
                    if (updatedUser) {
                        setUser(updatedUser);
                        localStorage.setItem('cast_prince_user', JSON.stringify(updatedUser));
                    }
                } catch (syncErr) {
                    console.error('[PROFILE-SYNC] Failed to update customer profile:', syncErr);
                }
            }

            // --- SECURE SERVER-SIDE ORDER CREATION ---
            // We call API route to generate sequential orderId and save order atomically
            const orderPayload = {
                prefix: 'WEB',
                customerId,
                customerPhone: fullPhone,
                customerName: checkoutForm.billingName,
                customerEmail: checkoutForm.billingEmail,
                shippingAddress: shippingAddressObj,
                billingAddress: billingAddressObj,
                paymentMethod: checkoutForm.paymentMethod,
                cart: cart,
                shippingCost: taxDetails.shipping,
                shippingZoneId: taxDetails.activeZone?.id,
                shippingState: checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState,
                shippingCountry: shippingCountry,
                couponCode: appliedCoupon?.couponCode || null
            };

            const createRes = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            const createData = await createRes.json();
            if (!createRes.ok) {
                throw new Error(createData.error || 'Failed to secure your order. Please try again.');
            }

            const assignedOrderId = createData.orderId;

            const finalOrderData = {
                orderId: assignedOrderId,
                billingName: checkoutForm.billingName,
                billingPhone: checkoutForm.billingPhone,
                customerName: checkoutForm.billingName,
                total: taxDetails.totalOrder,
                subtotal: taxDetails.subtotal || (taxDetails.totalOrder - taxDetails.shipping - ((taxDetails.cgst || 0) + (taxDetails.sgst || 0) + (taxDetails.igst || 0))),
                cgst: taxDetails.cgst,
                sgst: taxDetails.sgst,
                igst: taxDetails.igst,
                shipping: taxDetails.shipping
            };

            setCart([]);
            setCheckoutForm({
                billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingPincode: '', billingEmail: '', billingWhatsApp: '',
                shippingName: '', shippingPhone: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingPincode: '', shippingEmail: '',
                sameAsBilling: true, paymentMethod: 'COD'
            });
            showToast('Order Placed Successfully!', 'success');

            // Trigger Email Notification automatically
            try {
                fetch('/api/orders/resend-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: assignedOrderId })
                });
            } catch (emailErr) {
                console.error('Failed to trigger order confirmation email:', emailErr);
            }

            // Trigger WhatsApp Notification automatically for ALL orders
            try {
                fetch('/api/orders/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        orderId: assignedOrderId,
                        phone: checkoutForm.billingWhatsApp || checkoutForm.billingPhone
                    })
                });
            } catch (notifyErr) {
                console.error('Failed to trigger WhatsApp notification:', notifyErr);
            }

            return finalOrderData;

        } catch (err) {
            console.error(err);
            showToast('Order failed. Please try again.', 'error');
            throw err;
        }
    }

    const applyCoupon = async (code) => {
        setCouponError(null);
        setCouponMessage(null);
        if (!code || !code.trim()) {
            setCouponError('Please enter a coupon code.');
            return false;
        }

        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    couponCode: code,
                    subtotal: cartTotal,
                    cartItems: cart,
                    customer: user
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setCouponError(data.message || 'Invalid coupon code.');
                return false;
            }

            setAppliedCoupon({
                couponCode: data.couponCode,
                rule: data.rule,
                couponDiscount: data.couponDiscount,
                calculation: data.calculation
            });
            setCouponMessage(data.message);
            showToast(data.message, 'success');
            return true;
        } catch (err) {
            setCouponError(err.message || 'Error applying coupon');
            return false;
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponMessage(null);
        setCouponError(null);
        showToast('Coupon removed', 'info');
    };

    return (
        <ShopContext.Provider value={{
            products, cart, loading, user, setUser, isSessionLoading, shippingZones, zoneMappings, businessState,
            checkoutForm, setCheckoutForm, addToCart, removeFromCart, updateQty,
            handleLogout, showToast, toast, cartTotal, cartCount, taxDetails, discountData, mysqlClient, placeOrder,
            isCartOpen, setIsCartOpen, openCart, closeCart, toggleCart,
            comingSoonSettings, setComingSoonSettings, fetchComingSoon,
            appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon,
            dbCategories, fetchDbCategories
        }}>
            {children}
        </ShopContext.Provider>
    );
}

export const useShop = () => {
    const context = useContext(ShopContext);
    if (!context || typeof context.openCart !== 'function') {
        return defaultContextValue;
    }
    return context;
};
