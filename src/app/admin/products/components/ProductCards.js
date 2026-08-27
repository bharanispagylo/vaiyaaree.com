'use client';

import { Loader2, Image as ImageIcon, Eye, Share2, Package as PackageIcon, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProductUrl } from '@/lib/productUrl';

export default function ProductCards({
    products = [],
    loading = false,
    openEditModal,
    setZoomedImage,
    shareToStatus,
    fetchHistory,
    handleDelete,
    currentPage = 1,
    totalPages = 1,
    setPage
}) {
    return (
        <div>
            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading products...
                </div>
            ) : products.length === 0 ? (
                <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', borderRadius: '16px' }}>
                    No products found.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    {products.map(product => {
                        const isLowStock = (product.stock || 0) <= (product.alert_threshold || 5);

                        return (
                            <div
                                key={product.id}
                                className="card"
                                style={{
                                    padding: 0,
                                    overflow: 'hidden',
                                    borderRadius: '16px',
                                    background: '#ffffff',
                                    border: '1px solid hsl(var(--border-subtle))',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            >
                                {/* Product Image */}
                                <div
                                    style={{ height: '190px', background: 'hsl(var(--bg-app))', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                                    onClick={() => openEditModal(product)}
                                    title="Click to edit product"
                                >
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url?.split(',')[0]}
                                            alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedImage(product.image_url?.split(',')[0]);
                                            }}
                                            onError={e => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
                                            <ImageIcon size={48} />
                                        </div>
                                    )}

                                    {/* Stock Badge */}
                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                        <span className={isLowStock ? 'badge badge-cancelled' : 'badge badge-delivered'}>
                                            {product.stock || 0} pcs
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div style={{ padding: '1rem' }}>
                                    {product.product_catalog_image_id && (
                                        <div style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-roboto)',
                                            background: 'hsl(var(--accent) / 0.1)',
                                            color: 'hsl(var(--accent))',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            display: 'inline-block',
                                            marginBottom: '6px'
                                        }}>
                                            {product.product_catalog_image_id}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                        {product.category || 'General'}
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.95rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {product.name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {product.description || '—'}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--primary))', marginBottom: '12px' }}>
                                        ₹{(product.price || 0).toLocaleString()}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => window.open(getProductUrl(product), '_blank')}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem', color: 'hsl(var(--primary))', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="View Live Product Page"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => shareToStatus(product)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem', color: 'hsl(var(--primary))', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Share to WhatsApp Status"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fetchHistory(product)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem', color: 'hsl(var(--primary))', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="View Stock History Log"
                                        >
                                            <PackageIcon size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(product.id)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Delete Product"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Card Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                                    <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setPage(page)}
                                        className="btn"
                                        style={{
                                            minWidth: '38px',
                                            height: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            borderRadius: '10px',
                                            background: currentPage === page ? 'hsl(var(--primary))' : '#ffffff',
                                            color: currentPage === page ? 'white' : 'hsl(var(--text-main))',
                                            border: currentPage === page ? 'none' : '1px solid hsl(var(--border-subtle))',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
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
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
