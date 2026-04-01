'use client';

import { useState, useEffect } from 'react';
import {
    Megaphone, Users, Send, CheckCircle2, Loader2, Search,
    Package, Tag, Check, ChevronDown, ChevronUp,
    UserCheck, ShoppingCart, Filter, MessageSquare, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function BroadcastPage() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);

    // Selection state
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [selectedCustomers, setSelectedCustomers] = useState(new Set());
    const [message, setMessage] = useState('Check out our newest collection!');

    // Filters
    const [productGroupFilter, setProductGroupFilter] = useState('ALL');
    const [productSearch, setProductSearch] = useState('');
    const [customerTierFilter, setCustomerTierFilter] = useState('ALL');
    const [customerSearch, setCustomerSearch] = useState('');

    // Collapse sections
    const [productSectionOpen, setProductSectionOpen] = useState(true);
    const [customerSectionOpen, setCustomerSectionOpen] = useState(true);

    // Send state
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({ sent: 0, total: 0, failed: 0 });
    const [completed, setCompleted] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm }
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        setHasMounted(true);
        const load = async () => {
            // Get products
            const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
            setProducts(prodData || []);

            // Get unique customers from orders
            const { data: orderData } = await supabase.from('orders').select('*').neq('status', 'DRAFT').order('created_at', { ascending: false });

            const customerMap = {};
            (orderData || []).forEach(o => {
                const phone = o.customer_phone;
                if (!phone) return;
                if (!customerMap[phone]) {
                    customerMap[phone] = {
                        phone,
                        name: o.customer_name || 'WhatsApp Customer',
                        totalOrders: 0,
                        totalSpent: 0,
                        lastOrder: o.created_at,
                    };
                }
                customerMap[phone].totalOrders++;
                customerMap[phone].totalSpent += o.total_amount || 0;
                if (o.customer_name && o.customer_name !== 'WhatsApp Customer') {
                    customerMap[phone].name = o.customer_name;
                }
            });

            setCustomers(Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent));
            setLoading(false);
        };
        load();
    }, []);

    // ─── HELPERS ────────────────────────────────────────────────────
    const getTier = (spent) => {
        if (spent >= 20000) return 'VIP';
        if (spent >= 10000) return 'Gold';
        if (spent >= 5000) return 'Silver';
        return 'Regular';
    };

    const getTierStyle = (tier) => {
        switch (tier) {
            case 'VIP': return { bg: 'linear-gradient(135deg, hsl(43 96% 64%), hsl(28 92% 54%))', color: '#3f2203', label: 'VIP' };
            case 'Gold': return { bg: 'hsl(48 96% 89%)', color: 'hsl(38 92% 50%)', label: 'Gold' };
            case 'Silver': return { bg: '#f1f5f9', color: 'hsl(var(--text-muted))', label: 'Silver' };
            default: return { bg: 'transparent', color: 'hsl(var(--text-muted))', label: 'Regular' };
        }
    };

    // ─── PRODUCT GROUPS ─────────────────────────────────────────────
    const productGroups = ['ALL', ...new Set(products.map(p => p.product_group).filter(Boolean))];
    const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    const filteredProducts = products.filter(p => {
        const matchGroup = productGroupFilter === 'ALL' || p.product_group === productGroupFilter || p.category === productGroupFilter;
        const matchSearch = !productSearch || (p.name || '').toLowerCase().includes(productSearch.toLowerCase());
        return matchGroup && matchSearch;
    });

    // ─── CUSTOMER TIERS ─────────────────────────────────────────────
    const filteredCustomers = customers.filter(c => {
        const tier = getTier(c.totalSpent);
        const matchTier = customerTierFilter === 'ALL' || tier === customerTierFilter;
        const matchSearch = !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch);
        return matchTier && matchSearch;
    });

    // ─── SELECTION HANDLERS ─────────────────────────────────────────
    const toggleProduct = (id) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAllFilteredProducts = () => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            const allSelected = filteredProducts.every(p => next.has(p.id));
            if (allSelected) {
                filteredProducts.forEach(p => next.delete(p.id));
            } else {
                filteredProducts.forEach(p => next.add(p.id));
            }
            return next;
        });
    };

    const toggleCustomer = (phone) => {
        setSelectedCustomers(prev => {
            const next = new Set(prev);
            next.has(phone) ? next.delete(phone) : next.add(phone);
            return next;
        });
    };

    const selectAllFilteredCustomers = () => {
        setSelectedCustomers(prev => {
            const next = new Set(prev);
            const allSelected = filteredCustomers.every(c => next.has(c.phone));
            if (allSelected) {
                filteredCustomers.forEach(c => next.delete(c.phone));
            } else {
                filteredCustomers.forEach(c => next.add(c.phone));
            }
            return next;
        });
    };

    // ─── BROADCAST SENDER ───────────────────────────────────────────
    const startBroadcast = async () => {
        const targetCustomers = customers.filter(c => selectedCustomers.has(c.phone));
        const targetProducts = products.filter(p => selectedProducts.has(p.id));

        if (targetCustomers.length === 0) return setNotification({ message: '⚠️ Please select at least one customer.', type: 'error' });
        if (!message.trim()) return setNotification({ message: '⚠️ Please enter a broadcast message.', type: 'error' });

        const confirmMsg = targetProducts.length > 0
            ? `Send broadcast with ${targetProducts.length} product(s) to ${targetCustomers.length} customer(s)?`
            : `Send broadcast message to ${targetCustomers.length} customer(s)?`;

        setConfirmAction({
            title: 'Start Broadcast?',
            message: confirmMsg,
            onConfirm: async () => {
                setConfirmAction(null);
                setSending(true);
                setCompleted(false);
                setStats({ sent: 0, total: targetCustomers.length, failed: 0 });

                for (let i = 0; i < targetCustomers.length; i++) {
                    const customer = targetCustomers[i];
                    try {
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                        const customerPhone = customer.phone;
                        const shopUrl = `${baseUrl}/shop?phone=${encodeURIComponent(customerPhone)}`;

                        if (targetProducts.length > 0) {
                            for (const product of targetProducts) {
                                let mergedMsg = message.replace('{{name}}', customer.name);
                                mergedMsg += `\n\n*${product.name}*`;
                                mergedMsg += `\n💰 ₹${product.price}`;
                                if (product.variants && product.variants.length > 0) mergedMsg += `\n📦 Variants: ${product.variants.join(', ')}`;

                                const pUrl = `${shopUrl}&view=${product.id}`;
                                mergedMsg += `\n\n*View & Buy Here:* ${pUrl}`;

                                const mediaUrl = product.images?.[0] || null;

                                const res = await fetch('/api/admin/whatsapp/chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ phone: customerPhone, message: mergedMsg, mediaUrl })
                                });
                                if (!res.ok) throw new Error('Send failed');
                                await new Promise(r => setTimeout(r, 800)); // Delay between products
                            }
                        } else {
                            let mergedMsg = message.replace('{{name}}', customer.name);
                            mergedMsg += `\n\n*Visit our shop:* ${shopUrl}`;

                            const res = await fetch('/api/admin/whatsapp/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: customerPhone, message: mergedMsg })
                            });
                            if (!res.ok) throw new Error('Send failed');
                        }

                        setStats(prev => ({ ...prev, sent: prev.sent + 1 }));
                    } catch (err) {
                        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
                    }
                    await new Promise(r => setTimeout(r, 1000)); // Delay between customers
                }

                setSending(false);
                setCompleted(true);
            }
        });
    };


    // ─── COMPUTED VALUES ────────────────────────────────────────────
    const selectedProductsList = products.filter(p => selectedProducts.has(p.id));
    const selectedCustomersList = customers.filter(c => selectedCustomers.has(c.phone));

    const inputStyle = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)',
        background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
    };

    const pillStyle = (active) => ({
        padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s', border: 'none',
        background: active ? 'hsl(var(--primary))' : '#ffffff',
        color: active ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
        outline: active ? 'none' : '1px solid hsl(var(--border-subtle))',
    });

    const checkboxStyle = (checked) => ({
        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
        background: checked ? 'hsl(var(--primary))' : 'transparent',
        border: checked ? '2px solid hsl(var(--primary))' : '2px solid hsl(var(--border-subtle))',
        color: 'white'
    });

    if (!hasMounted || loading) {
        return (
            <div className="animate-enter">
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
                    <p>{!hasMounted ? 'Initializing...' : 'Fetching data...'}</p>
                </div>
                <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            <div className="animate-enter">
            {/* Header */}
                <div>
                    <h1>Broadcast Center</h1>
                    <p>Group products & customers, then broadcast targeted messages via WhatsApp</p>
                </div>

            {/* Quick Stats */}
            <div className="admin-grid-3" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Products Selected', value: selectedProducts.size, total: products.length, icon: <Package size={18} />, color: 'hsl(var(--primary))' },
                    { label: 'Customers Selected', value: selectedCustomers.size, total: customers.length, icon: <Users size={18} />, color: 'hsl(var(--accent))' },
                    { label: 'Messages to Send', value: selectedCustomers.size * Math.max(selectedProducts.size, 1), icon: <MessageSquare size={18} />, color: 'hsl(var(--success))' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: s.color, fontFamily: 'var(--font-heading)' }}>
                                {s.value}{s.total ? <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}> / {s.total}</span> : null}
                            </div>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `color-mix(in srgb, ${s.color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
                {/* LEFT COLUMN: Product & Customer Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ═══ STEP 1: SELECT PRODUCTS ═══ */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Section Header - Collapsible */}
                        <div
                            onClick={() => setProductSectionOpen(!productSectionOpen)}
                            style={{
                                padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', background: '#f1f5f9', borderBottom: productSectionOpen ? '1px solid hsl(var(--border-subtle))' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: selectedProducts.size > 0 ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                                    color: 'white'
                                }}>
                                    {selectedProducts.size > 0 ? <Check size={14} /> : '1'}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                                    Select Products
                                    {selectedProducts.size > 0 && <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>({selectedProducts.size} selected)</span>}
                                </h3>
                            </div>
                            {productSectionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>

                        {productSectionOpen && (
                            <div style={{ padding: '1.25rem' }}>
                                {/* Filters Row */}
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    {/* Search */}
                                    <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                        <input type="text" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                            style={{ ...inputStyle, paddingLeft: '2rem', fontSize: '0.8rem' }} />
                                    </div>
                                    {/* Select All */}
                                    <button onClick={selectAllFilteredProducts} style={{
                                        ...pillStyle(filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id))),
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <Check size={12} /> {filteredProducts.every(p => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {/* Group / Category Filter Tabs */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem', alignItems: 'center' }}>
                                    <Tag size={13} style={{ color: 'hsl(var(--text-muted))' }} />
                                    <button onClick={() => setProductGroupFilter('ALL')} style={pillStyle(productGroupFilter === 'ALL')}>All</button>
                                    {productGroups.filter(g => g !== 'ALL').map(g => (
                                        <button key={`g_${g}`} onClick={() => setProductGroupFilter(g)} style={{
                                            ...pillStyle(productGroupFilter === g),
                                            background: productGroupFilter === g ? 'hsl(var(--accent))' : pillStyle(false).background,
                                        }}>{g}</button>
                                    ))}
                                    {productCategories.map(c => (
                                        <button key={`c_${c}`} onClick={() => setProductGroupFilter(c)} style={pillStyle(productGroupFilter === c)}>{c}</button>
                                    ))}
                                </div>

                                {/* Product Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', padding: '0.25rem' }}>
                                    {filteredProducts.map(p => {
                                        const isSelected = selectedProducts.has(p.id);
                                        return (
                                            <div key={p.id} onClick={() => toggleProduct(p.id)}
                                                style={{
                                                    padding: '0.5rem', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s',
                                                    border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                                    background: isSelected ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--bg-panel))',
                                                    position: 'relative'
                                                }}>
                                                {/* Checkbox */}
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2 }}>
                                                    <div style={checkboxStyle(isSelected)}>{isSelected && <Check size={12} strokeWidth={3} />}</div>
                                                </div>
                                                {/* Image */}
                                                <div style={{ height: '85px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                                                    <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'; }} />
                                                </div>
                                                {/* Info */}
                                                <div style={{ fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <span style={{ color: 'hsl(var(--primary))', fontWeight: 700, fontSize: '0.75rem' }}>₹{(p.price || 0).toLocaleString()}</span>
                                                    {p.product_group && (
                                                        <span style={{ padding: '1px 5px', borderRadius: '9999px', fontSize: '0.55rem', fontWeight: 700, background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))' }}>
                                                            {p.product_group}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredProducts.length === 0 && (
                                        <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>No products match the filter.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ STEP 2: SELECT CUSTOMERS ═══ */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Section Header - Collapsible */}
                        <div
                            onClick={() => setCustomerSectionOpen(!customerSectionOpen)}
                            style={{
                                padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', background: '#f1f5f9', borderBottom: customerSectionOpen ? '1px solid hsl(var(--border-subtle))' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: selectedCustomers.size > 0 ? 'hsl(var(--success))' : 'hsl(var(--accent))',
                                    color: 'white'
                                }}>
                                    {selectedCustomers.size > 0 ? <Check size={14} /> : '2'}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                                    Select Customers
                                    {selectedCustomers.size > 0 && <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'hsl(var(--accent))', marginLeft: '0.5rem' }}>({selectedCustomers.size} selected)</span>}
                                </h3>
                            </div>
                            {customerSectionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>

                        {customerSectionOpen && (
                            <div style={{ padding: '1.25rem' }}>
                                {/* Filters Row */}
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    {/* Search */}
                                    <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                        <input type="text" placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                                            style={{ ...inputStyle, paddingLeft: '2rem', fontSize: '0.8rem' }} />
                                    </div>
                                    {/* Select All */}
                                    <button onClick={selectAllFilteredCustomers} style={{
                                        ...pillStyle(filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomers.has(c.phone))),
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <UserCheck size={12} /> {filteredCustomers.every(c => selectedCustomers.has(c.phone)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {/* Tier Filter */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem', alignItems: 'center' }}>
                                    <Filter size={13} style={{ color: 'hsl(var(--text-muted))' }} />
                                    {['ALL', 'VIP', 'Gold', 'Silver', 'Regular'].map(tier => (
                                        <button key={tier} onClick={() => setCustomerTierFilter(tier)} style={{
                                            ...pillStyle(customerTierFilter === tier),
                                            background: customerTierFilter === tier
                                                ? tier === 'VIP' ? 'linear-gradient(135deg, hsl(43 96% 64%), hsl(28 92% 54%))' : 'hsl(var(--primary))'
                                                : pillStyle(false).background,
                                            color: customerTierFilter === tier ? (tier === 'VIP' ? '#3f2203' : 'hsl(var(--bg-app))') : 'hsl(var(--text-muted))',
                                        }}>
                                            {tier === 'ALL' ? 'All Customers' : tier === 'VIP' ? 'VIP (₹20k+)' : tier === 'Gold' ? 'Gold (₹10k+)' : tier === 'Silver' ? 'Silver (₹5k+)' : 'Regular'}
                                        </button>
                                    ))}
                                </div>

                                {/* Customer List */}
                                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid hsl(var(--border-subtle))', borderRadius: '10px' }}>
                                    {filteredCustomers.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>No customers match the filter.</div>
                                    ) : filteredCustomers.map((c, idx) => {
                                        const isSelected = selectedCustomers.has(c.phone);
                                        const tier = getTier(c.totalSpent);
                                        const tierStyle = getTierStyle(tier);
                                        return (
                                            <div key={c.phone} onClick={() => toggleCustomer(c.phone)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                    background: isSelected ? 'hsl(var(--primary) / 0.06)' : 'transparent',
                                                    borderBottom: idx < filteredCustomers.length - 1 ? '1px solid hsl(var(--border-subtle) / 0.5)' : 'none',
                                                }}>
                                                {/* Checkbox */}
                                                <div style={checkboxStyle(isSelected)}>{isSelected && <Check size={12} strokeWidth={3} />}</div>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '0.8rem', color: 'white'
                                                }}>
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'hsl(var(--text-main))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>{c.phone} • {c.totalOrders} order{c.totalOrders > 1 ? 's' : ''}</div>
                                                </div>
                                                {/* Tier & Spent */}
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, background: tierStyle.bg, color: tierStyle.color }}>
                                                        {tierStyle.label}
                                                    </span>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', marginTop: '2px' }}>₹{c.totalSpent.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ STEP 3: COMPOSE MESSAGE ═══ */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'hsl(var(--success))', color: 'white'
                            }}>3</div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Compose Message</h3>
                        </div>
                        <textarea
                            value={message} onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g. Don't miss out on this year's most beautiful silk saree! Only a few left in stock."
                            style={{
                                width: '100%', padding: '1rem', borderRadius: '10px', background: '#f1f5f9',
                                border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.9rem',
                                minHeight: '90px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: Summary & Send */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Campaign Summary</h3>

                        {/* Selected Products Summary */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Products ({selectedProducts.size})</div>
                            {selectedProductsList.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted) / 0.6)', padding: '0.5rem', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>No products selected (text-only broadcast)</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                                    {selectedProductsList.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.78rem' }}>
                                            <img src={p.image_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                                                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=50&q=60'; }} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{p.name}</span>
                                            <button onClick={() => toggleProduct(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: '2px', fontSize: '14px', lineHeight: 1 }}>&times;</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Customers Summary */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Customers ({selectedCustomers.size})</div>
                            {selectedCustomersList.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted) / 0.6)', padding: '0.5rem', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>No customers selected</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '180px', overflowY: 'auto' }}>
                                    {selectedCustomersList.slice(0, 10).map(c => (
                                        <div key={c.phone} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.75rem' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{c.name}</span>
                                            <button onClick={() => toggleCustomer(c.phone)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: '2px', fontSize: '14px', lineHeight: 1 }}>&times;</button>
                                        </div>
                                    ))}
                                    {selectedCustomersList.length > 10 && (
                                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '0.25rem' }}>
                                            +{selectedCustomersList.length - 10} more...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                                <span style={{ color: 'hsl(var(--text-muted))' }}>Total Messages:</span>
                                <strong>{selectedCustomers.size * Math.max(selectedProducts.size, 1)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                <span style={{ color: 'hsl(var(--text-muted))' }}>Delivery:</span>
                                <strong style={{ color: 'hsl(var(--success))' }}>WhatsApp</strong>
                            </div>
                        </div>

                        {/* Send Button */}
                        {!sending && !completed && (
                            <button
                                onClick={startBroadcast}
                                disabled={selectedCustomers.size === 0 || !message.trim()}
                                className="btn btn-primary"
                                style={{
                                    width: '100%', padding: '0.9rem', justifyContent: 'center', gap: '0.75rem',
                                    opacity: (selectedCustomers.size === 0 || !message.trim()) ? 0.5 : 1,
                                    cursor: (selectedCustomers.size === 0 || !message.trim()) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <Send size={18} /> Send Broadcast Now
                            </button>
                        )}

                        {/* Sending Progress */}
                        {sending && (
                            <div style={{ textAlign: 'center' }}>
                                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Broadcasting...</div>
                                <div className="badge badge-delivered" style={{ padding: '4px 12px' }}>
                                    {stats.sent} / {stats.total} Sent
                                </div>
                                {stats.failed > 0 && (
                                    <div style={{ color: 'hsl(var(--danger))', fontSize: '0.8rem', marginTop: '0.5rem' }}>{stats.failed} failed</div>
                                )}
                                <div style={{ width: '100%', height: '6px', background: '#ffffff', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                                    <div style={{ width: `${(stats.sent / stats.total) * 100}%`, height: '100%', background: 'hsl(var(--primary))', transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}

                        {/* Completed */}
                        {completed && (
                            <div style={{ textAlign: 'center', background: 'hsl(var(--success) / 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--success) / 0.3)' }}>
                                <CheckCircle2 size={36} style={{ color: 'hsl(var(--success))', marginBottom: '0.75rem' }} />
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--success))' }}>Broadcast Complete!</div>
                                <p style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                                    Sent to {stats.sent} customer{stats.sent > 1 ? 's' : ''}
                                    {stats.failed > 0 && <span style={{ color: 'hsl(var(--danger))' }}> ({stats.failed} failed)</span>}
                                </p>
                                <button
                                    onClick={() => { setCompleted(false); setSelectedProducts(new Set()); setSelectedCustomers(new Set()); }}
                                    className="btn btn-secondary"
                                    style={{ marginTop: '0.5rem', width: '100%' }}
                                >
                                    New Campaign
                                </button>
                            </div>
                        )}

                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                            ⚠️ Rapid bulk messaging may result in temporary WhatsApp account limitations. Messages are sent sequentially.
                        </div>
                    </div>
                </div>
            </div>
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </>
    );
}
