'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Check, Loader2, Image as ImageIcon, X, Grid } from 'lucide-react';
import { stampProductCode, uploadWatermarkedImage } from '@/lib/imageStamp';
import { supabase } from '@/lib/supabaseClient';

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
    const [items, setItems] = useState(
        products.map(p => ({
            ...p,
            previewUrl: p.image_url || null,
            status: 'idle', // 'idle' | 'stamping' | 'done' | 'error'
            code: p.product_code || null,
            catalogId: p.product_catalog_image_id || null,
        }))
    );
    const [mediaFiles, setMediaFiles] = useState([]);
    const [loadingMedia, setLoadingMedia] = useState(true);
    const [activePickerIndex, setActivePickerIndex] = useState(null); // which row is open in picker
    const [ocrLoading, setOcrLoading] = useState(false);
    const fileRefs = useRef([]);

    // Load existing media library
    useEffect(() => {
        fetch('/api/admin/upload')
            .then(r => r.json())
            .then(d => setMediaFiles(d.files || []))
            .catch(() => { })
            .finally(() => setLoadingMedia(false));
    }, []);

    // Assign an image URL to a product row, stamp it, upload, save
    const assignImage = async (index, rawImageUrl) => {
        const item = items[index];

        setItems(prev => prev.map((it, i) =>
            i === index ? { ...it, status: 'stamping', previewUrl: rawImageUrl } : it
        ));

        try {
            // 1. Generate a unique catalog ID (CAT-XXXXX format)
            const catalogId = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            console.log('Generated catalog ID:', catalogId);

            // 2. Stamp the catalog ID onto the image via Canvas
            const watermarkedBlob = await stampProductCode(rawImageUrl, catalogId);

            // 4. Upload the watermarked image to the media library
            const finalUrl = await uploadWatermarkedImage(watermarkedBlob, catalogId);

            // 5. Update product with the watermarked image URL and catalog ID
            console.log('Updating product:', item.id, 'with URL:', finalUrl, 'catalog ID:', catalogId);
            const { data: updateData, error: updateError } = await supabase.from('products')
                .update({
                    image_url: finalUrl,
                    product_catalog_image_id: catalogId
                })
                .eq('id', item.id)
                .select();

            if (updateError) {
                console.error('Update error:', updateError);
                throw new Error('Failed to update product: ' + updateError.message);
            }

            console.log('Update successful:', updateData);

            setItems(prev => prev.map((it, i) =>
                i === index ? { ...it, status: 'done', previewUrl: finalUrl, catalogId } : it
            ));
        } catch (err) {
            console.error('assignImage error:', err);
            setItems(prev => prev.map((it, i) =>
                i === index ? { ...it, status: 'error' } : it
            ));
            alert('Failed: ' + err.message);
        }
    };

    // Handle file pick from device
    const handleFileChange = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setOcrLoading(true);
            // 1. OCR Check for existing watermark
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            const base64Image = await base64Promise;

            const ocrRes = await fetch('/api/admin/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Image })
            });
            const ocrData = await ocrRes.json();

            if (ocrData.hasWatermark) {
                alert("The image has already WaterMark");
                e.target.value = '';
                return;
            }

            // 2. Proceed with assigning and stamping
            const objectUrl = URL.createObjectURL(file);
            await assignImage(index, objectUrl);
        } catch (err) {
            console.error('OCR check error:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setOcrLoading(false);
        }
    };

    const allDone = items.every(it => it.status === 'done');
    const doneCount = items.filter(it => it.status === 'done').length;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)', zIndex: 2000, overflowY: 'auto',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '2rem 1rem'
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
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
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
                        <div key={item.id} style={{
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
                                    <img src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
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

            {/* Mini Media Picker overlay */}
            {activePickerIndex !== null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: '700px', maxHeight: '80vh',
                        borderRadius: '20px', overflow: 'hidden', display: 'flex',
                        flexDirection: 'column', background: 'hsl(var(--bg-panel))'
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>
                                Choose from Media Library — {items[activePickerIndex]?.name}
                            </h3>
                            <button
                                onClick={() => setActivePickerIndex(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                            {loadingMedia ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : mediaFiles.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
                                    No images in library yet. Upload some first.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                                    {mediaFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={async () => {
                                                const url = file.url;
                                                try {
                                                    setOcrLoading(true);
                                                    // 1. OCR Check for existing watermark
                                                    const res = await fetch(url);
                                                    const blob = await res.blob();
                                                    const reader = new FileReader();
                                                    const base64Promise = new Promise((resolve) => {
                                                        reader.onload = () => resolve(reader.result);
                                                        reader.readAsDataURL(blob);
                                                    });
                                                    const base64Image = await base64Promise;

                                                    const ocrRes = await fetch('/api/admin/ocr', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ base64Image })
                                                    });
                                                    const ocrData = await ocrRes.json();

                                                    if (ocrData.hasWatermark) {
                                                        alert("The image has already WaterMark");
                                                        return; // Stop selection
                                                    }
                                                } catch (err) {
                                                    console.error('Library OCR check error:', err);
                                                } finally {
                                                    setOcrLoading(false);
                                                }

                                                assignImage(activePickerIndex, url);
                                                setActivePickerIndex(null);
                                            }}
                                            style={{
                                                aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden',
                                                cursor: 'pointer', border: '2px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                        >
                                            <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
        </div>
    );
}
