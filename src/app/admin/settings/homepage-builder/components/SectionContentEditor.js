'use client';

import React, { useState, useEffect } from 'react';
import {
    Save,
    Image as ImageIcon,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Check,
    Sparkles,
    Settings,
    Layers
} from 'lucide-react';
import HeroSlidesEditor from './HeroSlidesEditor';
import FeaturePerksEditor from './FeaturePerksEditor';
import { getSectionIcon, getSectionTypeName } from './builderConstants';

export default function SectionContentEditor({
    section,
    onSave,
    onToggleVisibility,
    onDuplicate,
    onDelete,
    openMediaPicker
}) {
    const [formState, setFormState] = useState(section || {});
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Whenever a new section is selected from the left column, sync local form state
    useEffect(() => {
        if (section) {
            setFormState(JSON.parse(JSON.stringify(section)));
            setSavedSuccess(false);
        }
    }, [section?.id]);

    if (!section) {
        return (
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '2px dashed #e2e8f0',
                padding: '4rem 2rem',
                textAlign: 'center',
                color: '#64748b'
            }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                }}>
                    <Layers size={28} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '1.2rem' }}>
                    Select a Block to Edit
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '360px', marginInline: 'auto' }}>
                    Click any block from the left panel to configure its text, media, slides, and display settings.
                </p>
            </div>
        );
    }

    const updateField = (field, value) => {
        setFormState(prev => ({ ...prev, [field]: value }));
        setSavedSuccess(false);
    };

    const updateSetting = (key, value) => {
        setFormState(prev => ({
            ...prev,
            settings: {
                ...(prev.settings || {}),
                [key]: value
            }
        }));
        setSavedSuccess(false);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(formState);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        }
    };

    const sectionType = formState?.section_type || '';
    const settings = formState?.settings || {};

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header Toolbar */}
            <div style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: formState.is_enabled ? 'rgba(93, 8, 33, 0.08)' : '#f1f5f9',
                        color: formState.is_enabled ? '#5d0821' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {getSectionIcon(sectionType)}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#5d0821',
                                background: 'rgba(93, 8, 33, 0.08)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {getSectionTypeName(sectionType)}
                            </span>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                background: formState.is_enabled ? '#f0fdf4' : '#fef2f2',
                                color: formState.is_enabled ? '#16a34a' : '#dc2626'
                            }}>
                                {formState.is_enabled ? 'VISIBLE' : 'HIDDEN'}
                            </span>
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.2
                        }}>
                            {formState.title || 'Untitled Section'}
                        </h2>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {onToggleVisibility && (
                        <button
                            type="button"
                            onClick={() => onToggleVisibility(formState.id)}
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: formState.is_enabled ? '#f8fafc' : '#fee2e2',
                                color: formState.is_enabled ? '#475569' : '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700
                            }}
                            title={formState.is_enabled ? 'Hide from live store' : 'Show on live store'}
                        >
                            {formState.is_enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                            {formState.is_enabled ? 'Enabled' : 'Hidden'}
                        </button>
                    )}

                    {onDuplicate && (
                        <button
                            type="button"
                            onClick={() => onDuplicate(formState)}
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700
                            }}
                            title="Duplicate this block"
                        >
                            <Copy size={15} />
                            Duplicate
                        </button>
                    )}

                    {onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(formState.id)}
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: 700
                            }}
                            title="Delete this block"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.55rem 1.25rem',
                            borderRadius: '8px',
                            background: savedSuccess ? '#16a34a' : '#5d0821',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: savedSuccess
                                ? '0 4px 12px rgba(22, 163, 74, 0.25)'
                                : '0 4px 12px rgba(93, 8, 33, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {savedSuccess ? <Check size={16} /> : <Save size={16} />}
                        {savedSuccess ? 'Updated!' : 'Update Content'}
                    </button>
                </div>
            </div>

            {/* Content Form Body */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* General Settings Card */}
                <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                        <Settings size={18} style={{ color: '#5d0821' }} />
                        <span>General Section Typography & Badges</span>
                    </div>

                    {/* Section Title */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                            Section Title (Heading)
                        </label>
                        <input
                            type="text"
                            value={formState.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder="Enter section heading"
                            style={{
                                width: '100%',
                                padding: '0.7rem 0.95rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.92rem',
                                background: '#ffffff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                            Subtitle / Narrative Description
                        </label>
                        <textarea
                            value={formState.subtitle || ''}
                            onChange={(e) => updateField('subtitle', e.target.value)}
                            rows={3}
                            placeholder="Enter section subtitle or promotional copy"
                            style={{
                                width: '100%',
                                padding: '0.7rem 0.95rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                background: '#ffffff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Badge Pill Text
                            </label>
                            <input
                                type="text"
                                value={formState.badge_text || ''}
                                onChange={(e) => updateField('badge_text', e.target.value)}
                                placeholder="e.g. AUTHENTIC WEAVES"
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.9rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem',
                                    background: '#ffffff',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Text Alignment
                            </label>
                            <select
                                value={settings.align || 'center'}
                                onChange={(e) => updateSetting('align', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.9rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem',
                                    background: '#ffffff',
                                    outline: 'none'
                                }}
                            >
                                <option value="center">Center Aligned</option>
                                <option value="left">Left Aligned</option>
                                <option value="right">Right Aligned</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section Specific Editors */}
                {sectionType === 'hero_banner' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                            <Sparkles size={18} style={{ color: '#5d0821' }} />
                            <span>Hero Slides & Banners</span>
                        </div>
                        <HeroSlidesEditor
                            settings={settings}
                            updateSettings={updateSetting}
                            openMediaPicker={openMediaPicker}
                        />
                    </div>
                )}

                {sectionType === 'feature_perks' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FeaturePerksEditor
                            settings={settings}
                            updateSettings={updateSetting}
                        />
                    </div>
                )}

                {(sectionType === 'image_and_text' || sectionType === 'text_and_image' || sectionType === 'craftsmanship_story') && (
                    <div style={{
                        background: '#ffffff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                            <ImageIcon size={18} style={{ color: '#5d0821' }} />
                            <span>Split Banner Image & Call-to-Action</span>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Feature Image URL
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.image_url || ''}
                                    onChange={(e) => updateSetting('image_url', e.target.value)}
                                    placeholder="/uploads/media/..."
                                    style={{
                                        flex: 1,
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                                {openMediaPicker && (
                                    <button
                                        type="button"
                                        onClick={() => openMediaPicker((url) => updateSetting('image_url', url))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.65rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            color: '#334155'
                                        }}
                                    >
                                        <ImageIcon size={16} /> Choose Image
                                    </button>
                                )}
                            </div>
                            {settings.image_url && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    width: '180px',
                                    height: '110px',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                    <img
                                        src={settings.image_url}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Button Text
                                </label>
                                <input
                                    type="text"
                                    value={settings.button_text || ''}
                                    onChange={(e) => updateSetting('button_text', e.target.value)}
                                    placeholder="e.g. EXPLORE CATALOG"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Button Link (URL)
                                </label>
                                <input
                                    type="text"
                                    value={settings.button_link || ''}
                                    onChange={(e) => updateSetting('button_link', e.target.value)}
                                    placeholder="e.g. /shop"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {sectionType === 'brand_story_logo' && (
                    <div style={{
                        background: '#ffffff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                            <Sparkles size={18} style={{ color: '#5d0821' }} />
                            <span>50-50 Brand Story & Logo Settings</span>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Brand Logo / Maiden Art Image
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.logo_image || '/images/vaiyaaree-logo.png'}
                                    onChange={(e) => updateSetting('logo_image', e.target.value)}
                                    placeholder="/images/vaiyaaree-logo.png"
                                    style={{
                                        flex: 1,
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                                {openMediaPicker && (
                                    <button
                                        type="button"
                                        onClick={() => openMediaPicker((url) => updateSetting('logo_image', url))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.65rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            color: '#334155'
                                        }}
                                    >
                                        <ImageIcon size={16} /> Choose Logo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Maroon Side Button Text
                                </label>
                                <input
                                    type="text"
                                    value={settings.button_text || ''}
                                    onChange={(e) => updateSetting('button_text', e.target.value)}
                                    placeholder="e.g. EXPLORE OUR SILK CATALOG"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Button Link (URL)
                                </label>
                                <input
                                    type="text"
                                    value={settings.button_link || ''}
                                    onChange={(e) => updateSetting('button_link', e.target.value)}
                                    placeholder="e.g. /shop"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {sectionType === 'whatsapp_shopping' && (
                    <div style={{
                        background: '#ffffff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            WhatsApp Shopping Configuration
                        </h4>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                WhatsApp Support Number (10 digits)
                            </label>
                            <input
                                type="text"
                                value={settings.phone || '8667793292'}
                                onChange={(e) => updateSetting('phone', e.target.value)}
                                placeholder="8667793292"
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem'
                                }}
                            />
                        </div>
                    </div>
                )}

                {(sectionType === 'featured_product_slider' || sectionType === 'all_product_slider' || sectionType === 'best_sellers' || sectionType === 'explore_collection') && (
                    <div style={{
                        background: '#ffffff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Number of Sarees to Display
                            </label>
                            <input
                                type="number"
                                value={settings.limit || 8}
                                onChange={(e) => updateSetting('limit', Number(e.target.value) || 8)}
                                min={2}
                                max={30}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
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
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem'
                                }}
                            />
                        </div>
                    </div>
                )}

                {sectionType === 'shop_by_category' && (
                    <div style={{
                        background: '#ffffff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Category Display Columns
                            </label>
                            <select
                                value={settings.columns || 3}
                                onChange={(e) => updateSetting('columns', Number(e.target.value) || 3)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem'
                                }}
                            >
                                <option value={2}>2 Columns</option>
                                <option value={3}>3 Columns</option>
                                <option value={4}>4 Columns</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                Max Categories Limit
                            </label>
                            <input
                                type="number"
                                value={settings.limit || 6}
                                onChange={(e) => updateSetting('limit', Number(e.target.value) || 6)}
                                min={2}
                                max={20}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.88rem'
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div style={{
                padding: '1.25rem 1.75rem',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Clicking <strong>Update Content</strong> updates this block in your current draft.
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.7rem 1.75rem',
                        borderRadius: '10px',
                        background: savedSuccess ? '#16a34a' : '#5d0821',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: savedSuccess
                            ? '0 4px 12px rgba(22, 163, 74, 0.25)'
                            : '0 4px 12px rgba(93, 8, 33, 0.25)',
                        transition: 'all 0.2s'
                    }}
                >
                    {savedSuccess ? <Check size={18} /> : <Save size={18} />}
                    {savedSuccess ? 'Content Updated!' : 'Update Section Content'}
                </button>
            </div>
        </div>
    );
}
