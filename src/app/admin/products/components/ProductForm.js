'use client';

import { useState, useEffect } from 'react';
import {
    Link as LinkIcon, Check, Package as PackageIcon, LayoutGrid,
    Upload, Image as ImageIcon, Trash2, Plus, Edit2, RefreshCw,
    ExternalLink, X, Globe, ArrowLeft, Save, Eye, Layers, Settings
} from 'lucide-react';
import { getProductSlug, slugify } from '@/lib/productUrl';

export default function ProductForm({
    currentProduct,
    formProductName,
    setFormProductName,
    copiedProductUrl,
    setCopiedProductUrl,
    productType,
    setProductType,
    dbActiveCategories = [],
    productImageUrl,
    setProductImageUrl,
    galleryImageUrl,
    setGalleryImageUrl,
    variants = [],
    setVariants,
    addVariant,
    updateVariant,
    removeVariant,
    handleSave,
    handleDelete,
    setIsEditing,
    fbProcessing,
    setZoomedImage,
    setActiveImageField,
    setShowMediaPicker,
    setLoadingOverlayText,
    setOcrLoading,
    setWatermarkModal,
    setErrorModal
}) {
    // Slug & Permalink States
    const [customSlug, setCustomSlug] = useState(() => currentProduct?.slug || '');
    const [isEditingSlug, setIsEditingSlug] = useState(false);
    const [tempSlug, setTempSlug] = useState('');
    const [isCustomSlugLocked, setIsCustomSlugLocked] = useState(() => Boolean(currentProduct?.slug));

    // Multi-Option Builder State (Shopify Style: Size, Color, etc.)
    const extractInitialOptions = (existingVars) => {
        if (!existingVars || existingVars.length === 0) {
            return [
                { name: 'Size', values: ['S', 'M'] },
                { name: 'Color', values: ['Red', 'Green', 'Blue'] }
            ];
        }
        const first = existingVars[0]?.name || '';
        if (first.includes('/')) {
            const partsCount = first.split('/').length;
            const defaultNames = ['Size', 'Color', 'Material', 'Style'];
            const opts = [];
            for (let i = 0; i < partsCount; i++) {
                opts.push({ name: defaultNames[i] || `Option ${i + 1}`, values: [] });
            }
            existingVars.forEach(v => {
                const parts = String(v.name || '').split('/').map(p => p.trim());
                parts.forEach((p, idx) => {
                    if (opts[idx] && p && !opts[idx].values.includes(p)) {
                        opts[idx].values.push(p);
                    }
                });
            });
            const valid = opts.filter(o => o.values.length > 0);
            return valid.length > 0 ? valid : [{ name: 'Size', values: ['S', 'M'] }, { name: 'Color', values: ['Red', 'Green'] }];
        } else {
            const vals = [];
            existingVars.forEach(v => {
                const val = String(v.name || '').trim();
                if (val && !vals.includes(val)) vals.push(val);
            });
            return [{ name: 'Size', values: vals.length > 0 ? vals : ['32', '34', '36', '38', '40', '42'] }];
        }
    };

    const [optionsList, setOptionsList] = useState(() => extractInitialOptions(variants));
    const [optValueInputs, setOptValueInputs] = useState({});
    const [selectedVariantRows, setSelectedVariantRows] = useState([]);

    useEffect(() => {
        if (variants && variants.length > 0) {
            setOptionsList(extractInitialOptions(variants));
        }
    }, [currentProduct]);

    // Generate Combinations Matrix from options (Cartesian Product)
    const generateMatrix = (customOpts = optionsList, showModalOnError = true) => {
        const validOptions = (customOpts || []).filter(opt => opt.name.trim() && opt.values && opt.values.length > 0);
        if (validOptions.length === 0) {
            if (showModalOnError && setErrorModal) {
                setErrorModal({
                    title: 'Missing Option Values',
                    message: 'Please specify at least one option name and add at least one value (e.g. Size: S, M or Color: Red, Green) before generating combinations.'
                });
            }
            return;
        }

        // Cartesian product
        const combos = validOptions.reduce((acc, currOpt) => {
            if (acc.length === 0) {
                return currOpt.values.map(val => val.trim());
            }
            const res = [];
            acc.forEach(prev => {
                currOpt.values.forEach(val => {
                    res.push(`${prev} / ${val.trim()}`);
                });
            });
            return res;
        }, []);

        const defaultPrice = currentProduct?.price || 0;
        const defaultCompare = currentProduct?.compare_price || currentProduct?.original_price || '';
        const baseSku = currentProduct?.product_no || currentProduct?.sku || 'SKU';
        const mainImg = (productImageUrl || '').split(',')[0] || '';

        const newVariants = combos.map((comboName) => {
            const existing = (variants || []).find(v => String(v.name || '').trim().toLowerCase() === comboName.toLowerCase());
            if (existing) {
                return {
                    ...existing,
                    name: comboName
                };
            }

            const skuSuffix = comboName.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase();
            return {
                name: comboName,
                sku: `${baseSku}-${skuSuffix}`,
                price: defaultPrice,
                compare_price: defaultCompare,
                stock: 10,
                image_url: mainImg
            };
        });

        setVariants(newVariants);
    };

    const addOptionGroup = () => {
        const defaultNames = ['Size', 'Color', 'Material', 'Style', 'Pattern'];
        const existingNames = optionsList.map(o => o.name.toLowerCase());
        const nextName = defaultNames.find(n => !existingNames.includes(n.toLowerCase())) || `Option ${optionsList.length + 1}`;
        const updated = [...optionsList, { name: nextName, values: [] }];
        setOptionsList(updated);
    };

    const removeOptionGroup = (optIdx) => {
        const updated = optionsList.filter((_, i) => i !== optIdx);
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const updateOptionName = (optIdx, newName) => {
        const updated = [...optionsList];
        updated[optIdx].name = newName;
        setOptionsList(updated);
    };

    const addOptionValue = (optIdx, value) => {
        const clean = String(value || '').trim();
        if (!clean) return;
        const updated = [...optionsList];
        if (!updated[optIdx].values.includes(clean)) {
            updated[optIdx].values = [...updated[optIdx].values, clean];
            setOptionsList(updated);
            generateMatrix(updated, false);
        }
        setOptValueInputs(prev => ({ ...prev, [optIdx]: '' }));
    };

    const removeOptionValue = (optIdx, valIdx) => {
        const updated = [...optionsList];
        updated[optIdx].values = updated[optIdx].values.filter((_, i) => i !== valIdx);
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const addPresetValuesToOption = (optIdx, presetValues) => {
        const updated = [...optionsList];
        const currentVals = updated[optIdx].values || [];
        const newVals = presetValues.filter(pv => !currentVals.some(cv => cv.toLowerCase() === pv.toLowerCase()));
        updated[optIdx].values = [...currentVals, ...newVals];
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const toggleSelectAllVariants = () => {
        if (selectedVariantRows.length === variants.length) {
            setSelectedVariantRows([]);
        } else {
            setSelectedVariantRows(variants.map((_, i) => i));
        }
    };

    const toggleSelectVariantRow = (idx) => {
        if (selectedVariantRows.includes(idx)) {
            setSelectedVariantRows(selectedVariantRows.filter(i => i !== idx));
        } else {
            setSelectedVariantRows([...selectedVariantRows, idx]);
        }
    };

    useEffect(() => {
        if (productType === 'variant' && (!variants || variants.length === 0)) {
            generateMatrix(optionsList, false);
        }
    }, [productType]);

    useEffect(() => {
        setCustomSlug(currentProduct?.slug || '');
        setIsCustomSlugLocked(Boolean(currentProduct?.slug));
        setIsEditingSlug(false);
    }, [currentProduct]);

    useEffect(() => {
        if (!isCustomSlugLocked) {
            const autoSlug = slugify(formProductName || '');
            setCustomSlug(autoSlug);
        }
    }, [formProductName, isCustomSlugLocked]);

    // Compute effective public product slug
    const effectiveSlug = (customSlug && customSlug.trim())
        ? slugify(customSlug)
        : getProductSlug({
            ...currentProduct,
            name: formProductName || currentProduct?.name || 'new-product',
            product_no: currentProduct?.product_no || currentProduct?.sku || ''
        });

    const publicProductPath = `/product/${effectiveSlug}/`;
    const publicProductFullUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publicProductPath}`
        : `https://vaiyaaree.com${publicProductPath}`;
    const baseSiteUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/` : 'https://vaiyaaree.com/product/';

    return (
        <div className="animate-enter" style={{ paddingBottom: '3rem', maxWidth: '1450px', margin: '0 auto' }}>
            {/* ── TOP HEADER & STICKY ACTION BAR (Shopify Style) ── */}
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

                {/* Top Action Buttons (Cancel, Delete, Save) */}
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
                            onClick={() => { handleDelete(currentProduct.id); setIsEditing(false); }}
                            className="btn btn-danger"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
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
                        <Save size={15} /> {fbProcessing ? 'Saving...' : 'Save Product'}
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

            {/* ── MAIN 2-COLUMN SHOPIFY-STYLE LAYOUT ── */}
            <style>{`
                .shopify-product-form-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 340px;
                    gap: 1.5rem;
                    alignItems: flex-start;
                }
                @media (max-width: 1024px) {
                    .shopify-product-form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
            <form id="product-admin-form" key={currentProduct?.id || 'new_product'} onSubmit={handleSave}>
                <input type="hidden" name="slug" value={effectiveSlug} />

                <div className="shopify-product-form-grid">
                    {/* ═══════════════════════════════════════════════════ */}
                    {/* ── LEFT COLUMN (Main Product Content & Variants) ── */}
                    {/* ═══════════════════════════════════════════════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        
                        {/* 1. TITLE, SLUG & DESCRIPTION CARD */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                    Product Title *
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    value={formProductName}
                                    onChange={(e) => setFormProductName(e.target.value)}
                                    required
                                    placeholder="e.g. Pure Kanjivaram Silk Saree with Rich Pallu"
                                    className="admin-input"
                                    style={{ fontSize: '0.95rem', fontWeight: 600, padding: '0.65rem 0.85rem' }}
                                />

                                {/* Inline Permalink Slug Box */}
                                <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ fontWeight: 700, color: '#64748b' }}>Permalink:</span>
                                        <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{baseSiteUrl}</span>

                                        {!isEditingSlug ? (
                                            <>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: '#0f172a',
                                                    background: '#e2e8f0',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {effectiveSlug}
                                                </span>
                                                <span style={{ color: '#64748b', fontFamily: 'monospace' }}>/</span>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTempSlug(effectiveSlug);
                                                        setIsEditingSlug(true);
                                                    }}
                                                    style={{
                                                        padding: '2px 8px',
                                                        background: '#ffffff',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '4px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        color: '#0f172a',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Edit2 size={11} /> Edit
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <input
                                                    type="text"
                                                    value={tempSlug}
                                                    onChange={(e) => setTempSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                                                    placeholder="custom-slug"
                                                    style={{
                                                        padding: '3px 8px',
                                                        border: '1.5px solid hsl(var(--primary))',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        fontFamily: 'monospace',
                                                        outline: 'none',
                                                        minWidth: '180px',
                                                        background: '#ffffff'
                                                    }}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const cleaned = slugify(tempSlug);
                                                            setCustomSlug(cleaned);
                                                            setIsCustomSlugLocked(Boolean(cleaned));
                                                            setIsEditingSlug(false);
                                                        } else if (e.key === 'Escape') {
                                                            setIsEditingSlug(false);
                                                        }
                                                    }}
                                                />
                                                <span style={{ color: '#64748b', fontFamily: 'monospace' }}>/</span>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const cleaned = slugify(tempSlug);
                                                        setCustomSlug(cleaned);
                                                        setIsCustomSlugLocked(Boolean(cleaned));
                                                        setIsEditingSlug(false);
                                                    }}
                                                    style={{ padding: '3px 8px', background: 'hsl(var(--primary))', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingSlug(false)}
                                                    style={{ padding: '3px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const defaultAuto = slugify(formProductName || 'product');
                                                        setCustomSlug('');
                                                        setTempSlug(defaultAuto);
                                                        setIsCustomSlugLocked(false);
                                                        setIsEditingSlug(false);
                                                    }}
                                                    style={{ padding: '3px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                >
                                                    <RefreshCw size={10} /> Reset
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    defaultValue={currentProduct?.description}
                                    placeholder="Enter full product details, fabric specifications, weave style, wash care instructions..."
                                    rows="5"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#ffffff',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        color: '#0f172a',
                                        fontFamily: 'inherit',
                                        fontSize: '0.85rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>

                        {/* 2. PRODUCT TYPE SELECTOR CARD */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Product Type
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={() => setProductType('simple')}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: productType === 'simple' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'simple' ? '#ffffff' : '#64748b',
                                        fontWeight: 700, fontSize: '0.84rem', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <PackageIcon size={16} /> Simple Product (Single SKU)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProductType('variant')}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: productType === 'variant' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'variant' ? '#ffffff' : '#64748b',
                                        fontWeight: 700, fontSize: '0.84rem', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <LayoutGrid size={16} /> Variant Product (Size, Color, etc.)
                                </button>
                            </div>
                        </div>

                        {/* 3. SIMPLE PRODUCT: MEDIA GALLERY CARD */}
                        {productType === 'simple' && (
                            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ImageIcon size={18} style={{ color: 'hsl(var(--primary))' }} /> Media & Images
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    {/* Main Product Image */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                            Main Product Image *
                                        </label>
                                        {productImageUrl && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                {productImageUrl.split(',').filter(Boolean).map((imgUrl, idx) => (
                                                    <div key={imgUrl} style={{ position: 'relative', width: '75px', height: '95px' }}>
                                                        <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setZoomedImage(imgUrl)} title="Click to zoom" />
                                                        <button type="button" onClick={() => {
                                                            setProductImageUrl(prev => {
                                                                const urls = prev.split(',').filter(Boolean);
                                                                urls.splice(idx, 1);
                                                                return urls.join(',');
                                                            });
                                                        }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button type="button" onClick={() => { setActiveImageField({ type: 'product' }); setTimeout(() => setShowMediaPicker(true), 50); }} className="btn btn-secondary" style={{ flex: 1, height: '40px', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <ImageIcon size={14} /> Library
                                            </button>
                                            <label className="btn btn-secondary" style={{ flex: 1, height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <Upload size={14} /> Upload
                                                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (!files.length) return;
                                                    try {
                                                        setLoadingOverlayText("Processing..."); setOcrLoading(true);
                                                        for (const file of files) {
                                                            const reader = new FileReader();
                                                            const filePromptPromise = new Promise((resolve) => {
                                                                reader.onload = async (re) => {
                                                                    try {
                                                                        const base64 = re.target.result;
                                                                        const formData = new FormData();
                                                                        formData.append('file', file);
                                                                        formData.append('checkOnly', 'true');
                                                                        const token = localStorage.getItem('cast_prince_admin') || '';
                                                                        const detRes = await fetch('/api/admin/upload', {
                                                                            method: 'POST',
                                                                            headers: { 'Authorization': `Bearer ${token}` },
                                                                            body: formData
                                                                        });
                                                                        const detData = await detRes.json();

                                                                        const onProceedWithUpload = async (catId) => {
                                                                            setLoadingOverlayText("Processing..."); setOcrLoading(true);
                                                                            const uploadData = new FormData();
                                                                            uploadData.append('file', file);
                                                                            uploadData.append('catalogId', catId);
                                                                            uploadData.append('requireClean', 'true');
                                                                            uploadData.append('skipDetection', 'true');
                                                                            const token = localStorage.getItem('cast_prince_admin') || '';
                                                                            const res = await fetch('/api/admin/upload', {
                                                                                method: 'POST',
                                                                                headers: { 'Authorization': `Bearer ${token}` },
                                                                                body: uploadData
                                                                            });
                                                                            const data = await res.json();
                                                                            const finalUrl = data.watermarkedUrl || data.url;
                                                                            setProductImageUrl(prev => {
                                                                                const existingArray = prev ? prev.split(',').filter(Boolean) : [];
                                                                                return [...existingArray, finalUrl].join(',');
                                                                            });
                                                                            setWatermarkModal(null);
                                                                            resolve();
                                                                        };

                                                                        if (detData.hasWatermark) {
                                                                            setErrorModal({
                                                                                title: 'Watermarked Image Blocked',
                                                                                message: `This uploaded image already contains an existing product watermark (${detData.catalogId || 'CAT-CODE'}). Images with existing product watermarks cannot be selected or uploaded as product images.`
                                                                            });
                                                                            resolve();
                                                                            return;
                                                                        } else {
                                                                            const newCatId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                                                                            setWatermarkModal({
                                                                                type: 'new',
                                                                                detectedCode: newCatId,
                                                                                url: base64,
                                                                                onProceed: () => onProceedWithUpload(newCatId)
                                                                            });
                                                                        }
                                                                    } catch (err) {
                                                                        setErrorModal({ title: 'Error', message: err.message });
                                                                        resolve();
                                                                    } finally {
                                                                        setOcrLoading(false);
                                                                    }
                                                                };
                                                                reader.readAsDataURL(file);
                                                            });
                                                            await filePromptPromise;
                                                        }
                                                    } catch (err) {
                                                        setErrorModal({ title: 'Upload Error', message: err.message });
                                                    } finally {
                                                        setOcrLoading(false);
                                                    }
                                                    e.target.value = '';
                                                }} />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Gallery Images */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                            Gallery Images
                                        </label>
                                        {galleryImageUrl.filter(Boolean).length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                {galleryImageUrl.filter(Boolean).map((imgUrl, idx) => (
                                                    <div key={imgUrl} style={{ position: 'relative', width: '75px', height: '95px' }}>
                                                        <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setZoomedImage(imgUrl)} title="Click to zoom" />
                                                        <button type="button" onClick={() => {
                                                            setGalleryImageUrl(prev => {
                                                                const urls = [...prev];
                                                                urls.splice(idx, 1);
                                                                return urls;
                                                            });
                                                        }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button type="button" onClick={() => { setActiveImageField({ type: 'gallery' }); setTimeout(() => setShowMediaPicker(true), 50); }} className="btn btn-secondary" style={{ flex: 1, height: '40px', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <ImageIcon size={14} /> Library
                                            </button>
                                            <label className="btn btn-secondary" style={{ flex: 1, height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <Upload size={14} /> Upload
                                                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (!files.length) return;
                                                    try {
                                                        setLoadingOverlayText('Uploading Gallery Assets...');
                                                        setOcrLoading(true);
                                                        const uploadedUrls = [];
                                                        for (const file of files) {
                                                            const formData = new FormData();
                                                            formData.append('file', file);
                                                            formData.append('skipDetection', 'true');
                                                            formData.append('requireClean', 'false');
                                                            const token = localStorage.getItem('cast_prince_admin') || '';
                                                            const res = await fetch('/api/admin/upload', {
                                                                method: 'POST',
                                                                headers: { 'Authorization': `Bearer ${token}` },
                                                                body: formData
                                                            });
                                                            const data = await res.json();
                                                            if (res.ok) uploadedUrls.push(data.url);
                                                        }
                                                        setGalleryImageUrl(prev => [...uploadedUrls, ...prev]);
                                                    } catch (err) {
                                                        setErrorModal({ title: 'Upload Error', message: err.message });
                                                    } finally {
                                                        setOcrLoading(false);
                                                    }
                                                    e.target.value = '';
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. SIMPLE PRODUCT: PRICING & INVENTORY CARD */}
                        {productType === 'simple' && (
                            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
                                    Pricing & Inventory
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                            Price (Selling Price ₹)
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            defaultValue={currentProduct?.price ?? ''}
                                            min="0"
                                            placeholder="0.00"
                                            className="admin-input"
                                            style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}
                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                            Compare-at Price (MRP ₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="compare_price"
                                            defaultValue={(() => {
                                                const tagList = Array.isArray(currentProduct?.tags)
                                                    ? currentProduct?.tags
                                                    : (typeof currentProduct?.tags === 'string' ? currentProduct?.tags.split(',') : []);
                                                const mrpTag = tagList.map(t => String(t).trim()).find(t => t.toLowerCase().startsWith('mrp:'));
                                                return currentProduct?.compare_price || currentProduct?.original_price || (mrpTag ? mrpTag.split(':')[1] : '');
                                            })()}
                                            required
                                            min="0"
                                            placeholder="0.00"
                                            className="admin-input"
                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                            Stock Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            name="stock"
                                            defaultValue={currentProduct?.stock ?? 0}
                                            required
                                            min="0"
                                            placeholder="0"
                                            className="admin-input"
                                            style={{ fontWeight: 700 }}
                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. VARIANT PRODUCT: SHOPIFY OPTIONS BUILDER & COMBINATIONS MATRIX */}
                        {productType === 'variant' && (
                            <>
                                {/* ── CARD 1: SHOPIFY OPTIONS BUILDER (Size, Color, Material, etc.) ── */}
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                                                Options
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Add options like size or color (e.g. Size: S, M and Color: Red, Green)
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addOptionGroup}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Plus size={14} /> Add another option
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {optionsList.map((opt, optIdx) => {
                                            const isSizeOpt = opt.name.toLowerCase().includes('size');
                                            const isColorOpt = opt.name.toLowerCase().includes('color') || opt.name.toLowerCase().includes('colour');

                                            return (
                                                <div key={optIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.15rem' }}>
                                                    {/* Option Header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                Option {optIdx + 1}:
                                                            </span>
                                                            <select
                                                                value={['Size', 'Color', 'Material', 'Style', 'Pattern'].includes(opt.name) ? opt.name : 'Custom'}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (val !== 'Custom') updateOptionName(optIdx, val);
                                                                }}
                                                                style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', background: '#ffffff' }}
                                                            >
                                                                <option value="Size">Size</option>
                                                                <option value="Color">Color</option>
                                                                <option value="Material">Material</option>
                                                                <option value="Style">Style</option>
                                                                <option value="Pattern">Pattern</option>
                                                                <option value="Custom">Custom Name</option>
                                                            </select>
                                                            {!['Size', 'Color', 'Material', 'Style', 'Pattern'].includes(opt.name) && (
                                                                <input
                                                                    type="text"
                                                                    value={opt.name}
                                                                    placeholder="e.g. Blouse Type"
                                                                    onChange={e => updateOptionName(optIdx, e.target.value)}
                                                                    style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, width: '130px', background: '#ffffff' }}
                                                                />
                                                            )}
                                                        </div>

                                                        {optionsList.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOptionGroup(optIdx)}
                                                                style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                title="Remove option"
                                                            >
                                                                <Trash2 size={13} /> Remove Option
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Option Values Tags */}
                                                    <div style={{ marginBottom: '0.6rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                                            Option Values:
                                                        </label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '40px' }}>
                                                            {opt.values.length === 0 && (
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                                    No values added yet. Type below and press Enter.
                                                                </span>
                                                            )}
                                                            {opt.values.map((val, valIdx) => (
                                                                <span
                                                                    key={valIdx}
                                                                    style={{
                                                                        background: '#f1f5f9',
                                                                        color: '#0f172a',
                                                                        border: '1px solid #cbd5e1',
                                                                        padding: '0.25rem 0.65rem',
                                                                        borderRadius: '20px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 700,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}
                                                                >
                                                                    {val}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOptionValue(optIdx, valIdx)}
                                                                        style={{ border: 'none', background: '#cbd5e1', color: '#334155', width: '16px', height: '16px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, fontSize: '0.65rem' }}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Add Value Input + Presets */}
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder={`Add ${opt.name} value (e.g. ${isColorOpt ? 'Red, Green' : 'S, M'}) and press Enter`}
                                                            value={optValueInputs[optIdx] || ''}
                                                            onChange={e => setOptValueInputs({ ...optValueInputs, [optIdx]: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' || e.key === ',') {
                                                                    e.preventDefault();
                                                                    addOptionValue(optIdx, optValueInputs[optIdx]);
                                                                }
                                                            }}
                                                            style={{ flex: 1, minWidth: '200px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => addOptionValue(optIdx, optValueInputs[optIdx])}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>

                                                    {/* Presets */}
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Presets:</span>
                                                        {isSizeOpt ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addPresetValuesToOption(optIdx, ['32', '34', '36', '38', '40', '42', 'Unstitched'])}
                                                                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                                                                >
                                                                    + Blouse 32-42 & Unstitched
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addPresetValuesToOption(optIdx, ['S', 'M', 'L', 'XL', 'XXL'])}
                                                                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                                                                >
                                                                    + S, M, L, XL, XXL
                                                                </button>
                                                                {['32', '34', '36', '38', '40', '42', '44', 'Unstitched', 'Free Size', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => (
                                                                    <button
                                                                        key={sz}
                                                                        type="button"
                                                                        onClick={() => addOptionValue(optIdx, sz)}
                                                                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                                    >
                                                                        +{sz}
                                                                    </button>
                                                                ))}
                                                            </>
                                                        ) : isColorOpt ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addPresetValuesToOption(optIdx, ['Red', 'Maroon', 'Pink', 'Green', 'Navy Blue', 'Gold'])}
                                                                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                                                                >
                                                                    + Popular Colors
                                                                </button>
                                                                {['Red', 'Maroon', 'Pink', 'Green', 'Navy Blue', 'Royal Blue', 'Gold', 'Mustard', 'Purple', 'Black', 'Wine', 'Orange'].map(cl => (
                                                                    <button
                                                                        key={cl}
                                                                        type="button"
                                                                        onClick={() => addOptionValue(optIdx, cl)}
                                                                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                                    >
                                                                        +{cl}
                                                                    </button>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            ['Silk', 'Cotton', 'Organza', 'Chiffon', 'Georgette', 'Tissue', 'Linen'].map(mat => (
                                                                <button
                                                                    key={mat}
                                                                    type="button"
                                                                    onClick={() => addOptionValue(optIdx, mat)}
                                                                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                                >
                                                                    +{mat}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── CARD 2: SHOPIFY VARIANTS MATRIX TABLE ── */}
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                                Variants Matrix ({variants.length})
                                            </span>
                                            {selectedVariantRows.length > 0 && (
                                                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                                    {selectedVariantRows.length} selected
                                                </span>
                                            )}
                                        </div>

                                        {/* Bulk Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const targetList = selectedVariantRows.length > 0 ? selectedVariantRows : variants.map((_, i) => i);
                                                    const val = prompt(`Enter Selling Price (₹) to apply to ${targetList.length} variant(s):`);
                                                    if (val && !isNaN(Number(val))) {
                                                        const num = Number(val);
                                                        setVariants(variants.map((v, idx) => targetList.includes(idx) ? { ...v, price: num } : v));
                                                    }
                                                }}
                                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
                                            >
                                                Edit Prices
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const targetList = selectedVariantRows.length > 0 ? selectedVariantRows : variants.map((_, i) => i);
                                                    const val = prompt(`Enter Compare-at Price (MRP ₹) to apply to ${targetList.length} variant(s):`);
                                                    if (val && !isNaN(Number(val))) {
                                                        const num = Number(val);
                                                        setVariants(variants.map((v, idx) => targetList.includes(idx) ? { ...v, compare_price: num } : v));
                                                    }
                                                }}
                                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
                                            >
                                                Edit Compare-at Prices
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const targetList = selectedVariantRows.length > 0 ? selectedVariantRows : variants.map((_, i) => i);
                                                    const val = prompt(`Enter Stock Quantity to apply to ${targetList.length} variant(s):`);
                                                    if (val && !isNaN(parseInt(val, 10))) {
                                                        const num = Math.max(0, parseInt(val, 10));
                                                        setVariants(variants.map((v, idx) => targetList.includes(idx) ? { ...v, stock: num } : v));
                                                    }
                                                }}
                                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
                                            >
                                                Edit Quantities
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const firstImg = (productImageUrl || '').split(',')[0] || '';
                                                    if (firstImg) {
                                                        const targetList = selectedVariantRows.length > 0 ? selectedVariantRows : variants.map((_, i) => i);
                                                        setVariants(variants.map((v, idx) => targetList.includes(idx) ? { ...v, image_url: firstImg } : v));
                                                    }
                                                }}
                                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
                                            >
                                                Sync Image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addVariant}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', fontWeight: 700 }}
                                            >
                                                <Plus size={13} /> Add Variant
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table Headers */}
                                    {variants.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '32px 1.8fr 1.1fr 1.1fr 1fr 1.3fr 40px', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.5rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', alignItems: 'center' }}>
                                            <div>
                                                <input
                                                    type="checkbox"
                                                    checked={variants.length > 0 && selectedVariantRows.length === variants.length}
                                                    onChange={toggleSelectAllVariants}
                                                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                                />
                                            </div>
                                            <div>Variant</div>
                                            <div>Price (₹)</div>
                                            <div>Compare-at Price (₹)</div>
                                            <div>Available</div>
                                            <div>SKU</div>
                                            <div></div>
                                        </div>
                                    )}

                                    {/* Variant Rows */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {variants.map((v, i) => {
                                            const isChecked = selectedVariantRows.includes(i);

                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '32px 1.8fr 1.1fr 1.1fr 1fr 1.3fr 40px',
                                                        gap: '0.75rem',
                                                        alignItems: 'center',
                                                        background: isChecked ? '#f8fafc' : '#ffffff',
                                                        padding: '0.65rem 0.75rem',
                                                        borderRadius: '8px',
                                                        border: isChecked ? '1px solid #94a3b8' : '1px solid #e2e8f0',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleSelectVariantRow(i)}
                                                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div
                                                            style={{
                                                                width: '42px',
                                                                height: '42px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                background: '#f8fafc',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                overflow: 'hidden',
                                                                position: 'relative',
                                                                flexShrink: 0
                                                            }}
                                                            onClick={() => { setActiveImageField({ type: 'variant', index: i }); setShowMediaPicker(true); }}
                                                            title="Click to choose or upload variant image"
                                                        >
                                                            {v.image_url ? (
                                                                <img
                                                                    src={v.image_url.split(',')[0]}
                                                                    alt=""
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '2px' }}>
                                                                    <ImageIcon size={16} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <input
                                                            placeholder="e.g. S / Red"
                                                            value={v.name || ''}
                                                            onChange={e => updateVariant(i, 'name', e.target.value)}
                                                            className="admin-input"
                                                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', flex: 1 }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={v.price !== undefined ? v.price : ''}
                                                            min="0"
                                                            onChange={e => updateVariant(i, 'price', e.target.value ? Number(e.target.value) : '')}
                                                            className="admin-input"
                                                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.84rem', fontWeight: 700, color: 'hsl(var(--primary))' }}
                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={v.compare_price || ''}
                                                            min="0"
                                                            required
                                                            onChange={e => updateVariant(i, 'compare_price', e.target.value ? Number(e.target.value) : '')}
                                                            className="admin-input"
                                                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}
                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={v.stock ?? ''}
                                                            min="0"
                                                            onChange={e => updateVariant(i, 'stock', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                                                            className="admin-input"
                                                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.84rem', textAlign: 'center', fontWeight: 700, color: (v.stock || 0) <= 0 ? '#e11d48' : '#15803d' }}
                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <input
                                                            placeholder="SKU"
                                                            value={v.sku || ''}
                                                            onChange={e => updateVariant(i, 'sku', e.target.value)}
                                                            className="admin-input"
                                                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', fontFamily: 'monospace' }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariant(i)}
                                                            style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Delete variant"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* ── RIGHT COLUMN (Sidebar / Organization Cards) ─── */}
                    {/* ═══════════════════════════════════════════════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* SIDEBAR CARD 1: STATUS & VISIBILITY */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Settings size={15} style={{ color: 'hsl(var(--primary))' }} /> Status & Visibility
                            </h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Product Status
                                </label>
                                <select
                                    name="is_active"
                                    defaultValue={currentProduct ? (currentProduct.is_active !== 0 && currentProduct.is_active !== false ? 'on' : 'off') : 'on'}
                                    className="admin-input-select"
                                    style={{ fontSize: '0.84rem', fontWeight: 700 }}
                                >
                                    <option value="on">Active (Visible in Store)</option>
                                    <option value="off">Draft (Hidden)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                                    <input id="is_featured" name="is_featured" type="checkbox" defaultChecked={Boolean(currentProduct?.is_featured)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                    Feature on Home Page
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                                    <input id="is_explore" name="is_explore" type="checkbox" defaultChecked={currentProduct?.product_group === 'EXPLORE'} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                    Explore Slider Showcase
                                </label>
                            </div>
                        </div>

                        {/* SIDEBAR CARD 2: PRODUCT ORGANIZATION */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={15} style={{ color: 'hsl(var(--primary))' }} /> Organization
                            </h3>

                            {/* Category */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Category *
                                </label>
                                <select name="category" defaultValue={currentProduct?.category || (dbActiveCategories[0]?.name || 'Silk Saree')} className="admin-input-select" style={{ fontSize: '0.84rem' }}>
                                    {(() => {
                                        const currentCatName = currentProduct?.category;
                                        const list = [...dbActiveCategories];
                                        if (currentCatName && !list.some(c => c.name.toLowerCase() === currentCatName.toLowerCase())) {
                                            list.unshift({ id: 'current', name: currentCatName, status: 'existing' });
                                        }
                                        if (list.length === 0) {
                                            return (
                                                <>
                                                    <option value="Silk Saree">Silk Saree</option>
                                                    <option value="Cotton Saree">Cotton Saree</option>
                                                    <option value="Designer">Designer</option>
                                                </>
                                            );
                                        }
                                        return list.map(c => (
                                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                        ));
                                    })()}
                                </select>
                            </div>

                            {/* Product Group */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Product Group
                                </label>
                                <input
                                    name="product_group"
                                    defaultValue={currentProduct?.product_group || ''}
                                    className="admin-input"
                                    placeholder="e.g. Bestsellers, Wedding"
                                    style={{ fontSize: '0.84rem' }}
                                />
                            </div>

                            {/* Tags / Keywords */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Tags (Keywords)
                                </label>
                                <input
                                    name="tags_input"
                                    defaultValue={(Array.isArray(currentProduct?.tags) ? currentProduct?.tags : (typeof currentProduct?.tags === 'string' ? currentProduct?.tags.split(',') : []))
                                        .map(t => String(t).trim())
                                        .filter(t => Boolean(t) && !t.toLowerCase().startsWith('mrp:'))
                                        .join(', ')
                                    }
                                    className="admin-input"
                                    placeholder="silk, pure, zari (comma separated)"
                                    style={{ fontSize: '0.82rem' }}
                                />
                            </div>
                        </div>

                        {/* SIDEBAR CARD 3: INVENTORY SETTINGS */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Inventory Settings
                            </h3>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Low Stock Alert Threshold
                                </label>
                                <input
                                    type="number"
                                    name="alert_threshold"
                                    defaultValue={currentProduct?.alert_threshold || 5}
                                    min="0"
                                    className="admin-input"
                                    style={{ fontSize: '0.84rem', fontWeight: 700 }}
                                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                    Triggers low stock badge when quantity falls below this value.
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── BOTTOM ACTION BAR (Save & Cancel at Bottom) ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid hsl(var(--border-subtle))',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        {currentProduct?.id && (
                            <button
                                type="button"
                                onClick={() => { handleDelete(currentProduct.id); setIsEditing(false); }}
                                className="btn btn-danger"
                                style={{ padding: '0.55rem 1.15rem', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={15} /> Delete Product
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.55rem 1.25rem', fontSize: '0.84rem', fontWeight: 700 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={fbProcessing}
                            style={{
                                padding: '0.55rem 1.75rem',
                                fontSize: '0.86rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(93, 8, 33, 0.28)'
                            }}
                        >
                            <Save size={16} /> {fbProcessing ? 'Saving Product...' : 'Save Product'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
