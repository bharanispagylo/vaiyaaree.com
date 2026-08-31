'use client';

import { useState } from 'react';
import {
    Search, ChevronDown, List, LayoutGrid, TrendingUp, X,
    Tag, Layers, CircleDot, ArrowUpDown, RotateCcw, Filter,
    SlidersHorizontal, ChevronUp
} from 'lucide-react';

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
    const [isFilterGroupOpen, setIsFilterGroupOpen] = useState(false);

    // Calculate active dropdown filters (excluding search)
    const activeDropdownCount = [
        categoryFilter !== 'ALL' ? 1 : 0,
        groupFilter !== 'ALL' ? 1 : 0,
        statusFilter !== 'ALL' ? 1 : 0,
        (sortBy && sortBy !== 'product_no_desc') ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    const hasAnyActiveFilters = Boolean(
        searchTerm || activeDropdownCount > 0
    );

    const handleResetAll = () => {
        setSearchTerm('');
        setCategoryFilter('ALL');
        setGroupFilter('ALL');
        setStatusFilter('ALL');
        setSortBy('product_no_desc');
    };

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid hsl(var(--border-subtle))',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
        }}>
            {/* Main Bar: Search, Filter Toggle Button, and View Switcher */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                flexWrap: 'wrap'
            }}>
                {/* Left Side: Search & Filter Toggle Button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flex: '1 1 320px',
                    minWidth: '260px',
                    flexWrap: 'wrap'
                }}>
                    {/* Search Input Bar */}
                    <div style={{
                        position: 'relative',
                        flex: '1 1 240px',
                        minWidth: '220px'
                    }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: searchTerm ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                            transition: 'color 0.15s'
                        }} />
                        <input
                            type="text"
                            placeholder="Search by name, #no, SKU, CAT-code..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                paddingLeft: '2.5rem',
                                paddingRight: searchTerm ? '2.5rem' : '1rem',
                                height: '42px',
                                fontSize: '0.85rem',
                                borderRadius: '10px',
                                border: searchTerm
                                    ? '1px solid hsl(var(--primary) / 0.5)'
                                    : '1px solid hsl(var(--border-subtle))',
                                background: searchTerm ? 'hsl(var(--primary) / 0.02)' : '#f8fafc',
                                color: 'hsl(var(--text-main))',
                                outline: 'none',
                                transition: 'all 0.15s'
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = 'hsl(var(--primary))';
                                e.target.style.background = '#ffffff';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = searchTerm ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border-subtle))';
                                e.target.style.background = searchTerm ? 'hsl(var(--primary) / 0.02)' : '#f8fafc';
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '22px',
                                    height: '22px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'hsl(var(--text-muted))',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Filter Icon & Group Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsFilterGroupOpen(prev => !prev)}
                        title={isFilterGroupOpen ? 'Hide Filters' : 'Show Filter Options'}
                        style={{
                            height: '42px',
                            padding: '0 1rem',
                            borderRadius: '10px',
                            border: isFilterGroupOpen || activeDropdownCount > 0
                                ? '1px solid hsl(var(--primary) / 0.6)'
                                : '1px solid hsl(var(--border-subtle))',
                            background: isFilterGroupOpen || activeDropdownCount > 0
                                ? 'hsl(var(--primary) / 0.08)'
                                : '#f8fafc',
                            color: isFilterGroupOpen || activeDropdownCount > 0
                                ? 'hsl(var(--primary))'
                                : 'hsl(var(--text-main))',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                            userSelect: 'none'
                        }}
                        onMouseEnter={e => {
                            if (!isFilterGroupOpen && activeDropdownCount === 0) {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.borderColor = 'hsl(var(--border-bright))';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isFilterGroupOpen && activeDropdownCount === 0) {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                            }
                        }}
                    >
                        <Filter size={15} style={{ color: (isFilterGroupOpen || activeDropdownCount > 0) ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))' }} />
                        <span>Filters</span>

                        {activeDropdownCount > 0 && (
                            <span style={{
                                background: 'hsl(var(--primary))',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                borderRadius: '12px',
                                padding: '1px 7px',
                                minWidth: '18px',
                                textAlign: 'center'
                            }}>
                                {activeDropdownCount}
                            </span>
                        )}

                        {isFilterGroupOpen ? (
                            <ChevronUp size={14} style={{ opacity: 0.7 }} />
                        ) : (
                            <ChevronDown size={14} style={{ opacity: 0.7 }} />
                        )}
                    </button>
                </div>

                {/* Right Side: View Mode Switcher & Counter */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    flexWrap: 'nowrap',
                    marginLeft: 'auto'
                }}>
                    {/* View Switcher Segmented Control */}
                    <div style={{
                        display: 'flex',
                        background: '#f1f5f9',
                        border: '1px solid hsl(var(--border-subtle))',
                        borderRadius: '10px',
                        padding: '3px',
                        gap: '2px'
                    }}>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            title="Table View"
                            style={{
                                padding: '0.42rem 0.8rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                                color: viewMode === 'table' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s'
                            }}
                        >
                            <List size={14} /> Table
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('card')}
                            title="Card View"
                            style={{
                                padding: '0.42rem 0.8rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: viewMode === 'card' ? '#ffffff' : 'transparent',
                                color: viewMode === 'card' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                boxShadow: viewMode === 'card' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s'
                            }}
                        >
                            <LayoutGrid size={14} /> Cards
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('analytics')}
                            title="Analytics View"
                            style={{
                                padding: '0.42rem 0.8rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: viewMode === 'analytics' ? '#ffffff' : 'transparent',
                                color: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                boxShadow: viewMode === 'analytics' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s'
                            }}
                        >
                            <TrendingUp size={14} /> Analysis
                        </button>
                    </div>

                    {/* Counter Badge */}
                    <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'hsl(var(--text-muted))',
                        background: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border-subtle))',
                        whiteSpace: 'nowrap'
                    }}>
                        Showing <strong style={{ color: 'hsl(var(--text-main))' }}>{totalCount > 0 ? `${showingStart}-${showingEnd}` : 0}</strong> of <strong style={{ color: 'hsl(var(--text-main))' }}>{totalCount}</strong>
                    </div>
                </div>
            </div>

            {/* Collapsible Filter Group Panel */}
            {isFilterGroupOpen && (
                <div
                    className="animate-enter"
                    style={{
                        padding: '1rem',
                        background: '#fafbfc',
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border-subtle))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--text-muted))', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <SlidersHorizontal size={13} color="hsl(var(--primary))" /> Filter By Attributes
                        </div>

                        {hasAnyActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetAll}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'hsl(var(--danger))',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px'
                                }}
                            >
                                <RotateCcw size={12} /> Reset All Filters
                            </button>
                        )}
                    </div>

                    {/* Filter Inputs Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem'
                    }}>
                        {/* 1. Category Filter */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: categoryFilter !== 'ALL' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Tag size={14} />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.2rem',
                                    paddingRight: '2rem',
                                    height: '40px',
                                    fontSize: '0.82rem',
                                    fontWeight: categoryFilter !== 'ALL' ? 700 : 500,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    border: categoryFilter !== 'ALL'
                                        ? '1px solid hsl(var(--primary) / 0.6)'
                                        : '1px solid hsl(var(--border-subtle))',
                                    background: categoryFilter !== 'ALL'
                                        ? 'hsl(var(--primary) / 0.05)'
                                        : '#ffffff',
                                    color: categoryFilter !== 'ALL'
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>
                                        {c === 'ALL' ? 'All Categories' : c}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'hsl(var(--text-muted))',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {/* 2. Group Filter */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: groupFilter !== 'ALL' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Layers size={14} />
                            </div>
                            <select
                                value={groupFilter}
                                onChange={e => setGroupFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.2rem',
                                    paddingRight: '2rem',
                                    height: '40px',
                                    fontSize: '0.82rem',
                                    fontWeight: groupFilter !== 'ALL' ? 700 : 500,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    border: groupFilter !== 'ALL'
                                        ? '1px solid hsl(var(--primary) / 0.6)'
                                        : '1px solid hsl(var(--border-subtle))',
                                    background: groupFilter !== 'ALL'
                                        ? 'hsl(var(--primary) / 0.05)'
                                        : '#ffffff',
                                    color: groupFilter !== 'ALL'
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            >
                                {groups.map(g => (
                                    <option key={g} value={g}>
                                        {g === 'ALL' ? 'All Groups' : g}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'hsl(var(--text-muted))',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {/* 3. Status Filter */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: statusFilter !== 'ALL' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <CircleDot size={14} />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.2rem',
                                    paddingRight: '2rem',
                                    height: '40px',
                                    fontSize: '0.82rem',
                                    fontWeight: statusFilter !== 'ALL' ? 700 : 500,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    border: statusFilter !== 'ALL'
                                        ? '1px solid hsl(var(--primary) / 0.6)'
                                        : '1px solid hsl(var(--border-subtle))',
                                    background: statusFilter !== 'ALL'
                                        ? 'hsl(var(--primary) / 0.05)'
                                        : '#ffffff',
                                    color: statusFilter !== 'ALL'
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="INACTIVE">Draft / Inactive</option>
                            </select>
                            <ChevronDown size={13} style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'hsl(var(--text-muted))',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {/* 4. Sort Selector */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: (sortBy && sortBy !== 'product_no_desc') ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <ArrowUpDown size={14} />
                            </div>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.2rem',
                                    paddingRight: '2rem',
                                    height: '40px',
                                    fontSize: '0.82rem',
                                    fontWeight: (sortBy && sortBy !== 'product_no_desc') ? 700 : 500,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    border: (sortBy && sortBy !== 'product_no_desc')
                                        ? '1px solid hsl(var(--primary) / 0.6)'
                                        : '1px solid hsl(var(--border-subtle))',
                                    background: (sortBy && sortBy !== 'product_no_desc')
                                        ? 'hsl(var(--primary) / 0.05)'
                                        : '#ffffff',
                                    color: (sortBy && sortBy !== 'product_no_desc')
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            >
                                <option value="product_no_desc">Product No: High to Low</option>
                                <option value="product_no_asc">Product No: Low to High</option>
                                <option value="newest">Date: Newest First</option>
                                <option value="oldest">Date: Oldest First</option>
                                <option value="name_asc">Name: A to Z</option>
                                <option value="name_desc">Name: Z to A</option>
                                <option value="low_price">Price: Low to High</option>
                                <option value="high_price">Price: High to Low</option>
                                <option value="low_stock">Stock: Low First</option>
                                <option value="high_stock">Stock: High First</option>
                            </select>
                            <ChevronDown size={13} style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'hsl(var(--text-muted))',
                                pointerEvents: 'none'
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Active Filter Chips Strip (Always visible when filters are active) */}
            {hasAnyActiveFilters && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '0.78rem'
                }}>
                    <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Filter size={12} /> Active:
                    </span>

                    {searchTerm && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'hsl(var(--primary) / 0.08)',
                            color: 'hsl(var(--primary))',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            Search: &ldquo;{searchTerm}&rdquo;
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                        </span>
                    )}

                    {categoryFilter !== 'ALL' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            Category: {categoryFilter}
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter('ALL')} />
                        </span>
                    )}

                    {groupFilter !== 'ALL' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fdf4ff',
                            color: '#a21caf',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            Group: {groupFilter}
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGroupFilter('ALL')} />
                        </span>
                    )}

                    {statusFilter !== 'ALL' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: statusFilter === 'ACTIVE' ? '#f0fdf4' : '#f8fafc',
                            color: statusFilter === 'ACTIVE' ? '#15803d' : '#64748b',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            Status: {statusFilter === 'ACTIVE' ? 'Active' : 'Draft'}
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                        </span>
                    )}

                    {sortBy && sortBy !== 'product_no_desc' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fefce8',
                            color: '#a16207',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            Custom Sort
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSortBy('product_no_desc')} />
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={handleResetAll}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'hsl(var(--text-muted))',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            padding: '0 4px',
                            marginLeft: '4px'
                        }}
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
