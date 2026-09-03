'use client';

import React from 'react';
import { X, Image as ImageIcon, Save } from 'lucide-react';
import HeroSlidesEditor from './HeroSlidesEditor';
import FeaturePerksEditor from './FeaturePerksEditor';

export default function EditSectionModal({
    editingSection,
    onClose,
    onSave,
    openMediaPicker
}) {
    const [formState, setFormState] = React.useState(editingSection || {});

    React.useEffect(() => {
        if (editingSection) {
            setFormState(editingSection);
        }
    }, [editingSection]);

    if (!editingSection) return null;

    const updateField = (field, value) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const updateSetting = (key, value) => {
        setFormState(prev => ({
            ...prev,
            settings: {
                ...(prev.settings || {}),
                [key]: value
            }
        }));
    };

    const handleSave = () => {
        onSave(formState);
    };

    const sectionType = formState?.section_type || '';
    const settings = formState?.settings || {};

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '20px', maxWidth: '780px', width: '100%',
                maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5d0821', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Component: {sectionType}
                        </span>
                        <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                            Customize Section
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* General Title, Subtitle, Badge */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            Section Title (Heading)
                        </label>
                        <input
                            type="text"
                            value={formState.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder="Enter section heading"
                            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            Subtitle / Narrative Description
                        </label>
                        <textarea
                            value={formState.subtitle || ''}
                            onChange={(e) => updateField('subtitle', e.target.value)}
                            rows={3}
                            placeholder="Enter section subtitle or description"
                            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                Badge Pill Text
                            </label>
                            <input
                                type="text"
                                value={formState.badge_text || ''}
                                onChange={(e) => updateField('badge_text', e.target.value)}
                                placeholder="e.g. AUTHENTIC SILKS"
                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                Text Alignment
                            </label>
                            <select
                                value={settings.align || 'center'}
                                onChange={(e) => updateSetting('align', e.target.value)}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                            >
                                <option value="center">Center Aligned</option>
                                <option value="left">Left Aligned</option>
                                <option value="right">Right Aligned</option>
                            </select>
                        </div>
                    </div>

                    {/* Section Type Specific Customizers */}
                    {sectionType === 'hero_banner' && (
                        <HeroSlidesEditor
                            settings={settings}
                            updateSettings={updateSetting}
                            openMediaPicker={openMediaPicker}
                        />
                    )}

                    {sectionType === 'feature_perks' && (
                        <FeaturePerksEditor
                            settings={settings}
                            updateSettings={updateSetting}
                        />
                    )}

                    {(sectionType === 'image_and_text' || sectionType === 'text_and_image' || sectionType === 'craftsmanship_story') && (
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Split Banner Image & Call-to-Action</h4>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    Feature Image URL
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={settings.image_url || ''}
                                        onChange={(e) => updateSetting('image_url', e.target.value)}
                                        placeholder="/uploads/media/..."
                                        style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                    {openMediaPicker && (
                                        <button
                                            type="button"
                                            onClick={() => openMediaPicker((url) => updateSetting('image_url', url))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '0.55rem 0.85rem', borderRadius: '8px',
                                                border: '1px solid #cbd5e1', background: '#ffffff',
                                                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                                color: '#334155'
                                            }}
                                        >
                                            <ImageIcon size={14} /> Choose Image
                                        </button>
                                    )}
                                </div>
                                {settings.image_url && (
                                    <div style={{ marginTop: '0.5rem', width: '140px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <img src={settings.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                        Button Text
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.button_text || ''}
                                        onChange={(e) => updateSetting('button_text', e.target.value)}
                                        placeholder="e.g. EXPLORE CATALOG"
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                        Button Link (URL)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.button_link || ''}
                                        onChange={(e) => updateSetting('button_link', e.target.value)}
                                        placeholder="e.g. /shop"
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {sectionType === 'brand_story_logo' && (
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>50-50 Brand Story & Logo Settings</h4>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    Brand Logo / Maiden Art Image
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={settings.logo_image || '/images/vaiyaaree-logo.png'}
                                        onChange={(e) => updateSetting('logo_image', e.target.value)}
                                        placeholder="/images/vaiyaaree-logo.png"
                                        style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                    {openMediaPicker && (
                                        <button
                                            type="button"
                                            onClick={() => openMediaPicker((url) => updateSetting('logo_image', url))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '0.55rem 0.85rem', borderRadius: '8px',
                                                border: '1px solid #cbd5e1', background: '#ffffff',
                                                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                                color: '#334155'
                                            }}
                                        >
                                            <ImageIcon size={14} /> Choose Logo
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                        Maroon Side Button Text
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.button_text || ''}
                                        onChange={(e) => updateSetting('button_text', e.target.value)}
                                        placeholder="e.g. EXPLORE OUR SILK CATALOG"
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                        Button Link (URL)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.button_link || ''}
                                        onChange={(e) => updateSetting('button_link', e.target.value)}
                                        placeholder="e.g. /shop"
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {sectionType === 'whatsapp_shopping' && (
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>WhatsApp Shopping Configuration</h4>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    WhatsApp Support Number (10 digits)
                                </label>
                                <input
                                    type="text"
                                    value={settings.phone || '8667793292'}
                                    onChange={(e) => updateSetting('phone', e.target.value)}
                                    placeholder="8667793292"
                                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                    )}

                    {(sectionType === 'featured_product_slider' || sectionType === 'all_product_slider' || sectionType === 'best_sellers' || sectionType === 'explore_collection') && (
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    Number of Sarees to Display
                                </label>
                                <input
                                    type="number"
                                    value={settings.limit || 8}
                                    onChange={(e) => updateSetting('limit', Number(e.target.value) || 8)}
                                    min={2}
                                    max={30}
                                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    Auto Scroll Interval (ms)
                                </label>
                                <input
                                    type="number"
                                    value={settings.scroll_interval || settings.auto_play_delay || 5000}
                                    onChange={(e) => {
                                        const v = Number(e.target.value) || 5000;
                                        updateSetting('scroll_interval', v);
                                        updateSetting('auto_play_delay', v);
                                    }}
                                    step={500}
                                    min={2000}
                                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn btn-primary"
                        style={{
                            padding: '0.65rem 1.5rem', borderRadius: '10px', fontWeight: 800,
                            background: '#5d0821', color: '#ffffff', border: 'none',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
