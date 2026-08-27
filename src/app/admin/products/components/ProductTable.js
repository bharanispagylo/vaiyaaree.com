'use client';

import {
    Loader2, Eye, Share2, Package as PackageIcon, Trash2,
    ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { getProductUrl } from '@/lib/productUrl';

export default function ProductTable({
    products = [],
    loading = false,
    selectedProductIds = [],
    toggleSelectItem,
    toggleSelectAll,
    openEditModal,
    setZoomedImage,
    shareToStatus,
    fetchHistory,
    handleDelete,
    currentPage = 1,
    totalPages = 1,
    setPage,
    pageSize = 10,
    setPageSize,
    totalCount = 0,
    sortBy = 'product_no_desc',
    setSortBy
}) {
    const handleHeaderSort = (columnKey) => {
        if (!setSortBy) return;

        if (columnKey === 'product_no') {
            setSortBy(sortBy === 'product_no_desc' ? 'product_no_asc' : 'product_no_desc');
        } else if (columnKey === 'name') {
            setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc');
        } else if (columnKey === 'price') {
            setSortBy(sortBy === 'low_price' ? 'high_price' : 'low_price');
        } else if (columnKey === 'stock') {
            setSortBy(sortBy === 'low_stock' ? 'high_stock' : 'low_stock');
        } else if (columnKey === 'created_at') {
            setSortBy(sortBy === 'newest' ? 'oldest' : 'newest');
        }
    };

    const renderSortIcon = (columnKey) => {
        if (columnKey === 'product_no') {
            if (sortBy === 'product_no_desc') return <ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />;
            if (sortBy === 'product_no_asc') return <ArrowUp size={14} style={{ color: 'hsl(var(--primary))' }} />;
        } else if (columnKey === 'name') {
            if (sortBy === 'name_asc') return <ArrowUp size={14} style={{ color: 'hsl(var(--primary))' }} />;
            if (sortBy === 'name_desc') return <ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />;
        } else if (columnKey === 'price') {
            if (sortBy === 'low_price') return <ArrowUp size={14} style={{ color: 'hsl(var(--primary))' }} />;
            if (sortBy === 'high_price') return <ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />;
        } else if (columnKey === 'stock') {
            if (sortBy === 'low_stock') return <ArrowUp size={14} style={{ color: 'hsl(var(--primary))' }} />;
            if (sortBy === 'high_stock') return <ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />;
        } else if (columnKey === 'created_at') {
            if (sortBy === 'newest') return <ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />;
            if (sortBy === 'oldest') return <ArrowUp size={14} style={{ color: 'hsl(var(--primary))' }} />;
        }
        return <ArrowUpDown size={13} style={{ opacity: 0.35 }} />;
    };

    return (
        <div className="card shadow-sm" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
            {/* Table Control Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                background: '#f8fafc',
                borderBottom: '1px solid hsl(var(--border-subtle))',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-main))' }}>
                    <span style={{
                        background: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontFamily: 'monospace'
                    }}>
                        {totalCount}
                    </span>
                    <span>Products in Catalogue</span>
                </div>

                {/* Page Size Selector */}
                {setPageSize && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        <span style={{ fontWeight: 600 }}>Show:</span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                if (setPage) setPage(1);
                            }}
                            style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid hsl(var(--border-subtle))',
                                background: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: 'hsl(var(--text-main))',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={10}>10 rows</option>
                            <option value={25}>25 rows</option>
                            <option value={50}>50 rows</option>
                            <option value={100}>100 rows</option>
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading products data...
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                        <thead>
                            {/* Column Headers with Order and Sorting */}
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                {/* 1. Index # */}
                                <th style={{ width: '45px', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    #
                                </th>

                                {/* 2. Checkbox */}
                                <th style={{ width: '40px', textAlign: 'center', padding: '0.9rem 0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={products.length > 0 && selectedProductIds.length === products.length}
                                        onChange={toggleSelectAll}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                </th>

                                {/* 3. Product No (Sortable) */}
                                <th
                                    onClick={() => handleHeaderSort('product_no')}
                                    style={{ width: '130px', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none' }}
                                    title="Click to sort by Product Number"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Product No {renderSortIcon('product_no')}
                                    </div>
                                </th>

                                {/* 4. Product Info (Sortable) */}
                                <th
                                    onClick={() => handleHeaderSort('name')}
                                    style={{ padding: '0.9rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none' }}
                                    title="Click to sort by Product Name"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Product {renderSortIcon('name')}
                                    </div>
                                </th>

                                {/* 5. Category */}
                                <th style={{ width: '140px', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Category
                                </th>

                                {/* 6. Price (Sortable) */}
                                <th
                                    onClick={() => handleHeaderSort('price')}
                                    style={{ width: '120px', textAlign: 'right', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none' }}
                                    title="Click to sort by Price"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                        Price {renderSortIcon('price')}
                                    </div>
                                </th>

                                {/* 7. Stock (Sortable) */}
                                <th
                                    onClick={() => handleHeaderSort('stock')}
                                    style={{ width: '120px', textAlign: 'center', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none' }}
                                    title="Click to sort by Stock Quantity"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        Stock {renderSortIcon('stock')}
                                    </div>
                                </th>

                                {/* 8. Status */}
                                <th style={{ width: '90px', textAlign: 'center', padding: '0.9rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Status
                                </th>

                                {/* 9. Actions */}
                                <th style={{ width: '140px', textAlign: 'right', padding: '0.9rem 1.25rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <PackageIcon size={32} style={{ color: '#cbd5e1' }} />
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>No products found</div>
                                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                                                Try adjusting your search criteria or add new products.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product, idx) => {
                                    const isSelected = selectedProductIds.includes(product.id);
                                    const isOutOfStock = (product.stock || 0) <= 0;
                                    const isLowStock = !isOutOfStock && (product.stock || 0) <= (product.alert_threshold || 5);
                                    const prodNo = product.product_no || (product.sku ? parseInt(product.sku) : null) || (1000 + idx);

                                    return (
                                        <tr
                                            key={product.id}
                                            onClick={() => openEditModal(product)}
                                            style={{
                                                background: isSelected ? 'hsl(var(--primary) / 0.05)' : (idx % 2 === 0 ? '#ffffff' : '#fafbfc'),
                                                borderBottom: '1px solid hsl(var(--border-subtle))',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = (idx % 2 === 0 ? '#ffffff' : '#fafbfc'); }}
                                        >
                                            {/* 1. Row Index */}
                                            <td style={{ padding: '0.75rem 0.75rem', color: 'hsl(var(--text-muted))', fontSize: '0.78rem', fontWeight: 600 }}>
                                                {(currentPage - 1) * pageSize + idx + 1}
                                            </td>

                                            {/* 2. Selection Checkbox */}
                                            <td
                                                style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}
                                                onClick={e => { e.stopPropagation(); toggleSelectItem(product.id); }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                            </td>

                                            {/* 3. Product No Badge */}
                                            <td style={{ padding: '0.75rem 0.75rem' }}>
                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: 900,
                                                    background: 'hsl(var(--primary) / 0.08)',
                                                    color: 'hsl(var(--primary))',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '0.02em',
                                                    display: 'inline-block'
                                                }}>
                                                    #{prodNo}
                                                </span>
                                            </td>

                                            {/* 4. Product Info & Thumbnail */}
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                                    <div style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        borderRadius: '10px',
                                                        overflow: 'hidden',
                                                        background: '#f8fafc',
                                                        flexShrink: 0,
                                                        border: '1px solid hsl(var(--border-subtle))',
                                                        position: 'relative'
                                                    }}>
                                                        {product.image_url ? (
                                                            <img
                                                                src={product.image_url?.split(',')[0]}
                                                                alt={product.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setZoomedImage(product.image_url?.split(',')[0]);
                                                                }}
                                                                onError={e => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80';
                                                                }}
                                                                title="Click to zoom image"
                                                            />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
                                                                <PackageIcon size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                                            {product.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                            {product.product_catalog_image_id && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))', padding: '1px 5px', borderRadius: '4px' }}>
                                                                    {product.product_catalog_image_id}
                                                                </span>
                                                            )}
                                                            {product.type === 'variant' && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#f3e8ff', color: '#7e22ce', padding: '1px 5px', borderRadius: '4px' }}>
                                                                    VARIANT
                                                                </span>
                                                            )}
                                                            {product.slug && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }} title={`Slug: ${product.slug}`}>
                                                                    /{product.slug}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 5. Category */}
                                            <td style={{ padding: '0.75rem 0.75rem' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                                                    {product.category || '—'}
                                                </span>
                                            </td>

                                            {/* 6. Price */}
                                            <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontWeight: 800, color: 'hsl(var(--text-main))', fontSize: '0.9rem' }}>
                                                ₹{(product.price || 0).toLocaleString()}
                                            </td>

                                            {/* 7. Stock Status Badge */}
                                            <td style={{ textAlign: 'center', padding: '0.75rem 0.75rem' }}>
                                                {isOutOfStock ? (
                                                    <span style={{
                                                        background: '#fff1f2',
                                                        color: '#e11d48',
                                                        border: '1px solid #fecdd3',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.03em',
                                                        display: 'inline-block',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        Out of Stock
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span style={{
                                                        background: '#fffbeb',
                                                        color: '#d97706',
                                                        border: '1px solid #fde68a',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        display: 'inline-block',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {product.stock} pcs (Low)
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        background: '#f0fdf4',
                                                        color: '#16a34a',
                                                        border: '1px solid #bbf7d0',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        display: 'inline-block',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {product.stock} pcs
                                                    </span>
                                                )}
                                            </td>

                                            {/* 8. Status Badge */}
                                            <td style={{ textAlign: 'center', padding: '0.75rem 0.75rem' }}>
                                                {product.is_active !== 0 ? (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f0fdf4', color: '#16a34a', padding: '2px 7px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                                                        ACTIVE
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                                        DRAFT
                                                    </span>
                                                )}
                                            </td>

                                            {/* 9. Quick Actions */}
                                            <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); window.open(getProductUrl(product), '_blank'); }}
                                                        title="View Live Storefront Page"
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); shareToStatus(product); }}
                                                        title="Share to WhatsApp Status"
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', color: '#16a34a' }}
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); fetchHistory(product); }}
                                                        title="View Stock History Log"
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', color: '#475569' }}
                                                    >
                                                        <PackageIcon size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); handleDelete(product.id); }}
                                                        title="Delete Product"
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Table Pagination Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid hsl(var(--border-subtle))',
                background: '#fafbfc',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                    Showing {totalCount > 0 ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, totalCount)}` : 0} of {totalCount} products
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', opacity: currentPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '8px', fontWeight: 700 }}
                        >
                            <ChevronLeft size={15} /> Prev
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {(() => {
                                const pages = [];
                                const range = 1;
                                pages.push(1);
                                if (currentPage > range + 2) pages.push('...');
                                for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
                                    pages.push(i);
                                }
                                if (currentPage < totalPages - range - 1) pages.push('...');
                                if (totalPages > 1) pages.push(totalPages);

                                return pages.map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.4rem', fontWeight: 700 }}>...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setPage(page)}
                                            style={{
                                                minWidth: '34px',
                                                height: '34px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0',
                                                fontSize: '0.82rem',
                                                fontWeight: 800,
                                                borderRadius: '8px',
                                                background: currentPage === page ? 'hsl(var(--primary))' : '#ffffff',
                                                color: currentPage === page ? 'white' : 'hsl(var(--text-main))',
                                                border: currentPage === page ? 'none' : '1px solid hsl(var(--border-subtle))',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', opacity: currentPage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '8px', fontWeight: 700 }}
                        >
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
