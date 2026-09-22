'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, 
    Trash2, 
    Image as ImageIcon, 
    ArrowUp, 
    ArrowDown, 
    Sparkles, 
    ZoomIn, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    Eye, 
    ExternalLink, 
    SlidersHorizontal
} from 'lucide-react';

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

    // State for modal popup
    const [previewIndex, setPreviewIndex] = useState(null);

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
        if (previewIndex !== null) {
            if (next.length === 0) setPreviewIndex(null);
            else if (previewIndex >= next.length) setPreviewIndex(next.length - 1);
        }
        commitImages(next);
    };

    const handleMoveImage = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= images.length) return;
        const next = [...images];
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        
        if (previewIndex === index) setPreviewIndex(targetIndex);
        else if (previewIndex === targetIndex) setPreviewIndex(index);

        commitImages(next);
    };

    // Keyboard navigation for preview modal
    const handleKeyDown = useCallback((e) => {
        if (previewIndex === null) return;
        if (e.key === 'Escape') {
            setPreviewIndex(null);
        } else if (e.key === 'ArrowLeft') {
            setPreviewIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
        } else if (e.key === 'ArrowRight') {
            setPreviewIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
        }
    }, [previewIndex, images.length]);

    useEffect(() => {
        if (previewIndex !== null) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [previewIndex, handleKeyDown]);

    const activePreviewImg = previewIndex !== null && images[previewIndex] ? images[previewIndex] : null;

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

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {images.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setPreviewIndex(0)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ffffff',
                                color: '#5d0821',
                                border: '1px solid #5d0821',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Open interactive scrollable modal popup"
                        >
                            <Eye size={14} /> Preview Lightbox
                        </button>
                    )}
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

            {/* List of Images with Scrollable Container */}
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
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    maxHeight: '440px',
                    overflowY: 'auto',
                    paddingRight: '6px'
                }}>
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
                                alignItems: 'center',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                            }}
                        >
                            {/* Preview Thumbnail with Click-to-Modal Zoom */}
                            <div 
                                onClick={() => img.url && setPreviewIndex(idx)}
                                title="Click to open modal popup"
                                style={{
                                    width: '74px',
                                    height: '74px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    cursor: img.url ? 'pointer' : 'default',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                {img.url ? (
                                    <>
                                        <img
                                            src={img.url}
                                            alt={`Slide ${idx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(0,0,0,0.35)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.2s ease',
                                                color: '#ffffff'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                                        >
                                            <ZoomIn size={18} />
                                        </div>
                                    </>
                                ) : (
                                    <ImageIcon size={24} style={{ color: '#94a3b8' }} />
                                )}
                                <span style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    left: '2px',
                                    background: 'rgba(0,0,0,0.65)',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 700
                                }}>
                                    #{idx + 1}
                                </span>
                            </div>

                            {/* Inputs */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
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
                                            fontSize: '0.82rem',
                                            minWidth: 0
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
                                    onClick={() => setPreviewIndex(idx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#0284c7',
                                        cursor: 'pointer',
                                        padding: '3px',
                                        borderRadius: '4px'
                                    }}
                                    title="View Full Modal Popup"
                                >
                                    <ZoomIn size={15} />
                                </button>
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
                                        padding: '3px',
                                        marginTop: '1px'
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
                    <SlidersHorizontal size={15} style={{ color: '#5d0821' }} /> Lightbox & Carousel Behavior
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

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* INTERACTIVE SCROLLABLE MODAL POPUP FOR GALLERY IMAGE PREVIEW & DETAILS */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {activePreviewImg && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setPreviewIndex(null)}
                >
                    {/* Modal Box with Scrollable Container */}
                    <div
                        style={{
                            position: 'relative',
                            background: '#ffffff',
                            borderRadius: '18px',
                            maxWidth: '920px',
                            width: '100%',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                    background: '#5d0821',
                                    color: '#ffffff',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.05em'
                                }}>
                                    PHOTO {previewIndex + 1} OF {images.length}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                    Gallery Lightbox Preview
                                </h3>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {activePreviewImg.url && (
                                    <a
                                        href={activePreviewImg.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: '#64748b',
                                            fontSize: '0.78rem',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0'
                                        }}
                                        title="Open original file in new tab"
                                    >
                                        <ExternalLink size={13} /> Open Original
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPreviewIndex(null)}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                    title="Close Modal (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Scrollable Image Viewport */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1.5rem',
                            background: '#090d16',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            minHeight: '340px'
                        }}>
                            {/* Previous Slide Button */}
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(4px)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '42px',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Previous Photo (Left Arrow)"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                            )}

                            {/* Full Scrollable / Responsive Image */}
                            {activePreviewImg.url ? (
                                <div style={{
                                    maxWidth: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <img
                                        src={activePreviewImg.url}
                                        alt={activePreviewImg.caption || `Gallery preview ${previewIndex + 1}`}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '62vh',
                                            objectFit: 'contain',
                                            borderRadius: '10px',
                                            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>
                                    <ImageIcon size={48} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                    <p>No valid image URL provided</p>
                                </div>
                            )}

                            {/* Next Slide Button */}
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(4px)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '42px',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Next Photo (Right Arrow)"
                                >
                                    <ChevronRight size={22} />
                                </button>
                            )}
                        </div>

                        {/* Modal Footer: Caption, Thumbnail Strip & Direct Quick-Edit */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            background: '#ffffff',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.85rem'
                        }}>
                            {/* Editable Caption in Modal */}
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={activePreviewImg.caption || ''}
                                    onChange={(e) => handleUpdateImage(previewIndex, 'caption', e.target.value)}
                                    placeholder="Enter caption or customer credit..."
                                    style={{
                                        flex: 1,
                                        padding: '0.55rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                {openMediaPicker && (
                                    <button
                                        type="button"
                                        onClick={() => openMediaPicker((url) => handleUpdateImage(previewIndex, 'url', url))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '0.55rem 0.85rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            color: '#334155'
                                        }}
                                    >
                                        <ImageIcon size={14} /> Replace Photo
                                    </button>
                                )}
                            </div>

                            {/* Scrollable Mini-Thumbnails Strip */}
                            {images.length > 1 && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    overflowX: 'auto',
                                    paddingBottom: '4px',
                                    alignItems: 'center'
                                }}>
                                    {images.map((thumb, tIdx) => (
                                        <button
                                            key={`thumb-nav-${tIdx}`}
                                            type="button"
                                            onClick={() => setPreviewIndex(tIdx)}
                                            style={{
                                                width: '46px',
                                                height: '46px',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                border: previewIndex === tIdx ? '2px solid #5d0821' : '1px solid #cbd5e1',
                                                opacity: previewIndex === tIdx ? 1 : 0.6,
                                                padding: 0,
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                background: '#f1f5f9',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title={`Go to photo #${tIdx + 1}`}
                                        >
                                            {thumb.url ? (
                                                <img
                                                    src={thumb.url}
                                                    alt={`Thumb ${tIdx + 1}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <ImageIcon size={16} style={{ color: '#94a3b8' }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
