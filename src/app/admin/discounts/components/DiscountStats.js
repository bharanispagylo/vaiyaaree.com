'use client';

import { Tag, Sparkles, Percent, ShoppingBag } from 'lucide-react';

export default function DiscountStats({ stats = { total: 0, active: 0, coupons: 0, redemptions: 0 } }) {
    return (
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
    );
}
