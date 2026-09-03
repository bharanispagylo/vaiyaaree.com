'use client';

export default function ProductPricingInventoryCard({
    currentProduct
}) {
    return (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
                Pricing & Inventory
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                        Price (Selling Price ₹) *
                    </label>
                    <input
                        type="number"
                        name="price"
                        defaultValue={currentProduct?.price ?? ''}
                        required
                        min="0"
                        step="0.01"
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
                        step="0.01"
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
    );
}
