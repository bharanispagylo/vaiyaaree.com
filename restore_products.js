const fs = require('fs');

function restoreProductsPage() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // We locate the start of the form
    const formStart = '<form onSubmit={handleSave} style={{ padding: \'1.75rem\' }}>';
    const formEnd = '</form>';

    const startIndex = content.indexOf(formStart);
    const endIndex = content.indexOf(formEnd, startIndex) + formEnd.length;

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find form boundaries');
        return;
    }

    const newFormContent = `<form onSubmit={handleSave} style={{ padding: '1.75rem' }}>
                            {/* Product Type Toggle */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saree Type</label>
                                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <button type="button" onClick={() => setProductType('simple')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'simple' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'simple' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <PackageIcon size={16} /> Simple Saree
                                    </button>
                                    <button type="button" onClick={() => setProductType('variant')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'variant' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'variant' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <LayoutGrid size={16} /> Variant Saree
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                    Basic Information
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Saree Name *</label>
                                        <input name="name" type="text" defaultValue={currentProduct?.name} required placeholder="e.g. Royal Kanjivaram Silk" className="admin-input" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Category *</label>
                                        <select name="category" defaultValue={currentProduct?.category || 'Silk Saree'} className="admin-input-select">
                                            <option>Silk Saree</option>
                                            <option>Cotton Saree</option>
                                            <option>Designer</option>
                                            <option>Georgette</option>
                                            <option>Banarasi</option>
                                            <option>Chiffon</option>
                                            <option>Linen</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {productType === 'simple' ? (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Saree Details (Single Item)
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Price (₹) *</label>
                                            <input type="number" name="price" defaultValue={currentProduct?.price} required placeholder="e.g. 12500" className="admin-input" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Stock Qty *</label>
                                            <input type="number" name="stock" defaultValue={currentProduct?.stock} required placeholder="e.g. 10" className="admin-input" />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Saree Image *</label>
                                            {productImageUrl && (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {productImageUrl.split(',').filter(Boolean).map((imgUrl, idx) => (
                                                        <div key={idx} style={{ position: 'relative', width: '80px', height: '100px' }}>
                                                            <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                                            <button type="button" onClick={() => {
                                                                const urls = productImageUrl.split(',').filter(Boolean);
                                                                urls.splice(idx, 1);
                                                                setProductImageUrl(urls.join(','));
                                                            }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button type="button" onClick={() => { setActiveImageField({ type: 'product' }); setShowMediaPicker(true); }} className="btn btn-secondary" style={{ flex: 1, height: '44px' }}>
                                                   <ImageIcon size={15} /> From Library
                                                </button>
                                                <label className="btn btn-secondary" style={{ flex: 1, height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <Upload size={15} /> Upload Files
                                                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (!files.length) return;
                                                        try {
                                                            setOcrLoading(true);
                                                            const catalogId = currentProduct?.product_catalog_image_id || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
                                                            const processedUrls = [...(productImageUrl ? productImageUrl.split(',').filter(Boolean) : [])];
                                                            for (const file of files) {
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('catalogId', catalogId);
                                                                formData.append('requireClean', 'true');
                                                                const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                                const data = await res.json();
                                                                if (!res.ok) {
                                                                    if (data.error === 'Watermark already present') {
                                                                        setErrorModal({ title: 'Watermark Blocked', message: \`Image "\${file.name}" already has a watermark.\` });
                                                                    } else throw new Error(data.error || 'Upload failed');
                                                                    continue;
                                                                }
                                                                processedUrls.push(data.watermarkedUrl || data.url);
                                                                if (!currentProduct?.product_catalog_image_id) setCurrentProduct(prev => ({ ...prev, product_catalog_image_id: data.catalogId }));
                                                            }
                                                            setProductImageUrl(processedUrls.join(','));
                                                        } catch (err) { setErrorModal({ title: 'Error', message: err.message }); }
                                                        finally { setOcrLoading(false); }
                                                        e.target.value = '';
                                                    }} />
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Threshold</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} className="admin-input" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Manage Variants (Multiple Colors/Options)
                                    </h3>
                                    <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Create different versions:</span>
                                            <button type="button" onClick={addVariant} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                                                <Plus size={14} /> Add Variant
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {variants.map((v, i) => (
                                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'center' }}>
                                                    <input placeholder="Color" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <input type="number" placeholder="Price" value={v.price} onChange={e => updateVariant(i, 'price', Number(e.target.value))} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <input type="number" placeholder="Stock" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {v.image_url && <img src={v.image_url} style={{ width: '32px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                        <button type="button" onClick={() => { setActiveImageField({ type: 'variant', index: i }); setShowMediaPicker(true); }} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.65rem', padding: '0.4rem' }}>Library</button>
                                                        <label className="btn btn-secondary" style={{ flex: 1, fontSize: '0.65rem', padding: '0.4rem', cursor: 'pointer', textAlign: 'center' }}>
                                                            Upload
                                                            <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                try {
                                                                    setOcrLoading(true);
                                                                    const catalogId = currentProduct?.product_catalog_image_id || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('catalogId', catalogId);
                                                                    formData.append('requireClean', 'true');
                                                                    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                                    const data = await res.json();
                                                                    if (!res.ok) throw new Error(data.error || 'Upload failed');
                                                                    updateVariant(i, 'image_url', data.watermarkedUrl || data.url);
                                                                    if (!currentProduct?.product_catalog_image_id) setCurrentProduct(prev => ({ ...prev, product_catalog_image_id: data.catalogId }));
                                                                } catch (err) { setErrorModal({ title: 'Error', message: err.message }); }
                                                                finally { setOcrLoading(false); }
                                                            }} />
                                                        </label>
                                                    </div>
                                                    <button type="button" onClick={() => removeVariant(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--danger) / 0.1)', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold (Overall)</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} className="admin-input" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Description</label>
                                <textarea name="description" defaultValue={currentProduct?.description} rows={3} className="admin-input" style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Tax Class (GST)</label>
                                    <select name="tax_class" defaultValue={currentProduct?.tax_class || 'GST_5'} className="admin-input-select">
                                        <option value="GST_0">GST 0% (Exempt)</option>
                                        <option value="GST_5">GST 5% (Default)</option>
                                        <option value="GST_12">GST 12%</option>
                                        <option value="GST_18">GST 18%</option>
                                        <option value="GST_28">GST 28%</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Product Group / Tag</label>
                                    <input name="product_group" defaultValue={currentProduct?.product_group || ''} className="admin-input" />
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input id="is_featured" name="is_featured" type="checkbox" defaultChecked={currentProduct?.is_featured} />
                                    <label htmlFor="is_featured" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Feature on Home Page</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                    <input id="is_explore" name="is_explore" type="checkbox" defaultChecked={currentProduct?.product_group === 'EXPLORE'} />
                                    <label htmlFor="is_explore" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Explore Our Products Slider</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                    <input id="is_active_toggle" name="is_active" type="checkbox" defaultChecked={currentProduct ? currentProduct.is_active !== false : true} />
                                    <label htmlFor="is_active_toggle" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Product Status (Active)</label>
                                </div>
                            </div>

                            {/* Facebook Integration */}
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            <Share2 size={16} />
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Facebook Meta Integration</div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={postToFacebook} onChange={e => setPostToFacebook(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: postToFacebook ? '#1877F2' : '#ccc', borderRadius: '20px' }}>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: postToFacebook ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%' }}></span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                {currentProduct && (
                                    <button type="button" onClick={() => { handleDelete(currentProduct.id); setIsEditing(false); }} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Trash2 size={16} /> Delete Product
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary" disabled={fbProcessing}>
                                    {fbProcessing ? 'Processing...' : 'Save Product'}
                                </button>
                            </div>
                        </form>`;

    content = content.substring(0, startIndex) + newFormContent + content.substring(endIndex);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully restored and refactored ProductsPage.js Form');
}

restoreProductsPage();
