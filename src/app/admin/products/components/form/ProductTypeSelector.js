'use client';

import { Package as PackageIcon, LayoutGrid } from 'lucide-react';

export default function ProductTypeSelector({
    productType,
    setProductType
}) {
    return (
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
    );
}
