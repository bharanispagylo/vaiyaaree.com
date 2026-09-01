'use client';

import { Image as ImageIcon, Upload } from 'lucide-react';

export default function ProductMediaCard({
    useExistingWatermark,
    setUseExistingWatermark,
    productImageUrl,
    setProductImageUrl,
    galleryImageUrl,
    setGalleryImageUrl,
    currentProduct,
    setZoomedImage,
    setActiveImageField,
    setShowMediaPicker,
    setLoadingOverlayText,
    setOcrLoading,
    setWatermarkModal,
    setErrorModal
}) {
    return (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={18} style={{ color: 'hsl(var(--primary))' }} /> Media & Images
                </h3>
            </div>

            {/* Checkbox option for using existing watermark image */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: useExistingWatermark ? '#f0fdf4' : '#f8fafc',
                border: useExistingWatermark ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                borderRadius: '12px',
                marginBottom: '1.25rem',
                transition: 'all 0.15s'
            }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                    <input
                        type="checkbox"
                        checked={useExistingWatermark}
                        onChange={(e) => setUseExistingWatermark(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                    <div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: useExistingWatermark ? '#15803d' : '#1e293b' }}>
                            Use existing watermark image
                        </span>
                        <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0' }}>
                            Check this box to allow using an already-watermarked image for this product (new or existing product).
                        </p>
                    </div>
                </label>
                {useExistingWatermark && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: '20px' }}>
                        ACTIVE
                    </span>
                )}
            </div>

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
                                if (!files.length) return;                                 try {
                                    setLoadingOverlayText("Analyzing Fabric Image & Watermark..."); setOcrLoading(true);
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
                                                        setLoadingOverlayText("Generating High-Res Watermark & Catalog ID..."); setOcrLoading(true);
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
                                                        setLoadingOverlayText("Attaching Watermarked Image to Product...");
                                                        setProductImageUrl(prev => {
                                                            const existingArray = prev ? prev.split(',').filter(Boolean) : [];
                                                            return [...existingArray, finalUrl].join(',');
                                                        });
                                                        setWatermarkModal(null);
                                                        setTimeout(() => {
                                                            setOcrLoading(false);
                                                            resolve();
                                                        }, 350);
                                                    };

                                                    const onProceedWithExisting = async (catId) => {
                                                        setLoadingOverlayText("Attaching Watermarked Image to Product..."); setOcrLoading(true);
                                                        const uploadData = new FormData();
                                                        uploadData.append('file', file);
                                                        uploadData.append('catalogId', catId || currentProduct?.product_catalog_image_id || '');
                                                        uploadData.append('alreadyWatermarked', 'true');
                                                        uploadData.append('skipDetection', 'true');
                                                        uploadData.append('requireClean', 'false');
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
                                                        setTimeout(() => {
                                                            setOcrLoading(false);
                                                            resolve();
                                                        }, 350);
                                                    };

                                                    if (detData.hasWatermark) {
                                                        const existingCatId = detData.catalogId || currentProduct?.product_catalog_image_id || 'CAT-WATERMARK';
                                                        if (useExistingWatermark) {
                                                            await onProceedWithExisting(existingCatId);
                                                        } else {
                                                            setOcrLoading(false);
                                                            setWatermarkModal({
                                                                type: 'existing',
                                                                detectedCode: existingCatId,
                                                                url: base64,
                                                                onUseExisting: () => {
                                                                    setUseExistingWatermark(true);
                                                                    onProceedWithExisting(existingCatId);
                                                                }
                                                            });
                                                        }
                                                    } else {
                                                        setOcrLoading(false);
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
                                                    setOcrLoading(false);
                                                    resolve();
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
    );
}
