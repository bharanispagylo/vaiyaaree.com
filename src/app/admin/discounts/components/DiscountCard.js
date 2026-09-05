'use client';

import { Tag, Edit, Trash2 } from 'lucide-react';
import { parseDateToUTC, formatOrderDate } from '@/lib/dateUtils';

export default function DiscountCard({
    rule,
    handleOpenForm,
    handleDeleteRule,
    handleToggleActive
}) {
    const now = new Date();
    const startObj = rule.start_date ? parseDateToUTC(rule.start_date) : null;
    const endObj = rule.end_date ? parseDateToUTC(rule.end_date) : null;

    const isCurrentActive = (rule.is_active === 1 || rule.is_active === true) &&
        (!startObj || startObj <= now) &&
        (!endObj || endObj >= now);

    const isScheduled = (rule.is_active === 1 || rule.is_active === true) &&
        startObj && startObj > now;

    return (
        <div className={`rule-card ${!isCurrentActive ? 'inactive' : ''}`}>
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
                        {(rule.discount_type === 'FIXED_AMOUNT' || rule.discount_type === 'FIXED') && `₹${rule.discount_value} OFF`}
                        {rule.discount_type === 'FREE_SHIPPING' && `FREE SHIPPING`}
                    </div>
                    <div className="offer-meta">
                        {rule.calculation_basis === 'CART' ? (
                            (rule.threshold_type === 'COUNT' || rule.target_type === 'CART_COUNT')
                                ? `Cart Offer (≥ ${rule.threshold_count || rule.minimum_cart_products || 1} units)`
                                : `Cart Offer (≥ ₹${parseFloat(rule.threshold_value || rule.minimum_cart_amount || 0).toLocaleString()})`
                        ) : (
                            <>
                                {rule.target_type === 'ALL_PRODUCTS' && 'Storewide (All Products)'}
                                {rule.target_type === 'SPECIFIC_CATEGORIES' && `Categories (${rule.categories?.length || 0})`}
                                {rule.target_type === 'SPECIFIC_PRODUCTS' && `Specific Sarees (${rule.products?.length || 0})`}
                            </>
                        )}
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
                        <span className="val">{rule.end_date ? formatOrderDate(rule.end_date, { includeTime: false }) : 'Never'}</span>
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
                    <button
                        type="button"
                        onClick={() => handleOpenForm(rule)}
                        className="btn-edit"
                        title="Edit Discount Rule"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        className="btn-trash"
                        title="Delete Discount Rule"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
