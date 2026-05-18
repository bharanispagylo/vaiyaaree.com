'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Check, Loader2, Image as ImageIcon, X, Grid, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ImageZoom from './ImageZoom';
import MediaPicker from './MediaPicker';

/**
 * ProductImageAssigner
 *
 * Shown after Excel import. Lists imported products and lets the admin
 * assign an image to each one. The image gets watermarked with the product's
 * unique catalog ID (CAT-XXXXX) and saved back to the product record.
 *
 * Props:
 *   products  - Array of newly imported product objects { id, name, image_url, ... }
 *   onClose   - Called when done / dismissed
 *   onDone    - Called after all assignments are saved
 */
export default function ProductImageAssigner({ products, onClose, onDone }) {
    const [errorModal, setErrorModal] = useState(null);
    const [items, setItems] = useState(
        products.map(p => ({
            ...p,
            previewUrl: p.image_url || null,
            status: 'idle', // 'idle' | 'stamping' | 'done' | 'error'
            code: p.product_code || null,
            catalogId: p.product_catalog_image_id || null,
        }))
    );
    const [activePickerIndex, setActivePickerIndex] = useState(null); // which row is open in picker
    const [ocrLoading, setOcrLoading] = useState(false);
    const [watermarkModal, setWatermarkModal] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const fileRefs = useRef([]);

    // Assign an image URL to a product row, stamp it, upload, save
    const assignImage = async (index, rawImageUrl) => {
        const item = items[index];
        setOcrLoading(true);

        try {
            // 1. Detection Phase (Check Only)
            const response = await fetch(rawImageUrl);
            const blob = await response.blob();
            const fileCheck = new File([blob], `check-${Date.now()}.jpg`, { type: 'image/jpeg' });

            const checkFormData = new FormData();
            checkFormData.append('file', fileCheck);
            checkFormData.append('checkOnly', 'true');
            const token = localStorage.getItem('cast_prince_admin') || '';
            const detRes = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: checkFormData
            });
            const detData = await detRes.json();

            const onProceedWithUpload = async (catId) => {
                setOcrLoading(true);
                setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'stamping', previewUrl: rawImageUrl } : it));

                const uploadFormData = new FormData();
                uploadFormData.append('file', fileCheck);
                uploadFormData.append('catalogId', catId);
                uploadFormData.append('requireClean', 'true');
                uploadFormData.append('skipDetection', 'true');
                uploadFormData.append('mode', 'product');

                const token = localStorage.getItem('cast_prince_admin') || '';
                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });
                const data = await uploadRes.json();

                if (!uploadRes.ok) throw new Error(data.error || 'Upload failed');

                const finalUrl = data.watermarkedUrl || data.url;
                const dbData = {
                    name: item.name, description: item.description, price: item.price, stock: item.stock,
                    category: item.category, type: 'simple', is_active: true,
                    image_url: finalUrl, product_catalog_image_id: data.catalogId
                };

                let savedProduct = null;
                if (item.isNew) {
                    dbData.total_added = item.stock || 0;
                    const { data: insData, error } = await supabase.from('products').insert([dbData]).select();
                    if (error) throw error;
                    savedProduct = insData?.[0];
                    if (savedProduct && savedProduct.stock > 0) {
                        await supabase.from('product_history').insert({
                            product_id: savedProduct.id,
                            change_type: 'ADD',
                            quantity_change: savedProduct.stock,
                            new_stock: savedProduct.stock,
                            reason: 'Excel Import (Initial)'
                        });
                    }
                } else {
                    const { data: updData, error } = await supabase.from('products').update(dbData).eq('id', item.id).select();
                    if (error) throw error;
                    savedProduct = updData?.[0];
                }

                setItems(prev => prev.map((it, i) => i === index ? { ...it, ...savedProduct, status: 'done', previewUrl: finalUrl, catalogId: data.catalogId } : it));
                setWatermarkModal(null);
                setOcrLoading(false);
            };

            // Show confirmation modal like main product page
            if (detData.hasWatermark) {
                setWatermarkModal({
                    type: 'existing',
                    detectedCode: detData.catalogId || 'CAT-CODE',
                    url: rawImageUrl,
                    onProceed: () => onProceedWithUpload(detData.catalogId)
                });
            } else {
                const newCatId = item.catalogId || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                setWatermarkModal({
                    type: 'new',
                    detectedCode: newCatId,
                    url: rawImageUrl,
                    onProceed: () => onProceedWithUpload(newCatId)
                });
            }

        } catch (err) {
            setErrorModal({ title: 'Detection Error', message: err.message });
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'error' } : it));
        } finally {
            setOcrLoading(false);
        }
    };

    const handleFileChange = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        await assignImage(index, objectUrl);
        e.target.value = '';
    };

    const allDone = items.every(it => it.status === 'done');
    const doneCount = items.filter(it => it.status === 'done').length;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-box shadow-premium" style={{
                width: '95%', maxWidth: '1000px', padding: 0,
                borderRadius: '40px', background: '#ffffff',
                overflow: 'hidden', height: '90vh', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                animation: 'modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '2rem 3rem', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ImageIcon size={32} className="text-primary" /> Assign Product Images
                        </h2>
                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                            {doneCount} of {items.length} products assigned • Automatic CAT-Code watermarking enabled
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                            background: doneCount === items.length ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--primary) / 0.05)',
                            color: doneCount === items.length ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                            padding: '0.5rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800,
                            border: `1px solid ${doneCount === items.length ? 'hsl(var(--success) / 0.2)' : 'hsl(var(--primary) / 0.1)'}`
                        }}>
                            {doneCount === items.length ? 'COMPLETED' : `${doneCount} / ${items.length} SAVED`}
                        </div>
                        <button
                            onClick={onClose}
                            className="btn-icon danger"
                            style={{ width: '40px', height: '40px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: '#eef2f6' }}>
                    <div style={{
                        height: '100%', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        width: `${(doneCount / items.length) * 100}%`,
                        background: '#0f172a'
                    }} />
                </div>

                {/* Product List */}
                <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {items.map((item, i) => (
                        <div key={item.id ? `prod-${item.id}` : `idx-${i}`} style={{
                            display: 'flex', gap: '1.5rem', alignItems: 'center',
                            padding: '1.5rem', borderRadius: '24px',
                            background: '#ffffff',
                            border: `1px solid ${item.status === 'done' ? 'hsl(var(--success) / 0.2)' : '#eef2f6'}`,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                            {/* Image Preview */}
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '20px',
                                overflow: 'hidden', flexShrink: 0, position: 'relative',
                                background: '#f1f5f9', border: '1px solid #eef2f6',
                                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)'
                            }}>
                                {item.previewUrl ? (
                                    <img src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setZoomedImage(item.previewUrl)} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <ImageIcon size={32} style={{ color: '#94a3b8', opacity: 0.5 }} />
                                    </div>
                                )}
                                {item.status === 'stamping' && (
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Loader2 size={24} className="animate-spin text-primary" />
                                    </div>
                                )}
                                {item.status === 'done' && (
                                    <div style={{
                                        position: 'absolute', top: 8, right: 8,
                                        background: 'hsl(var(--success))', borderRadius: '50%', width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                    }}>
                                        <Check size={14} color="white" strokeWidth={4} />
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', marginBottom: '8px' }}>
                                    {item.name}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '1rem', color: 'hsl(var(--primary))', fontWeight: 800 }}>
                                        ₹{(item.price || 0).toLocaleString()}
                                    </span>
                                    {item.catalogId && (
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em',
                                            background: '#f1f5f9', color: '#64748b',
                                            padding: '4px 12px', borderRadius: '10px', fontFamily: 'var(--font-roboto)',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            {item.catalogId}
                                        </span>
                                    )}
                                    {item.status === 'done' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--success))', fontSize: '0.85rem', fontWeight: 700 }}>
                                            <Check size={16} /> Finalized & Uploaded
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                                <button
                                    disabled={item.status === 'stamping'}
                                    onClick={() => setActivePickerIndex(i)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', fontSize: '0.85rem', height: '48px', gap: '8px' }}
                                >
                                    <Grid size={18} /> Library
                                </button>

                                <button
                                    disabled={item.status === 'stamping'}
                                    onClick={() => fileRefs.current[i]?.click()}
                                    className="btn btn-primary"
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', fontSize: '0.85rem', height: '48px', gap: '8px' }}
                                >
                                    <Upload size={18} /> Upload
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={el => fileRefs.current[i] = el}
                                    onChange={e => handleFileChange(e, i)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '2.5rem 3rem', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            💡
                        </div>
                        <span>Unique Catalog IDs (CAT-XXXXX) are automatically generated for batch tracking.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={onClose} className="modal-btn modal-btn-secondary" style={{ padding: '0.75rem 1.75rem' }}>Skip for now</button>
                        <button
                            onClick={() => { onDone?.(); onClose(); }}
                            className="modal-btn modal-btn-primary"
                            disabled={doneCount === 0}
                            style={{ padding: '0.75rem 2.5rem', background: 'hsl(var(--text-main))' }}
                        >
                            ✅ Complete Import ({doneCount})
                        </button>
                    </div>
                </div>
            </div>

            {/* Unified Media Picker Overlay */}
            {activePickerIndex !== null && (
                <MediaPicker
                    onSelect={(url) => {
                        assignImage(activePickerIndex, url);
                        setActivePickerIndex(null);
                    }}
                    onClose={() => setActivePickerIndex(null)}
                    currentImage={items[activePickerIndex]?.previewUrl}
                />
            )}

            {/* OCR Loading Overlay */}
            {ocrLoading && (
                <div className="modal-overlay" style={{ zIndex: 5000 }}>
                    <div className="modal-box" style={{ maxWidth: '360px', textAlign: 'center', padding: '3rem' }}>
                        <Loader2 size={48} className="animate-spin text-primary" style={{ margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Digital Scanning</h3>
                        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Searching for existing watermarks...</p>
                    </div>
                </div>
            )}

            {/* Watermark Confirmation Modal */}
            {watermarkModal && (
                <div className="modal-overlay" style={{ zIndex: 6000 }}>
                    {watermarkModal.type === 'existing' ? (
                        <div className="modal-box modal-error" style={{ maxWidth: '440px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 0 0 1px #fee2e2' }}>
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="modal-title">Conflict Detected</h3>
                            <p className="modal-message">
                                This image already contains a watermark (<strong>{watermarkModal.detectedCode}</strong>). Please use a clean original image for new products.
                            </p>
                            <div className="modal-actions">
                                <button
                                    onClick={() => { setWatermarkModal(null); setOcrLoading(false); }}
                                    className="modal-btn modal-btn-primary"
                                    style={{ background: '#ef4444', width: '100%' }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="modal-box" style={{ maxWidth: '480px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: 'inset 0 0 0 2px hsl(var(--primary) / 0.1)' }}>
                                <ImageIcon size={40} />
                            </div>
                            <h3 className="modal-title">New Image Ready</h3>
                            <p className="modal-message">
                                Detected <strong>clean asset</strong>. We will generate ID <strong>{watermarkModal.detectedCode}</strong> and apply branding automatically.
                            </p>
                            <div style={{
                                width: '100%', height: '240px', borderRadius: '24px',
                                overflow: 'hidden', border: '1px solid #f1f5f9',
                                marginBottom: '2.5rem', background: '#f8fafc', position: 'relative'
                            }}>
                                <img src={watermarkModal.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    right: '20px',
                                    background: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '50px',
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    zIndex: 10,
                                    fontFamily: 'monospace'
                                }}>
                                    {watermarkModal.detectedCode}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button onClick={() => { setWatermarkModal(null); setOcrLoading(false); }} className="modal-btn modal-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={watermarkModal.onProceed} className="modal-btn modal-btn-primary" style={{ flex: 1.5 }}>Generate & Apply</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error Modal */}
            {errorModal && (
                <div className="modal-overlay" style={{ zIndex: 9000 }}>
                    <div className="modal-box modal-error" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                            <X size={40} />
                        </div>
                        <h3 className="modal-title">{errorModal.title}</h3>
                        <p className="modal-message">{errorModal.message}</p>
                        <button onClick={() => setErrorModal(null)} className="modal-btn modal-btn-primary" style={{ background: '#ef4444', width: '100%' }}>Got it</button>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <ImageZoom url={zoomedImage} onClose={() => setZoomedImage(null)} />
            )}
        </div>
    );
}
