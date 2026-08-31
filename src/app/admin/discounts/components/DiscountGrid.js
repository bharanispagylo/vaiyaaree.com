'use client';

import { Loader2, Tag, Plus } from 'lucide-react';
import DiscountCard from './DiscountCard';

export default function DiscountGrid({
    loading = false,
    filteredRules = [],
    handleOpenForm,
    handleDeleteRule,
    handleToggleActive
}) {
    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 size={36} className="spin" style={{ color: '#6366f1' }} />
                <p>Loading discount rules...</p>
            </div>
        );
    }

    if (filteredRules.length === 0) {
        return (
            <div className="empty-card">
                <Tag size={48} />
                <h3>No Discount Rules Found</h3>
                <p>Create a promotional rule to offer percentage sales, coupons, or minimum cart discounts.</p>
                <button type="button" onClick={() => handleOpenForm()} className="btn-primary-glow">
                    <Plus size={16} /> Create Discount Rule
                </button>
            </div>
        );
    }

    return (
        <div className="rules-grid">
            {filteredRules.map(rule => (
                <DiscountCard
                    key={rule.id}
                    rule={rule}
                    handleOpenForm={handleOpenForm}
                    handleDeleteRule={handleDeleteRule}
                    handleToggleActive={handleToggleActive}
                />
            ))}
        </div>
    );
}
