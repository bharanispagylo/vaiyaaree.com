'use client';

import { Settings, Layers, CheckCircle, FileText, Lock, Eye } from 'lucide-react';

export default function ProductFormSidebar({
    currentProduct,
    productStatus,
    setProductStatus,
    dbActiveCategories = []
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* SIDEBAR CARD 1: STATUS & VISIBILITY */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={15} style={{ color: 'hsl(var(--primary))' }} /> Status & Visibility
                    </h3>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: productStatus === 'active' ? '#dcfce7' : '#fef3c7',
                        color: productStatus === 'active' ? '#166534' : '#92400e'
                    }}>
                        {productStatus === 'active' ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                </div>

                {/* Hidden input to ensure form submission includes is_active */}
                <input type="hidden" name="is_active" value={productStatus === 'active' ? 'on' : 'off'} />

                {/* Interactive Status Selector Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => setProductStatus('active')}
                        style={{
                            padding: '0.75rem 0.6rem',
                            borderRadius: '10px',
                            border: productStatus === 'active' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                            background: productStatus === 'active' ? '#f0fdf4' : '#fafafa',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s'
                        }}
                    >
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: productStatus === 'active' ? '#15803d' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Active
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                            Visible in Store
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setProductStatus('draft')}
                        style={{
                            padding: '0.75rem 0.6rem',
                            borderRadius: '10px',
                            border: productStatus === 'draft' ? '2px solid #d97706' : '1px solid #e2e8f0',
                            background: productStatus === 'draft' ? '#fffbeb' : '#fafafa',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s'
                        }}
                    >
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: productStatus === 'draft' ? '#b45309' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <FileText size={14} /> Draft
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                            Hidden from Shop
                        </div>
                    </button>
                </div>

                <p style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {productStatus === 'active' 
                        ? <><Eye size={14} style={{ color: '#16a34a', flexShrink: 0 }} /> This product will be publicly published and searchable on the store.</> 
                        : <><Lock size={14} style={{ color: '#d97706', flexShrink: 0 }} /> This product is saved as a private draft and will not appear in the store.</>}
                </p>

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
    );
}
