'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

const defaultContextValue = {
    products: [], cart: [], loading: false, user: null, setUser: () => { },
    shippingZones: [], zoneMappings: [], businessState: 'Tamil Nadu',
    checkoutForm: { 
        billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: 'Tamil Nadu', billingPincode: '', billingEmail: '', billingWhatsApp: '',
        shippingName: '', shippingPhone: '', shippingAddress: '', shippingCity: '', shippingState: 'Tamil Nadu', shippingPincode: '',
        sameAsBilling: true, paymentMethod: 'COD' 
    },
    setCheckoutForm: () => { }, addToCart: () => { }, removeFromCart: () => { }, updateQty: () => { },
    handleLogout: () => { }, showToast: () => { }, toast: { show: false, message: '', type: 'success' },
    cartTotal: 0, cartCount: 0, taxDetails: { cgst: 0, sgst: 0, igst: 0, shipping: 0, totalOrder: 0 },
    supabase: null, placeOrder: () => { },
    isCartOpen: false, setIsCartOpen: () => { }, openCart: () => { }, closeCart: () => { }, toggleCart: () => { }
};

const ShopContext = createContext(defaultContextValue);
const SESSION_EXPIRY_DAYS = 7; // Auto-logout after 7 days


export function ShopProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [shippingZones, setShippingZones] = useState([]);
    const [zoneMappings, setZoneMappings] = useState([]);
    const [businessState, setBusinessState] = useState('Tamil Nadu');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [hasMounted, setHasMounted] = useState(false);
    const [isCartLoaded, setIsCartLoaded] = useState(false); // Guard for DB sync

    const [checkoutForm, setCheckoutForm] = useState({
        // Billing fields
        billingName: '',
        billingPhone: '',
        billingAddress: '',
        billingCity: '',
        billingState: 'Tamil Nadu',
        billingPincode: '',
        billingEmail: '',
        // Shipping fields
        shippingName: '',
        shippingPhone: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: 'Tamil Nadu',
        shippingPincode: '',
        shippingEmail: '',
        sameAsBilling: true,
        // Payment
        paymentMethod: 'COD'
    });

    // ── EFFECTS ──
    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
        fetchBusinessState();
        fetchShippingRates();
        checkSession();
    }, []);

    // ── CART PERSISTENCE ──
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
                    await supabase.from('whatsapp_cart').delete().in('phone', phoneVariations);

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
                        await supabase.from('whatsapp_cart').insert(inserts);
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

                    const { data } = await supabase.from('whatsapp_cart').select('*').in('phone', phoneVariations);
                    
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
                        
                        // If we have items in DB, sync them. 
                        // If DB is empty, but we have guest items, we might want to preserve them ONLY IF this is the first load after login
                        // However, to keep it strictly synced, if a user is logged in, the DB is the source of truth.
                        
                        const guestItems = prev.filter(g => !dbCart.find(d => (g.variantId ? d.variantId === g.variantId : d.id === g.id)));
                        
                        // Only merge guest items if the user just recently signed in (isCartLoaded was false)
                        if (!isCartLoaded && guestItems.length > 0) {
                            return [...dbCart, ...guestItems];
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
        const storedUser = localStorage.getItem('cast_prince_user');
        if (storedUser) {
            try {
                const localUser = JSON.parse(storedUser);
                
                // Check for session expiration
                if (localUser.login_at) {
                    const diff = Date.now() - localUser.login_at;
                    const days = diff / (1000 * 60 * 60 * 24);
                    if (days > SESSION_EXPIRY_DAYS) {
                        handleLogout();
                        return;
                    }
                } else {
                    // For legacy sessions without timestamp, add it now or force refresh
                    // Let's add it now so they get one more grace period
                    localUser.login_at = Date.now();
                    localStorage.setItem('cast_prince_user', JSON.stringify(localUser));
                }
                
                // Only fetch from database if we have a valid ID
                if (localUser.id && localUser.id !== 'undefined') {
                    const { data: dbUser } = await supabase.from('customers').select('*').eq('id', localUser.id).single();
                    const activeUser = dbUser || localUser;
                    setUser(activeUser);
                    setCheckoutForm(prev => ({
                        ...prev,
                        billingName: activeUser.name || '',
                        billingPhone: activeUser.phone ? activeUser.phone.replace(/^91/, '') : '',
                        shippingName: activeUser.name || '',
                        shippingPhone: activeUser.phone ? activeUser.phone.replace(/^91/, '') : ''
                    }));
                } else {
                    // Use stored user as-is if ID is invalid
                    setUser(localUser);
                }
            } catch (error) {
                console.error('Session check error:', error);
                // Clear invalid stored user
                localStorage.removeItem('cast_prince_user');
            }
        }
    }



    async function handleLogout() {
        localStorage.clear();
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

    async function fetchProducts() {
        setLoading(true);
        try {
            const { data } = await supabase
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
            const { data: zones } = await supabase.from('shipping_zones').select('*');
            const { data: mappings } = await supabase.from('shipping_zone_states').select('*');
            if (zones) setShippingZones(zones);
            if (mappings) setZoneMappings(mappings);
        } catch (err) {
            console.error('Shipping Rates Fetch Error:', err);
        }
    }

    async function fetchBusinessState() {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'business_state').single();
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
                image_url: (variant && variant.image_url) ? variant.image_url : product.image_url,
                qty: quantity,
                stock: itemStock,
                variantId: variant?.id,
                variantName: variant?.name
            };
            return [...prev, newEntry];
        });

        if (!isBlocked) {
            setIsCartOpen(true);
            showToast(`✨ ${quantity}x ${product.name}${variant ? ` (${variant.name})` : ''} added to cart!`);
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

    const taxDetails = useMemo(() => {
        const subtotal = cartTotal;
        let cgst = 0, sgst = 0, igst = 0;
        
        // Determine shipping country, state and city
        const shippingCountry = (checkoutForm.sameAsBilling ? checkoutForm.billingCountry : checkoutForm.shippingCountry) || 'India';
        const isInternational = shippingCountry.trim().toLowerCase() !== 'india' && shippingCountry.trim().toLowerCase() !== 'in';
        const shippingState = checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState;
        const shippingCity = checkoutForm.sameAsBilling ? checkoutForm.billingCity : checkoutForm.shippingCity;
        
        // Calculate tax based on location
        const normalizedFormState = (shippingState || '').trim().toLowerCase();
        const normalizedBizState = (businessState || 'Tamil Nadu').trim().toLowerCase();
        
        if (isInternational) {
            igst = Math.round(subtotal * 0.05);
        } else if (normalizedFormState === normalizedBizState) {
            cgst = Math.round(subtotal * 0.025);
            sgst = Math.round(subtotal * 0.025);
        } else {
            igst = Math.round(subtotal * 0.05);
        }

        let shipping = 0;
        let activeZone = null;
        
        if (isInternational) {
            activeZone = shippingZones.find(z => z.is_international);
        } else {
            const domesticZones = shippingZones.filter(z => !z.is_international);
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
            shipping = parseFloat(activeZone.rate || 0);
            const threshold = parseFloat(activeZone.free_threshold || 0);
            if (threshold > 0 && subtotal >= threshold) shipping = 0;
        } else {
            shipping = isInternational ? 1500 : 100;
        }

        const totalOrder = subtotal + cgst + sgst + igst + shipping;
        return { cgst, sgst, igst, shipping, totalOrder, activeZone };
    }, [cartTotal, checkoutForm.billingState, checkoutForm.shippingState, checkoutForm.billingCity, checkoutForm.shippingCity, checkoutForm.billingCountry, checkoutForm.shippingCountry, checkoutForm.sameAsBilling, businessState, shippingZones, zoneMappings]);

    async function placeOrder() {
        const shippingState = checkoutForm.sameAsBilling ? checkoutForm.billingState : checkoutForm.shippingState;
        const shippingCity = checkoutForm.sameAsBilling ? checkoutForm.billingCity : checkoutForm.shippingCity;
        const shippingAddress = checkoutForm.sameAsBilling ? checkoutForm.billingAddress : checkoutForm.shippingAddress;
        const shippingPincode = checkoutForm.sameAsBilling ? checkoutForm.billingPincode : checkoutForm.shippingPincode;
        const shippingName = checkoutForm.sameAsBilling ? checkoutForm.billingName : checkoutForm.shippingName;
        const shippingPhone = checkoutForm.sameAsBilling ? checkoutForm.billingPhone : checkoutForm.shippingPhone;
        const shippingEmail = checkoutForm.sameAsBilling ? checkoutForm.billingEmail : checkoutForm.shippingEmail;

        if (!checkoutForm.billingName || !checkoutForm.billingPhone || !checkoutForm.billingAddress) {
            showToast('Please fill all required billing fields', 'error');
            return;
        }

        if (!checkoutForm.sameAsBilling && (!shippingName || !shippingPhone || !shippingAddress)) {
            showToast('Please fill all required shipping fields', 'error');
            return;
        }

        try {
            const orderId = `WEB-${Date.now().toString().slice(-6)}`;
            const customerPhone = checkoutForm.billingPhone.replace(/\D/g, '');
            const fullPhone = customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`;
            
            // Build full addresses
            const fullBillingAddress = `${checkoutForm.billingAddress}, ${checkoutForm.billingCity} - ${checkoutForm.billingPincode} (${checkoutForm.billingState}, India)`.trim();
            const fullShippingAddress = `${shippingAddress}, ${shippingCity} - ${shippingPincode} (${shippingState}, India)`.trim();

            // Create billing/shipping JSON objects
            const billingAddressObj = {
                name: checkoutForm.billingName,
                phone: checkoutForm.billingPhone,
                email: checkoutForm.billingEmail || null,
                address: checkoutForm.billingAddress,
                city: checkoutForm.billingCity,
                state: checkoutForm.billingState,
                pincode: checkoutForm.billingPincode,
                country: 'India'
            };
            
            const shippingAddressObj = {
                name: shippingName,
                phone: shippingPhone,
                email: shippingEmail || null,
                address: shippingAddress,
                city: shippingCity,
                state: shippingState,
                pincode: shippingPincode,
                country: 'India'
            };

            // GUEST CHECKOUT / AUTO-ACCOUNT CREATION LOGIC
            let customerId = user?.id;
            let currentCustomer = user;

            if (!customerId) {
                // Check if customer exists by phone
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('phone', fullPhone)
                    .single();

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                    currentCustomer = existingCustomer;
                } else {
                    // Create new customer
                    const { data: newCustomer, error: createError } = await supabase
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

                // Log the guest in locally so they can see their order history immediately
                setUser(currentCustomer);
                localStorage.setItem('cast_prince_user', JSON.stringify(currentCustomer));
            }

            // --- SECURE SERVER-SIDE ORDER CREATION ---
            // We now call an API route instead of direct Supabase inserts to prevent price manipulation and race conditions.
            const orderPayload = {
                orderId,
                customerId,
                customerPhone: fullPhone,
                customerName: checkoutForm.billingName,
                customerEmail: checkoutForm.billingEmail,
                shippingAddress: shippingAddressObj,
                billingAddress: billingAddressObj,
                paymentMethod: checkoutForm.paymentMethod,
                cart: cart,
                shippingCost: taxDetails.shipping,
                shippingZoneId: taxDetails.activeZone?.id
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

            // --- SYNC CUSTOMER PROFILE ---
            if (user && user.id) {
                try {
                    await supabase.from('customers').update({
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
                    }).eq('id', user.id);
                } catch (syncErr) {
                    console.error('[PROFILE-SYNC] Failed to update customer profile:', syncErr);
                }
            }
            // --- END SYNC ---

            const finalOrderData = {
                orderId,
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
                    body: JSON.stringify({ orderId })
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
                        orderId,
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

    return (
        <ShopContext.Provider value={{
            products, cart, loading, user, setUser, shippingZones, zoneMappings, businessState,
            checkoutForm, setCheckoutForm, addToCart, removeFromCart, updateQty,
            handleLogout, showToast, toast, cartTotal, cartCount, taxDetails, supabase, placeOrder,
            isCartOpen, setIsCartOpen, openCart, closeCart, toggleCart
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
