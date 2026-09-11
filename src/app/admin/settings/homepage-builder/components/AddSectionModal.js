'use client';

import React, { useState, useMemo } from 'react';
import {
    X,
    Search,
    Layout,
    Sparkles,
    ShoppingCart,
    Grid,
    MessageSquare,
    Image as ImageIcon,
    FileText,
    Truck,
    Package,
    Layers,
    Plus,
    Flame,
    CheckCircle2
} from 'lucide-react';
import { SECTION_TEMPLATES } from './builderConstants';

// Categorize templates for Elementor-like category grouping
const CATEGORIES = [
    { id: 'all', label: 'All Elements' },
    { id: 'sliders', label: 'Banners & Sliders' },
    { id: 'products', label: 'Products & Shop' },
    { id: 'media', label: 'Gallery & Media' },
    { id: 'story', label: 'Brand & Story' },
    { id: 'support', label: 'Support & Perks' }
];

const TEMPLATE_CATEGORY_MAP = {
    hero_banner: 'sliders',
    featured_product_slider: 'products',
    all_product_slider: 'products',
    best_sellers: 'products',
    explore_collection: 'products',
    shop_by_category: 'products',
    gallery_popup: 'media',
    image_and_text: 'media',
    text_and_image: 'media',
    brand_story_logo: 'story',
    craftsmanship_story: 'story',
    whatsapp_shopping: 'support',
    feature_perks: 'support'
};

export default function AddSectionModal({ isOpen, onClose, onSelectTemplate }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const filteredTemplates = useMemo(() => {
        return SECTION_TEMPLATES.filter(tmpl => {
            const matchesCategory = activeCategory === 'all' || TEMPLATE_CATEGORY_MAP[tmpl.type] === activeCategory;
            const matchesSearch = !searchQuery.trim() ||
                tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tmpl.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (tmpl.badge && tmpl.badge.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, activeCategory]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex'
        }}>
            {/* Dark Backdrop Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    animation: 'fadeInOverlay 0.25s ease forwards'
                }}
            />

            {/* Elementor-Style Left Sidebar Panel */}
            <div
                style={{
                    position: 'relative',
                    width: '420px',
                    maxWidth: '92vw',
                    height: '100%',
                    background: '#1e222d', // Elementor dark navy aesthetic
                    color: '#f8fafc',
                    boxShadow: '10px 0 40px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    zIndex: 2,
                    borderRight: '1px solid rgba(255,255,255,0.08)'
                }}
            >
                <style jsx>{`
                    @keyframes slideInLeft {
                        from {
                            transform: translateX(-100%);
                            opacity: 0.8;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes fadeInOverlay {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .elementor-item-card {
                        transition: all 0.22s ease;
                    }
                    .elementor-item-card:hover {
                        background: #2a3040 !important;
                        border-color: #d47a06 !important;
                        transform: translateY(-2px);
                        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
                    }
                    .elementor-item-card:hover .elementor-insert-btn {
                        background: #5d0821 !important;
                        color: #ffffff !important;
                        border-color: #5d0821 !important;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(0,0,0,0.15);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.2);
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.35);
                    }
                `}</style>

                {/* Top Header Bar */}
                <div style={{
                    padding: '1.25rem 1.25rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: '#181b24',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #5d0821 0%, #8b1136 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                boxShadow: '0 2px 8px rgba(93, 8, 33, 0.4)'
                            }}>
                                <Grid size={18} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
                                    ELEMENTS / BLOCKS
                                </h3>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Add blocks to Homepage
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search Input Box */}
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Search
                            size={16}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                color: '#94a3b8',
                                pointerEvents: 'none'
                            }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search widgets (e.g. slider, gallery)..."
                            style={{
                                width: '100%',
                                background: '#262c3a',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                padding: '0.6rem 2.2rem 0.6rem 2.25rem',
                                color: '#ffffff',
                                fontSize: '0.84rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#d47a06'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '2px'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills Bar */}
                <div
                    className="custom-scrollbar"
                    style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: '#181b24',
                        display: 'flex',
                        gap: '0.4rem',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isActive ? '#5d0821' : 'rgba(255,255,255,0.06)',
                                    color: isActive ? '#ffffff' : '#94a3b8',
                                    boxShadow: isActive ? '0 2px 6px rgba(93, 8, 33, 0.4)' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Items List (Elementor-style 2-Column Grid or List) */}
                <div
                    className="custom-scrollbar"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}
                >
                    {filteredTemplates.length === 0 ? (
                        <div style={{
                            padding: '3rem 1rem',
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <Search size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#cbd5e1' }}>No matching elements found</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Try searching with a different term or clear filters.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                            {filteredTemplates.map(tmpl => {
                                const IconComp = tmpl.icon;
                                return (
                                    <div
                                        key={tmpl.type}
                                        className="elementor-item-card"
                                        onClick={() => onSelectTemplate(tmpl)}
                                        style={{
                                            background: '#232836',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            padding: '0.85rem 0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            position: 'relative',
                                            userSelect: 'none'
                                        }}
                                    >
                                        {/* Icon Container */}
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '10px',
                                            background: 'rgba(212, 122, 6, 0.12)',
                                            color: '#d47a06',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '0.6rem',
                                            border: '1px solid rgba(212, 122, 6, 0.25)'
                                        }}>
                                            <IconComp size={22} />
                                        </div>

                                        {/* Title */}
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            lineHeight: 1.25,
                                            marginBottom: '0.35rem',
                                            minHeight: '2.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {tmpl.name}
                                        </div>

                                        {/* Badge Tag */}
                                        <span style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            color: '#d47a06',
                                            background: 'rgba(212, 122, 6, 0.15)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            letterSpacing: '0.03em',
                                            marginBottom: '0.6rem'
                                        }}>
                                            {tmpl.badge}
                                        </span>

                                        {/* Insert Button */}
                                        <div
                                            className="elementor-insert-btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.35rem 0',
                                                borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#cbd5e1',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '3px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Plus size={12} /> Add Block
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div style={{
                    padding: '0.85rem 1.25rem',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: '#181b24',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>{filteredTemplates.length} elements available</span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#cbd5e1',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Close Panel
                    </button>
                </div>
            </div>
        </div>
    );
}
