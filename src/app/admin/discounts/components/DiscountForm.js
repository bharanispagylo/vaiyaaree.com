'use client';

import { useState, useMemo } from 'react';
import {
    Tag, Percent, Calendar, ArrowLeft, Check, Loader2, Plus, Sliders, Search, Image as ImageIcon
} from 'lucide-react';
import { formatOrderDate } from '@/lib/dateUtils';
import { normalizeImageUrl } from '@/lib/productUrl';

export default function DiscountForm({
    editingRule = null,
    formData,
    setFormData,
    availableCategories = [],
    availableProducts = [],
    saving = false,
    handleSaveRule,
    onClose
}) {
    const [productSearch, setProductSearch] = useState('');

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return availableProducts;
        const q = productSearch.toLowerCase().trim();
        const cleanQ = q.replace(/^#+/, '').trim();
        return availableProducts.filter(p => {
            const pNoStr = String(p.product_no || '').trim();
            return (p.name && p.name.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)) ||
                (p.sku && String(p.sku).toLowerCase().includes(q)) ||
                (p.sku && String(p.sku).toLowerCase().includes(cleanQ)) ||
                (pNoStr && (pNoStr.includes(cleanQ) || (`#${pNoStr}`).toLowerCase().includes(q)));
        });
    }, [availableProducts, productSearch]);
    return (
        <div className="full-page-form animate-enter">
            {/* Form Top Header Navigation */}
            <div className="form-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button type="button" onClick={onClose} className="btn-back">
                        <ArrowLeft size={18} /> Back to Rules
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                            {editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}
                        </h1>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                            Set up discount amounts, target eligibility, promo codes, and validity.
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={onClose} className="btn-secondary-outline">
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
                                Descriptive name for your promotion (e.g. &ldquo;Diwali Special Offer&rdquo; or &ldquo;Summer Sale&rdquo;).
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
                        <label className="field-label">Description (Optional)</label>
                        <textarea
                            rows="2"
                            placeholder="Internal notes or customer-facing details about this offer..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="styled-textarea"
                        />
                    </div>
                </div>

                {/* SECTION 2: OFFER CALCULATION & SCOPE */}
                <div className="form-section-card">
                    <div className="section-title">
                        <Percent size={20} color="#6366f1" />
                        <h3>2. Offer Calculation & Scope</h3>
                    </div>

                    {/* DISCOUNT BASIS SELECTOR */}
                    <div className="form-field mb-4" style={{ marginBottom: '1.5rem' }}>
                        <label className="field-label" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            Discount Basis <span className="req">*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className={`basis-btn ${formData.calculation_basis === 'PRODUCT' ? 'active' : ''}`}
                                onClick={() => setFormData({
                                    ...formData,
                                    calculation_basis: 'PRODUCT',
                                    target_type: (formData.target_type === 'CART_COUNT' || formData.target_type === 'CART_VALUE') ? 'ALL_PRODUCTS' : (formData.target_type || 'ALL_PRODUCTS')
                                })}
                            >
                                Products (Storewide, Category, or Item Scoped)
                            </button>
                            <button
                                type="button"
                                className={`basis-btn ${formData.calculation_basis === 'CART' ? 'active' : ''}`}
                                onClick={() => setFormData({
                                    ...formData,
                                    calculation_basis: 'CART',
                                    minimum_cart_products_enabled: false
                                })}
                            >
                                Cart Level (Spend / Quantity Threshold)
                            </button>
                        </div>
                        <div className="field-explain" style={{ marginTop: '0.4rem' }}>
                            {formData.calculation_basis === 'PRODUCT'
                                ? 'Applies discount to all products or selected categories/sarees.'
                                : 'Applies discount when customer cart meets a total item count or minimum spend requirement.'}
                        </div>
                    </div>

                    {formData.calculation_basis === 'PRODUCT' ? (
                        /* PRODUCT SCOPE FIELDS */
                        <>
                            <div className="form-grid-3">
                                <div className="form-field">
                                    <label className="field-label">Discount Type</label>
                                    <select
                                        value={formData.product_discount_type || 'PERCENTAGE'}
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData({
                                                ...formData,
                                                product_discount_type: newType,
                                                product_discount_value: newType === 'FREE_SHIPPING' ? '0' : (formData.product_discount_value === '0' ? '10' : formData.product_discount_value)
                                            });
                                        }}
                                        className="styled-select"
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                                        <option value="FREE_SHIPPING">Free Shipping</option>
                                    </select>
                                    <div className="field-explain">
                                        Percentage off, flat rupee discount, or free delivery.
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="field-label">
                                        Discount Value {formData.product_discount_type === 'FREE_SHIPPING' ? '(Free Shipping)' : (formData.product_discount_type === 'PERCENTAGE' ? '(%)' : '(₹)')}
                                    </label>
                                    <input
                                        type={formData.product_discount_type === 'FREE_SHIPPING' ? 'text' : 'number'}
                                        step="0.01"
                                        min="0.01"
                                        max={formData.product_discount_type === 'PERCENTAGE' ? '100' : undefined}
                                        placeholder={formData.product_discount_type === 'FREE_SHIPPING' ? 'Free Delivery' : 'e.g. 20'}
                                        value={formData.product_discount_type === 'FREE_SHIPPING' ? 'Free Delivery (100% Shipping Off)' : (formData.product_discount_value ?? '')}
                                        onChange={e => setFormData({ ...formData, product_discount_value: e.target.value })}
                                        disabled={formData.product_discount_type === 'FREE_SHIPPING'}
                                        className="styled-input"
                                    />
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
                                        Storewide or restricted to specific categories/products.
                                    </div>
                                </div>
                            </div>

                            {/* TARGET CATEGORIES PICKER */}
                            {formData.target_type === 'SPECIFIC_CATEGORIES' && (
                                <div className="picker-container mt-3">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <label className="field-label" style={{ margin: 0 }}>
                                                Select Eligible Categories ({formData.categories?.length || 0} selected)
                                            </label>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                Only sarees belonging to the selected categories will receive this discount.
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, categories: [...availableCategories] })}
                                                style={{
                                                    padding: '0.35rem 0.7rem',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    color: '#4f46e5',
                                                    background: '#eef2ff',
                                                    border: '1px solid #c7d2fe',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Select All
                                            </button>
                                            {formData.categories?.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, categories: [] })}
                                                    style={{
                                                        padding: '0.35rem 0.7rem',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color: '#ef4444',
                                                        background: '#fee2e2',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Clear ({formData.categories.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="chip-grid">
                                        {availableCategories.map(cat => {
                                            const catStr = String(cat).trim();
                                            const selected = (formData.categories || []).some(c => String(c).trim().toLowerCase() === catStr.toLowerCase());
                                            return (
                                                <label key={catStr} className={`chip-item ${selected ? 'selected' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={e => {
                                                            const current = formData.categories || [];
                                                            if (e.target.checked) {
                                                                setFormData({
                                                                    ...formData,
                                                                    categories: [...current.filter(c => String(c).trim().toLowerCase() !== catStr.toLowerCase()), catStr]
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    categories: current.filter(c => String(c).trim().toLowerCase() !== catStr.toLowerCase())
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <span>{catStr}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TARGET PRODUCTS PICKER */}
                            {formData.target_type === 'SPECIFIC_PRODUCTS' && (
                                <div className="picker-container mt-3">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <label className="field-label" style={{ margin: 0 }}>
                                                Select Eligible Sarees ({formData.product_ids.length} selected)
                                            </label>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                Check the sarees that qualify for this discount rule.
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <Search size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8', pointerEvents: 'none' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Search sarees by name / SKU..."
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                    style={{
                                                        padding: '0.4rem 0.75rem 0.4rem 2rem',
                                                        fontSize: '0.82rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        background: 'white',
                                                        outline: 'none',
                                                        width: '210px'
                                                    }}
                                                />
                                            </div>
                                            {formData.product_ids.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, product_ids: [] })}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        color: '#ef4444',
                                                        background: '#fee2e2',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Clear ({formData.product_ids.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="product-scroll-list">
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                No sarees found matching &ldquo;{productSearch}&rdquo;
                                            </div>
                                        ) : (
                                            filteredProducts.map(p => {
                                                const pidStr = String(p.id).trim();
                                                const selected = (formData.product_ids || []).some(id => String(id).trim() === pidStr);
                                                const rawImg = p.image_url ? p.image_url.split(',')[0].trim() : '';
                                                const cleanImg = rawImg ? normalizeImageUrl(rawImg) : '';

                                                const rawPrice = parseFloat(p.price || 0);
                                                const discType = formData.product_discount_type || 'PERCENTAGE';
                                                const discVal = parseFloat(formData.product_discount_value || 0);
                                                let discountedPrice = null;

                                                if (rawPrice > 0 && discVal > 0 && discType !== 'FREE_SHIPPING') {
                                                    if (discType === 'PERCENTAGE') {
                                                        const cut = (rawPrice * Math.min(100, discVal)) / 100;
                                                        discountedPrice = Math.max(0, Math.round(rawPrice - cut));
                                                    } else if (discType === 'FIXED_AMOUNT') {
                                                        discountedPrice = Math.max(0, Math.round(rawPrice - Math.min(rawPrice, discVal)));
                                                    }
                                                }

                                                return (
                                                    <label key={p.id} className={`product-select-row ${selected ? 'selected' : ''}`}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={e => {
                                                                    const current = formData.product_ids || [];
                                                                    if (e.target.checked) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            product_ids: [...current.filter(id => String(id).trim() !== pidStr), pidStr]
                                                                        });
                                                                    } else {
                                                                        setFormData({
                                                                            ...formData,
                                                                            product_ids: current.filter(id => String(id).trim() !== pidStr)
                                                                        });
                                                                    }
                                                                }}
                                                                style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                                                            />
                                                            <div style={{
                                                                width: '44px',
                                                                height: '44px',
                                                                borderRadius: '8px',
                                                                overflow: 'hidden',
                                                                background: '#f1f5f9',
                                                                border: '1px solid #e2e8f0',
                                                                flexShrink: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                {cleanImg ? (
                                                                    <img
                                                                        src={cleanImg}
                                                                        alt={p.name}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        onError={e => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=60';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <ImageIcon size={18} color="#94a3b8" />
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{p.name}</span>
                                                                {(p.category || p.sku) && (
                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                        {[p.category, p.sku ? `SKU: ${p.sku}` : null].filter(Boolean).join(' • ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                                                            {discountedPrice !== null && discountedPrice < rawPrice ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
                                                                    <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>₹{discountedPrice}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>₹{p.price}</span>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.85rem' }}>₹{p.price}</span>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* OPTIONAL MINIMUM QUANTITY THRESHOLD (Only for bundle / bulk offers) */}
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1rem 1.25rem',
                                background: '#f8fafc',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.minimum_cart_products_enabled}
                                        onChange={e => setFormData({ ...formData, minimum_cart_products_enabled: e.target.checked })}
                                        style={{ width: '17px', height: '17px', accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                    <span>Require Minimum Quantity in Cart (Optional)</span>
                                </label>

                                {formData.minimum_cart_products_enabled && (
                                    <div className="animate-enter" style={{ marginTop: '0.85rem', maxWidth: '320px' }}>
                                        <label className="field-label">Minimum Quantity of Eligible Items</label>
                                        <input
                                            type="number"
                                            min="2"
                                            placeholder="e.g. 3"
                                            value={formData.minimum_cart_products}
                                            onChange={e => setFormData({ ...formData, minimum_cart_products: e.target.value })}
                                            className="styled-input"
                                            style={{ marginTop: '0.35rem' }}
                                        />
                                        <div className="field-explain">
                                            Discount only triggers when customer has at least this many eligible items in cart (e.g. &ldquo;Buy 3 get 20% off&rdquo;).
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* CART CONDITIONAL SCOPE FIELDS */
                        <>
                            <div className="form-grid-3">
                                <div className="form-field">
                                    <label className="field-label">Cart Trigger Condition</label>
                                    <select
                                        value={formData.threshold_type}
                                        onChange={e => setFormData({ ...formData, threshold_type: e.target.value })}
                                        className="styled-select"
                                    >
                                        <option value="COUNT">Cart Item Quantity (Units)</option>
                                        <option value="VALUE">Cart Subtotal Spend (₹)</option>
                                    </select>
                                    <div className="field-explain">
                                        Trigger: Minimum item units or minimum order subtotal.
                                    </div>
                                </div>

                                {formData.threshold_type === 'COUNT' ? (
                                    <div className="form-field">
                                        <label className="field-label">Minimum Total Cart Units</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 5"
                                            value={formData.threshold_count}
                                            onChange={e => setFormData({ ...formData, threshold_count: e.target.value })}
                                            className="styled-input"
                                        />
                                        <div className="field-explain">
                                            Qualifies when total cart item quantity is at least this amount.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="form-field">
                                        <label className="field-label">Minimum Cart Subtotal (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g. 5000"
                                            value={formData.threshold_value}
                                            onChange={e => setFormData({ ...formData, threshold_value: e.target.value })}
                                            className="styled-input"
                                        />
                                        <div className="field-explain">
                                            Qualifies when cart subtotal reaches or exceeds this amount.
                                        </div>
                                    </div>
                                )}

                                <div className="form-field">
                                    <label className="field-label">Discount Type</label>
                                    <select
                                        value={formData.cart_discount_type || 'PERCENTAGE'}
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData({
                                                ...formData,
                                                cart_discount_type: newType,
                                                cart_discount_value: newType === 'FREE_SHIPPING' ? '0' : (formData.cart_discount_value === '0' ? '10' : formData.cart_discount_value)
                                            });
                                        }}
                                        className="styled-select"
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                                        <option value="FREE_SHIPPING">Free Shipping</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-grid-2 mt-3" style={{ marginTop: '1rem' }}>
                                <div className="form-field">
                                    <label className="field-label">
                                        Discount Value {formData.cart_discount_type === 'FREE_SHIPPING' ? '(Free Shipping)' : (formData.cart_discount_type === 'PERCENTAGE' ? '(%)' : '(₹)')}
                                    </label>
                                    <input
                                        type={formData.cart_discount_type === 'FREE_SHIPPING' ? 'text' : 'number'}
                                        step="0.01"
                                        min="0.01"
                                        max={formData.cart_discount_type === 'PERCENTAGE' ? '100' : undefined}
                                        placeholder={formData.cart_discount_type === 'FREE_SHIPPING' ? 'Free Delivery' : 'e.g. 20'}
                                        value={formData.cart_discount_type === 'FREE_SHIPPING' ? 'Free Delivery (100% Shipping Off)' : (formData.cart_discount_value ?? '')}
                                        onChange={e => setFormData({ ...formData, cart_discount_value: e.target.value })}
                                        disabled={formData.cart_discount_type === 'FREE_SHIPPING'}
                                        className="styled-input"
                                    />
                                    <div className="field-explain">
                                        {formData.cart_discount_type === 'FREE_SHIPPING'
                                            ? 'Automatically waives shipping charges when cart condition is satisfied.'
                                            : (formData.cart_discount_type === 'PERCENTAGE' ? 'Percentage reduction on qualifying cart subtotal.' : 'Flat rupee discount on qualifying cart subtotal.')}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* SECTION 3: VALIDITY SCHEDULE & STATUS */}
                <div className="form-section-card">
                    <div className="section-title">
                        <Calendar size={20} color="#6366f1" />
                        <h3>3. Validity Schedule & Status</h3>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-field">
                            <label className="field-label">Start Date & Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="styled-input"
                            />
                            {formData.start_date && (
                                <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#4f46e5' }}>
                                    Active From: {formatOrderDate(formData.start_date)}
                                </div>
                            )}
                            <div className="field-explain">
                                Leave blank to start immediately.
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="field-label">End Date & Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.end_date || ''}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="styled-input"
                            />
                            {formData.end_date && (
                                <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#4f46e5' }}>
                                    Expires: {formatOrderDate(formData.end_date)}
                                </div>
                            )}
                            {formData.end_date && formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date) && (
                                <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                                    ⚠️ Warning: End Date must be after Start Date, or the rule will expire immediately!
                                </div>
                            )}
                            <div className="field-explain">
                                Leave blank for an ongoing promotion with no expiry date.
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
                                <div className="check-desc">Check if customers can apply this discount together with other active promotions.</div>
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
                    <button type="button" onClick={onClose} className="btn-secondary-outline">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary-glow">
                        {saving && <Loader2 className="spin" size={18} />}
                        <span>{editingRule ? 'Save Changes' : 'Create Rule'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
