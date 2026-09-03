'use client';

import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

export default function ProductVariantBuilder({
    optionsList,
    setOptionsList,
    optValueInputs,
    setOptValueInputs,
    variants,
    setVariants,
    selectedVariantRows,
    setSelectedVariantRows,
    productImageUrl,
    addVariant,
    updateVariant,
    removeVariant,
    addOptionGroup,
    removeOptionGroup,
    updateOptionName,
    addOptionValue,
    removeOptionValue,
    addPresetValuesToOption,
    toggleSelectAllVariants,
    toggleSelectVariantRow,
    setActiveImageField,
    setShowMediaPicker
}) {
    return (
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
                                        step="0.01"
                                        required
                                        onChange={e => updateVariant(i, 'price', e.target.value !== '' ? parseFloat(e.target.value) : '')}
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
                                        step="0.01"
                                        required
                                        onChange={e => updateVariant(i, 'compare_price', e.target.value !== '' ? parseFloat(e.target.value) : '')}
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
    );
}
