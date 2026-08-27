'use client';

import { Search, ChevronDown, List, LayoutGrid, TrendingUp, X } from 'lucide-react';

export default function ProductFilters({
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories = [],
    groupFilter,
    setGroupFilter,
    groups = [],
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    showingStart,
    showingEnd,
    totalCount
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
        }}>
            {/* Left Controls: Search & Dropdowns */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flex: 1,
                minWidth: '300px',
                flexWrap: 'wrap'
            }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                    <Search size={16} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--text-muted))'
                    }} />
                    <input
                        type="text"
                        placeholder="Search by name, #no, SKU, CAT-code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="admin-input"
                        style={{
                            width: '100%',
                            paddingLeft: '2.5rem',
                            paddingRight: searchTerm ? '2.5rem' : '1rem',
                            height: '42px',
                            fontSize: '0.85rem'
                        }}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'hsl(var(--text-muted))',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Category Dropdown */}
                <div style={{ position: 'relative', width: '150px' }}>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="admin-input"
                        style={{
                            width: '100%',
                            paddingLeft: '1rem',
                            paddingRight: '2rem',
                            height: '42px',
                            fontSize: '0.85rem',
                            appearance: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>
                                {c === 'ALL' ? 'All Categories' : c}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--text-muted))',
                        pointerEvents: 'none'
                    }} />
                </div>

                {/* Group Dropdown */}
                <div style={{ position: 'relative', width: '140px' }}>
                    <select
                        value={groupFilter}
                        onChange={e => setGroupFilter(e.target.value)}
                        className="admin-input"
                        style={{
                            width: '100%',
                            paddingLeft: '1rem',
                            paddingRight: '2rem',
                            height: '42px',
                            fontSize: '0.85rem',
                            appearance: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {groups.map(g => (
                            <option key={g} value={g}>
                                {g === 'ALL' ? 'All Groups' : g}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--text-muted))',
                        pointerEvents: 'none'
                    }} />
                </div>

                {/* Status Dropdown */}
                <div style={{ position: 'relative', width: '130px' }}>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="admin-input"
                        style={{
                            width: '100%',
                            paddingLeft: '1rem',
                            paddingRight: '2rem',
                            height: '42px',
                            fontSize: '0.85rem',
                            appearance: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Draft / Inactive</option>
                    </select>
                    <ChevronDown size={14} style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--text-muted))',
                        pointerEvents: 'none'
                    }} />
                </div>

                {/* Sort By Dropdown */}
                <div style={{ position: 'relative', width: '240px' }}>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="admin-input"
                        style={{
                            width: '100%',
                            paddingLeft: '1rem',
                            paddingRight: '2.5rem',
                            height: '42px',
                            fontSize: '0.85rem',
                            appearance: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="product_no_desc">Product No: Descending (Latest First)</option>
                        <option value="product_no_asc">Product No: Ascending (#1001, #1002...)</option>
                        <option value="newest">Date: Newest First</option>
                        <option value="oldest">Date: Oldest First</option>
                        <option value="name_asc">Name: A to Z</option>
                        <option value="name_desc">Name: Z to A</option>
                        <option value="low_price">Price: Low to High</option>
                        <option value="high_price">Price: High to Low</option>
                        <option value="low_stock">Stock: Low Stock First</option>
                        <option value="high_stock">Stock: Highest First</option>
                    </select>
                    <ChevronDown size={14} style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--text-muted))',
                        pointerEvents: 'none'
                    }} />
                </div>
            </div>

            {/* Right Controls: View Mode Toggle & Counter */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    background: 'hsl(var(--bg-app))',
                    border: '1px solid hsl(var(--border-subtle))',
                    borderRadius: '12px',
                    padding: '4px'
                }}>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        title="Table View"
                        style={{
                            padding: '0.45rem 0.85rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: viewMode === 'table' ? 'hsl(var(--primary))' : 'transparent',
                            color: viewMode === 'table' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}
                    >
                        <List size={15} /> Table
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        title="Card View"
                        style={{
                            padding: '0.45rem 0.85rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: viewMode === 'card' ? 'hsl(var(--primary))' : 'transparent',
                            color: viewMode === 'card' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LayoutGrid size={14} /> Cards
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('analytics')}
                        title="Analytics View"
                        style={{
                            padding: '0.45rem 0.85rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'transparent',
                            color: viewMode === 'analytics' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            transition: 'all 0.2s'
                        }}
                    >
                        <TrendingUp size={14} /> Analysis
                    </button>
                </div>

                <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                    Showing {totalCount > 0 ? `${showingStart} - ${showingEnd}` : 0} of {totalCount} items
                </span>
            </div>
        </div>
    );
}
