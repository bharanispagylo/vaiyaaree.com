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
            const detRes = await fetch('/api/admin/upload', { method: 'POST', body: checkFormData });
            const detData = await detRes.json();

            const onProceedWithUpload = async (catId) => {
                setOcrLoading(true);
                setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'stamping', previewUrl: rawImageUrl } : it));

                const uploadFormData = new FormData();
                uploadFormData.append('file', fileCheck);
                uploadFormData.append('catalogId', catId);
                uploadFormData.append('requireClean', 'true');
                uploadFormData.append('mode', 'product');

                const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: uploadFormData });
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
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)', zIndex: 2000, overflowY: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <div className="card shadow-premium" style={{
                width: '100%', maxWidth: '860px', borderRadius: '24px',
                background: 'hsl(var(--bg-panel))', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'hsl(var(--bg-app) / 0.5)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                            📸 Assign Product Images
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            {doneCount}/{items.length} done • Each image gets a unique catalog ID (CAT-XXXXX) and is stored in media library
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{
                            background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))',
                            padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700
                        }}>
                            {doneCount}/{items.length} ✓
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '4px', background: 'hsl(var(--bg-app))' }}>
                    <div style={{
                        height: '100%', transition: 'width 0.4s',
                        width: `${(doneCount / items.length) * 100}%`,
                        background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--success)))'
                    }} />
                </div>

                {/* Product List */}
                <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map((item, i) => (
                        <div key={item.id ? `prod-${item.id}` : `idx-${i}`} style={{
                            display: 'flex', gap: '1rem', alignItems: 'center',
                            padding: '1rem 1.25rem', borderRadius: '16px',
                            background: item.status === 'done'
                                ? 'hsl(var(--success) / 0.08)'
                                : 'hsl(var(--bg-app))',
                            border: `1px solid ${item.status === 'done'
                                ? 'hsl(var(--success) / 0.3)'
                                : 'hsl(var(--border-subtle))'}`,
                            transition: 'all 0.3s'
                        }}>
                            {/* Image Preview */}
                            <div style={{
                                width: '68px', height: '68px', borderRadius: '12px',
                                overflow: 'hidden', flexShrink: 0, position: 'relative',
                                background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-subtle))'
                            }}>
                                {item.previewUrl ? (
                                    <img src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setZoomedImage(item.previewUrl)} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <ImageIcon size={24} style={{ color: 'hsl(var(--text-muted))' }} />
                                    </div>
                                )}
                                {item.status === 'stamping' && (
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Loader2 size={20} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                                    </div>
                                )}
                                {item.status === 'done' && (
                                    <div style={{
                                        position: 'absolute', bottom: 4, right: 4,
                                        background: 'hsl(var(--success))', borderRadius: '50%', padding: '2px'
                                    }}>
                                        <Check size={10} color="white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>
                                        ₹{(item.price || 0).toLocaleString()}
                                    </span>
                                    {item.catalogId && (
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
                                            background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))',
                                            padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace'
                                        }}>
                                            {item.catalogId}
                                        </span>
                                    )}
                                    {item.status === 'done' && (
                                        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--success))', fontWeight: 700 }}>
                                            ✓ Watermarked & Saved
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                {/* Pick from media library */}
                                <button
                                    disabled={item.status === 'stamping'}
                                    onClick={() => setActivePickerIndex(i)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', gap: '6px' }}
                                    title="From Media Library"
                                >
                                    <Grid size={14} /> Library
                                </button>

                                {/* Upload from device */}
                                <button
                                    disabled={item.status === 'stamping'}
                                    onClick={() => fileRefs.current[i]?.click()}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', gap: '6px' }}
                                    title="Upload from device"
                                >
                                    <Upload size={14} /> Upload
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
                    padding: '1.25rem 2rem', borderTop: '1px solid hsl(var(--border-subtle))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'hsl(var(--bg-app) / 0.3)'
                }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                        💡 Images are stored in media library with unique catalog IDs for easy tracking
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} className="btn btn-secondary">Skip for now</button>
                        <button
                            onClick={() => { onDone?.(); onClose(); }}
                            className="btn btn-primary"
                            disabled={doneCount === 0}
                        >
                            ✅ Done ({doneCount} saved)
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
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                }}>
                    <Loader2 size={42} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                    <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1.5rem', borderRadius: '12px' }}>
                        Searching for WaterMark...
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            {/* Watermark Modal */}
            {watermarkModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)', zIndex: 6000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    {watermarkModal.type === 'existing' ? (
                        /* NEW ERROR STYLE MODAL */
                        <div className="animate-enter" style={{
                            maxWidth: '400px', width: '100%', background: '#ffffff', 
                            borderRadius: '16px', overflow: 'hidden', textAlign: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ padding: '2.5rem 2rem' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: '#fee2e2', color: '#ef4444',
                                    display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem'
                                }}>
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#111827' }}>
                                    Watermark present
                                </h3>
                                <p style={{ color: '#6b7280', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                    This image already contains a watermark and cannot be processed again.
                                </p>
                            </div>
                            <div style={{ background: '#fef2f2', padding: '1rem' }}>
                                <button
                                    onClick={() => { setWatermarkModal(null); setOcrLoading(false); }}
                                    style={{
                                        width: '100%', background: '#ef4444', color: '#ffffff',
                                        border: 'none', padding: '0.75rem', borderRadius: '8px',
                                        fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* NEW CLEAN MODAL */
                        <div className="card shadow-premium animate-enter" style={{
                            maxWidth: '450px', width: '90%', padding: '2.5rem', textAlign: 'center',
                            background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'hsl(var(--success) / 0.1)',
                                color: 'hsl(var(--success))',
                                display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem'
                            }}>
                                <ImageIcon size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                                New Image Ready
                            </h3>
                            <p style={{ color: 'hsl(var(--text-muted))', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                                This is a clean image. We'll generate a unique ID and watermark it for you.
                            </p>
                            <div style={{
                                width: '100%', height: '220px', borderRadius: '16px',
                                overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))',
                                marginBottom: '2rem', background: 'hsl(var(--bg-app))', cursor: 'zoom-in'
                            }} onClick={() => setZoomedImage(watermarkModal.url)}>
                                <img src={watermarkModal.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => { setWatermarkModal(null); setOcrLoading(false); }} className="btn btn-secondary" style={{ flex: 1, padding: '0.8rem' }}>Cancel</button>
                                <button onClick={watermarkModal.onProceed} className="btn btn-primary" style={{ flex: 1.5, background: 'hsl(var(--text-main))', padding: '0.8rem', color: 'white' }}>Apply & Use</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error Modal */}
            {errorModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)', zIndex: 9000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className='card shadow-premium' style={{
                        maxWidth: '400px', width: '100%', padding: '2rem',
                        textAlign: 'center', borderRadius: '24px'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem'
                        }}>
                            <X size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{errorModal.title}</h3>
                        <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>{errorModal.message}</p>
                        <button
                            onClick={() => setErrorModal(null)}
                            className='admin-button-primary'
                            style={{ width: '100%' }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
            {zoomedImage && (
                <ImageZoom url={zoomedImage} onClose={() => setZoomedImage(null)} />
            )}
        </div>
    );
}
