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
    const [activeTab, setActiveTab] = useState('PRODUCTS'); // PRODUCTS, CUSTOMERS, MESSAGE, SUMMARY

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
        if (spent >= 15000) return 'VIP';
        if (spent >= 7000) return 'Gold';
        if (spent >= 2000) return 'Silver';
        return 'Regular';
    };

    const getTierStyle = (tier) => {
        switch (tier) {
            case 'VIP': return { bg: 'hsl(var(--primary))', color: 'white', label: 'VIP' };
            case 'Gold': return { bg: 'hsl(var(--success))', color: 'white', label: 'Gold' };
            case 'Silver': return { bg: 'hsl(var(--warning))', color: 'white', label: 'Silver' };
            default: return { bg: '#94a3b8', color: 'white', label: 'Regular' };
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

        if (targetCustomers.length === 0) return setNotification({ message: 'Please select at least one customer.', type: 'error' });
        if (!message.trim()) return setNotification({ message: 'Please enter a broadcast message.', type: 'error' });

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
                        const customerPhone = String(customer.phone);
                        const shopUrl = `${baseUrl}/shop?phone=${encodeURIComponent(customerPhone)}`;

                        if (targetProducts.length > 0) {
                            for (const product of targetProducts) {
                                let mergedMsg = message.replace(/\{\{name\}\}/g, customer.name);
                                const productUrl = `${shopUrl}&view=${product.id}`;

                                if (mergedMsg.includes('{{product.name}}')) {
                                    mergedMsg = mergedMsg.replace(/\{\{product\.name\}\}/g, product.name);
                                    mergedMsg = mergedMsg.replace(/\{\{product\.price\}\}/g, product.price);
                                    mergedMsg = mergedMsg.replace(/\{\{product\.url\}\}/g, productUrl);
                                } else {
                                    mergedMsg += `\n\n*${product.name}*`;
                                    mergedMsg += `\n💰 ₹${product.price}`;
                                    
                                    let variantText = '';
                                    if (Array.isArray(product.variants) && product.variants.length > 0) {
                                        variantText = `\n📦 Variants: ${product.variants.join(', ')}`;
                                    } else if (typeof product.variants === 'string') {
                                        try {
                                            const parsed = JSON.parse(product.variants);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                variantText = `\n📦 Variants: ${parsed.join(', ')}`;
                                            }
                                        } catch(e) {}
                                    }
                                    mergedMsg += variantText;
                                    // mergedMsg += `\n\nView & Buy Here: ${productUrl}`;
                                }

                                const mediaUrl = product.image_url || null;

                                const token = localStorage.getItem('cast_prince_admin') || '';
                                const res = await fetch('/api/admin/whatsapp/chat', {
                                    method: 'POST',
                                    headers: { 
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}` 
                                    },
                                    body: JSON.stringify({ phone: customerPhone, message: mergedMsg, mediaUrl, productId: product.id })
                                });
                                if (!res.ok) throw new Error('Send failed');
                                await new Promise(r => setTimeout(r, 800)); // Delay between products
                            }
                        } else {
                            let mergedMsg = message.replace('{{name}}', customer.name);
                            mergedMsg += `\n\n*Visit our shop:* ${shopUrl}`;

                            const token = localStorage.getItem('cast_prince_admin') || '';
                            const res = await fetch('/api/admin/whatsapp/chat', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}` 
                                },
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
        background: checked ? 'hsl(var(--accent))' : 'transparent',
        border: checked ? '2px solid hsl(var(--accent))' : '2px solid hsl(var(--border-subtle))',
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
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ marginBottom: '0.25rem' }}>Broadcast Center</h1>
                    <p style={{ margin: 0, color: 'hsl(var(--text-muted))' }}>Sequence your campaign: Select Products → Target Customers → Compose Message → Send</p>
                </div>

                {/* Quick Stats */}
            <div className="admin-grid-3" style={{ marginBottom: '2rem' }}>
                {[
                    { label: 'Products', value: selectedProducts.size, total: products.length, icon: <Package size={18} />, color: 'hsl(var(--primary))' },
                    { label: 'Audience', value: selectedCustomers.size, total: customers.length, icon: <Users size={18} />, color: 'hsl(var(--accent))' },
                    { label: 'Broadcasts', value: selectedCustomers.size * Math.max(selectedProducts.size, 1), icon: <MessageSquare size={18} />, color: 'hsl(var(--success))' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem', color: 'hsl(var(--text-main))' }}>
                                {s.value}{s.total ? <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}> / {s.total}</span> : null}
                            </div>
                        </div>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `color-mix(in srgb, ${s.color} 10%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                    </div>
                ))}
            </div>

                {/* Attached Tab Navigation */}
                <div style={{ 
                    display: 'flex', gap: '4px', padding: '6px', background: 'white', 
                    borderRadius: '20px 20px 0 0', border: '1px solid hsl(var(--border-subtle))', borderBottom: 'none',
                    boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.05)'
                }}>
                    {[
                        { id: 'PRODUCTS', label: '1. Products', icon: <Package size={16} /> },
                        { id: 'CUSTOMERS', label: '2. Audience', icon: <Users size={16} /> },
                        { id: 'MESSAGE', label: '3. Message', icon: <MessageSquare size={16} /> },
                        { id: 'SUMMARY', label: '4. Summary', icon: <Send size={16} /> }
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        const isDone = (tab.id === 'PRODUCTS' && selectedProducts.size > 0) || 
                                       (tab.id === 'CUSTOMERS' && selectedCustomers.size > 0) ||
                                       (tab.id === 'MESSAGE' && message.trim().length > 0);

                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '0.85rem 1rem', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: isActive ? 'hsl(var(--primary))' : 'transparent',
                                    color: isActive ? 'white' : 'hsl(var(--text-muted))',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.85rem'
                                }}>
                                <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isActive ? 'rgba(255,255,255,0.2)' : (isDone ? 'hsl(var(--success))' : '#cbd5e1'),
                                    color: 'white'
                                }}>
                                    {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : tab.icon}
                                </div>
                                <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

            

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* ═══ TAB CONTENT ═══ */}
                <div className="animate-enter" key={activeTab}>
                    {activeTab === 'PRODUCTS' && (
                        <div className="card" style={{ padding: '1.5rem', borderRadius: '0 0 20px 20px', borderTop: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Select Products</h2>
                                    <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Choose the items you want to feature in this broadcast.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={selectAllFilteredProducts} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                                        {filteredProducts.every(p => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                    <input type="text" placeholder="Search products by name..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                        style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
                                </div>
                                {/* <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                    <button onClick={() => setProductGroupFilter('ALL')} style={pillStyle(productGroupFilter === 'ALL')}>All</button>
                                    {productGroups.filter(g => g !== 'ALL').map(g => (
                                        <button key={`g_${g}`} onClick={() => setProductGroupFilter(g)} style={pillStyle(productGroupFilter === g)}>{g}</button>
                                    ))}
                                    {productCategories.map(c => (
                                        <button key={`c_${c}`} onClick={() => setProductGroupFilter(c)} style={pillStyle(productGroupFilter === c)}>{c}</button>
                                    ))}
                                </div> */}
                            </div>

                            {/* Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', maxHeight: '500px', overflowY: 'auto', padding: '0.5rem' }}>
                                {filteredProducts.map(p => {
                                    const isSelected = selectedProducts.has(p.id);
                                    return (
                                        <div key={p.id} onClick={() => toggleProduct(p.id)}
                                            style={{
                                                padding: '0.75rem', cursor: 'pointer', borderRadius: '16px', transition: 'all 0.2s',
                                                border: isSelected ? '2px solid #6366f1' : '1px solid hsl(var(--border-subtle))',
                                                background: isSelected ? '#6366f108' : 'white',
                                                position: 'relative',
                                                boxShadow: isSelected ? '0 10px 15px -3px rgb(99 102 241 / 0.1)' : 'none'
                                            }}>
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
                                                <div style={checkboxStyle(isSelected)}>{isSelected && <Check size={12} strokeWidth={3} />}</div>
                                            </div>
                                            <div style={{ height: '120px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '0.9rem' }}>₹{p.price.toLocaleString()}</span>
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>{p.product_group || 'Regular'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button onClick={() => setActiveTab('CUSTOMERS')} className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
                                    Next: Target Audience <Users size={18} style={{ marginLeft: '8px' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'CUSTOMERS' && (
                        <div className="card" style={{ padding: '1.5rem', borderRadius: '0 0 20px 20px', borderTop: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Target Audience</h2>
                                    <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Select the customers who will receive this broadcast.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={selectAllFilteredCustomers} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                                        {filteredCustomers.every(c => selectedCustomers.has(c.phone)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                    <input type="text" placeholder="Search by name or phone..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                                        style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
                                </div>
                                {/* <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                    {['ALL', 'VIP', 'Gold', 'Silver', 'Regular'].map(tier => (
                                        <button key={tier} onClick={() => setCustomerTierFilter(tier)} style={{
                                            ...pillStyle(customerTierFilter === tier),
                                            background: customerTierFilter === tier ? 'hsl(var(--primary))' : 'white',
                                            color: customerTierFilter === tier ? 'white' : 'hsl(var(--text-muted))'
                                        }}>
                                            {tier}
                                        </button>
                                    ))}
                                </div> */}
                            </div>

                            <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '1rem', width: '50px' }}></th>
                                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Customer</th>
                                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Contact</th>
                                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Orders</th>
                                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Total Spent</th>
                                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Tier</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((c, idx) => {
                                            const isSelected = selectedCustomers.has(c.phone);
                                            const tier = getTier(c.totalSpent);
                                            const tierStyle = getTierStyle(tier);
                                            return (
                                                <tr key={c.phone} onClick={() => toggleCustomer(c.phone)}
                                                    style={{
                                                        cursor: 'pointer', transition: 'all 0.1s',
                                                        background: isSelected ? 'hsl(var(--primary) / 0.05)' : (idx % 2 === 0 ? 'white' : '#fcfdfe'),
                                                        borderBottom: '1px solid #f1f5f9'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.background = isSelected ? 'hsl(var(--primary) / 0.08)' : '#f8fafc'}
                                                    onMouseOut={e => e.currentTarget.style.background = isSelected ? 'hsl(var(--primary) / 0.05)' : (idx % 2 === 0 ? 'white' : '#fcfdfe')}
                                                >
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={checkboxStyle(isSelected)}>{isSelected && <Check size={12} strokeWidth={3} />}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.8rem' }}>
                                                                {c.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{c.phone}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{c.totalOrders}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem' }}>₹{c.totalSpent.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '9999px', background: tierStyle.bg, color: tierStyle.color, border: `1px solid ${tierStyle.color}30` }}>
                                                            {tier}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                                <button onClick={() => setActiveTab('PRODUCTS')} className="btn btn-secondary" style={{ padding: '0.8rem 2rem' }}>Back</button>
                                <button onClick={() => setActiveTab('MESSAGE')} className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
                                    Next: Compose Message <MessageSquare size={18} style={{ marginLeft: '8px' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'MESSAGE' && (
                        <div className="card" style={{ padding: '1.5rem', borderRadius: '0 0 20px 20px', borderTop: 'none' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Compose Message</h2>
                                <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>This message will be sent alongside the selected products. Use {'{{name}}'} to personalize.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                                <div>
                                    <textarea
                                        value={message} onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type your broadcast message here..."
                                        style={{
                                            width: '100%', height: '280px', padding: '1.5rem', borderRadius: '20px', background: '#f8fafc',
                                            border: '2px solid #e2e8f0', fontSize: '1rem', lineHeight: '1.6', outline: 'none',
                                            transition: 'all 0.2s', focus: { borderColor: '#10b981' }
                                        }}
                                    />
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['{{name}}', '{{product.name}}', '{{product.price}}', '{{product.url}}'].map((suggest) => (
                                            <button key={suggest} onClick={() => setMessage(message + (message.endsWith(' ') || message.length === 0 ? '' : ' ') + suggest)}
                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                                                + {suggest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ background: '#f1f5f9', borderRadius: '20px', padding: '1.5rem', height: 'fit-content' }}>
                                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#475569' }}>WhatsApp Preview</h4>
                                    <div style={{ background: '#e5ddd5', borderRadius: '12px', padding: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ background: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', maxWidth: '90%', position: 'relative', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                                {message.replace(/\{\{name\}\}/g, 'Customer')
                                                        .replace(/\{\{product\.name\}\}/g, 'Premium Saree')
                                                        .replace(/\{\{product\.price\}\}/g, '1,999')
                                                        .replace(/\{\{product\.url\}\}/g, 'https://shop.link/123')}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'right', marginTop: '4px' }}>12:45 PM</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5' }}>
                                        <strong>Personalization:</strong><br />
                                        You are currently targeting <strong>{selectedCustomers.size} customers</strong> with <strong>{selectedProducts.size} products</strong>.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                                <button onClick={() => setActiveTab('CUSTOMERS')} className="btn btn-secondary" style={{ padding: '0.8rem 2rem' }}>Back</button>
                                <button onClick={() => setActiveTab('SUMMARY')} className="btn btn-primary" style={{ padding: '0.8rem 2rem', background: '#10b981' }}>
                                    Next: Summary & Send <CheckCircle2 size={18} style={{ marginLeft: '8px' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'SUMMARY' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '2rem', padding: '1.5rem', background: 'white', borderRadius: '0 0 20px 20px', border: '1px solid hsl(var(--border-subtle))', borderTop: 'none' }}>
                            <div className="card" style={{ padding: '1.5rem', minWidth: 0 }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Final Campaign Review</h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Featured Products ({selectedProducts.size})</span>
                                            <button onClick={() => setActiveTab('PRODUCTS')} style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Selection</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                                            {selectedProductsList.length === 0 ? (
                                                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', width: '100%', textAlign: 'center', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}>No products selected - sending text-only message.</div>
                                            ) : selectedProductsList.map(p => (
                                                <div key={p.id} style={{ flexShrink: 0, width: '100px', textAlign: 'center' }}>
                                                    <img src={p.image_url} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', objectFit: 'cover', marginBottom: '4px' }} />
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Target Customers ({selectedCustomers.size})</span>
                                            <button onClick={() => setActiveTab('CUSTOMERS')} style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Audience</button>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {selectedCustomersList.slice(0, 30).map(c => (
                                                    <span key={c.phone} style={{ padding: '4px 8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.7rem' }}>{c.name}</span>
                                                ))}
                                                {selectedCustomersList.length > 30 && <span style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#64748b' }}>+{selectedCustomersList.length - 30} more...</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
                                <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem' }}>Ready to Broadcast?</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Target Audience:</span>
                                        <strong>{selectedCustomers.size} People</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Content:</span>
                                        <strong>{selectedProducts.size > 0 ? `${selectedProducts.size} Products` : 'Text only'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Total Messages:</span>
                                        <strong style={{ color: '#10b981' }}>{selectedCustomers.size * Math.max(selectedProducts.size, 1)}</strong>
                                    </div>
                                </div>

                                {/* Send Button */}
                                {!sending && !completed && (
                                    <button
                                        onClick={startBroadcast}
                                        disabled={selectedCustomers.size === 0 || !message.trim()}
                                        className="btn btn-primary"
                                        style={{
                                            width: '100%', height: '56px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 800, background: 'hsl(var(--primary))', boxShadow: '0 10px 20px -5px hsl(var(--primary) / 0.3)'
                                        }}
                                    >
                                        <Send size={20} style={{ marginRight: '10px' }} /> Launch Campaign
                                    </button>
                                )}

                                {sending && (
                                    <div style={{ textAlign: 'center' }}>
                                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Sending Broadcast...</div>
                                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--primary))', margin: '4px 0 1rem' }}>{stats.sent} / {stats.total} Sent</div>
                                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(stats.sent / stats.total) * 100}%`, height: '100%', background: 'hsl(var(--primary))', transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                )}

                                {completed && (
                                    <div style={{ textAlign: 'center' }}>
                                        {stats.failed === stats.total ? (
                                            <>
                                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                                    <Megaphone size={32} />
                                                </div>
                                                <h3 style={{ margin: '0 0 0.5rem', color: 'hsl(var(--destructive))' }}>Broadcast Failed</h3>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>None of the messages could be sent. Please check your WhatsApp API configuration or recipient numbers.</p>
                                            </>
                                        ) : stats.failed > 0 ? (
                                            <>
                                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eab30820', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h3 style={{ margin: '0 0 0.5rem', color: '#eab308' }}>Partial Success</h3>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Successfully sent {stats.sent} messages. Failed to send {stats.failed} messages.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#10b98120', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h3 style={{ margin: '0 0 0.5rem', color: '#10b981' }}>Success!</h3>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Your campaign has been successfully broadcasted.</p>
                                            </>
                                        )}
                                        <button onClick={() => { setCompleted(false); setActiveTab('PRODUCTS'); setSelectedProducts(new Set()); setSelectedCustomers(new Set()); }}
                                            className="btn btn-secondary" style={{ width: '100%' }}>Start New Campaign</button>
                                    </div>
                                )}

                                <div style={{ marginTop: '1.5rem', padding: '12px', background: '#fff9f1', borderRadius: '12px', fontSize: '0.7rem', color: '#9a6a12', border: '1px solid #ffedc1' }}>
                                    <Megaphone size={12} style={{ marginRight: '4px' }} /> Note: Messages are sent via your connected WhatsApp instance with randomized delays to avoid spam detection.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmAction && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 800 }}>{confirmAction.title}</h3>
                        <p style={{ margin: '0 0 1.5rem', color: 'hsl(var(--text-muted))', lineHeight: '1.5' }}>{confirmAction.message}</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmAction(null)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
                            <button onClick={confirmAction.onConfirm} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: notification.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--success))', color: 'white', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, animation: 'slideUp 0.3s', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {notification.type === 'error' ? <Megaphone size={18} /> : <CheckCircle2 size={18} />}
                    <span style={{ fontWeight: 600 }}>{notification.message}</span>
                    <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '8px', opacity: 0.8 }}>✕</button>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </>
    );
}
