'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, AlertCircle } from 'lucide-react';

// Modular Components
import DiscountStats from './components/DiscountStats';
import DiscountFilters from './components/DiscountFilters';
import DiscountGrid from './components/DiscountGrid';
import DiscountForm from './components/DiscountForm';
import DiscountStyles from './components/DiscountStyles';

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
        calculation_basis: 'PRODUCT', // 'PRODUCT' | 'CART'
        threshold_type: 'COUNT', // 'COUNT' | 'VALUE'
        threshold_count: '5',
        threshold_value: '5000',
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
            const basis = (rule.calculation_basis || 'PRODUCT').toUpperCase();
            const threshType = rule.threshold_type || (rule.target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT');
            setEditingRule(rule);
            setFormData({
                name: rule.name || '',
                description: rule.description || '',
                coupon_code: rule.coupon_code || '',
                calculation_basis: basis,
                threshold_type: threshType,
                threshold_count: rule.threshold_count !== null && rule.threshold_count !== undefined ? String(rule.threshold_count) : '5',
                threshold_value: rule.threshold_value !== null && rule.threshold_value !== undefined ? String(rule.threshold_value) : '5000',
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
                calculation_basis: 'PRODUCT',
                threshold_type: 'COUNT',
                threshold_count: '5',
                threshold_value: '5000',
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
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSaveRule = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!formData.name.trim()) {
            setError('Rule Title is required');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const isCartBasis = formData.calculation_basis === 'CART';

            const payload = {
                ...formData,
                calculation_basis: formData.calculation_basis,
                threshold_type: isCartBasis ? formData.threshold_type : null,
                threshold_count: isCartBasis && formData.threshold_type === 'COUNT' ? parseInt(formData.threshold_count || '1', 10) : null,
                threshold_value: isCartBasis && formData.threshold_type === 'VALUE' ? parseFloat(formData.threshold_value || '0') : null,
                discount_value: formData.discount_type === 'FREE_SHIPPING' ? 0 : parseFloat(formData.discount_value || 0),
                minimum_cart_amount: parseFloat(formData.minimum_cart_amount || 0),
                maximum_discount_amount: null,
                minimum_cart_products_enabled: !isCartBasis && formData.minimum_cart_products_enabled ? 1 : 0,
                minimum_cart_products: !isCartBasis && formData.minimum_cart_products_enabled ? parseInt(formData.minimum_cart_products || '1', 10) : null,
                categories: isCartBasis ? [] : formData.categories,
                product_ids: isCartBasis ? [] : formData.product_ids,
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
            <DiscountStyles />

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

            {/* MAIN LIST VIEW OR FULL PAGE FORM VIEW */}
            {!showForm ? (
                <>
                    {/* Page Header */}
                    <header className="page-header">
                        <div>
                            <div className="breadcrumb">Promotions / Rules Engine</div>
                            <h1>Discount Rules</h1>
                            <p>Configure sales offers, cart subtotal discounts, promo coupons, and storewide deals.</p>
                        </div>
                        <button type="button" onClick={() => handleOpenForm()} className="btn-primary-glow">
                            <Plus size={18} />
                            <span>Create Discount Rule</span>
                        </button>
                    </header>

                    {/* Stats Summary Cards */}
                    <DiscountStats stats={stats} />

                    {/* Filter & Search Bar */}
                    <DiscountFilters
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        rulesCount={rules.length}
                        stats={stats}
                    />

                    {/* Rules Grid */}
                    <DiscountGrid
                        loading={loading}
                        filteredRules={filteredRules}
                        handleOpenForm={handleOpenForm}
                        handleDeleteRule={handleDeleteRule}
                        handleToggleActive={handleToggleActive}
                    />
                </>
            ) : (
                /* FULL PAGE FORM VIEW */
                <DiscountForm
                    editingRule={editingRule}
                    formData={formData}
                    setFormData={setFormData}
                    availableCategories={availableCategories}
                    availableProducts={availableProducts}
                    saving={saving}
                    handleSaveRule={handleSaveRule}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    );
}
