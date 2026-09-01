'use client';

import React from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

export default function HeroSlidesEditor({ 
    settings, 
    updateSettings, 
    openMediaPicker 
}) {
    const slides = Array.isArray(settings?.slides) ? settings.slides : [];

    const handleAddSlide = () => {
        const newSlide = {
            title: "New Silk Saree Collection",
            subtitle: "Handwoven Handloom Perfection",
            image: "/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg",
            button_text: "EXPLORE NOW",
            button_link: "/shop",
            badge: "AUTHENTIC WEAVES"
        };
        updateSettings('slides', [...slides, newSlide]);
    };

    const handleUpdateSlide = (index, field, value) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        updateSettings('slides', newSlides);
    };

    const handleDeleteSlide = (index) => {
        if (slides.length <= 1) {
            alert('The Hero Banner must have at least one slide.');
            return;
        }
        const newSlides = slides.filter((_, i) => i !== index);
        updateSettings('slides', newSlides);
    };

    return (
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Hero Banner Slides ({slides.length})</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Manage the 50-50 slides displayed in the top hero slider.</p>
                </div>
                <button
                    type="button"
                    onClick={handleAddSlide}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: '#5d0821', color: '#ffffff', border: 'none',
                        padding: '0.45rem 0.85rem', borderRadius: '8px',
                        fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                    }}
                >
                    <Plus size={14} /> Add Slide
                </button>
            </div>

            {/* Slide Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {slides.map((slide, idx) => (
                    <div
                        key={`hero-slide-edit-${idx}`}
                        style={{
                            background: '#ffffff', borderRadius: '10px',
                            border: '1px solid #cbd5e1', padding: '1rem',
                            display: 'flex', flexDirection: 'column', gap: '0.75rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#5d0821', textTransform: 'uppercase' }}>
                                Slide #{idx + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleDeleteSlide(idx)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                                title="Delete Slide"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Slide Title
                                </label>
                                <input
                                    type="text"
                                    value={slide.title || ''}
                                    onChange={(e) => handleUpdateSlide(idx, 'title', e.target.value)}
                                    placeholder="e.g. Wedding Silk Collection"
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Badge Pill Text
                                </label>
                                <input
                                    type="text"
                                    value={slide.badge || ''}
                                    onChange={(e) => handleUpdateSlide(idx, 'badge', e.target.value)}
                                    placeholder="e.g. AUTHENTIC SILKS"
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                Subtitle / Narrative
                            </label>
                            <input
                                type="text"
                                value={slide.subtitle || ''}
                                onChange={(e) => handleUpdateSlide(idx, 'subtitle', e.target.value)}
                                placeholder="e.g. Celebrate Love with Timeless Handwoven Elegance"
                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Button Text
                                </label>
                                <input
                                    type="text"
                                    value={slide.button_text || ''}
                                    onChange={(e) => handleUpdateSlide(idx, 'button_text', e.target.value)}
                                    placeholder="e.g. EXPLORE COLLECTION"
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                    Button Link (URL)
                                </label>
                                <input
                                    type="text"
                                    value={slide.button_link || ''}
                                    onChange={(e) => handleUpdateSlide(idx, 'button_link', e.target.value)}
                                    placeholder="e.g. /shop"
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                />
                            </div>
                        </div>

                        {/* Slide Image Field */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                Slide Right-Side Image URL
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={slide.image || ''}
                                    onChange={(e) => handleUpdateSlide(idx, 'image', e.target.value)}
                                    placeholder="/uploads/media/..."
                                    style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                />
                                {openMediaPicker && (
                                    <button
                                        type="button"
                                        onClick={() => openMediaPicker((url) => handleUpdateSlide(idx, 'image', url))}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: '0.45rem 0.75rem', borderRadius: '6px',
                                            border: '1px solid #cbd5e1', background: '#f8fafc',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                            color: '#334155'
                                        }}
                                    >
                                        <ImageIcon size={14} /> Choose Image
                                    </button>
                                )}
                            </div>
                            {slide.image && (
                                <div style={{ marginTop: '0.5rem', width: '120px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <img src={slide.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Auto Play Interval */}
            <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                    Auto-Play Interval (milliseconds)
                </label>
                <input
                    type="number"
                    value={settings?.auto_play_interval || 5000}
                    onChange={(e) => updateSettings('auto_play_interval', Number(e.target.value) || 5000)}
                    min={2000}
                    step={500}
                    style={{ width: '180px', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
            </div>
        </div>
    );
}
