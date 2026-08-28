'use client';

import { Edit2, RefreshCw } from 'lucide-react';
import { slugify } from '@/lib/productUrl';

export default function ProductBasicInfoCard({
    formProductName,
    setFormProductName,
    currentProduct,
    baseSiteUrl,
    effectiveSlug,
    isEditingSlug,
    setIsEditingSlug,
    tempSlug,
    setTempSlug,
    setCustomSlug,
    setIsCustomSlugLocked
}) {
    return (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {/* Product Title */}
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

            {/* Description */}
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
    );
}
