'use client';

import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { calculateDiscounts } from '@/services/discountService';
import { sanitizeCustomerSession } from '@/lib/authSanitizer';

const defaultContextValue = {
    products: [], cart: [], loading: false, user: null, setUser: () => { }, isSessionLoading: true,
    shippingZones: [], zoneMappings: [], businessState: 'Tamil Nadu', fetchShippingRates: async () => {},
    checkoutForm: { 
        billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingCountry: 'India', billingPincode: '', billingEmail: '', billingWhatsApp: '',
        shippingName: '', shippingPhone: '', shippingWhatsApp: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingCountry: 'India', shippingPincode: '', shippingEmail: '',
        sameAsBilling: true, paymentMethod: 'COD' 
    },
    setCheckoutForm: () => { }, addToCart: () => { }, removeFromCart: () => { }, updateQty: () => { },
    handleLogout: () => { }, showToast: () => { }, toast: { show: false, message: '', type: 'success' },
    cartTotal: 0, cartCount: 0, taxDetails: { cgst: 0, sgst: 0, igst: 0, shipping: 0, totalOrder: 0 },
    mysqlClient: null, placeOrder: () => { }, clearCartAfterSuccess: () => { },
    isCartOpen: false, setIsCartOpen: () => { }, openCart: () => { }, closeCart: () => { }, toggleCart: () => { },
    comingSoonSettings: null, setComingSoonSettings: () => { }, fetchComingSoon: () => { },
    activeDiscountRules: [], getEffectiveProductPrice: () => ({ originalPrice: 0, discountedPrice: 0, discountPercent: 0, discountAmount: 0, activeRule: null, hasDiscount: false }),
    appliedCoupon: null, couponMessage: null, couponError: null, applyCoupon: async () => false, removeCoupon: () => { }, discountData: null,
    hasMounted: false, isCartLoaded: false,
    communicationChannel: 'whatsapp',
    isEmailOnly: false,
    isWhatsAppOnly: true,
    isHybridChannel: false,
    waChatbotEnabled: true,
    supportEmail: 'vaiyaaree@gmail.com',
    supportPhone: '918667793292',
    fetchCommunicationSettings: () => { }
};

const ShopContext = createContext(defaultContextValue);
const SESSION_EXPIRY_DAYS = 7; // Auto-logout after 7 days


export function ShopProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const [shippingZones, setShippingZones] = useState([
        { id: 'intl_default', name: 'International Standard', rate: 100, free_threshold: 10000, is_international: 1 },
        { id: 'dom_default', name: 'Domestic Group', rate: 50, free_threshold: 2005, is_international: 0 }
    ]);
    const [zoneMappings, setZoneMappings] = useState([]);
    const [businessState, setBusinessState] = useState('Tamil Nadu');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasMounted, setHasMounted] = useState(false);
    const [isCartLoaded, setIsCartLoaded] = useState(false); // Guard for DB sync
    const isCartHydratedRef = useRef(false);
    const [appliedCoupon, setAppliedCoupon] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('vaiyaaree_applied_coupon');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return null;
    });
    const [couponMessage, setCouponMessage] = useState(null);
    const [couponError, setCouponError] = useState(null);
    const [discountData, setDiscountData] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('vaiyaaree_applied_coupon');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.calculation) return parsed.calculation;
                }
            } catch (e) {}
        }
        return {
            subtotal: 0,
            productDiscount: 0,
            cartDiscount: 0,
            couponDiscount: 0,
            shippingDiscount: 0,
            totalDiscount: 0,
            discountedItems: [],
            appliedRules: []
        };
    });

    // Hydrate applied coupon from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('vaiyaaree_applied_coupon');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.couponCode) {
                        setAppliedCoupon(parsed);
                        if (parsed.calculation) {
                            setDiscountData(parsed.calculation);
                        }
                    }
                }
            } catch (e) {}
        }
    }, []);
    const [comingSoonSettings, setComingSoonSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('vaiyaaree_coming_soon');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return null;
    });

    const [communicationChannel, setCommunicationChannel] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('vaiyaaree_communication_channel') || 'whatsapp';
        }
        return 'whatsapp';
    });

    const isEmailOnly = communicationChannel === 'email';
    const isWhatsAppOnly = communicationChannel === 'whatsapp';
    const isHybridChannel = communicationChannel === 'both';

    const [waChatbotEnabled, setWaChatbotEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('vaiyaaree_wa_chatbot_enabled');
            if (cached !== null) return cached !== 'false' && cached !== '0';
        }
        return true;
    });

    const [supportEmail, setSupportEmail] = useState('vaiyaaree@gmail.com');
    const [supportPhone, setSupportPhone] = useState('918667793292');

    const [checkoutForm, setCheckoutForm] = useState(() => {
        const defaultForm = {
            billingName: '',
            billingCountryCode: '+91',
            billingPhone: '',
            billingWhatsApp: '',
            billingEmail: '',
            billingAddress: '',
            billingCity: '',
            billingState: 'Tamil Nadu',
            billingCountry: 'India',
            billingPincode: '',
            shippingName: '',
            shippingPhone: '',
            shippingWhatsApp: '',
            shippingAddress: '',
            shippingCity: '',
            shippingState: 'Tamil Nadu',
            shippingCountry: 'India',
            shippingPincode: '',
            shippingEmail: '',
            sameAsBilling: true,
            paymentMethod: 'COD'
        };
        if (typeof window !== 'undefined') {
            try {
                const saved = sessionStorage.getItem('vaiyaaree_checkout_form') || localStorage.getItem('vaiyaaree_checkout_form');
                let parsed = null;
                if (saved) {
                    try { parsed = JSON.parse(saved); } catch (e) {}
                }
                const savedLast = localStorage.getItem('vaiyaaree_last_billing_address');
                let parsedLast = null;
                if (savedLast) {
                    try { parsedLast = JSON.parse(savedLast); } catch (e) {}
                }

                const merged = { ...defaultForm, ...(parsedLast || {}), ...(parsed || {}) };
                if ((!merged.billingAddress || !merged.billingAddress.trim()) && parsedLast?.billingAddress) {
                    merged.billingAddress = parsedLast.billingAddress;
                    merged.billingCity = parsedLast.billingCity || merged.billingCity;
                    merged.billingState = parsedLast.billingState || merged.billingState;
                    merged.billingPincode = parsedLast.billingPincode || merged.billingPincode;
                    merged.billingCountry = parsedLast.billingCountry || merged.billingCountry;
                    merged.billingName = parsedLast.billingName || merged.billingName;
                    merged.billingPhone = parsedLast.billingPhone || merged.billingPhone;
                    merged.billingWhatsApp = parsedLast.billingWhatsApp || merged.billingWhatsApp;
                    merged.shippingAddress = parsedLast.shippingAddress || merged.shippingAddress;
                    merged.shippingCity = parsedLast.shippingCity || merged.shippingCity;
                    merged.shippingState = parsedLast.shippingState || merged.shippingState;
                    merged.shippingPincode = parsedLast.shippingPincode || merged.shippingPincode;
                    merged.shippingCountry = parsedLast.shippingCountry || merged.shippingCountry;
                }
                return merged;
            } catch (e) {}
        }
        return defaultForm;
    });

    // Persist checkoutForm to sessionStorage and localStorage to survive page refresh
    useEffect(() => {
        if (!hasMounted || !isCartHydratedRef.current || typeof window === 'undefined') return;
        try {
            sessionStorage.setItem('vaiyaaree_checkout_form', JSON.stringify(checkoutForm));
            localStorage.setItem('vaiyaaree_checkout_form', JSON.stringify(checkoutForm));
        } catch (e) {}
    }, [checkoutForm, hasMounted]);

    const [dbCategories, setDbCategories] = useState([]);
    const [activeDiscountRules, setActiveDiscountRules] = useState([]);

    const fetchActiveDiscountRules = async () => {
        try {
            const res = await fetch('/api/discounts/active');
            const data = await res.json();
            if (data.success && Array.isArray(data.rules)) {
                setActiveDiscountRules(data.rules);
            }
        } catch (err) {
            console.error('[SHOP CONTEXT] Fetch active discount rules error:', err);
        }
    };

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

    // Helper: calculate effective price & active discount rules for any product/variant
    const getEffectiveProductPrice = (product, selectedVariant = null) => {
        if (!product) {
            return { originalPrice: 0, comparePrice: 0, discountedPrice: 0, discountPercent: 0, discountAmount: 0, activeRule: null, hasDiscount: false };
        }

        const basePrice = selectedVariant?.price !== undefined && selectedVariant?.price !== null
            ? Number(selectedVariant.price)
            : Number(product.price || 0);

        if (basePrice <= 0) {
            return { originalPrice: basePrice, comparePrice: basePrice, discountedPrice: basePrice, discountPercent: 0, discountAmount: 0, activeRule: null, hasDiscount: false };
        }

        // Tag MRP or compare price
        const tagList = Array.isArray(product.tags)
            ? product.tags
            : (typeof product.tags === 'string' ? product.tags.split(',') : []);
        const mrpTag = tagList.map(t => String(t).trim()).find(t => t.toLowerCase().startsWith('mrp:'));
        const comparePrice = selectedVariant?.compare_price || selectedVariant?.original_price || (mrpTag ? Number(mrpTag.split(':')[1]) : (product.compare_price || product.original_price || product.mrp));
        const mrpPrice = comparePrice && !isNaN(comparePrice) && Number(comparePrice) > basePrice ? Number(comparePrice) : null;

        // Check active automatic discount rules
        const prodCategory = (product.category || '').trim().toLowerCase();
        const prodId = String(product.id || '');

        let matchedRule = null;
        let calculatedDiscount = 0;

        // Filter active product-basis rules with no coupon code required
        const eligibleRules = (activeDiscountRules || []).filter(r => {
            if (r.calculation_basis && r.calculation_basis !== 'PRODUCT') return false;
            if (r.coupon_code && r.coupon_code.trim()) return false;
            
            // Check scope
            const targetType = r.target_type || 'ALL_PRODUCTS';
            if (targetType === 'ALL_PRODUCTS') return true;
            if (targetType === 'SPECIFIC_CATEGORIES') {
                const cats = (r.categories || []).map(c => String(c).trim().toLowerCase());
                return cats.includes(prodCategory);
            }
            if (targetType === 'SPECIFIC_PRODUCTS') {
                const pids = (r.product_ids || []).map(id => String(id));
                return pids.includes(prodId);
            }
            return false;
        });

        // Pick the best discount rule
        for (const rule of eligibleRules) {
            if (rule.minimum_cart_products_enabled) continue;

            let discount = 0;
            if (rule.discount_type === 'PERCENTAGE') {
                discount = (basePrice * Number(rule.discount_value || 0)) / 100;
            } else if (rule.discount_type === 'FIXED_AMOUNT' || rule.discount_type === 'FIXED') {
                discount = Math.min(basePrice, Number(rule.discount_value || 0));
            }

            if (discount > calculatedDiscount) {
                calculatedDiscount = discount;
                matchedRule = rule;
            }
        }

        if (calculatedDiscount > 0 && matchedRule) {
            const finalPrice = Math.max(0, Math.round(basePrice - calculatedDiscount));
            const percent = Math.round((calculatedDiscount / basePrice) * 100);
            return {
                originalPrice: basePrice,
                comparePrice: mrpPrice || basePrice,
                discountedPrice: finalPrice,
                discountPercent: percent,
                discountAmount: calculatedDiscount,
                activeRule: matchedRule,
                hasDiscount: true
            };
        }

        // If no automatic promotion matched, fallback to MRP comparison if available
        if (mrpPrice && mrpPrice > basePrice) {
            const mrpDiscount = mrpPrice - basePrice;
            const mrpPercent = Math.round((mrpDiscount / mrpPrice) * 100);
            return {
                originalPrice: mrpPrice,
                comparePrice: mrpPrice,
                discountedPrice: basePrice,
                discountPercent: mrpPercent,
                discountAmount: mrpDiscount,
                activeRule: null,
                hasDiscount: true
            };
        }

        return {
            originalPrice: basePrice,
            comparePrice: basePrice,
            discountedPrice: basePrice,
            discountPercent: 0,
            discountAmount: 0,
            activeRule: null,
            hasDiscount: false
        };
    };

    //  EFFECTS 
    useEffect(() => {
        // 1. Synchronously hydrate cart from localStorage on mount before any save can trigger
        if (typeof window !== 'undefined') {
            try {
                const savedCart = localStorage.getItem('vaiyaaree_cart') || localStorage.getItem('cast_prince_cart');
                if (savedCart) {
                    const parsed = JSON.parse(savedCart);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCart(parsed);
                    }
                }
            } catch (e) {
                console.error('[CART HYDRATION ERROR]', e);
            }

            // 2. Synchronously hydrate checkoutForm from storage on mount
            try {
                const savedForm = sessionStorage.getItem('vaiyaaree_checkout_form') || localStorage.getItem('vaiyaaree_checkout_form');
                let parsed = null;
                if (savedForm) {
                    try { parsed = JSON.parse(savedForm); } catch (e) {}
                }
                const savedLast = localStorage.getItem('vaiyaaree_last_billing_address');
                let parsedLast = null;
                if (savedLast) {
                    try { parsedLast = JSON.parse(savedLast); } catch (e) {}
                }
                const merged = { ...(parsedLast || {}), ...(parsed || {}) };
                if ((!merged.billingAddress || !merged.billingAddress.trim()) && parsedLast?.billingAddress) {
                    merged.billingAddress = parsedLast.billingAddress;
                    merged.billingCity = parsedLast.billingCity || merged.billingCity;
                    merged.billingState = parsedLast.billingState || merged.billingState;
                    merged.billingPincode = parsedLast.billingPincode || merged.billingPincode;
                    merged.billingCountry = parsedLast.billingCountry || merged.billingCountry;
                    merged.billingName = parsedLast.billingName || merged.billingName;
                    merged.billingPhone = parsedLast.billingPhone || merged.billingPhone;
                    merged.billingWhatsApp = parsedLast.billingWhatsApp || merged.billingWhatsApp;
                    merged.shippingAddress = parsedLast.shippingAddress || merged.shippingAddress;
                    merged.shippingCity = parsedLast.shippingCity || merged.shippingCity;
                    merged.shippingState = parsedLast.shippingState || merged.shippingState;
                    merged.shippingPincode = parsedLast.shippingPincode || merged.shippingPincode;
                    merged.shippingCountry = parsedLast.shippingCountry || merged.shippingCountry;
                }
                if (merged && Object.keys(merged).length > 0) {
                    setCheckoutForm(prev => ({ ...prev, ...merged }));
                }
            } catch (e) {
                console.error('[CHECKOUT HYDRATION ERROR]', e);
            }
        }

        isCartHydratedRef.current = true;
        setHasMounted(true);
        setIsCartLoaded(true);

        // Execute initial data fetches concurrently for fast startup performance
        Promise.all([
            fetchProducts(),
            fetchBusinessState(),
            fetchShippingRates(),
            checkSession(),
            fetchComingSoon(),
            fetchCommunicationSettings(),
            fetchDbCategories(),
            fetchActiveDiscountRules()
        ]).catch(err => console.error('[APP INIT] Startup fetch error:', err));

        // Listen for live settings updates from Admin or other tabs
        const handleShippingUpdated = () => {
            fetchShippingRates();
        };
        const handleSettingsUpdated = () => {
            fetchComingSoon();
            fetchCommunicationSettings();
        };
        const handleStorageChange = (e) => {
            if (e.key === 'vaiyaaree_shipping_updated') {
                fetchShippingRates();
            }
            if (e.key === 'vaiyaaree_communication_channel' || e.key === 'vaiyaaree_wa_chatbot_enabled') {
                fetchCommunicationSettings();
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('vaiyaaree_shipping_updated', handleShippingUpdated);
            window.addEventListener('vaiyaaree_settings_updated', handleSettingsUpdated);
            window.addEventListener('storage', handleStorageChange);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('vaiyaaree_shipping_updated', handleShippingUpdated);
                window.removeEventListener('vaiyaaree_settings_updated', handleSettingsUpdated);
                window.removeEventListener('storage', handleStorageChange);
            }
        };
    }, []);

    const fetchCommunicationSettings = async () => {
        try {
            const { data } = await mysqlClient
                .from('app_settings')
                .select('key, value')
                .in('key', ['communication_channel', 'wa_chatbot_enabled', 'support_email', 'support_phone']);
            
            if (data && data.length > 0) {
                const map = {};
                data.forEach(item => { map[item.key] = item.value; });
                if (map.communication_channel) {
                    setCommunicationChannel(map.communication_channel);
                    if (typeof window !== 'undefined') localStorage.setItem('vaiyaaree_communication_channel', map.communication_channel);
                }
                if (map.wa_chatbot_enabled !== undefined) {
                    const enabled = map.wa_chatbot_enabled !== 'false' && map.wa_chatbot_enabled !== '0';
                    setWaChatbotEnabled(enabled);
                    if (typeof window !== 'undefined') localStorage.setItem('vaiyaaree_wa_chatbot_enabled', map.wa_chatbot_enabled);
                }
                if (map.support_email) setSupportEmail(map.support_email);
                if (map.support_phone) setSupportPhone(map.support_phone);
            }
        } catch (e) {
            console.error('Fetch communication settings error:', e);
        }
    };

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
        if (!hasMounted || !isCartHydratedRef.current) return;
        try {
            localStorage.setItem('vaiyaaree_cart', JSON.stringify(cart));
            localStorage.setItem('cast_prince_cart', JSON.stringify(cart));
        } catch (e) {}

        const syncCart = async () => {
            if (!isCartLoaded || !isCartHydratedRef.current) return;
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

    // Merge cart from DB when user logs in or session is restored
    useEffect(() => {
        if (!hasMounted || !isCartHydratedRef.current) return;

        const loadUserCart = async () => {
            if (user?.phone) {
                try {
                    const digits = user.phone.replace(/\D/g, '');
                    const phoneVariations = [digits];
                    if (digits.length === 10) phoneVariations.push('91' + digits);
                    else if (digits.length === 12 && digits.startsWith('91')) phoneVariations.push(digits.substring(2));

                    const { data } = await mysqlClient.from('whatsapp_cart').select('*').in('phone', phoneVariations);
                    
                    // CRITICAL FIX: Only merge DB items if DB actually returned items!
                    // NEVER wipe local cart to [] if DB cart has no rows!
                    if (data && Array.isArray(data) && data.length > 0) {
                        const dbCart = data.map(dbItem => ({
                            id: dbItem.product_id,
                            name: dbItem.product_name,
                            price: dbItem.price,
                            qty: dbItem.quantity,
                            image_url: dbItem.image_url,
                            variantId: dbItem.variant_id,
                            variantName: dbItem.variant_name
                        }));
                        
                        setCart(prev => {
                            if (!prev || prev.length === 0) {
                                return dbCart;
                            }
                            const merged = [...prev];
                            dbCart.forEach(dbItem => {
                                const exists = merged.find(m => (dbItem.variantId ? m.variantId === dbItem.variantId : m.id === dbItem.id));
                                if (!exists) {
                                    merged.push(dbItem);
                                }
                            });
                            return merged;
                        });
                    }
                } catch (err) {
                    console.error('Error loading WhatsApp cross-platform cart:', err);
                }
            }
        };

        loadUserCart();
    }, [user?.phone, hasMounted]);

    async function checkSession() {
        if (typeof window === 'undefined') {
            setIsSessionLoading(false);
            return;
        }
        const storedUser = localStorage.getItem('vaiyaaree_user') || localStorage.getItem('cast_prince_user');
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
                localStorage.removeItem('vaiyaaree_user');
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
                localStorage.setItem('vaiyaaree_user', JSON.stringify(localUser));
                localStorage.setItem('cast_prince_user', JSON.stringify(localUser));
            }

            const diff = Date.now() - loginTime;
            const days = diff / (1000 * 60 * 60 * 24);
            if (days > SESSION_EXPIRY_DAYS) {
                handleLogout();
                setIsSessionLoading(false);
                return;
            }

            // Sanitize existing localUser immediately to strip any legacy sensitive fields
            const cleanLocalUser = sanitizeCustomerSession(localUser);
            if (!cleanLocalUser) {
                localStorage.removeItem('vaiyaaree_user');
                localStorage.removeItem('cast_prince_user');
                setUser(null);
                setIsSessionLoading(false);
                return;
            }

            // Set sanitized local user immediately so UI remains logged in on page refresh
            setUser(cleanLocalUser);
            localStorage.setItem('vaiyaaree_user', JSON.stringify(cleanLocalUser));
            localStorage.setItem('cast_prince_user', JSON.stringify(cleanLocalUser));

            // Fetch latest user profile from DB to sync changes if valid ID exists
            if (cleanLocalUser.id && cleanLocalUser.id !== 'undefined') {
                try {
                    const { data: dbUser, error: dbError } = await mysqlClient
                        .from('customers')
                        .select('id, name, email, phone, country_code, address, city, state, pincode, role, is_verified, is_locked')
                        .eq('id', cleanLocalUser.id)
                        .maybeSingle();

                    if (!dbError && dbUser) {
                        if (Boolean(dbUser.is_locked)) {
                            console.warn('[SESSION] Customer account has been locked by admin.');
                            localStorage.removeItem('vaiyaaree_user');
                            localStorage.removeItem('cast_prince_user');
                            setUser(null);
                            setIsSessionLoading(false);
                            return;
                        }
                        const activeUser = sanitizeCustomerSession({ ...cleanLocalUser, ...dbUser });
                        setUser(activeUser);
                        localStorage.setItem('vaiyaaree_user', JSON.stringify(activeUser));
                        localStorage.setItem('cast_prince_user', JSON.stringify(activeUser));

                        setCheckoutForm(prev => ({
                            ...prev,
                            billingName: prev.billingName || activeUser.name || '',
                            billingCountryCode: prev.billingCountryCode || activeUser.country_code || '+91',
                            billingPhone: prev.billingPhone || (activeUser.phone ? String(activeUser.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                            billingWhatsApp: prev.billingWhatsApp || (activeUser.phone ? String(activeUser.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                            billingEmail: prev.billingEmail || activeUser.email || '',
                            billingAddress: prev.billingAddress || activeUser.address || '',
                            billingCity: prev.billingCity || activeUser.city || '',
                            billingState: prev.billingState || activeUser.state || 'Tamil Nadu',
                            billingPincode: prev.billingPincode || activeUser.pincode || '',
                            shippingName: prev.shippingName || activeUser.name || '',
                            shippingPhone: prev.shippingPhone || (activeUser.phone ? String(activeUser.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                            shippingWhatsApp: prev.shippingWhatsApp || (activeUser.phone ? String(activeUser.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                            shippingAddress: prev.shippingAddress || activeUser.address || '',
                            shippingCity: prev.shippingCity || activeUser.city || '',
                            shippingState: prev.shippingState || activeUser.state || 'Tamil Nadu',
                            shippingPincode: prev.shippingPincode || activeUser.pincode || '',
                            shippingCountry: prev.shippingCountry || 'India'
                        }));
                    }
                } catch (dbErr) {
                    console.warn('[SESSION] Could not refresh customer profile from DB, retaining local session:', dbErr);
                }
            }
        } catch (error) {
            console.error('[SESSION] Error parsing stored user session:', error);
            localStorage.removeItem('vaiyaaree_user');
            localStorage.removeItem('cast_prince_user');
            setUser(null);
        } finally {
            setIsSessionLoading(false);
        }
    }

    // Auto-sync checkout form whenever logged in user profile updates without wiping user input
    useEffect(() => {
        if (user && user.id) {
            setCheckoutForm(prev => ({
                ...prev,
                billingName: prev.billingName || user.name || '',
                billingCountryCode: prev.billingCountryCode || user.country_code || '+91',
                billingPhone: prev.billingPhone || (user.phone ? String(user.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                billingWhatsApp: prev.billingWhatsApp || (user.phone ? String(user.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                billingEmail: prev.billingEmail || user.email || '',
                billingAddress: prev.billingAddress || user.address || '',
                billingCity: prev.billingCity || user.city || '',
                billingState: prev.billingState || user.state || 'Tamil Nadu',
                billingPincode: prev.billingPincode || user.pincode || '',
                shippingName: prev.shippingName || user.name || '',
                shippingPhone: prev.shippingPhone || (user.phone ? String(user.phone).replace(/^91/, '').replace(/\D/g, '') : ''),
                shippingWhatsApp: prev.shippingWhatsApp || (user.phone ? String(user.phone).replace(/^91/, '').replace(/\D/g, '') : '')
            }));
        }
    }, [user?.id]);

    async function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('vaiyaaree_user');
            localStorage.removeItem('cast_prince_user');
            localStorage.removeItem('vaiyaaree_cart');
            localStorage.removeItem('cast_prince_cart');
        }
        setUser(null);
        setCart([]);
        setIsCartLoaded(true);
        setCheckoutForm({
            billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingPincode: '', billingEmail: '', billingWhatsApp: '',
            shippingName: '', shippingPhone: '', shippingWhatsApp: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingPincode: '', shippingEmail: '',
            sameAsBilling: true, paymentMethod: 'COD'
        });
        showToast('Logged out successfully');
    }

    //fetch shop products from mysql with their variants
    async function fetchProducts() {
        setLoading(true);
        try {
            const [productsRes, variantsRes] = await Promise.all([
                mysqlClient
                    .from('products')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .order('id', { ascending: false }),
                mysqlClient
                    .from('product_variants')
                    .select('*')
                    .order('created_at', { ascending: true })
            ]);

            const productsData = productsRes.data || [];
            const variantsData = variantsRes.data || [];

            // Group variants by product_id
            const variantsMap = {};
            variantsData.forEach(v => {
                const pid = v.product_id;
                if (!variantsMap[pid]) variantsMap[pid] = [];
                variantsMap[pid].push(v);
            });

            const enrichedProducts = productsData.map(p => {
                const isVar = (p.type === 'variant' || p.type === 'variable');
                return {
                    ...p,
                    type: p.type || 'simple',
                    variants: isVar ? (variantsMap[p.id] || p.variants || []) : []
                };
            });

            // Guaranteed Sort: Latest Date DESC, then Numeric Product_No / ID DESC
            enrichedProducts.sort((a, b) => {
                const getSortKey = (p) => {
                    let time = 0;
                    if (p.created_at) {
                        const parsed = typeof p.created_at === 'number' ? p.created_at : new Date(p.created_at).getTime();
                        if (!isNaN(parsed) && parsed > 0) time = parsed;
                    }
                    if (time === 0 && p.updated_at) {
                        const parsed = typeof p.updated_at === 'number' ? p.updated_at : new Date(p.updated_at).getTime();
                        if (!isNaN(parsed) && parsed > 0) time = parsed;
                    }
                    let num = 0;
                    if (p.product_no !== undefined && p.product_no !== null && !isNaN(Number(p.product_no))) {
                        num = Number(p.product_no);
                    } else if (p.sku && !isNaN(Number(p.sku))) {
                        num = Number(p.sku);
                    } else if (p.id) {
                        const digits = Number(String(p.id).replace(/\D/g, ''));
                        if (!isNaN(digits) && digits > 0) num = digits;
                    }
                    return { time, num, id: String(p.id || '') };
                };

                const keyA = getSortKey(a);
                const keyB = getSortKey(b);

                if (keyB.time !== keyA.time) return keyB.time - keyA.time;
                if (keyB.num !== keyA.num) return keyB.num - keyA.num;
                return keyB.id.localeCompare(keyA.id);
            });

            setProducts(enrichedProducts);
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
            if (zones && Array.isArray(zones) && zones.length > 0) {
                setShippingZones(zones);
            }
            if (mappings && Array.isArray(mappings)) {
                setZoneMappings(mappings);
            }
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

    function addToCart(product, variant = null, quantity = 1, openDrawer = true) {
        const itemStock = variant ? (variant.stock ?? 0) : (product.stock ?? 0);
        if (itemStock <= 0) {
            showToast('Saree Not Available (Out of Stock)', 'error');
            return false;
        }
        if (itemStock < quantity) {
            showToast(`Saree Not Available in requested quantity. Only ${itemStock} in stock.`, 'error');
            return false;
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

        if (isBlocked) {
            return false;
        }

        if (openDrawer) {
            setIsCartOpen(true);
        }
        showToast(` ${quantity}x ${product.name}${variant ? ` (${variant.name})` : ''} added to cart!`);
        return true;
    }

    function updateQty(target, delta) {
        setCart(prev => {
            const newCart = [...prev];
            const targetIdx = typeof target === 'number'
                ? target
                : newCart.findIndex(i => (i.variantId ? String(i.variantId) === String(target) : String(i.id) === String(target)) || `${i.id}_${i.variantId}` === String(target));

            if (targetIdx === -1 || !newCart[targetIdx]) return prev;

            const item = newCart[targetIdx];
            const itemStock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : 999;
            const targetQty = item.qty + delta;

            if (delta > 0 && targetQty > itemStock) {
                showToast(`Saree Not Available for higher quantity. Maximum ${itemStock} in stock.`, 'error');
                return prev;
            }

            const updatedItem = { ...item, qty: Math.max(0, targetQty) };

            if (updatedItem.qty > 0) {
                newCart[targetIdx] = updatedItem;
                return newCart;
            } else {
                return newCart.filter((_, i) => i !== targetIdx);
            }
        });
    }

    function removeFromCart(target) {
        setCart(prev => {
            if (typeof target === 'number') {
                return prev.filter((_, i) => i !== target);
            }
            return prev.filter(i => {
                const matchVariant = i.variantId && String(i.variantId) === String(target);
                const matchId = String(i.id) === String(target);
                const matchKey = `${i.id}_${i.variantId}` === String(target);
                return !matchVariant && !matchId && !matchKey;
            });
        });
    }

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);

    const autoCouponAttemptedRef = useRef(false);
    const prevCartItemsRef = useRef('');

    useEffect(() => {
        const cartKey = (cart || []).map(i => `${i.id}_${i.qty}_${i.price}`).join('|');
        if (cartKey !== prevCartItemsRef.current) {
            prevCartItemsRef.current = cartKey;
            autoCouponAttemptedRef.current = false;
        }
    }, [cart]);

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
                let res = null;
                let activeCouponCode = appliedCoupon?.couponCode || null;

                // Auto-apply best available active coupon if none applied and customer hasn't explicitly removed it
                if (!activeCouponCode && typeof window !== 'undefined' && !autoCouponAttemptedRef.current) {
                    const isRemovedByUser = sessionStorage.getItem('vaiyaaree_coupon_removed') === 'true';
                    if (!isRemovedByUser) {
                        let rulesToExamine = activeDiscountRules;
                        if (!rulesToExamine || rulesToExamine.length === 0) {
                            try {
                                const rRes = await fetch('/api/discounts/active');
                                if (rRes.ok) {
                                    const rData = await rRes.json();
                                    if (rData.success && Array.isArray(rData.rules)) {
                                        rulesToExamine = rData.rules;
                                        setActiveDiscountRules(rData.rules);
                                    }
                                }
                            } catch (_) {}
                        }

                        const candidateCouponRules = (rulesToExamine || []).filter(r => 
                            (r.is_active === 1 || r.is_active === true || r.is_active === '1') &&
                            r.coupon_code && r.coupon_code.trim()
                        );

                        if (candidateCouponRules.length > 0) {
                            autoCouponAttemptedRef.current = true;
                            let bestCandidate = null;
                            let maxSavings = 0;

                            for (const candidate of candidateCouponRules) {
                                const candidateCode = candidate.coupon_code.trim().toUpperCase();
                                const candidateCalc = await calculateDiscounts({
                                    cartItems: cart,
                                    couponCode: candidateCode,
                                    customer: user || null
                                });
                                const savings = Number(candidateCalc?.totalDiscount || 0) + Number(candidateCalc?.shippingDiscount || 0);
                                const isFreeShipping = (candidateCalc?.appliedRules || []).some(r => r.discountType === 'FREE_SHIPPING');
                                if (savings > maxSavings || (isFreeShipping && !bestCandidate)) {
                                    maxSavings = savings;
                                    bestCandidate = {
                                        rule: candidate,
                                        code: candidateCode,
                                        calculation: candidateCalc
                                    };
                                }
                            }

                            if (bestCandidate && (maxSavings > 0 || bestCandidate.calculation?.appliedRules?.some(r => r.discountType === 'FREE_SHIPPING'))) {
                                activeCouponCode = bestCandidate.code;
                                const newCouponState = {
                                    couponCode: bestCandidate.code,
                                    rule: bestCandidate.rule,
                                    couponDiscount: Number(bestCandidate.calculation?.couponDiscount || 0),
                                    calculation: bestCandidate.calculation
                                };
                                setAppliedCoupon(newCouponState);
                                setCouponMessage(`Coupon "${bestCandidate.code}" applied!`);
                                try {
                                    sessionStorage.setItem('vaiyaaree_applied_coupon', JSON.stringify(newCouponState));
                                } catch (_) {}
                                res = bestCandidate.calculation;
                            }
                        }
                    }
                }

                if (!res) {
                    try {
                        const apiRes = await fetch('/api/discounts/calculate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                cartItems: cart,
                                subtotal: cartTotal,
                                couponCode: activeCouponCode,
                                customer: user || null
                            })
                        });
                        if (apiRes.ok) {
                            const json = await apiRes.json();
                            if (json?.success) res = json;
                        }
                    } catch (apiErr) {
                        // Fallback to client-side calculateDiscounts
                    }

                    if (!res) {
                        res = await calculateDiscounts({
                            cartItems: cart,
                            couponCode: activeCouponCode,
                            customer: user || null
                        });
                    }
                }

                if (res) {
                    setDiscountData(res);
                }

                // Reconcile appliedCoupon with actual server calculation results
                if (appliedCoupon) {
                    const couponCodeUpper = (appliedCoupon.couponCode || '').trim().toUpperCase();
                    const matchingCouponRule = (res?.appliedRules || []).find(
                        r => (r.isCoupon && r.couponCode && r.couponCode.trim().toUpperCase() === couponCodeUpper) ||
                             (r.couponCode && r.couponCode.trim().toUpperCase() === couponCodeUpper) ||
                             (r.isCoupon && !r.couponCode)
                    );
                    const hasAppliedCouponRule = Boolean(matchingCouponRule);
                    const totalBenefit = Number(res?.couponDiscount || 0) + Number(res?.shippingDiscount || 0) + Number(res?.totalDiscount || 0);

                    if (!hasAppliedCouponRule || (totalBenefit <= 0 && matchingCouponRule?.discountType !== 'FREE_SHIPPING')) {
                        // Coupon is disabled, expired, or invalid for cart items
                        setAppliedCoupon(null);
                        if (typeof window !== 'undefined') {
                            try { sessionStorage.removeItem('vaiyaaree_applied_coupon'); } catch (e) {}
                        }
                        setCouponError('The applied coupon is no longer active or valid for the items in your cart.');
                    } else {
                        const updatedCoupon = {
                            ...appliedCoupon,
                            couponDiscount: Number(res?.couponDiscount || matchingCouponRule?.discountAmount || 0),
                            calculation: res
                        };
                        setAppliedCoupon(updatedCoupon);
                        if (typeof window !== 'undefined') {
                            try { sessionStorage.setItem('vaiyaaree_applied_coupon', JSON.stringify(updatedCoupon)); } catch (e) {}
                        }
                    }
                }
            } catch (err) {
                console.error('Error calculating storewide discounts:', err);
            }
        }
        syncDiscounts();
    }, [cart, appliedCoupon?.couponCode, user, activeDiscountRules]);

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
            const cleanState = (shippingState || '').trim().toLowerCase();
            const cleanCity = (shippingCity || '').trim().toLowerCase();

            const districtMapping = zoneMappings.find(m => 
                domesticZoneIds.has(m.zone_id) &&
                (m.state_name || '').trim().toLowerCase() === cleanState && 
                (m.district_name || '').trim().toLowerCase() === cleanCity
            );

            if (districtMapping) {
                activeZone = domesticZones.find(z => z.id === districtMapping.zone_id);
            } else {
                const stateMapping = zoneMappings.find(m => 
                    domesticZoneIds.has(m.zone_id) && 
                    (m.state_name || '').trim().toLowerCase() === cleanState && 
                    !m.district_name
                );
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
            const intlZones = shippingZones.filter(z => isZoneIntl(z));
            const domesticZones = shippingZones.filter(z => !isZoneIntl(z));
            const fallbackIntlRate = intlZones[0] ? parseFloat(intlZones[0].rate || 0) : 100;
            const fallbackRate = domesticZones[0] ? parseFloat(domesticZones[0].rate || 0) : 50;
            shipping = isInternational ? fallbackIntlRate : fallbackRate;
        }

        // Apply Free Shipping discount rules or shipping discount if active
        const hasFreeShippingRule = (discountData?.appliedRules || []).some(r => r.discountType === 'FREE_SHIPPING');
        if (hasFreeShippingRule || (discountData?.shippingDiscount > 0)) {
            shipping = 0;
        }

        const totalOrder = Math.round(taxableSubtotal + cgst + sgst + igst + shipping);
        return { cgst, sgst, igst, shipping, totalOrder, activeZone, isInternational, totalDiscount, taxableSubtotal };
    }, [cartTotal, discountData, checkoutForm.billingState, checkoutForm.shippingState, checkoutForm.billingCity, checkoutForm.shippingCity, checkoutForm.billingCountry, checkoutForm.shippingCountry, checkoutForm.sameAsBilling, businessState, shippingZones, zoneMappings]);

    const clearCartAfterSuccess = () => {
        setCart([]);
        setAppliedCoupon(null);
        setCouponMessage(null);
        setCouponError(null);
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.removeItem('vaiyaaree_applied_coupon');
                localStorage.removeItem('vaiyaaree_cart');
                localStorage.removeItem('cast_prince_cart');
                // Preserve customer's previous billing & shipping address so ordering new products is seamless
                if (checkoutForm.billingAddress || checkoutForm.billingPhone) {
                    const lastAddressData = {
                        billingName: checkoutForm.billingName,
                        billingCountryCode: checkoutForm.billingCountryCode || '+91',
                        billingPhone: checkoutForm.billingPhone,
                        billingWhatsApp: checkoutForm.billingWhatsApp,
                        billingEmail: checkoutForm.billingEmail,
                        billingAddress: checkoutForm.billingAddress,
                        billingCity: checkoutForm.billingCity,
                        billingState: checkoutForm.billingState || 'Tamil Nadu',
                        billingCountry: checkoutForm.billingCountry || 'India',
                        billingPincode: checkoutForm.billingPincode,
                        shippingName: checkoutForm.shippingName,
                        shippingPhone: checkoutForm.shippingPhone,
                        shippingWhatsApp: checkoutForm.shippingWhatsApp,
                        shippingAddress: checkoutForm.shippingAddress,
                        shippingCity: checkoutForm.shippingCity,
                        shippingState: checkoutForm.shippingState || 'Tamil Nadu',
                        shippingCountry: checkoutForm.shippingCountry || 'India',
                        shippingPincode: checkoutForm.shippingPincode,
                        shippingEmail: checkoutForm.shippingEmail,
                        sameAsBilling: checkoutForm.sameAsBilling
                    };
                    localStorage.setItem('vaiyaaree_last_billing_address', JSON.stringify(lastAddressData));
                    localStorage.setItem('vaiyaaree_checkout_form', JSON.stringify(lastAddressData));
                    sessionStorage.setItem('vaiyaaree_checkout_form', JSON.stringify(lastAddressData));
                }
            } catch (e) {}
        }
        // Retain address details in form state so customer doesn't have to re-enter
        setCheckoutForm(prev => ({
            ...prev,
            paymentMethod: 'COD'
        }));
    };

    async function placeOrder(explicitMethod = null) {
        const effectiveMethod = explicitMethod || checkoutForm.paymentMethod || 'COD';
        const shippingState = checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState;
        const shippingCity = checkoutForm.sameAsBilling ? checkoutForm.billingCity : checkoutForm.shippingCity;
        const shippingAddress = checkoutForm.sameAsBilling ? checkoutForm.billingAddress : checkoutForm.shippingAddress;
        const shippingPincode = checkoutForm.sameAsBilling ? checkoutForm.billingPincode : checkoutForm.shippingPincode;
        const shippingName = checkoutForm.sameAsBilling ? checkoutForm.billingName : checkoutForm.shippingName;
        const shippingPhone = checkoutForm.sameAsBilling ? checkoutForm.billingPhone : checkoutForm.shippingPhone;
        const shippingEmail = checkoutForm.sameAsBilling ? checkoutForm.billingEmail : checkoutForm.shippingEmail;
        const shippingWhatsApp = checkoutForm.sameAsBilling ? checkoutForm.billingWhatsApp : checkoutForm.shippingWhatsApp;

        const rawBillingCountry = checkoutForm.billingCountry ?? 'India';
        const rawShippingCountry = checkoutForm.sameAsBilling 
            ? (checkoutForm.billingCountry ?? 'India') 
            : (checkoutForm.shippingCountry ?? 'India');

        const billingCountry = String(rawBillingCountry || 'India').trim() || 'India';
        const shippingCountry = String(rawShippingCountry || 'India').trim() || 'India';

        if (!checkoutForm.billingName || !checkoutForm.billingPhone || !checkoutForm.billingWhatsApp || !checkoutForm.billingAddress) {
            showToast('Please fill all required billing fields including WhatsApp number', 'error');
            return;
        }

        if (!checkoutForm.sameAsBilling && (!shippingName || !shippingPhone || !shippingWhatsApp || !shippingAddress)) {
            showToast('Please fill all required shipping fields including WhatsApp number', 'error');
            return;
        }

        try {
            const countryCode = checkoutForm.billingCountryCode || '+91';
            const cleanDigits = checkoutForm.billingPhone.replace(/\D/g, '');
            const isIndia = (billingCountry || 'India').toLowerCase() === 'india';
            const fullPhone = isIndia ? `91${cleanDigits.slice(-10)}` : `${countryCode.replace(/\D/g, '')}${cleanDigits}`;
            
            // Build full addresses
            const fullBillingAddress = `${checkoutForm.billingAddress}, ${checkoutForm.billingCity} - ${checkoutForm.billingPincode} (${checkoutForm.billingState}, ${billingCountry})`.trim();
            const fullShippingAddress = `${shippingAddress}, ${shippingCity} - ${shippingPincode} (${shippingState}, ${shippingCountry})`.trim();

            // Create billing/shipping JSON objects with correct dynamic countries
            const billingAddressObj = {
                name: checkoutForm.billingName,
                phone: checkoutForm.billingPhone,
                whatsapp: checkoutForm.billingWhatsApp,
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
                whatsapp: shippingWhatsApp,
                email: shippingEmail || null,
                address: shippingAddress,
                city: shippingCity,
                state: shippingState,
                pincode: shippingPincode,
                country: shippingCountry
            };

            // GUEST CHECKOUT / AUTO-ACCOUNT CREATION LOGIC
            const isUserValidCustomer = Boolean(
                user?.id && 
                user.role !== 'admin' && 
                user.role !== 'Super Admin' && 
                !user.username
            );

            let customerId = isUserValidCustomer ? user.id : null;
            let currentCustomer = isUserValidCustomer ? user : null;

            if (!customerId) {
                // Check if customer exists by phone OR email
                const phoneVariations = [cleanDigits, `91${cleanDigits}`, `+91${cleanDigits}`];
                let existingCustomer = null;

                try {
                    const { data: byPhone } = await mysqlClient
                        .from('customers')
                        .select('*')
                        .in('phone', phoneVariations)
                        .order('created_at', { ascending: true });
                    if (Array.isArray(byPhone) && byPhone.length > 0) {
                        existingCustomer = byPhone[0];
                    } else if (checkoutForm.billingEmail?.trim()) {
                        const { data: byEmail } = await mysqlClient
                            .from('customers')
                            .select('*')
                            .eq('email', checkoutForm.billingEmail.trim())
                            .order('created_at', { ascending: true });
                        if (Array.isArray(byEmail) && byEmail.length > 0) {
                            existingCustomer = byEmail[0];
                        }
                    }
                } catch (findErr) {
                    console.warn('[CHECKOUT] Could not lookup existing customer:', findErr);
                }

                if (existingCustomer) {
                    const updatePayload = {
                        name: checkoutForm.billingName || existingCustomer.name,
                        email: checkoutForm.billingEmail || existingCustomer.email,
                        address: checkoutForm.billingAddress || existingCustomer.address,
                        city: checkoutForm.billingCity || existingCustomer.city,
                        state: checkoutForm.billingState || existingCustomer.state,
                        pincode: checkoutForm.billingPincode || existingCustomer.pincode,
                        phone: existingCustomer.phone || cleanDigits,
                        country_code: existingCustomer.country_code || checkoutForm.billingCountryCode || '+91'
                    };

                    try {
                        const { data: updatedExisting } = await mysqlClient
                            .from('customers')
                            .update(updatePayload)
                            .eq('id', existingCustomer.id)
                            .select()
                            .single();
                        currentCustomer = updatedExisting || { ...existingCustomer, ...updatePayload };
                    } catch (updErr) {
                        currentCustomer = { ...existingCustomer, ...updatePayload };
                    }
                    customerId = currentCustomer.id;
                } else {
                    // Create new customer
                    try {
                        const { data: newCustomer, error: createError } = await mysqlClient
                            .from('customers')
                            .insert({
                                phone: cleanDigits,
                                country_code: checkoutForm.billingCountryCode || '+91',
                                name: checkoutForm.billingName,
                                email: checkoutForm.billingEmail || null,
                                address: checkoutForm.billingAddress,
                                city: checkoutForm.billingCity,
                                state: checkoutForm.billingState,
                                pincode: checkoutForm.billingPincode,
                                role: 'user',
                                is_verified: false
                            })
                            .select()
                            .single();

                        if (createError) throw createError;
                        customerId = newCustomer?.id || `cust_${cleanDigits}`;
                        currentCustomer = newCustomer || { id: customerId, phone: cleanDigits, name: checkoutForm.billingName };
                    } catch (cErr) {
                        console.warn('[CHECKOUT] Could not auto-insert customer row, fallback to phone ID:', cErr);
                        customerId = `cust_${cleanDigits}`;
                        currentCustomer = { id: customerId, phone: cleanDigits, name: checkoutForm.billingName };
                    }
                }

                // Log the customer in locally so they see their correct profile immediately
                const safeCustomer = sanitizeCustomerSession(currentCustomer);
                if (safeCustomer) {
                    setUser(safeCustomer);
                    localStorage.setItem('vaiyaaree_user', JSON.stringify(safeCustomer));
                    localStorage.setItem('cast_prince_user', JSON.stringify(safeCustomer));
                }
            } else {
                // User is logged in as valid customer: sync customer profile with latest billing details
                try {
                    const { data: updatedUser } = await mysqlClient.from('customers').update({
                        name: checkoutForm.billingName || user.name,
                        email: checkoutForm.billingEmail || user.email,
                        phone: user.phone || checkoutForm.billingPhone,
                        address: checkoutForm.billingAddress || checkoutForm.shippingAddress || user.address,
                        city: checkoutForm.billingCity || checkoutForm.shippingCity || user.city,
                        state: checkoutForm.billingState || checkoutForm.shippingState || user.state,
                        pincode: checkoutForm.billingPincode || checkoutForm.shippingPincode || user.pincode,
                        metadata: {
                            ...(user.metadata || {}),
                            last_billing_address: billingAddressObj,
                            last_shipping_address: shippingAddressObj
                        }
                    }).eq('id', user.id).select('id, name, email, phone, country_code, address, city, state, pincode, role, is_verified').single();
                    if (updatedUser) {
                        const safeUpdated = sanitizeCustomerSession(updatedUser);
                        if (safeUpdated) {
                            setUser(safeUpdated);
                            localStorage.setItem('vaiyaaree_user', JSON.stringify(safeUpdated));
                            localStorage.setItem('cast_prince_user', JSON.stringify(safeUpdated));
                        }
                    }

                    // Also save address record into customer_addresses table for profile & future checkouts
                    if (checkoutForm.billingAddress) {
                        try {
                            const newAddr = {
                                id: `addr_${Date.now()}`,
                                customer_id: user.id,
                                name: checkoutForm.billingName || user.name || 'Default Address',
                                phone: checkoutForm.billingPhone || user.phone || '',
                                address: checkoutForm.billingAddress,
                                address_line: checkoutForm.billingAddress,
                                city: checkoutForm.billingCity || '',
                                state: checkoutForm.billingState || 'Tamil Nadu',
                                pincode: checkoutForm.billingPincode || '',
                                country: checkoutForm.billingCountry || 'India',
                                is_default: 1
                            };
                            await mysqlClient.from('customer_addresses').insert(newAddr);
                        } catch (aErr) {}
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
                paymentMethod: effectiveMethod,
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

            // Store order ID locally so account orders page and track page always find it instantly
            if (typeof window !== 'undefined' && assignedOrderId) {
                try {
                    const prevIds = JSON.parse(localStorage.getItem('vaiyaaree_recent_order_ids') || '[]');
                    const nextIds = [assignedOrderId, ...prevIds.filter(id => id !== assignedOrderId)].slice(0, 25);
                    localStorage.setItem('vaiyaaree_recent_order_ids', JSON.stringify(nextIds));
                } catch (e) {}
            }

            const finalOrderData = {
                orderId: assignedOrderId,
                billingName: checkoutForm.billingName,
                billingPhone: checkoutForm.billingPhone,
                customerName: checkoutForm.billingName,
                total: createData?.totalAmount !== undefined ? createData.totalAmount : Math.round(taxDetails.totalOrder),
                subtotal: taxDetails.taxableSubtotal !== undefined ? taxDetails.taxableSubtotal : (taxDetails.subtotal || Math.max(0, taxDetails.totalOrder - taxDetails.shipping - ((taxDetails.cgst || 0) + (taxDetails.sgst || 0) + (taxDetails.igst || 0)))),
                cgst: taxDetails.cgst,
                sgst: taxDetails.sgst,
                igst: taxDetails.igst,
                shipping: taxDetails.shipping
            };

            const isOnlinePayment = effectiveMethod === 'RAZORPAY' || effectiveMethod === 'ONLINE';

            if (!isOnlinePayment) {
                clearCartAfterSuccess();
                showToast('Order Placed Successfully!', 'success');

                // Trigger Email Notification automatically for COD/offline orders
                try {
                    fetch('/api/orders/resend-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: assignedOrderId })
                    });
                } catch (emailErr) {
                    console.error('Failed to trigger order confirmation email:', emailErr);
                }

                // Trigger WhatsApp Notification automatically for COD/offline orders (only if WhatsApp channel is enabled)
                if (!isEmailOnly) {
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
                }
            }

            return finalOrderData;

        } catch (err) {
            console.error(err);
            showToast('Order failed. Please try again.', 'error');
            throw err;
        }
    }

    const applyCoupon = async (code) => {
        if (typeof window !== 'undefined') {
            try { sessionStorage.removeItem('vaiyaaree_coupon_removed'); } catch (e) {}
        }
        setCouponError(null);
        setCouponMessage(null);
        const trimmedCode = (code || '').trim().toUpperCase();
        if (!trimmedCode) {
            setCouponError('Please enter a coupon code.');
            return false;
        }

        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    couponCode: trimmedCode,
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

            const couponState = {
                couponCode: data.couponCode || trimmedCode,
                rule: data.rule,
                couponDiscount: data.couponDiscount,
                calculation: data.calculation
            };
            setAppliedCoupon(couponState);
            if (data.calculation) {
                setDiscountData(data.calculation);
            }
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem('vaiyaaree_applied_coupon', JSON.stringify(couponState));
                } catch (e) {}
            }
            setCouponMessage(data.message);
            showToast(data.message, 'success');
            return true;
        } catch (err) {
            setCouponError(err.message || 'Error applying coupon');
            return false;
        }
    };

    const removeCoupon = async () => {
        setAppliedCoupon(null);
        setCouponMessage(null);
        setCouponError(null);
        autoCouponAttemptedRef.current = true;
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.removeItem('vaiyaaree_applied_coupon');
                sessionStorage.setItem('vaiyaaree_coupon_removed', 'true');
            } catch (e) {}
        }
        showToast('Coupon removed', 'info');

        // Recalculate discounts without the coupon
        if (cart && cart.length > 0) {
            try {
                const apiRes = await fetch('/api/discounts/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cartItems: cart,
                        subtotal: cartTotal,
                        couponCode: null,
                        customer: user || null
                    })
                });
                if (apiRes.ok) {
                    const json = await apiRes.json();
                    if (json?.success) {
                        setDiscountData(json);
                        return;
                    }
                }
            } catch (e) {}
            try {
                const fallbackRes = await calculateDiscounts({
                    cartItems: cart,
                    couponCode: null,
                    customer: user || null
                });
                setDiscountData(fallbackRes);
            } catch (e) {}
        } else {
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
        }
    };

    return (
        <ShopContext.Provider value={{
            products, cart, loading, user, setUser, isSessionLoading, shippingZones, zoneMappings, businessState, fetchShippingRates,
            checkoutForm, setCheckoutForm, addToCart, removeFromCart, updateQty,
            handleLogout, showToast, toast, cartTotal, cartCount, taxDetails, discountData, mysqlClient, placeOrder, clearCartAfterSuccess,
            hasMounted, isCartLoaded,
            isCartOpen, setIsCartOpen, openCart, closeCart, toggleCart,
            comingSoonSettings, setComingSoonSettings, fetchComingSoon,
            communicationChannel,
            isEmailOnly,
            isWhatsAppOnly,
            isHybridChannel,
            waChatbotEnabled,
            supportEmail,
            supportPhone,
            fetchCommunicationSettings,
            appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon,
            dbCategories, fetchDbCategories,
            activeDiscountRules, fetchActiveDiscountRules, getEffectiveProductPrice
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
