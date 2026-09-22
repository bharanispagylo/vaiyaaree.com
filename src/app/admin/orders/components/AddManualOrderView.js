'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, Trash2, Loader2, Layers, Check, UserCheck, UserPlus, X, User, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { mysqlClient } from '@/lib/mysqlClient';

function ProductThumbnail({ src, alt = '', size = 44, borderRadius = '8px' }) {
    const [hasError, setHasError] = useState(false);
    const validSrc = !hasError && src ? (() => {
        const first = String(src).split(',')[0].trim();
        if (!first) return null;
        if (first.startsWith('http://') || first.startsWith('https://') || first.startsWith('/') || first.startsWith('data:')) return first;
        if (first.startsWith('images/')) return `/${first}`;
        return `/images/${first}`;
    })() : null;

    if (!validSrc) {
        return (
            <div
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    minWidth: `${size}px`,
                    borderRadius: borderRadius,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    flexShrink: 0
                }}
            >
                <Package size={Math.round(size * 0.45)} />
            </div>
        );
    }

    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                minWidth: `${size}px`,
                borderRadius: borderRadius,
                overflow: 'hidden',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img
                src={validSrc}
                alt={alt}
                onError={() => setHasError(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
        </div>
    );
}

export default function AddManualOrderView({
    isAddingOrder,
    setIsAddingOrder,
    newOrder,
    setNewOrder,
    allProducts = [],
    productSearch,
    setProductSearch,
    shippingZones = [],
    shippingMappings = [],
    isCreatingOrder,
    setIsCreatingOrder,
    setNotification,
    fetchOrders,
    fetchCatalogProducts
}) {
    // Customer Selection State
    const [customerType, setCustomerType] = useState(newOrder.customer_id ? 'existing' : 'existing');
    const [customersList, setCustomersList] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Load registered customers on mount
    useEffect(() => {
        let isMounted = true;
        const loadCustomers = async () => {
            setIsLoadingCustomers(true);
            try {
                const { data, error } = await mysqlClient
                    .from('customers')
                    .select('id, name, phone, country_code, email, address, city, state, pincode, metadata')
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (!error && data && isMounted) {
                    setCustomersList(data);
                }
            } catch (e) {
                console.warn('Error fetching customers:', e);
            } finally {
                if (isMounted) setIsLoadingCustomers(false);
            }
        };
        loadCustomers();
        return () => { isMounted = false; };
    }, []);

    if (!isAddingOrder) return null;

    // Financial calculations
    const subtotal = newOrder.is_replacement ? 0 : newOrder.items.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 1)), 0);

    // Discount Calculation
    const discountAmount = (() => {
        if (newOrder.is_replacement || subtotal === 0) return 0;
        const val = parseFloat(newOrder.discount_value) || 0;
        if (val <= 0) return 0;
        if (newOrder.discount_type === 'PERCENT') {
            return Math.round(subtotal * (Math.min(100, Math.max(0, val)) / 100));
        }
        return Math.min(subtotal, Math.max(0, val));
    })();

    const taxableSubtotal = Math.max(0, subtotal - discountAmount);

    const shipping = (() => {
        if (newOrder.manual_shipping_cost !== '') return parseFloat(newOrder.manual_shipping_cost) || 0;
        if (newOrder.is_replacement) return 0;
        if (subtotal === 0) return 0;
        const state = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
        const mapping = shippingMappings.find(m => m.state_name === state);
        const zoneId = mapping ? mapping.zone_id : (shippingZones.find(z => z.name.toLowerCase().includes('default'))?.id || shippingZones[0]?.id);
        const zone = shippingZones.find(z => z.id === zoneId);

        if (!zone) return 100;
        if (taxableSubtotal >= zone.free_threshold) return 0;
        return zone.rate || 0;
    })();

    const effectiveState = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
    let cgst = 0, sgst = 0, igst = 0;
    if (!newOrder.is_replacement && taxableSubtotal > 0) {
        if (effectiveState === 'Tamil Nadu') {
            cgst = Math.round(taxableSubtotal * 0.025);
            sgst = Math.round(taxableSubtotal * 0.025);
        } else {
            igst = Math.round(taxableSubtotal * 0.05);
        }
    }
    const tax = cgst + sgst + igst;
    const total = newOrder.is_replacement ? shipping : taxableSubtotal + tax + shipping;

    // Handle existing customer selection & auto-fill
    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        let parsedMeta = {};
        if (cust.metadata) {
            try {
                parsedMeta = typeof cust.metadata === 'string' ? JSON.parse(cust.metadata) : cust.metadata;
            } catch (e) {
                parsedMeta = {};
            }
        }
        const billing = parsedMeta.last_billing_address || {};
        const shippingAddr = parsedMeta.last_shipping_address || {};

        const rawPhone = cust.phone || '';
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

        setNewOrder(prev => ({
            ...prev,
            customer_id: cust.id,
            customer_name: billing.name || cust.name || '',
            billing_phone: billing.phone || cleanPhone || rawPhone,
            billing_email: billing.email || cust.email || '',
            billing_address: billing.address || cust.address || '',
            billing_city: billing.city || cust.city || '',
            billing_pincode: billing.pincode || cust.pincode || '',
            billing_state: billing.state || cust.state || 'Tamil Nadu',
            shipping_phone: shippingAddr.phone || billing.phone || cleanPhone || rawPhone,
            shipping_email: shippingAddr.email || billing.email || cust.email || '',
            shipping_address: shippingAddr.address || billing.address || cust.address || '',
            shipping_city: shippingAddr.city || billing.city || cust.city || '',
            shipping_pincode: shippingAddr.pincode || billing.pincode || cust.pincode || '',
            shipping_state: shippingAddr.state || billing.state || cust.state || 'Tamil Nadu',
            same_as_billing: true
        }));
        setCustomerSearch('');
    };

    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setNewOrder(prev => ({
            ...prev,
            customer_id: null,
            customer_name: '',
            billing_phone: '',
            billing_email: '',
            billing_address: '',
            billing_city: '',
            billing_pincode: '',
            billing_state: 'Tamil Nadu',
            shipping_phone: '',
            shipping_email: '',
            shipping_address: '',
            shipping_city: '',
            shipping_pincode: '',
            shipping_state: 'Tamil Nadu',
            same_as_billing: true
        }));
    };

    const handleCustomerTypeChange = (type) => {
        setCustomerType(type);
        if (type === 'new') {
            handleClearCustomer();
        }
    };

    const filteredCustomers = customersList.filter(c => {
        if (!customerSearch) return false;
        const q = customerSearch.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesEmail;
    });

    // Stock-capped product / variant selection
    const handleSelectProductOrVariant = (product, variant = null) => {
        const targetVariantId = variant ? variant.id : null;
        const targetPrice = variant ? Number(variant.price || 0) : Number(product.price || 0);
        const targetStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
        const targetSku = variant?.sku || product.sku || '';
        const targetVariantName = variant ? variant.name : null;
        const targetImageUrl = variant?.image_url || product.image_url || null;
        const itemDisplayName = `${product.name}${targetVariantName ? ` (${targetVariantName})` : ''}`;

        if (targetStock <= 0) {
            setNotification({ message: `"${itemDisplayName}" is Out of Stock (0 available).`, type: 'error' });
            return;
        }

        const existingIndex = newOrder.items.findIndex(
            i => i.product_id === product.id && (i.variant_id || null) === targetVariantId
        );

        if (existingIndex > -1) {
            const currentQty = newOrder.items[existingIndex].quantity;
            if (currentQty >= targetStock) {
                setNotification({ message: `Cannot add more "${itemDisplayName}". Maximum available stock is ${targetStock}.`, type: 'error' });
                return;
            }
            const updatedItems = [...newOrder.items];
            updatedItems[existingIndex].quantity = currentQty + 1;
            setNewOrder({ ...newOrder, items: updatedItems });
        } else {
            setNewOrder({
                ...newOrder,
                items: [
                    ...newOrder.items,
                    {
                        product_id: product.id,
                        product_name: product.name,
                        variant_id: targetVariantId,
                        variant_name: targetVariantName,
                        sku: targetSku,
                        stock: targetStock,
                        image_url: targetImageUrl,
                        quantity: 1,
                        price: targetPrice
                    }
                ]
            });
        }
        setProductSearch('');
    };

    const handleCreateOrder = async () => {
        if (!newOrder.customer_name || !newOrder.billing_phone || newOrder.items.length === 0) {
            setNotification({ message: 'Please fill all customer details and add at least one item.', type: 'error' });
            return;
        }

        // Validate stock before submitting
        for (const item of newOrder.items) {
            if (item.stock !== undefined && item.stock !== null && item.quantity > item.stock) {
                setNotification({
                    message: `Quantity for "${item.product_name}${item.variant_name ? ' (' + item.variant_name + ')' : ''}" exceeds available stock (${item.stock}). Please adjust quantity.`,
                    type: 'error'
                });
                return;
            }
        }

        setNotification({ message: 'Creating order...', type: 'info' });
        setIsCreatingOrder(true);
        try {
            const cleanPhone = newOrder.billing_phone.replace(/\D/g, '');
            const normalizedPhone = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

            const orderPayload = {
                source: 'MANUAL',
                customerId: newOrder.customer_id || null,
                status: newOrder.status || 'PAID',
                isReplacement: Boolean(newOrder.is_replacement),
                is_replacement: Boolean(newOrder.is_replacement),
                discountAmount: discountAmount,
                discountType: newOrder.discount_type === 'PERCENT' ? 'PERCENTAGE' : 'FIXED',
                discountValue: parseFloat(newOrder.discount_value) || 0,
                customerName: newOrder.customer_name,
                customerPhone: normalizedPhone,
                customerEmail: newOrder.billing_email || null,
                paymentMethod: newOrder.payment_method || 'UPI',
                billingAddress: {
                    name: newOrder.customer_name,
                    phone: normalizedPhone,
                    email: newOrder.billing_email || null,
                    address: newOrder.billing_address,
                    city: newOrder.billing_city,
                    pincode: newOrder.billing_pincode,
                    state: newOrder.billing_state
                },
                shippingAddress: newOrder.same_as_billing ? {
                    name: newOrder.customer_name,
                    phone: normalizedPhone,
                    email: newOrder.billing_email || null,
                    address: newOrder.billing_address,
                    city: newOrder.billing_city,
                    pincode: newOrder.billing_pincode,
                    state: newOrder.billing_state
                } : {
                    name: newOrder.customer_name,
                    phone: newOrder.shipping_phone || normalizedPhone,
                    email: newOrder.shipping_email || newOrder.billing_email || null,
                    address: newOrder.shipping_address,
                    city: newOrder.shipping_city,
                    pincode: newOrder.shipping_pincode,
                    state: newOrder.shipping_state
                },
                shippingState: newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state,
                shippingCost: shipping,
                cart: newOrder.items.map(it => ({
                    id: it.product_id,
                    qty: it.quantity,
                    name: it.product_name,
                    price: it.price,
                    variantId: it.variant_id || null,
                    variantName: it.variant_name || null
                })),
                send_notifications: newOrder.send_notifications,
                adminNotes: newOrder.admin_notes || (newOrder.is_replacement ? 'Manual Replacement Order' : 'Manual order created from admin panel')
            };

            const res = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            const resData = await res.json();
            if (!res.ok || resData.error) {
                throw new Error(resData.error || 'Failed to create manual order');
            }

            const createdOrderId = resData.orderId;

            setNotification({ message: `Manual Order #${createdOrderId} Created Successfully with ACID transaction guarantee!`, type: 'success' });
            setIsAddingOrder(false);
            setNewOrder({
                customer_id: null,
                customer_type: 'existing',
                customer_name: '',
                billing_email: '',
                billing_phone: '',
                billing_address: '',
                billing_city: '',
                billing_pincode: '',
                billing_state: 'Tamil Nadu',
                shipping_email: '',
                shipping_phone: '',
                shipping_address: '',
                shipping_city: '',
                shipping_pincode: '',
                shipping_state: 'Tamil Nadu',
                same_as_billing: true,
                payment_method: 'UPI',
                status: 'PAID',
                send_notifications: 'both',
                items: [],
                is_replacement: false,
                manual_shipping_cost: '',
                discount_type: 'FLAT',
                discount_value: '',
                admin_notes: ''
            });
            setSelectedCustomer(null);

            // Re-fetch catalog products to update live stock indicators
            if (typeof fetchCatalogProducts === 'function') {
                await fetchCatalogProducts();
            }
            if (typeof fetchOrders === 'function') {
                fetchOrders();
            }
        } catch (err) {
            console.error('Manual Order Error:', err);
            setNotification({ message: `Failed to create order: ${err.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setIsCreatingOrder(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // Filter products for search
    const filteredProducts = allProducts.filter(p => {
        if (!productSearch) return false;
        const q = productSearch.toLowerCase().trim();
        const cleanQ = q.replace(/^#+/, '').trim();
        const pNoStr = String(p.product_no || '').trim();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesCatalogId = (p.product_catalog_image_id || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(cleanQ);
        const matchesProductNo = (pNoStr && (pNoStr.includes(cleanQ) || (`#${pNoStr}`).toLowerCase().includes(q)));
        const matchesVariant = (p.variants || []).some(v =>
            (v.name || '').toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(cleanQ)
        );
        return matchesName || matchesCatalogId || matchesSku || matchesProductNo || matchesVariant;
    });

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                width: '100%', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
            }}>
                <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 800 }}>
                        <Package size={24} color="hsl(var(--primary))" /> Manual Order Creation
                    </h2>
                    <button type="button" onClick={() => setIsAddingOrder(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>

                    {/* 1. Customer Type Selector & Auto-fill */}
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Customer Information</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Select an existing customer to auto-fill billing details or create a new profile.</p>
                            </div>

                            {/* Toggle Pill Buttons */}
                            <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleCustomerTypeChange('existing')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: customerType === 'existing' ? '#ffffff' : 'transparent',
                                        color: customerType === 'existing' ? 'hsl(var(--primary))' : '#64748b',
                                        boxShadow: customerType === 'existing' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                >
                                    <UserCheck size={16} /> Existing Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCustomerTypeChange('new')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: customerType === 'new' ? '#ffffff' : 'transparent',
                                        color: customerType === 'new' ? 'hsl(var(--primary))' : '#64748b',
                                        boxShadow: customerType === 'new' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                >
                                    <UserPlus size={16} /> New Customer
                                </button>
                            </div>
                        </div>

                        {/* Existing Customer Search Dropdown */}
                        {customerType === 'existing' && (
                            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                {!selectedCustomer ? (
                                    <>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
                                            Search Customer (Name, Mobile, or Email)
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                            <input
                                                type="text"
                                                placeholder="Type customer name, phone (e.g. 9876543210), or email..."
                                                value={customerSearch}
                                                onChange={e => setCustomerSearch(e.target.value)}
                                                style={{ width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.75rem', borderRadius: '12px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.95rem' }}
                                            />
                                            {isLoadingCustomers && (
                                                <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                            )}
                                        </div>

                                        {customerSearch && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px', marginTop: '6px', zIndex: 60, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.15)' }}>
                                                {filteredCustomers.length === 0 ? (
                                                    <div style={{ padding: '1.25rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                                                        No customer profile found for &quot;{customerSearch}&quot;
                                                    </div>
                                                ) : (
                                                    filteredCustomers.map(cust => (
                                                        <div
                                                            key={cust.id}
                                                            onClick={() => handleSelectCustomer(cust)}
                                                            style={{
                                                                padding: '0.85rem 1.25rem',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <User size={14} color="hsl(var(--primary))" />
                                                                    {cust.name || 'Unnamed Customer'}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                                                                    {cust.phone && <span>📞 {cust.phone}</span>}
                                                                    {cust.email && <span>✉️ {cust.email}</span>}
                                                                    {cust.city && <span>📍 {cust.city}, {cust.state || ''}</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                style={{ padding: '0.35rem 0.8rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                                                            >
                                                                Select & Auto-fill
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Selected Customer Card */
                                    <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ background: '#10b981', color: '#ffffff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <UserCheck size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {selectedCustomer.name || 'Customer Profile'}
                                                    <span style={{ fontSize: '0.7rem', background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                                                        ID: {selectedCustomer.id}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>
                                                    {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                                                    {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                                                    {selectedCustomer.city && <span>📍 {selectedCustomer.city}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleClearCustomer}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.4rem 0.85rem',
                                                borderRadius: '8px',
                                                border: '1px solid #6ee7b7',
                                                background: '#ffffff',
                                                color: '#065f46',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={14} /> Clear / Choose Another
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {customerType === 'new' && (
                            <div style={{ fontSize: '0.85rem', color: '#0284c7', background: '#f0f9ff', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserPlus size={16} /> Enter details below to create a fresh customer record automatically with this order.
                            </div>
                        )}
                    </div>

                    {/* 2. Billing Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ gridColumn: 'span 2', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Billing Details</h3>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Customer Name *</label>
                            <input type="text" placeholder="John Doe" value={newOrder.customer_name} onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Email</label>
                            <input type="email" placeholder="billing@email.com (Optional)" value={newOrder.billing_email || ''} onChange={e => setNewOrder({ ...newOrder, billing_email: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Phone *</label>
                            <input type="tel" placeholder="9876543210" value={newOrder.billing_phone} onChange={e => setNewOrder({ ...newOrder, billing_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Address *</label>
                            <textarea rows={2} placeholder="Full billing address..." value={newOrder.billing_address} onChange={e => setNewOrder({ ...newOrder, billing_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'vertical' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing City *</label>
                            <input type="text" placeholder="City" value={newOrder.billing_city} onChange={e => setNewOrder({ ...newOrder, billing_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Pincode *</label>
                            <input type="text" placeholder="600001" value={newOrder.billing_pincode} onChange={e => setNewOrder({ ...newOrder, billing_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing State</label>
                            <select value={newOrder.billing_state} onChange={e => setNewOrder({ ...newOrder, billing_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Shipping Details</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                                <input type="checkbox" checked={newOrder.same_as_billing} onChange={e => setNewOrder({ ...newOrder, same_as_billing: e.target.checked })} />
                                Same as Billing
                            </label>
                        </div>

                        {!newOrder.same_as_billing && (
                            <>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Address *</label>
                                    <textarea rows={2} placeholder="Full shipping address..." value={newOrder.shipping_address} onChange={e => setNewOrder({ ...newOrder, shipping_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'vertical' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping City *</label>
                                    <input type="text" placeholder="City" value={newOrder.shipping_city} onChange={e => setNewOrder({ ...newOrder, shipping_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Pincode *</label>
                                    <input type="text" placeholder="600001" value={newOrder.shipping_pincode} onChange={e => setNewOrder({ ...newOrder, shipping_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping State</label>
                                    <select value={newOrder.shipping_state} onChange={e => setNewOrder({ ...newOrder, shipping_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                        {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Phone</label>
                                    <input type="tel" placeholder="9876543210" value={newOrder.shipping_phone} onChange={e => setNewOrder({ ...newOrder, shipping_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                            </>
                        )}

                        {/* 3. Order & Payment Options */}
                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'hsl(var(--primary))' }}>Order & Payment Options</h3>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                            <select value={newOrder.payment_method || 'UPI'} onChange={e => setNewOrder({ ...newOrder, payment_method: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                <option value="UPI">UPI / GPay / PhonePe</option>
                                <option value="COD">Cash on Delivery (COD)</option>
                                <option value="CASH">Cash in Hand / Store Counter</option>
                                <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/IMPS)</option>
                                <option value="CARD">Credit / Debit Card</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Order & Payment Status</label>
                            <select value={newOrder.status || 'PAID'} onChange={e => setNewOrder({ ...newOrder, status: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                <option value="PAID">PAID (Payment Complete & Verified)</option>
                                <option value="PLACED">PLACED (Order Created / Pending Payment)</option>
                                <option value="AWAITING_PAYMENT">AWAITING_PAYMENT (Awaiting Customer Transfer)</option>
                                <option value="PACKING">PACKING (Order in Processing / Packing)</option>
                            </select>
                        </div>

                        {/* Order Discount Option */}
                        <div style={{ gridColumn: 'span 2', background: '#fdfbf7', padding: '1.25rem 1.5rem', borderRadius: '14px', border: '1.5px solid #f0e6d2' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#5d0821', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Percent size={16} /> Order Discount (Optional)
                                </label>

                                {/* Discount Type Pill */}
                                <div style={{ display: 'flex', background: '#eee2d0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setNewOrder({ ...newOrder, discount_type: 'FLAT' })}
                                        style={{
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '7px',
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            background: newOrder.discount_type !== 'PERCENT' ? '#ffffff' : 'transparent',
                                            color: newOrder.discount_type !== 'PERCENT' ? '#5d0821' : '#785f54',
                                            boxShadow: newOrder.discount_type !== 'PERCENT' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                    >
                                        ₹ Flat Amount
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewOrder({ ...newOrder, discount_type: 'PERCENT' })}
                                        style={{
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '7px',
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            background: newOrder.discount_type === 'PERCENT' ? '#ffffff' : 'transparent',
                                            color: newOrder.discount_type === 'PERCENT' ? '#5d0821' : '#785f54',
                                            boxShadow: newOrder.discount_type === 'PERCENT' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                    >
                                        % Percentage
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder={newOrder.discount_type === 'PERCENT' ? 'Enter percentage discount e.g. 10' : 'Enter flat discount amount in ₹ e.g. 250'}
                                        value={newOrder.discount_value || ''}
                                        onChange={e => setNewOrder({ ...newOrder, discount_value: e.target.value })}
                                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: '#ffffff', border: '1px solid #d9c5b2', color: 'hsl(var(--text-main))', fontWeight: 600 }}
                                    />
                                </div>

                                {discountAmount > 0 && (
                                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Check size={16} /> Discount Applied: -₹{discountAmount.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Send Notifications</label>
                            <select value={newOrder.send_notifications || 'both'} onChange={e => setNewOrder({ ...newOrder, send_notifications: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                <option value="both">WhatsApp & Email</option>
                                <option value="whatsapp">Only WhatsApp</option>
                                <option value="email">Only Email</option>
                                <option value="none">No Notifications</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Manual Shipping Rate (Optional)</label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="Auto-calculated from shipping zone"
                                value={newOrder.manual_shipping_cost}
                                onChange={e => setNewOrder({ ...newOrder, manual_shipping_cost: e.target.value })}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Admin Notes / Reference</label>
                            <input
                                type="text"
                                placeholder="e.g. WhatsApp In-store pickup / Replacement for order #WEB-1002"
                                value={newOrder.admin_notes || ''}
                                onChange={e => setNewOrder({ ...newOrder, admin_notes: e.target.value })}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                            <input
                                type="checkbox"
                                id="is_replacement"
                                checked={Boolean(newOrder.is_replacement)}
                                onChange={e => setNewOrder({ ...newOrder, is_replacement: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="is_replacement" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                                Replacement Order (Zero Billing - Sets items and tax to ₹0 while strictly syncing inventory)
                            </label>
                        </div>
                    </div>

                    {/* 4. Item Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: 0 }}>Add Products & Variants</label>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{allProducts.length} items loaded in catalog</span>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text"
                                placeholder="Search by product name, variant, SKU, or catalog ID..."
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                style={{ width: '100%', padding: '0.9rem 0.9rem 0.9rem 2.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.95rem' }}
                            />
                            {productSearch && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px', marginTop: '6px', zIndex: 50, maxHeight: '350px', overflowY: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.15)' }}>
                                    {filteredProducts.length === 0 ? (
                                        <div style={{ padding: '1.25rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                                            No products found matching &quot;{productSearch}&quot;
                                        </div>
                                    ) : (
                                        filteredProducts.map(p => {
                                            const hasVariants = p.variants && p.variants.length > 0;
                                            const isOutOfStock = !hasVariants && Number(p.stock || 0) <= 0;

                                            return (
                                                <div key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    {/* Parent Product Header */}
                                                    <div style={{ padding: '0.75rem 1rem', background: hasVariants ? '#f8fafc' : '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                            <ProductThumbnail src={p.image_url} alt={p.name} size={46} borderRadius="10px" />
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.95rem' }}>{p.name}</div>
                                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                    {p.sku && <span>SKU: {p.sku}</span>}
                                                                    {p.category && <span>• {p.category}</span>}
                                                                    {!hasVariants && (
                                                                        <span style={{
                                                                            color: Number(p.stock) > 0 ? '#16a34a' : '#dc2626',
                                                                            fontWeight: 700,
                                                                            background: Number(p.stock) > 0 ? '#dcfce7' : '#fee2e2',
                                                                            padding: '1px 6px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            {Number(p.stock) > 0 ? `Stock: ${p.stock}` : 'Out of Stock (0)'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {!hasVariants ? (
                                                            <button
                                                                type="button"
                                                                disabled={isOutOfStock}
                                                                onClick={() => handleSelectProductOrVariant(p, null)}
                                                                style={{
                                                                    padding: '0.4rem 0.85rem',
                                                                    background: isOutOfStock ? '#cbd5e1' : 'hsl(var(--primary))',
                                                                    color: isOutOfStock ? '#64748b' : '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.85rem',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {isOutOfStock ? 'Out of Stock' : `+ Add ₹${Number(p.price || 0).toLocaleString()}`}
                                                            </button>
                                                        ) : (
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                <Layers size={12} /> {p.variants.length} Variants
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Variant Options List */}
                                                    {hasVariants && (
                                                        <div style={{ paddingLeft: '1.25rem', background: '#ffffff' }}>
                                                            {p.variants.map(v => {
                                                                const isVariantOutOfStock = Number(v.stock || 0) <= 0;
                                                                return (
                                                                    <div
                                                                        key={v.id}
                                                                        onClick={() => {
                                                                            if (!isVariantOutOfStock) handleSelectProductOrVariant(p, v);
                                                                        }}
                                                                        style={{
                                                                            padding: '0.6rem 1rem',
                                                                            cursor: isVariantOutOfStock ? 'not-allowed' : 'pointer',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            gap: '0.75rem',
                                                                            borderTop: '1px dashed #f1f5f9',
                                                                            opacity: isVariantOutOfStock ? 0.6 : 1,
                                                                            transition: 'background 0.15s'
                                                                        }}
                                                                        onMouseEnter={e => {
                                                                            if (!isVariantOutOfStock) e.currentTarget.style.background = '#f1f5f9';
                                                                        }}
                                                                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                                            <ProductThumbnail src={v.image_url || p.image_url} alt={v.name} size={36} borderRadius="8px" />
                                                                            <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>↳ {v.name}</span>
                                                                                    {v.sku && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({v.sku})</span>}
                                                                                    <span style={{
                                                                                        fontSize: '0.7rem',
                                                                                        fontWeight: 700,
                                                                                        color: Number(v.stock) > 0 ? '#16a34a' : '#dc2626',
                                                                                        background: Number(v.stock) > 0 ? '#dcfce7' : '#fee2e2',
                                                                                        padding: '1px 5px',
                                                                                        borderRadius: '4px'
                                                                                    }}>
                                                                                        {Number(v.stock) > 0 ? `Stock: ${v.stock}` : 'Out of Stock (0)'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', whiteSpace: 'nowrap' }}>
                                                                            <span style={{ fontWeight: 700, color: 'hsl(var(--primary))', fontSize: '0.85rem' }}>₹{Number(v.price || p.price || 0).toLocaleString()}</span>
                                                                            <button
                                                                                type="button"
                                                                                disabled={isVariantOutOfStock}
                                                                                style={{
                                                                                    padding: '0.25rem 0.6rem',
                                                                                    background: isVariantOutOfStock ? '#cbd5e1' : '#0284c7',
                                                                                    color: isVariantOutOfStock ? '#64748b' : '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: '6px',
                                                                                    cursor: isVariantOutOfStock ? 'not-allowed' : 'pointer',
                                                                                    fontWeight: 600,
                                                                                    fontSize: '0.75rem'
                                                                                }}
                                                                            >
                                                                                {isVariantOutOfStock ? 'Out of Stock' : '+ Add'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Items Table / Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {newOrder.items.map((item, idx) => {
                                const isItemReplacement = Boolean(newOrder.is_replacement);
                                const itemLineTotal = isItemReplacement ? 0 : Number(item.price || 0) * Number(item.quantity || 1);
                                const maxAvailableStock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : 999999;
                                const isAtMaxStock = item.stock !== undefined && item.stock !== null && item.quantity >= maxAvailableStock;

                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <ProductThumbnail src={item.image_url} alt={item.product_name} size={50} borderRadius="10px" />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{item.product_name}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                                {item.variant_name && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '2px 8px', borderRadius: '6px' }}>
                                                        {item.variant_name}
                                                    </span>
                                                )}
                                                {item.sku && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.sku}</span>}
                                                {item.stock !== undefined && (
                                                    <span style={{ fontSize: '0.75rem', color: Number(item.stock) > 0 ? '#16a34a' : '#dc2626', fontWeight: 700, background: Number(item.stock) > 0 ? '#dcfce7' : '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                                                        Max Available: {item.stock}
                                                    </span>
                                                )}
                                                {isAtMaxStock && (
                                                    <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <AlertTriangle size={11} /> Stock Limit Reached
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unit Price Override Input */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '110px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Unit Price (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                disabled={isItemReplacement}
                                                value={isItemReplacement ? 0 : item.price}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setNewOrder({ ...newOrder, items: newOrder.items.map((it, i) => i === idx ? { ...it, price: val } : it) });
                                                }}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontWeight: 700, textAlign: 'right' }}
                                            />
                                        </div>

                                        {/* Quantity Input (Capped by Available Stock) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '85px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>
                                                Qty (Max {maxAvailableStock})
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={maxAvailableStock}
                                                value={item.quantity}
                                                onChange={e => {
                                                    const parsedVal = parseInt(e.target.value);
                                                    if (isNaN(parsedVal)) return;
                                                    let val = parsedVal;
                                                    if (val < 1) val = 1;
                                                    if (val > maxAvailableStock) {
                                                        val = maxAvailableStock;
                                                        setNotification({
                                                            message: `Maximum available stock for "${item.product_name}" is ${maxAvailableStock}.`,
                                                            type: 'error'
                                                        });
                                                    }
                                                    setNewOrder({ ...newOrder, items: newOrder.items.map((it, i) => i === idx ? { ...it, quantity: val } : it) });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.45rem',
                                                    borderRadius: '6px',
                                                    background: '#ffffff',
                                                    border: isAtMaxStock ? '1.5px solid #f59e0b' : '1px solid hsl(var(--border-subtle))',
                                                    color: 'hsl(var(--text-main))',
                                                    fontWeight: 800,
                                                    textAlign: 'center'
                                                }}
                                            />
                                        </div>

                                        {/* Line Total */}
                                        <div style={{ width: '110px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Line Total</div>
                                            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: isItemReplacement ? '#16a34a' : 'hsl(var(--primary))' }}>
                                                ₹{itemLineTotal.toLocaleString()}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, i) => i !== idx) })}
                                            style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Remove item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                            {newOrder.items.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2.5rem', border: '2px dashed hsl(var(--border-subtle))', borderRadius: '16px', color: '#94a3b8', background: '#fafafa' }}>
                                    <Package size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                                    <div style={{ fontWeight: 600 }}>No items added yet</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Search products or variants above to add them to this order.</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. Summary & Save */}
                    <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '18px', border: '1.5px solid hsl(var(--primary) / 0.2)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>Subtotal ({newOrder.items.reduce((q, i) => q + Number(i.quantity || 1), 0)} items):</span>
                                <span style={{ fontWeight: 700 }}>₹{subtotal.toLocaleString()}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                                    <span>Discount ({newOrder.discount_type === 'PERCENT' ? `${newOrder.discount_value}%` : 'Flat ₹' + newOrder.discount_value}):</span>
                                    <span>-₹{discountAmount.toLocaleString()}</span>
                                </div>
                            )}

                            {discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
                                    <span>Taxable Subtotal:</span>
                                    <span style={{ fontWeight: 700 }}>₹{taxableSubtotal.toLocaleString()}</span>
                                </div>
                            )}

                            {cgst > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>CGST (2.5%):</span>
                                    <span style={{ fontWeight: 700 }}>₹{cgst.toLocaleString()}</span>
                                </div>
                            )}
                            {sgst > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>SGST (2.5%):</span>
                                    <span style={{ fontWeight: 700 }}>₹{sgst.toLocaleString()}</span>
                                </div>
                            )}
                            {igst > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>IGST (5%):</span>
                                    <span style={{ fontWeight: 700 }}>₹{igst.toLocaleString()}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>Shipping:</span>
                                <span style={{ fontWeight: 700 }}>{shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString()}`}</span>
                            </div>
                            <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.5rem 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>
                                <span>Final Amount:</span>
                                <span>₹{total.toLocaleString()}</span>
                            </div>
                            {newOrder.is_replacement && (
                                <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, textAlign: 'right' }}>
                                    ✓ Zero-cost replacement order enabled
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={isCreatingOrder}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                                color: 'white',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                boxShadow: '0 10px 25px hsl(var(--primary) / 0.25)'
                            }}
                        >
                            {isCreatingOrder ? (
                                <><Loader2 className="animate-spin" size={20} /> Placing & Syncing Inventory...</>
                            ) : (
                                <><Check size={20} /> Confirm & Place Manual Order</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
