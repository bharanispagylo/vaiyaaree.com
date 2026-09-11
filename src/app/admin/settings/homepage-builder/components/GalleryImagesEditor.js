'use client';

import React from 'react';
import { Plus, Trash2, Image as ImageIcon, ArrowUp, ArrowDown, Sparkles, ZoomIn } from 'lucide-react';

export default function GalleryImagesEditor({
    settings,
    updateSettings,
    openMediaPicker
}) {
    // Normalizing raw images to array format
    const rawImages = Array.isArray(settings?.images) ? settings.images : [];
    
    // Normalize to objects internally for easy editing
    const images = rawImages.map(item => {
        if (typeof item === 'string') {
            return { url: item, caption: '' };
        }
        return { url: item?.url || '', caption: item?.caption || '' };
    });

    const commitImages = (updatedImagesList) => {
        // Keep string format if caption is empty or preserve object
        const finalArray = updatedImagesList.map(img => {
            if (!img.caption || img.caption.trim() === '') {
                return img.url;
            }
            return { url: img.url, caption: img.caption };
        });
        updateSettings('images', finalArray);
    };

    const handleAddImage = (initialUrl = '') => {
        const newImg = { url: initialUrl || '/images/hero-saree.png', caption: '' };
        const next = [...images, newImg];
        commitImages(next);
    };

    const handleAddWithPicker = () => {
        if (openMediaPicker) {
            openMediaPicker((url) => {
                if (url) {
                    handleAddImage(url);
                }
            });
        } else {
            handleAddImage();
        }
    };

    const handleUpdateImage = (index, field, value) => {
        const next = images.map((img, idx) => {
            if (idx === index) {
                return { ...img, [field]: value };
            }
            return img;
        });
        commitImages(next);
    };

    const handleDeleteImage = (index) => {
        const next = images.filter((_, idx) => idx !== index);
        commitImages(next);
    };

    const handleMoveImage = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= images.length) return;
        const next = [...images];
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        commitImages(next);
    };

    return (
        <div style={{
            background: '#f8fafc',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                        <Sparkles size={16} style={{ color: '#5d0821' }} />
                        <span>Gallery Photos & Lightbox Showcase ({images.length})</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Upload or choose high-resolution drape photos for customer showcase with click-to-zoom popup.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {openMediaPicker && (
                        <button
                            type="button"
                            onClick={handleAddWithPicker}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            <ImageIcon size={14} /> Pick / Upload Photo
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleAddImage()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} /> Add URL
                    </button>
                </div>
            </div>

            {/* List of Images */}
            {images.length === 0 ? (
                <div style={{
                    background: '#ffffff',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: '#64748b'
                }}>
                    <ImageIcon size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Gallery Photos Added Yet</p>
                    <p style={{ margin: '4px 0 1rem', fontSize: '0.8rem' }}>Click &apos;Pick / Upload Photo&apos; to add your first customer or drape image.</p>
                    {openMediaPicker && (
                        <button
                            type="button"
                            onClick={handleAddWithPicker}
                            style={{
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Select from Media Gallery
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {images.map((img, idx) => (
                        <div
                            key={`gallery-img-${idx}`}
                            style={{
                                background: '#ffffff',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                padding: '0.85rem',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center'
                            }}
                        >
                            {/* Preview Thumbnail */}
                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                {img.url ? (
                                    <img
                                        src={img.url}
                                        alt={`Slide ${idx + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <ImageIcon size={24} style={{ color: '#94a3b8' }} />
                                )}
                                <span style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    left: '2px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    fontWeight: 700
                                }}>
                                    #{idx + 1}
                                </span>
                            </div>

                            {/* Inputs */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={img.url}
                                        onChange={(e) => handleUpdateImage(idx, 'url', e.target.value)}
                                        placeholder="Image URL or /uploads/media/..."
                                        style={{
                                            flex: 1,
                                            padding: '0.45rem 0.65rem',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.82rem'
                                        }}
                                    />
                                    {openMediaPicker && (
                                        <button
                                            type="button"
                                            onClick={() => openMediaPicker((url) => handleUpdateImage(idx, 'url', url))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '0.45rem 0.75rem',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                background: '#f8fafc',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                color: '#334155',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <ImageIcon size={13} /> Change
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={img.caption}
                                    onChange={(e) => handleUpdateImage(idx, 'caption', e.target.value)}
                                    placeholder="Optional caption or customer credit (e.g. Ananya in Crimson Kanjeevaram)"
                                    style={{
                                        width: '100%',
                                        padding: '0.4rem 0.65rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.78rem',
                                        color: '#475569'
                                    }}
                                />
                            </div>

                            {/* Reorder & Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 'up')}
                                    disabled={idx === 0}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: idx === 0 ? '#cbd5e1' : '#64748b',
                                        cursor: idx === 0 ? 'default' : 'pointer',
                                        padding: '2px'
                                    }}
                                    title="Move Up"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 'down')}
                                    disabled={idx === images.length - 1}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: idx === images.length - 1 ? '#cbd5e1' : '#64748b',
                                        cursor: idx === images.length - 1 ? 'default' : 'pointer',
                                        padding: '2px'
                                    }}
                                    title="Move Down"
                                >
                                    <ArrowDown size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteImage(idx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        marginTop: '2px'
                                    }}
                                    title="Remove Photo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Gallery Behavior Settings */}
            <div style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
            }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ZoomIn size={15} style={{ color: '#5d0821' }} /> Lightbox & Carousel Behavior
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings?.enable_popup !== false}
                            onChange={(e) => updateSettings('enable_popup', e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#5d0821' }}
                        />
                        Enable Click-to-Zoom Lightbox Modal
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings?.auto_play !== false}
                            onChange={(e) => updateSettings('auto_play', e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#5d0821' }}
                        />
                        Auto-play Slides
                    </label>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Slide Transition Interval (ms)
                    </label>
                    <input
                        type="number"
                        value={settings?.auto_play_delay || 3500}
                        onChange={(e) => updateSettings('auto_play_delay', Number(e.target.value) || 3500)}
                        step={500}
                        min={1500}
                        max={15000}
                        style={{
                            width: '100%',
                            maxWidth: '220px',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
