'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Tag, Plus, Trash2, Edit, Percent, IndianRupee, Globe, ShoppingBag,
    CheckCircle2, AlertCircle, Loader2, Search, Filter, Calendar, Users,
    Layers, ShieldAlert, Sparkles, RefreshCw, X, Check, ArrowRight, ArrowLeft, Info, HelpCircle
} from 'lucide-react';

export default function AdminDiscountsPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'COUPONS'
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Categories & Products for target selection
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableProducts, setAvailableProducts] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        coupon_code: '',
        discount_type: 'PERCENTAGE',
        discount_value: '10',
        target_type: 'ALL_PRODUCTS',
        minimum_cart_amount: '0',
        minimum_cart_products_enabled: false,
        minimum_cart_products: '3',
        start_date: '',
        end_date: '',
        priority: '10',
        is_active: true,
        customer_limit: '1',
        stackable: false,
        categories: [],
        product_ids: []
    });

    useEffect(() => {
        fetchDiscounts();
        fetchProductsAndCategories();
    }, []);

    const fetchDiscounts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/discounts');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch discounts');
            setRules(data.rules || []);
        } catch (err) {
            console.error('Fetch Discounts Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsAndCategories = async () => {
        try {
            const { mysqlClient } = await import('@/lib/mysqlClient');
            const { data } = await mysqlClient.from('products').select('id, name, category, price');
            if (data) {
                setAvailableProducts(data);
                const cats = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
                setAvailableCategories(cats);
            }
        } catch (err) {
            console.error('Fetch products error:', err);
        }
    };

    const handleOpenForm = (rule = null) => {
        setError(null);
        if (rule) {
            setEditingRule(rule);
            setFormData({
                name: rule.name || '',
                description: rule.description || '',
                coupon_code: rule.coupon_code || '',
                discount_type: rule.discount_type || 'PERCENTAGE',
                discount_value: rule.discount_value !== undefined ? String(rule.discount_value) : '10',
                target_type: rule.target_type || 'ALL_PRODUCTS',
                minimum_cart_amount: rule.minimum_cart_amount !== undefined ? String(rule.minimum_cart_amount) : '0',
                minimum_cart_products_enabled: rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true,
                minimum_cart_products: rule.minimum_cart_products !== null && rule.minimum_cart_products !== undefined ? String(rule.minimum_cart_products) : '3',
                start_date: rule.start_date ? rule.start_date.substring(0, 16) : '',
                end_date: rule.end_date ? rule.end_date.substring(0, 16) : '',
                priority: rule.priority !== undefined ? String(rule.priority) : '10',
                is_active: rule.is_active === 1 || rule.is_active === true,
                customer_limit: rule.customer_limit !== undefined ? String(rule.customer_limit) : '1',
                stackable: rule.stackable === 1 || rule.stackable === true,
                categories: (rule.categories || []).map(c => c.category),
                product_ids: (rule.products || []).map(p => p.product_id)
            });
        } else {
            setEditingRule(null);
            setFormData({
                name: '',
                description: '',
                coupon_code: '',
                discount_type: 'PERCENTAGE',
                discount_value: '10',
                target_type: 'ALL_PRODUCTS',
                minimum_cart_amount: '0',
                minimum_cart_products_enabled: false,
                minimum_cart_products: '3',
                start_date: '',
                end_date: '',
                priority: '10',
                is_active: true,
                customer_limit: '1',
                stackable: false,
                categories: [],
                product_ids: []
            });
        }
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Rule Title is required');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...formData,
                discount_value: parseFloat(formData.discount_value || 0),
                minimum_cart_amount: parseFloat(formData.minimum_cart_amount || 0),
                maximum_discount_amount: null,
                minimum_cart_products_enabled: formData.minimum_cart_products_enabled ? 1 : 0,
                minimum_cart_products: formData.minimum_cart_products_enabled ? parseInt(formData.minimum_cart_products || '1', 10) : null,
                priority: parseInt(formData.priority || '10', 10),
                usage_limit: null,
                customer_limit: parseInt(formData.customer_limit || '1', 10),
                is_active: formData.is_active ? 1 : 0,
                stackable: formData.stackable ? 1 : 0
            };

            const method = editingRule ? 'PUT' : 'POST';
            if (editingRule) payload.id = editingRule.id;

            const res = await fetch('/api/admin/discounts', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save discount rule');

            setSuccess(`Discount Rule "${formData.name}" ${editingRule ? 'updated' : 'created'} successfully!`);
            setShowForm(false);
            fetchDiscounts();
            setTimeout(() => setSuccess(null), 3500);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id, name) => {
        if (!confirm(`Are you sure you want to delete discount rule "${name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/discounts?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete discount rule');
            setSuccess(`Rule "${name}" deleted.`);
            fetchDiscounts();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (rule) => {
        try {
            const newActive = !(rule.is_active === 1 || rule.is_active === true);
            const res = await fetch('/api/admin/discounts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: rule.id, is_active: newActive ? 1 : 0 })
            });
            if (!res.ok) throw new Error('Failed to toggle status');
            fetchDiscounts();
        } catch (err) {
            console.error('Toggle status error:', err);
        }
    };

    // Filter rules
    const filteredRules = useMemo(() => {
        const now = new Date();
        return rules.filter(rule => {
            const matchesSearch = (rule.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (rule.coupon_code || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            const isCurrentActive = (rule.is_active === 1 || rule.is_active === true) &&
                (!rule.start_date || new Date(rule.start_date) <= now) &&
                (!rule.end_date || new Date(rule.end_date) >= now);

            const isScheduled = (rule.is_active === 1 || rule.is_active === true) &&
                rule.start_date && new Date(rule.start_date) > now;

            const isExpired = rule.end_date && new Date(rule.end_date) < now;
            const isCoupon = Boolean(rule.coupon_code);

            if (activeTab === 'ACTIVE') return isCurrentActive;
            if (activeTab === 'SCHEDULED') return isScheduled;
            if (activeTab === 'EXPIRED') return isExpired;
            if (activeTab === 'COUPONS') return isCoupon;
            return true;
        });
    }, [rules, activeTab, searchTerm]);

    const stats = useMemo(() => {
        const now = new Date();
        const activeCount = rules.filter(r => (r.is_active === 1 || r.is_active === true) && (!r.end_date || new Date(r.end_date) >= now)).length;
        const couponCount = rules.filter(r => r.coupon_code).length;
        const totalRedemptions = rules.reduce((sum, r) => sum + (r.usage_count || 0), 0);
        return { total: rules.length, active: activeCount, coupons: couponCount, redemptions: totalRedemptions };
    }, [rules]);

    return (
        <div className="discounts-layout">
            {/* ALERT TOAST NOTIFICATIONS */}
            {success && (
                <div className="toast-bar success animate-enter">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}
            {error && (
                <div className="toast-bar error animate-enter">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/*  MAIN LIST VIEW OR FULL PAGE FORM VIEW  */}
            {!showForm ? (
                <>
                    {/* Page Header */}
                    <header className="page-header">
                        <div>
                            <div className="breadcrumb">Promotions / Rules Engine</div>
                            <h1>Discount Rules</h1>
                            <p>Configure sales offers, cart subtotal discounts, promo coupons, and storewide deals.</p>
                        </div>
                        <button onClick={() => handleOpenForm()} className="btn-primary-glow">
                            <Plus size={18} />
                            <span>Create Discount Rule</span>
                        </button>
                    </header>

                    {/* Stats Summary Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon purple"><Tag size={22} /></div>
                            <div>
                                <div className="stat-val">{stats.total}</div>
                                <div className="stat-label">Total Rules</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green"><Sparkles size={22} /></div>
                            <div>
                                <div className="stat-val">{stats.active}</div>
                                <div className="stat-label">Active Promotions</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><Percent size={22} /></div>
                            <div>
                                <div className="stat-val">{stats.coupons}</div>
                                <div className="stat-label">Promo Coupons</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon amber"><ShoppingBag size={22} /></div>
                            <div>
                                <div className="stat-val">{stats.redemptions}</div>
                                <div className="stat-label">Total Redemptions</div>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="controls-bar">
                        <div className="tab-buttons">
                            <button className={activeTab === 'ALL' ? 'active' : ''} onClick={() => setActiveTab('ALL')}>All Rules ({rules.length})</button>
                            <button className={activeTab === 'ACTIVE' ? 'active' : ''} onClick={() => setActiveTab('ACTIVE')}>Active ({stats.active})</button>
                            <button className={activeTab === 'SCHEDULED' ? 'active' : ''} onClick={() => setActiveTab('SCHEDULED')}>Scheduled</button>
                            <button className={activeTab === 'EXPIRED' ? 'active' : ''} onClick={() => setActiveTab('EXPIRED')}>Expired</button>
                            <button className={activeTab === 'COUPONS' ? 'active' : ''} onClick={() => setActiveTab('COUPONS')}>Coupons Only ({stats.coupons})</button>
                        </div>

                        <div style={{ position: 'relative', width: '340px', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                            <input
                                type="text"
                                placeholder="Search title or coupon code..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3.25rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', outline: 'none', fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}
                            />
                        </div>
                    </div>

                    {/* Rules Grid */}
                    {loading ? (
                        <div className="loading-container">
                            <Loader2 size={36} className="spin" style={{ color: '#6366f1' }} />
                            <p>Loading discount rules...</p>
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="empty-card">
                            <Tag size={48} />
                            <h3>No Discount Rules Found</h3>
                            <p>Create a promotional rule to offer percentage sales, coupons, or minimum cart discounts.</p>
                            <button onClick={() => handleOpenForm()} className="btn-primary-glow">
                                <Plus size={16} /> Create Discount Rule
                            </button>
                        </div>
                    ) : (
                        <div className="rules-grid">
                            {filteredRules.map(rule => {
                                const now = new Date();
                                const isCurrentActive = (rule.is_active === 1 || rule.is_active === true) &&
                                    (!rule.start_date || new Date(rule.start_date) <= now) &&
                                    (!rule.end_date || new Date(rule.end_date) >= now);

                                const isScheduled = (rule.is_active === 1 || rule.is_active === true) &&
                                    rule.start_date && new Date(rule.start_date) > now;

                                return (
                                    <div key={rule.id} className={`rule-card ${!isCurrentActive ? 'inactive' : ''}`}>
                                        <div className="rule-card-top">
                                            <div className="rule-badge-row">
                                                {isCurrentActive ? (
                                                    <span className="status-pill active">Active</span>
                                                ) : isScheduled ? (
                                                    <span className="status-pill scheduled">Scheduled</span>
                                                ) : (
                                                    <span className="status-pill expired">Expired / Inactive</span>
                                                )}

                                                {rule.coupon_code && (
                                                    <span className="coupon-code-tag">
                                                        <Tag size={12} /> {rule.coupon_code}
                                                    </span>
                                                )}

                                                {rule.stackable === 1 && (
                                                    <span className="stackable-tag">Stackable</span>
                                                )}
                                            </div>

                                            <h3 className="rule-title">{rule.name}</h3>
                                            <p className="rule-desc">{rule.description || 'No description provided.'}</p>

                                            <div className="rule-offer-box">
                                                <div className="offer-value">
                                                    {rule.discount_type === 'PERCENTAGE' && `${rule.discount_value}% OFF`}
                                                    {rule.discount_type === 'FIXED_AMOUNT' && `₹${rule.discount_value} OFF`}
                                                    {rule.discount_type === 'FREE_SHIPPING' && `FREE SHIPPING`}
                                                </div>
                                                <div className="offer-meta">
                                                    {rule.target_type === 'ALL_PRODUCTS' && 'Storewide (All Products)'}
                                                    {rule.target_type === 'SPECIFIC_CATEGORIES' && `Categories (${rule.categories?.length || 0})`}
                                                    {rule.target_type === 'SPECIFIC_PRODUCTS' && `Specific Sarees (${rule.products?.length || 0})`}
                                                </div>
                                            </div>

                                            <div className="rule-details">
                                                {rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true ? (
                                                    <div className="detail-item">
                                                        <span>Min Products:</span>
                                                        <span className="val">≥ {rule.minimum_cart_products || 1} units</span>
                                                    </div>
                                                ) : null}
                                                <div className="detail-item">
                                                    <span>Redemptions:</span>
                                                    <span className="val">{rule.usage_count || 0} times</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span>Expires:</span>
                                                    <span className="val">{rule.end_date ? new Date(rule.end_date).toLocaleDateString() : 'Never'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.is_active === 1 || rule.is_active === true}
                                                    onChange={() => handleToggleActive(rule)}
                                                />
                                                <span className="slider"></span>
                                            </label>

                                            <div className="action-btns">
                                                <button onClick={() => handleOpenForm(rule)} className="btn-edit" title="Edit Discount Rule">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteRule(rule.id, rule.name)} className="btn-trash" title="Delete Discount Rule">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /*  FULL PAGE FORM VIEW (Dedicated creation & editing page)  */
                <div className="full-page-form animate-enter">
                    {/* Form Top Header Navigation */}
                    <div className="form-header-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-back">
                                <ArrowLeft size={18} /> Back to Rules
                            </button>
                            <div>
                                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                                    {editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}
                                </h1>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                                    Set up discount amounts, target eligibility, cart thresholds, and promo codes.
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary-outline">
                                Cancel
                            </button>
                            <button type="button" onClick={handleSaveRule} disabled={saving} className="btn-primary-glow">
                                {saving ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                                <span>{editingRule ? 'Save Changes' : 'Create Rule'}</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSaveRule} className="full-form-body">
                        {/* SECTION 1: PROMOTION IDENTIFICATION */}
                        <div className="form-section-card">
                            <div className="section-title">
                                <Tag size={20} color="#6366f1" />
                                <h3>1. Promotion Details</h3>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label className="field-label">
                                        Rule Title <span className="req">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Festival Season 20% Off"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="styled-input"
                                    />
                                    <div className="field-explain">
                                        Descriptive name for your promotion (e.g. "Diwali Special Offer" or "Summer Sale").
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="field-label">
                                        Coupon Code (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. FESTIVAL20"
                                        value={formData.coupon_code}
                                        onChange={e => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                                        className="styled-input uppercase"
                                    />
                                    <div className="field-explain">
                                        Promo code customers type at checkout. Leave blank for automatic storewide discounts.
                                    </div>
                                </div>
                            </div>

                            <div className="form-field mt-3">
                                <label className="field-label">Description</label>
                                <textarea
                                    rows="2"
                                    placeholder="Internal notes or customer-facing details about this offer..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="styled-textarea"
                                />
                                <div className="field-explain">
                                    Brief explanation of offer terms or internal campaign notes.
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: DISCOUNT VALUE & TARGET SCOPE */}
                        <div className="form-section-card">
                            <div className="section-title">
                                <Percent size={20} color="#6366f1" />
                                <h3>2. Offer Calculation & Scope</h3>
                            </div>

                            <div className="form-grid-3">
                                <div className="form-field">
                                    <label className="field-label">Discount Type</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData({
                                                ...formData,
                                                discount_type: newType,
                                                discount_value: newType === 'FREE_SHIPPING' ? '0' : (formData.discount_value === '0' ? '10' : formData.discount_value)
                                            });
                                        }}
                                        className="styled-select"
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                                        <option value="FREE_SHIPPING">Free Shipping</option>
                                    </select>
                                    <div className="field-explain">
                                        Choose percentage off, flat rupee discount, or free delivery.
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="field-label">
                                        Discount Value {formData.discount_type === 'FREE_SHIPPING' ? '(Free Shipping)' : (formData.discount_type === 'PERCENTAGE' ? '(%)' : '(₹)')}
                                    </label>
                                    <input
                                        type={formData.discount_type === 'FREE_SHIPPING' ? 'text' : 'number'}
                                        step="0.01"
                                        min="0"
                                        placeholder={formData.discount_type === 'FREE_SHIPPING' ? 'Free Delivery' : 'e.g. 20'}
                                        value={formData.discount_type === 'FREE_SHIPPING' ? 'Free Delivery (100% Shipping Off)' : formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        disabled={formData.discount_type === 'FREE_SHIPPING'}
                                        className="styled-input"
                                    />
                                    <div className="field-explain">
                                        {formData.discount_type === 'FREE_SHIPPING'
                                            ? 'Free delivery automatically waives shipping charges for eligible cart items.'
                                            : (formData.discount_type === 'PERCENTAGE' ? 'Percentage reduction (e.g. 20 for 20% off).' : 'Flat rupee discount (e.g. 500 for ₹500 off).')}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="field-label">Target Scope</label>
                                    <select
                                        value={formData.target_type}
                                        onChange={e => setFormData({ ...formData, target_type: e.target.value })}
                                        className="styled-select"
                                    >
                                        <option value="ALL_PRODUCTS">All Products (Storewide)</option>
                                        <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                                        <option value="SPECIFIC_PRODUCTS">Specific Sarees</option>
                                    </select>
                                    <div className="field-explain">
                                        Applies storewide to all catalog items or restricted to selected categories/products.
                                    </div>
                                </div>
                            </div>

                            {/* TARGET CATEGORIES PICKER */}
                            {formData.target_type === 'SPECIFIC_CATEGORIES' && (
                                <div className="picker-container mt-3">
                                    <label className="field-label">Select Eligible Categories</label>
                                    <div className="chip-grid">
                                        {availableCategories.map(cat => {
                                            const selected = formData.categories.includes(cat);
                                            return (
                                                <label key={cat} className={`chip-item ${selected ? 'selected' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={e => {
                                                            if (e.target.checked) setFormData({ ...formData, categories: [...formData.categories, cat] });
                                                            else setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
                                                        }}
                                                    />
                                                    <span>{cat}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TARGET PRODUCTS PICKER */}
                            {formData.target_type === 'SPECIFIC_PRODUCTS' && (
                                <div className="picker-container mt-3">
                                    <label className="field-label">Select Eligible Sarees ({formData.product_ids.length} selected)</label>
                                    <div className="product-scroll-list">
                                        {availableProducts.map(p => {
                                            const selected = formData.product_ids.includes(p.id);
                                            return (
                                                <label key={p.id} className={`product-select-row ${selected ? 'selected' : ''}`}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={e => {
                                                                if (e.target.checked) setFormData({ ...formData, product_ids: [...formData.product_ids, p.id] });
                                                                else setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== p.id) });
                                                            }}
                                                        />
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.85rem' }}>₹{p.price}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 3: CART THRESHOLDS */}
                        <div className="form-section-card">
                            <div className="section-title">
                                <ShoppingBag size={20} color="#6366f1" />
                                <h3>3. Cart Thresholds</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
                                <label className="styled-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 600, color: '#0f172a' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.minimum_cart_products_enabled}
                                        onChange={e => setFormData({ ...formData, minimum_cart_products_enabled: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                    />
                                    <span>Enable Minimum Cart Products</span>
                                </label>

                                <div className="form-field">
                                    <label className="field-label" style={{ opacity: formData.minimum_cart_products_enabled ? 1 : 0.5 }}>
                                        Minimum Cart Products
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 3"
                                        value={formData.minimum_cart_products}
                                        onChange={e => setFormData({ ...formData, minimum_cart_products: e.target.value })}
                                        disabled={!formData.minimum_cart_products_enabled}
                                        className="styled-input"
                                        style={{ opacity: formData.minimum_cart_products_enabled ? 1 : 0.5, cursor: formData.minimum_cart_products_enabled ? 'text' : 'not-allowed' }}
                                    />
                                    <div className="field-explain">
                                        Minimum number of eligible product units required to apply this offer. The discount applies when the cart contains this quantity or more of eligible products.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: SCHEDULE & ACTIVE STATUS */}
                        <div className="form-section-card">
                            <div className="section-title">
                                <Calendar size={20} color="#6366f1" />
                                <h3>4. Validity Schedule & Status</h3>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label className="field-label">Start Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="styled-input"
                                    />
                                    <div className="field-explain">
                                        Date & time when this discount rule becomes active (leave blank to start immediately).
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="field-label">End Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        className="styled-input"
                                    />
                                    <div className="field-explain">
                                        Expiration date & time (leave blank for an ongoing promotion with no expiry).
                                    </div>
                                </div>
                            </div>

                            <div className="toggles-box mt-3">
                                <label className="custom-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={formData.stackable}
                                        onChange={e => setFormData({ ...formData, stackable: e.target.checked })}
                                    />
                                    <div>
                                        <div className="check-title">Allow Combining with Other Coupons (Stackable)</div>
                                        <div className="check-desc">Check if customers can apply this discount together with other active promo rules.</div>
                                    </div>
                                </label>

                                <label className="custom-checkbox-row mt-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <div>
                                        <div className="check-title">Active Immediately</div>
                                        <div className="check-desc">Enable or disable this promotional rule on the website.</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* FORM FOOTER ACTION BAR */}
                        <div className="form-footer-bar">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn-primary-glow">
                                {saving && <Loader2 className="spin" size={18} />}
                                <span>{editingRule ? 'Save Changes' : 'Create Rule'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style jsx>{`
                .discounts-layout { padding: 2.5rem; max-width: 1400px; margin: 0 auto; color: #1e293b; font-family: inherit; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
                .breadcrumb { font-size: 0.75rem; color: #6366f1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
                h1 { margin: 0; font-size: 2.2rem; font-weight: 900; color: #0f172a; }
                .page-header p { color: #64748b; margin-top: 0.4rem; font-weight: 500; font-size: 0.95rem; }

                .btn-primary-glow { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 0.85rem 1.8rem; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 0.65rem; cursor: pointer; box-shadow: 0 10px 20px -5px rgba(99,102,241,0.4); transition: 0.3s; font-size: 0.95rem; }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99,102,241,0.6); }

                /* STATS */
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
                .stat-card { background: white; padding: 1.25rem; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
                .stat-icon.purple { background: #eef2ff; color: #6366f1; }
                .stat-icon.green { background: #f0fdf4; color: #16a34a; }
                .stat-icon.blue { background: #f0f9ff; color: #0284c7; }
                .stat-icon.amber { background: #fffbeb; color: #d97706; }
                .stat-val { font-size: 1.6rem; font-weight: 900; color: #0f172a; }
                .stat-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; }

                /* CONTROLS */
                .controls-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
                .tab-buttons { display: flex; background: #f1f5f9; padding: 0.3rem; border-radius: 14px; gap: 0.3rem; border: 1px solid #e2e8f0; }
                .tab-buttons button { padding: 0.65rem 1.25rem; border-radius: 10px; border: none; background: transparent; font-weight: 700; font-size: 0.85rem; color: #64748b; cursor: pointer; transition: 0.2s; }
                .tab-buttons button.active { background: white; color: #4f46e5; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

                .search-box { position: relative; width: 320px; }
                .search-box svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-box input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.8rem; background: white; border: 1px solid #e2e8f0; border-radius: 14px; outline: none; font-weight: 600; font-size: 0.9rem; }

                /* RULES GRID */
                .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
                .rule-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: 0.3s; position: relative; }
                .rule-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #cbd5e1; }
                .rule-card.inactive { opacity: 0.75; }

                .rule-badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
                .status-pill { font-size: 0.7rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 99px; text-transform: uppercase; }
                .status-pill.active { background: #dcfce7; color: #15803d; }
                .status-pill.scheduled { background: #dbeafe; color: #1d4ed8; }
                .status-pill.expired { background: #f1f5f9; color: #64748b; }
                .coupon-code-tag { background: #fef3c7; color: #b45309; border: 1px dashed #f59e0b; padding: 0.2rem 0.6rem; border-radius: 8px; font-weight: 900; font-size: 0.75rem; display: flex; align-items: center; gap: 0.3rem; }
                .stackable-tag { background: #f3e8ff; color: #6b21a8; padding: 0.2rem 0.5rem; border-radius: 8px; font-weight: 800; font-size: 0.7rem; }

                .rule-title { margin: 0 0 0.4rem; font-size: 1.25rem; font-weight: 900; color: #0f172a; }
                .rule-desc { color: #64748b; font-size: 0.85rem; margin: 0 0 1rem; line-height: 1.4; }

                .rule-offer-box { background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 16px; padding: 1rem; text-align: center; margin-bottom: 1.25rem; border: 1px solid #cbd5e1; }
                .offer-value { font-size: 1.75rem; font-weight: 900; color: #4f46e5; }
                .offer-meta { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 0.2rem; }

                .rule-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
                .detail-item { display: flex; justify-content: space-between; color: #64748b; }
                .detail-item .val { font-weight: 700; color: #0f172a; }

                .card-footer { display: flex; justify-content: space-between; align-items: center; }
                .action-btns { display: flex; gap: 0.5rem; }
                .btn-edit, .btn-trash { border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .btn-edit { background: #f1f5f9; color: #475569; }
                .btn-edit:hover { background: #e2e8f0; color: #0f172a; }
                .btn-trash { background: #fef2f2; color: #ef4444; }
                .btn-trash:hover { background: #fee2e2; }

                /* TOGGLE SWITCH */
                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .slider { background-color: #22c55e; }
                input:checked + .slider:before { transform: translateX(20px); }

                /* FULL PAGE FORM FORMAT STYLES */
                .full-page-form { display: flex; flex-direction: column; gap: 1.5rem; }
                .form-header-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 1.5rem 2rem; border-radius: 24px; border: 1px solid #e2e8f0; boxShadow: 0 4px 20px rgba(0,0,0,0.03); flex-wrap: wrap; gap: 1rem; }
                .btn-back { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 0.65rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.875rem; display: flex; alignItems: center; gap: 0.5rem; cursor: pointer; transition: 0.2s; }
                .btn-back:hover { background: #e2e8f0; color: #0f172a; }
                .btn-secondary-outline { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.8rem 1.5rem; border-radius: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
                .btn-secondary-outline:hover { background: #f8fafc; color: #0f172a; }

                .full-form-body { display: flex; flex-direction: column; gap: 1.5rem; }
                .form-section-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
                .section-title { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.5rem; }
                .section-title h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: #0f172a; }

                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; }

                .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
                .field-label { font-size: 0.8rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; }
                .req { color: #dc2626; }

                .styled-input, .styled-select, .styled-textarea { width: 100%; padding: 0.8rem 1rem; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; outline: none; font-size: 0.95rem; font-weight: 600; color: #0f172a; transition: all 0.2s; }
                .styled-input:focus, .styled-select:focus, .styled-textarea:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .uppercase { text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }

                .field-explain { font-size: 0.8rem; color: #64748b; font-weight: 500; margin-top: 2px; line-height: 1.35; }

                .picker-container { background: #f8fafc; padding: 1.25rem; border-radius: 16px; border: 1px dashed #cbd5e1; }
                .chip-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.6rem; }
                .chip-item { padding: 0.5rem 1rem; border-radius: 99px; border: 1px solid #cbd5e1; background: white; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: 0.2s; }
                .chip-item.selected { background: #eef2ff; border-color: #6366f1; color: #4f46e5; }

                .product-scroll-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.6rem; padding-right: 0.4rem; }
                .product-select-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 1rem; border-radius: 12px; background: white; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; }
                .product-select-row.selected { background: #eef2ff; border-color: #6366f1; }

                .toggles-box { background: #f8fafc; padding: 1.25rem; border-radius: 16px; display: flex; flex-direction: column; gap: 1rem; }
                .custom-checkbox-row { display: flex; align-items: flex-start; gap: 0.85rem; cursor: pointer; }
                .custom-checkbox-row input { width: 18px; height: 18px; margin-top: 2px; accent-color: #6366f1; cursor: pointer; }
                .check-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; }
                .check-desc { font-size: 0.8rem; color: #64748b; margin-top: 2px; }

                .form-footer-bar { display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem 2rem; background: white; border-radius: 24px; border: 1px solid #e2e8f0; }

                .toast-bar { padding: 1rem 1.5rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem; }
                .toast-bar.success { background: #dcfce7; color: #15803d; border-left: 4px solid #22c55e; }
                .toast-bar.error { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; }

                .empty-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 24px; padding: 4rem 2rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #64748b; gap: 1rem; }

                .mt-2 { margin-top: 0.5rem; }
                .mt-3 { margin-top: 1rem; }
                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-enter { animation: fadeIn 0.25s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
