'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Tag, Plus, Trash2, Edit, Percent, IndianRupee, Globe, ShoppingBag,
    CheckCircle2, AlertCircle, Loader2, Search, Filter, Calendar, Users,
    Layers, ShieldAlert, Sparkles, RefreshCw, X, Check, ArrowRight
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';

export default function AdminDiscountsPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'COUPONS'
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
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
        maximum_discount_amount: '',
        start_date: '',
        end_date: '',
        priority: '10',
        is_active: true,
        usage_limit: '',
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
            const { data } = await mysqlClient.from('products').select('id, name, category');
            if (data) {
                setAvailableProducts(data);
                const cats = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
                setAvailableCategories(cats);
            }
        } catch (err) {
            console.error('Fetch products error:', err);
        }
    };

    const handleOpenModal = (rule = null) => {
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
                maximum_discount_amount: rule.maximum_discount_amount !== null && rule.maximum_discount_amount !== undefined ? String(rule.maximum_discount_amount) : '',
                start_date: rule.start_date ? rule.start_date.substring(0, 16) : '',
                end_date: rule.end_date ? rule.end_date.substring(0, 16) : '',
                priority: rule.priority !== undefined ? String(rule.priority) : '10',
                is_active: rule.is_active === 1 || rule.is_active === true,
                usage_limit: rule.usage_limit !== null && rule.usage_limit !== undefined ? String(rule.usage_limit) : '',
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
                maximum_discount_amount: '',
                start_date: '',
                end_date: '',
                priority: '10',
                is_active: true,
                usage_limit: '',
                customer_limit: '1',
                stackable: false,
                categories: [],
                product_ids: []
            });
        }
        setShowModal(true);
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Discount Title is required');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...formData,
                discount_value: parseFloat(formData.discount_value || 0),
                minimum_cart_amount: parseFloat(formData.minimum_cart_amount || 0),
                maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
                priority: parseInt(formData.priority || 0, 10),
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
                customer_limit: parseInt(formData.customer_limit || 1, 10),
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
            setShowModal(false);
            fetchDiscounts();
            setTimeout(() => setSuccess(null), 3000);
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
            <header className="page-header">
                <div>
                    <div className="breadcrumb">Promotions / Rules Engine</div>
                    <h1>Discount Rule</h1>
                    <p>Configure product sales, cart threshold offers, coupons, and promotional rules.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn-primary-glow">
                    <Plus size={18} />
                    <span>Create Discount Rule</span>
                </button>
            </header>

            {/* STAT CARDS */}
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
                        <div className="stat-label">Active Promos</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><Percent size={22} /></div>
                    <div>
                        <div className="stat-val">{stats.coupons}</div>
                        <div className="stat-label">Active Coupons</div>
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

            {error && <div className="toast-bar error">{error}</div>}
            {success && <div className="toast-bar success"><CheckCircle2 size={18} /> {success}</div>}

            {/* CONTROLS BAR */}
            <div className="controls-bar">
                <div className="tab-buttons">
                    <button className={activeTab === 'ALL' ? 'active' : ''} onClick={() => setActiveTab('ALL')}>All Rules ({rules.length})</button>
                    <button className={activeTab === 'ACTIVE' ? 'active' : ''} onClick={() => setActiveTab('ACTIVE')}>Active ({stats.active})</button>
                    <button className={activeTab === 'SCHEDULED' ? 'active' : ''} onClick={() => setActiveTab('SCHEDULED')}>Scheduled</button>
                    <button className={activeTab === 'EXPIRED' ? 'active' : ''} onClick={() => setActiveTab('EXPIRED')}>Expired</button>
                    <button className={activeTab === 'COUPONS' ? 'active' : ''} onClick={() => setActiveTab('COUPONS')}>Coupons ({stats.coupons})</button>
                </div>

                <div className="search-box">
                    <Search size={16} />
                    <input
                        placeholder="Search rules or coupons..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* RULES GRID / LIST */}
            {loading ? (
                <div className="loading-container"><Loader2 className="spin" size={32} /><p>Loading discount engine...</p></div>
            ) : filteredRules.length === 0 ? (
                <div className="empty-card">
                    <Tag size={44} />
                    <h3>No discount rules found</h3>
                    <p>Click "Create Discount Rule" to set up your first promotional sale or coupon.</p>
                </div>
            ) : (
                <div className="rules-grid">
                    {filteredRules.map(rule => {
                        const now = new Date();
                        const isExpired = rule.end_date && new Date(rule.end_date) < now;
                        const isScheduled = rule.start_date && new Date(rule.start_date) > now;
                        const isActive = (rule.is_active === 1 || rule.is_active === true) && !isExpired && !isScheduled;

                        return (
                            <div key={rule.id} className={`rule-card ${!isActive ? 'inactive' : ''}`}>
                                <div className="card-top">
                                    <div className="rule-badge-row">
                                        <span className={`status-pill ${isActive ? 'active' : isScheduled ? 'scheduled' : 'expired'}`}>
                                            {isActive ? 'Active' : isScheduled ? 'Scheduled' : 'Inactive / Expired'}
                                        </span>
                                        {rule.coupon_code && (
                                            <span className="coupon-code-tag">
                                                <Tag size={12} /> {rule.coupon_code}
                                            </span>
                                        )}
                                        {rule.stackable === 1 && <span className="stackable-tag">Stackable</span>}
                                    </div>

                                    <h3 className="rule-title">{rule.name}</h3>
                                    {rule.description && <p className="rule-desc">{rule.description}</p>}
                                </div>

                                <div className="rule-offer-box">
                                    <div className="offer-value">
                                        {rule.discount_type === 'PERCENTAGE' && `${rule.discount_value}% OFF`}
                                        {rule.discount_type === 'FIXED' && `₹${rule.discount_value} OFF`}
                                        {rule.discount_type === 'FREE_SHIPPING' && `FREE SHIPPING`}
                                    </div>
                                    <div className="offer-meta">
                                        {rule.target_type === 'ALL_PRODUCTS' && 'Entire Store'}
                                        {rule.target_type === 'SPECIFIC_PRODUCTS' && `${rule.products?.length || 0} Selected Sarees`}
                                        {rule.target_type === 'SPECIFIC_CATEGORIES' && `${rule.categories?.length || 0} Categories`}
                                        {rule.target_type === 'SPECIFIC_CUSTOMERS' && 'Targeted Customers'}
                                    </div>
                                </div>

                                <div className="rule-details">
                                    <div className="detail-item">
                                        <span className="label">Min Cart:</span>
                                        <span className="val">{parseFloat(rule.minimum_cart_amount || 0) > 0 ? `₹${rule.minimum_cart_amount}` : 'None'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Max Cap:</span>
                                        <span className="val">{rule.maximum_discount_amount ? `₹${rule.maximum_discount_amount}` : 'No Cap'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Redemptions:</span>
                                        <span className="val">{rule.usage_count || 0} {rule.usage_limit ? `/ ${rule.usage_limit}` : ''}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Priority:</span>
                                        <span className="val">{rule.priority || 0}</span>
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
                                        <button onClick={() => handleOpenModal(rule)} className="btn-edit"><Edit size={15} /></button>
                                        <button onClick={() => handleDeleteRule(rule.id, rule.name)} className="btn-trash"><Trash2 size={15} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <ModalPortal>
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}</h2>
                                <button onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSaveRule} className="modal-form">
                                <div className="form-row">
                                    <div className="form-group flex-2">
                                        <label>Rule Title *</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Festival Season Sale"
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Coupon Code (Optional)</label>
                                        <input
                                            value={formData.coupon_code}
                                            onChange={e => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. FESTIVAL20"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <input
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Internal or customer-facing description..."
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>Discount Type</label>
                                        <select
                                            value={formData.discount_type}
                                            onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                        >
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FIXED">Fixed Amount (₹)</option>
                                            <option value="FREE_SHIPPING">Free Shipping</option>
                                        </select>
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Discount Value ({formData.discount_type === 'PERCENTAGE' ? '%' : '₹'})</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.discount_value}
                                            onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                            disabled={formData.discount_type === 'FREE_SHIPPING'}
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Target Scope</label>
                                        <select
                                            value={formData.target_type}
                                            onChange={e => setFormData({ ...formData, target_type: e.target.value })}
                                        >
                                            <option value="ALL_PRODUCTS">All Products (Storewide)</option>
                                            <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                                            <option value="SPECIFIC_PRODUCTS">Specific Sarees</option>
                                        </select>
                                    </div>
                                </div>

                                {/* CATEGORY TARGET SELECTION */}
                                {formData.target_type === 'SPECIFIC_CATEGORIES' && (
                                    <div className="form-group picker-box">
                                        <label>Select Eligible Categories</label>
                                        <div className="checkbox-grid">
                                            {availableCategories.map(cat => {
                                                const selected = formData.categories.includes(cat);
                                                return (
                                                    <label key={cat} className={`check-chip ${selected ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={e => {
                                                                if (e.target.checked) setFormData({ ...formData, categories: [...formData.categories, cat] });
                                                                else setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
                                                            }}
                                                        />
                                                        {cat}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* PRODUCT TARGET SELECTION */}
                                {formData.target_type === 'SPECIFIC_PRODUCTS' && (
                                    <div className="form-group picker-box">
                                        <label>Select Eligible Sarees ({formData.product_ids.length} selected)</label>
                                        <div className="select-scroll-box">
                                            {availableProducts.map(p => {
                                                const selected = formData.product_ids.includes(p.id);
                                                return (
                                                    <label key={p.id} className={`product-check-row ${selected ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={e => {
                                                                if (e.target.checked) setFormData({ ...formData, product_ids: [...formData.product_ids, p.id] });
                                                                else setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== p.id) });
                                                            }}
                                                        />
                                                        <span>{p.name}</span>
                                                        <small>₹{p.price}</small>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>Min Cart Subtotal (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.minimum_cart_amount}
                                            onChange={e => setFormData({ ...formData, minimum_cart_amount: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Max Discount Cap (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="No Cap"
                                            value={formData.maximum_discount_amount}
                                            onChange={e => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Priority Order</label>
                                        <input
                                            type="number"
                                            value={formData.priority}
                                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.start_date}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Global Usage Limit</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Unlimited"
                                            value={formData.usage_limit}
                                            onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row toggles-row">
                                    <label className="checkbox-toggle">
                                        <input
                                            type="checkbox"
                                            checked={formData.stackable}
                                            onChange={e => setFormData({ ...formData, stackable: e.target.checked })}
                                        />
                                        <span>Allow Combining with Other Rules (Stackable)</span>
                                    </label>
                                    <label className="checkbox-toggle">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <span>Active Immediately</span>
                                    </label>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" disabled={saving} className="btn-primary-glow">
                                        {saving && <Loader2 className="spin" size={16} />}
                                        <span>{editingRule ? 'Save Changes' : 'Create Rule'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <style jsx>{`
                .discounts-layout { padding: 2rem; max-width: 1400px; margin: 0 auto; color: #1e293b; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
                .breadcrumb { font-size: 0.75rem; color: #6366f1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
                h1 { margin: 0; font-size: 2.4rem; font-weight: 900; color: #0f172a; }
                .page-header p { color: #64748b; margin-top: 0.4rem; }

                .btn-primary-glow { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 0.8rem 1.6rem; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; cursor: pointer; box-shadow: 0 10px 20px -5px rgba(99,102,241,0.4); transition: 0.3s; }
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
                .tab-buttons button { padding: 0.6rem 1.2rem; border-radius: 10px; border: none; background: transparent; font-weight: 700; font-size: 0.85rem; color: #64748b; cursor: pointer; transition: 0.2s; }
                .tab-buttons button.active { background: white; color: #4f46e5; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

                .search-box { position: relative; width: 300px; }
                .search-box svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-box input { width: 100%; padding: 0.7rem 1rem 0.7rem 2.8rem; background: white; border: 1px solid #e2e8f0; border-radius: 14px; outline: none; font-weight: 600; }

                /* RULES GRID */
                .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
                .rule-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: 0.3s; position: relative; }
                .rule-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #cbd5e1; }
                .rule-card.inactive { opacity: 0.7; }

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
                .btn-edit, .btn-trash { border: none; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
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

                /* MODAL */
                .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
                .modal-box { background: white; border-radius: 28px; width: 100%; max-width: 750px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
                .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 900; }
                .modal-header button { background: none; border: none; cursor: pointer; color: #64748b; }

                .modal-form { padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
                .form-row { display: flex; gap: 1rem; }
                .flex-1 { flex: 1; }
                .flex-2 { flex: 2; }
                .form-group label { display: block; font-size: 0.78rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; }
                .form-group input, .form-group select { width: 100%; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; font-weight: 600; background: #f8fafc; color: #0f172a; }
                .form-group input:focus, .form-group select:focus { border-color: #6366f1; background: white; }

                .picker-box { background: #f8fafc; padding: 1rem; border-radius: 16px; border: 1px dashed #cbd5e1; }
                .checkbox-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .check-chip { padding: 0.4rem 0.8rem; border-radius: 99px; border: 1px solid #cbd5e1; background: white; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
                .check-chip.active { background: #eef2ff; border-color: #6366f1; color: #4f46e5; }
                .select-scroll-box { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 0.5rem; }
                .product-check-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: 10px; background: white; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
                .product-check-row.active { background: #eef2ff; border-color: #6366f1; }

                .toggles-row { display: flex; flex-direction: column; gap: 0.75rem; background: #f8fafc; padding: 1rem; border-radius: 16px; }
                .checkbox-toggle { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; }

                .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
                .btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 0.8rem 1.5rem; border-radius: 14px; font-weight: 800; cursor: pointer; }

                .toast-bar { padding: 1rem 1.5rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem; }
                .toast-bar.success { background: #dcfce7; color: #15803d; }
                .toast-bar.error { background: #fef2f2; color: #b91c1c; }

                .empty-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 24px; padding: 4rem 2rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #64748b; gap: 1rem; }

                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
