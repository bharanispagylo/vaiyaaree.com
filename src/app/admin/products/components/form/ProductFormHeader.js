'use client';

import {
    ArrowLeft, Eye, Trash2, FileText, Save, Globe, Edit2, Link as LinkIcon, Check
} from 'lucide-react';

export default function ProductFormHeader({
    currentProduct,
    productStatus,
    fbProcessing,
    setIsEditing,
    handleDelete,
    handleSaveAsDraft,
    publicProductPath,
    publicProductFullUrl,
    isCustomSlugLocked,
    effectiveSlug,
    setTempSlug,
    setIsEditingSlug,
    copiedProductUrl,
    setCopiedProductUrl
}) {
    return (
        <>
            {/* ── TOP HEADER & STICKY ACTION BAR ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid hsl(var(--border-subtle))',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}
                    >
                        <ArrowLeft size={16} /> Products
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {currentProduct?.id ? 'Edit Product' : 'Add New Product'}
                            {currentProduct?.id ? (
                                <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '50px', fontWeight: 800 }}>
                                    #{currentProduct?.product_no || currentProduct?.sku || currentProduct?.id}
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '50px', fontWeight: 800 }}>
                                    Draft
                                </span>
                            )}
                        </h2>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {currentProduct?.id && (
                        <a
                            href={publicProductPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                        >
                            <Eye size={14} /> View Live
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                        Cancel
                    </button>
                    {currentProduct?.id && (
                        <button
                            type="button"
                            onClick={() => handleDelete(currentProduct.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSaveAsDraft}
                        disabled={fbProcessing}
                        className="btn btn-secondary"
                        style={{
                            padding: '0.45rem 1rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                        }}
                    >
                        <FileText size={14} /> Save as Draft
                    </button>
                    <button
                        type="submit"
                        form="product-admin-form"
                        className="btn btn-primary"
                        disabled={fbProcessing}
                        style={{
                            padding: '0.45rem 1.35rem',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(93, 8, 33, 0.25)'
                        }}
                    >
                        <Save size={15} /> {fbProcessing ? 'Saving...' : (productStatus === 'draft' ? 'Save Product' : 'Publish Product')}
                    </button>
                </div>
            </div>

            {/* ── PRODUCT PUBLIC URL PREVIEW BAR ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--accent) / 0.05) 100%)',
                border: '1px solid hsl(var(--primary) / 0.2)',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Globe size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Public URL Permalink
                            </span>
                            {isCustomSlugLocked && (
                                <span style={{ fontSize: '0.62rem', background: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                    CUSTOM SLUG
                                </span>
                            )}
                        </div>
                        <a
                            href={publicProductPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: 'hsl(var(--primary))',
                                textDecoration: 'none',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {publicProductFullUrl}
                        </a>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setTempSlug(effectiveSlug);
                            setIsEditingSlug(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                    >
                        <Edit2 size={12} /> Edit Slug
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(publicProductFullUrl);
                                setCopiedProductUrl(true);
                                setTimeout(() => setCopiedProductUrl(false), 2000);
                            }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                    >
                        {copiedProductUrl ? <Check size={12} /> : <LinkIcon size={12} />}
                        {copiedProductUrl ? 'Copied!' : 'Copy URL'}
                    </button>
                </div>
            </div>
        </>
    );
}
