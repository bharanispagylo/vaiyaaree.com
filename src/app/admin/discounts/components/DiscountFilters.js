'use client';

import { Search } from 'lucide-react';

export default function DiscountFilters({
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    rulesCount = 0,
    stats = { active: 0, coupons: 0 }
}) {
    return (
        <div className="controls-bar">
            <div className="tab-buttons">
                <button
                    type="button"
                    className={activeTab === 'ALL' ? 'active' : ''}
                    onClick={() => setActiveTab('ALL')}
                >
                    All Rules ({rulesCount})
                </button>
                <button
                    type="button"
                    className={activeTab === 'ACTIVE' ? 'active' : ''}
                    onClick={() => setActiveTab('ACTIVE')}
                >
                    Active ({stats.active})
                </button>
                <button
                    type="button"
                    className={activeTab === 'SCHEDULED' ? 'active' : ''}
                    onClick={() => setActiveTab('SCHEDULED')}
                >
                    Scheduled
                </button>
                <button
                    type="button"
                    className={activeTab === 'EXPIRED' ? 'active' : ''}
                    onClick={() => setActiveTab('EXPIRED')}
                >
                    Expired
                </button>
                <button
                    type="button"
                    className={activeTab === 'COUPONS' ? 'active' : ''}
                    onClick={() => setActiveTab('COUPONS')}
                >
                    Coupons Only ({stats.coupons})
                </button>
            </div>

            <div style={{ position: 'relative', width: '340px', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{
                    position: 'absolute',
                    left: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    zIndex: 5
                }} />
                <input
                    type="text"
                    placeholder="Search title or coupon code..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 3.25rem',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        outline: 'none',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#0f172a'
                    }}
                />
            </div>
        </div>
    );
}
