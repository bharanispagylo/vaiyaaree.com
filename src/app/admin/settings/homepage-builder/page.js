'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopBar from '@/components/AdminTopBar';
import MediaPicker from '@/components/MediaPicker';
import {
    GripVertical,
    Eye,
    EyeOff,
    Edit2,
    Trash2,
    Plus,
    Save,
    RotateCcw,
    Layers,
    Layout,
    Sparkles,
    ShoppingCart,
    Grid,
    MessageSquare,
    Image as ImageIcon,
    Check,
    X,
    ExternalLink,
    ChevronUp,
    ChevronDown,
    Copy,
    ArrowUpRight,
    FileText,
    Truck,
    Package
} from 'lucide-react';

const SECTION_TEMPLATES = [
    {
        type: 'gallery_popup',
        name: 'Collection Gallery with Lightbox Popup',
        icon: ImageIcon,
        badge: 'CUSTOMER SHOWCASE',
        desc: 'Interactive photo gallery grid with image zoom and full-screen lightbox modal.',
        defaultTitle: 'Our Collection Gallery',
        defaultSubtitle: 'Click any photo to zoom in and preview the fine intricate weave patterns in high definition.',
        defaultSettings: {
            enable_popup: true,
            auto_play: true,
            auto_play_delay: 3500,
            images: [
                '/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg',
                '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg',
                '/uploads/media/without-watermark/CAT-RPX8M_1780639172860.jpg',
                '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
                '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg'
            ]
        }
    },
    {
        type: 'image_and_text',
        name: 'Image and Text (Split Banner)',
        icon: Layout,
        badge: 'WEAVER SPOTLIGHT',
        desc: 'Split layout with high-resolution image on the left and rich story content on the right.',
        defaultTitle: 'Pure Zari & Handcrafted Perfection',
        defaultSubtitle: 'Each saree in our collection takes up to 45 days of painstaking loom work by generational weavers, creating heirlooms that stay timeless across generations.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
            button_text: 'READ WEAVER STORY',
            button_link: '/shop',
            image_aspect_ratio: '4/3'
        }
    },
    {
        type: 'text_and_image',
        name: 'Text and Image (Split Banner)',
        icon: Layout,
        badge: 'EXCLUSIVE SERVICES',
        desc: 'Split layout with rich story content on the left and high-resolution image on the right.',
        defaultTitle: 'Bespoke Custom Blouse & Fall Stitching',
        defaultSubtitle: 'Get your saree delivered pre-stitched with matching fall, pico, and custom-tailored designer blouses crafted to your exact fit.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg',
            button_text: 'EXPLORE SERVICES',
            button_link: '/shop',
            image_aspect_ratio: '4/3'
        }
    },
    {
        type: 'featured_product_slider',
        name: 'Featured Product Slider',
        icon: Sparkles,
        badge: 'CURATED PICKS',
        desc: 'Dynamic carousel showing featured products with auto-scroll and direct checkout links.',
        defaultTitle: 'Featured Collection',
        defaultSubtitle: 'Special handpicked silk & designer weaves for the festive season',
        defaultSettings: {
            limit: 10,
            auto_play_delay: 4000
        }
    },
    {
        type: 'all_product_slider',
        name: 'All Product Slider / Latest Arrivals',
        icon: ShoppingCart,
        badge: 'NEW ARRIVALS',
        desc: 'Carousel showcasing all active sarees in your catalog sorted by newest additions.',
        defaultTitle: 'Latest Additions',
        defaultSubtitle: 'Fresh arrivals crafted with unmatched precision and pure elegance',
        defaultSettings: {
            limit: 12,
            auto_play_delay: 4500
        }
    },
    {
        type: 'hero_banner',
        name: 'Hero Banner Slider',
        icon: Layout,
        badge: 'EXCLUSIVE WEAVES & SILKS',
        desc: 'Grand top banner slider with customized background slides, typography, and shop CTA buttons.',
        defaultTitle: 'Exclusive Weaves & Silks',
        defaultSubtitle: 'Celebrate Love with Timeless Handwoven Elegance',
        defaultSettings: {
            slides: [
                {
                    title: "Wedding & Festive Collection",
                    subtitle: "Celebrate Love with Timeless Handwoven Elegance",
                    image: "/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg",
                    button_text: "SHOP NOW",
                    button_link: "/shop?category=Silk"
                },
                {
                    title: "Authentic Kanjivaram Pure Silks",
                    subtitle: "Woven by Master Artisans with Pure Zari Borders",
                    image: "/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg",
                    button_text: "SHOP NOW",
                    button_link: "/shop"
                }
            ],
            auto_play_interval: 5000
        }
    },
    {
        type: 'best_sellers',
        name: 'Best Sellers Collection',
        icon: Package,
        badge: 'TRENDING SELECTIONS',
        desc: 'Highlights trending best-selling sarees with animated hover cards and stock status.',
        defaultTitle: 'Best Sellers',
        defaultSubtitle: 'Explore our most loved handcrafted sarees chosen by patrons worldwide',
        defaultSettings: {
            limit: 8,
            auto_scroll: true,
            scroll_interval: 5000
        }
    },
    {
        type: 'explore_collection',
        name: 'Explore Our Weaves',
        icon: Grid,
        badge: 'HANDPICKED SELECTIONS',
        desc: 'Curated explore section displaying handpicked South Indian sarees.',
        defaultTitle: 'Explore Our Weaves',
        defaultSubtitle: 'Handpicked sarees showcasing the finest South Indian artistry',
        defaultSettings: {
            limit: 8,
            group_filter: 'EXPLORE',
            auto_scroll: true,
            scroll_interval: 6000
        }
    },
    {
        type: 'shop_by_category',
        name: 'Shop by Category',
        icon: Layers,
        badge: 'CURATED WEAVES',
        desc: 'Visual category grid cards with background imagery and saree counts.',
        defaultTitle: 'Shop by Category',
        defaultSubtitle: 'Explore handcrafted weaves, rich silks, and everyday elegance in our exclusive saree ranges.',
        defaultSettings: {
            limit: 6,
            columns: 3
        }
    },
    {
        type: 'craftsmanship_story',
        name: 'Heritage & Craftsmanship Story',
        icon: FileText,
        badge: 'HERITAGE & CRAFTSMANSHIP',
        desc: 'Brand story section highlighting artisan traditions and handloom authenticity.',
        defaultTitle: 'Authentic Weaves, Timeless Grace',
        defaultSubtitle: 'Vaiyaaree brings you authentic handloom weaves straight from master artisans in South India. Discover rich silk sarees, soft cotton prints, and designer festive drapes tailored for every occasion.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg',
            button_text: 'EXPLORE CATALOG',
            button_link: '/shop'
        }
    },
    {
        type: 'whatsapp_shopping',
        name: 'Shop via WhatsApp',
        icon: MessageSquare,
        badge: 'PERSONALIZED SHOPPING',
        desc: 'Direct WhatsApp shopping callout with QR code, feature bullet points, and live chat trigger.',
        defaultTitle: 'Shop via WhatsApp',
        defaultSubtitle: 'Connect directly with our saree experts, view live fabric photos, and place your order seamlessly via chat.',
        defaultSettings: {
            phone: '8667793292',
            features: ['Direct Fabric & Video Preview', 'Quick Order Confirmation & Tracking'],
            show_qr: true
        }
    },
    {
        type: 'feature_perks',
        name: 'Feature Perks & Trust Badges',
        icon: Truck,
        badge: 'OUR PROMISE',
        desc: 'Shipping, handcrafted authenticity, return policy, and support trust highlights.',
        defaultTitle: 'Why Choose Vaiyaaree',
        defaultSubtitle: 'Our commitment to authentic quality, trust, and exceptional service',
        defaultSettings: {
            perks: [
                { icon: 'Truck', title: "Free Shipping Nationwide", desc: "Completely free delivery across India" },
                { icon: 'Sparkles', title: "100% Authentic Handcraft", desc: "Direct from master weavers in Coimbatore" },
                { icon: 'MessageSquare', title: "WhatsApp Direct Order", desc: "Chat, view live fabrics & order via WhatsApp" },
                { icon: 'ShieldCheck', title: "Guaranteed Quality & Care", desc: "Hassle-free 10-day return & exchange window" }
            ]
        }
    }
];

export default function HomepageBuilderPage() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Modal / Drawer state for editing a section
    const [editingSection, setEditingSection] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Media Picker Modal State
    const [mediaPickerConfig, setMediaPickerConfig] = useState(null);

    useEffect(() => {
        fetchSections();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchSections = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/homepage-builder');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setSections(json.data);
            } else {
                showToast(json.error || 'Failed to load sections.', 'error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to connect to database.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveSectionsToServer = async (updatedSectionsList, silent = false) => {
        const payload = updatedSectionsList || sections;
        if (!silent) setSaving(true);
        try {
            const res = await fetch('/api/admin/homepage-builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: payload })
            });
            const json = await res.json();
            if (json.success) {
                if (!silent) showToast('Homepage layout saved successfully!');
            } else {
                showToast(json.error || 'Failed to save changes.', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Error saving changes to server.', 'error');
        } finally {
            if (!silent) setSaving(false);
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.parentNode);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIdx !== index) {
            setDragOverIdx(index);
        }
    };

    const handleDragEnd = () => {
        if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
            const reordered = [...sections];
            const [movedItem] = reordered.splice(draggedIdx, 1);
            reordered.splice(dragOverIdx, 0, movedItem);
            const withOrders = reordered.map((item, idx) => ({ ...item, display_order: idx + 1 }));
            setSections(withOrders);
            saveSectionsToServer(withOrders, true);
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const moveSection = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sections.length) return;
        const reordered = [...sections];
        const temp = reordered[index];
        reordered[index] = reordered[targetIndex];
        reordered[targetIndex] = temp;
        const withOrders = reordered.map((item, idx) => ({ ...item, display_order: idx + 1 }));
        setSections(withOrders);
        saveSectionsToServer(withOrders, true);
    };

    const toggleSectionVisibility = (id) => {
        const updated = sections.map(s => s.id === id ? { ...s, is_enabled: !s.is_enabled } : s);
        setSections(updated);
        saveSectionsToServer(updated, true);
    };

    const deleteSection = (id) => {
        if (!confirm('Are you sure you want to remove this section from the homepage?')) return;
        const updated = sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, display_order: idx + 1 }));
        setSections(updated);
        saveSectionsToServer(updated, true);
    };

    const duplicateSection = (sec) => {
        const newSec = {
            ...sec,
            id: `sec_${Date.now()}`,
            title: `${sec.title} (Copy)`,
            display_order: sections.length + 1
        };
        const updated = [...sections, newSec];
        setSections(updated);
        saveSectionsToServer(updated, true);
        showToast('Section duplicated and saved!');
    };

    const addNewSectionFromTemplate = (tmpl) => {
        const newSec = {
            id: `sec_${tmpl.type}_${Date.now()}`,
            section_key: tmpl.type,
            section_type: tmpl.type,
            title: tmpl.defaultTitle,
            subtitle: tmpl.defaultSubtitle,
            badge_text: tmpl.badge,
            is_enabled: true,
            display_order: sections.length + 1,
            settings: tmpl.defaultSettings
        };
        const updated = [...sections, newSec];
        setSections(updated);
        saveSectionsToServer(updated, true);
        setShowAddModal(false);
        setEditingSection(newSec);
        showToast(`Added ${tmpl.name}! Customize its details below.`);
    };

    const resetToDefaults = async () => {
        if (!confirm('Are you sure you want to reset all homepage sections to factory defaults? All custom additions and arrangements will be reset.')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/homepage-builder?reset_defaults=true', { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                showToast('Reset to factory defaults.');
                await fetchSections();
            } else {
                showToast(json.error || 'Failed to reset.', 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            showToast('Error resetting layout.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateEditingSection = (field, value) => {
        setEditingSection(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateEditingSetting = (key, value) => {
        setEditingSection(prev => ({
            ...prev,
            settings: {
                ...(prev.settings || {}),
                [key]: value
            }
        }));
    };

    const saveEditingSectionModal = () => {
        if (!editingSection) return;
        const updated = sections.map(s => s.id === editingSection.id ? editingSection : s);
        setSections(updated);
        saveSectionsToServer(updated, false);
        setEditingSection(null);
    };

    const getSectionIcon = (type) => {
        const tmpl = SECTION_TEMPLATES.find(t => t.type === type);
        if (tmpl) {
            const IconComp = tmpl.icon;
            return <IconComp size={18} />;
        }
        return <Layers size={18} />;
    };

    const getSectionTypeName = (type) => {
        const tmpl = SECTION_TEMPLATES.find(t => t.type === type);
        return tmpl ? tmpl.name : type.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
            <AdminSidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <AdminTopBar />

                <main style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                <div style={{ background: '#5d0821', color: '#ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Layout size={20} />
                                </div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                    Home Page Builder
                                </h1>
                            </div>
                            <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem' }}>
                                Drag and reorder sections, customize text and settings, or add dynamic product carousels & banners to your storefront.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                                onClick={resetToDefaults}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 1.1rem', background: '#ffffff', border: '1px solid #cbd5e1',
                                    borderRadius: '10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                title="Reset all sections to default arrangement"
                            >
                                <RotateCcw size={15} />
                                Reset Defaults
                            </button>

                            <a
                                href="/"
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 1.1rem', background: '#ffffff', border: '1px solid #cbd5e1',
                                    borderRadius: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700,
                                    textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <ArrowUpRight size={16} />
                                Live Storefront
                            </a>

                            <button
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 1.25rem', background: '#5d0821', border: 'none',
                                    borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700,
                                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(93, 8, 33, 0.25)', transition: 'all 0.2s'
                                }}
                            >
                                <Plus size={16} />
                                Add New Section
                            </button>

                            <button
                                onClick={() => saveSectionsToServer(null, false)}
                                disabled={saving}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 1.4rem', background: '#16a34a', border: 'none',
                                    borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800,
                                    cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                                    opacity: saving ? 0.7 : 1, transition: 'all 0.2s'
                                }}
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save & Publish'}
                            </button>
                        </div>
                    </div>

                    {/* Toast Alert */}
                    {toast && (
                        <div style={{
                            marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px',
                            background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                            border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                            color: toast.type === 'error' ? '#dc2626' : '#15803d',
                            fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}>
                            {toast.type === 'error' ? <X size={18} /> : <Check size={18} />}
                            {toast.message}
                        </div>
                    )}

                    {/* Section Blocks Drag-and-Drop Container */}
                    {loading ? (
                        <div style={{ background: '#ffffff', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                            <div style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#5d0821', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                            <p style={{ margin: 0, fontWeight: 700 }}>Loading homepage layout sections...</p>
                        </div>
                    ) : sections.length === 0 ? (
                        <div style={{ background: '#ffffff', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                            <Layout size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
                            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>No Homepage Sections Found</h3>
                            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                                Start by adding your first section or initialize with default store sections.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ background: '#5d0821', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
                                    <Plus size={16} /> Choose Section
                                </button>
                                <button onClick={resetToDefaults} className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
                                    <RotateCcw size={16} /> Load Defaults
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {sections.map((sec, index) => {
                                const isDragging = draggedIdx === index;
                                const isDragOver = dragOverIdx === index;

                                return (
                                    <div
                                        key={sec.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        style={{
                                            background: '#ffffff',
                                            borderRadius: '14px',
                                            border: isDragOver ? '2px solid #5d0821' : sec.is_enabled ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                                            padding: '1.1rem 1.4rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '1.25rem',
                                            boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                                            opacity: isDragging ? 0.4 : sec.is_enabled ? 1 : 0.65,
                                            transform: isDragging ? 'scale(1.01)' : 'none',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                            cursor: 'grab'
                                        }}
                                    >
                                        {/* Left Side: Drag Handle & Meta */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
                                            <div style={{ color: '#94a3b8', cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                                                <GripVertical size={20} />
                                            </div>

                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '10px',
                                                background: sec.is_enabled ? 'rgba(93, 8, 33, 0.08)' : '#f1f5f9',
                                                color: sec.is_enabled ? '#5d0821' : '#94a3b8',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {getSectionIcon(sec.section_type)}
                                            </div>

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                                                    <span style={{
                                                        background: '#f1f5f9', color: '#475569', fontSize: '0.72rem',
                                                        fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px',
                                                        textTransform: 'uppercase', letterSpacing: '0.04em'
                                                    }}>
                                                        #{index + 1}
                                                    </span>
                                                    <h3 style={{
                                                        margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                    }}>
                                                        {sec.title || getSectionTypeName(sec.section_type)}
                                                    </h3>
                                                    {sec.badge_text && (
                                                        <span style={{
                                                            background: 'rgba(93, 8, 33, 0.08)', color: '#5d0821',
                                                            fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem',
                                                            borderRadius: '6px', textTransform: 'uppercase'
                                                        }}>
                                                            {sec.badge_text}
                                                        </span>
                                                    )}
                                                    {!sec.is_enabled && (
                                                        <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                                            HIDDEN
                                                        </span>
                                                    )}
                                                </div>

                                                <p style={{
                                                    margin: 0, fontSize: '0.82rem', color: '#64748b',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {sec.subtitle || `Section Type: ${sec.section_type}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side: Actions Toolbar */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {/* Reorder Buttons */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.5rem' }}>
                                                <button
                                                    onClick={() => moveSection(index, -1)}
                                                    disabled={index === 0}
                                                    style={{
                                                        background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px',
                                                        padding: '2px 6px', cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                        color: index === 0 ? '#cbd5e1' : '#64748b'
                                                    }}
                                                    title="Move Up"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => moveSection(index, 1)}
                                                    disabled={index === sections.length - 1}
                                                    style={{
                                                        background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px',
                                                        padding: '2px 6px', cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer',
                                                        color: index === sections.length - 1 ? '#cbd5e1' : '#64748b'
                                                    }}
                                                    title="Move Down"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            {/* Visibility Toggle */}
                                            <button
                                                onClick={() => toggleSectionVisibility(sec.id)}
                                                style={{
                                                    padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                    background: sec.is_enabled ? '#f8fafc' : '#fee2e2',
                                                    color: sec.is_enabled ? '#475569' : '#dc2626',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                                title={sec.is_enabled ? 'Hide Section' : 'Show Section'}
                                            >
                                                {sec.is_enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>

                                            {/* Duplicate Section */}
                                            <button
                                                onClick={() => duplicateSection(sec)}
                                                style={{
                                                    padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                    background: '#f8fafc', color: '#475569', cursor: 'pointer'
                                                }}
                                                title="Duplicate Section"
                                            >
                                                <Copy size={16} />
                                            </button>

                                            {/* Customize / Edit Button */}
                                            <button
                                                onClick={() => setEditingSection(JSON.parse(JSON.stringify(sec)))}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                    padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none',
                                                    background: '#5d0821', color: '#ffffff', fontWeight: 700,
                                                    fontSize: '0.82rem', cursor: 'pointer'
                                                }}
                                            >
                                                <Edit2 size={14} /> Customize
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => deleteSection(sec.id)}
                                                style={{
                                                    padding: '0.5rem', borderRadius: '8px', border: '1px solid #fecaca',
                                                    background: '#fff1f2', color: '#dc2626', cursor: 'pointer'
                                                }}
                                                title="Remove Section"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* ADD SECTION MODAL */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: '20px', maxWidth: '850px', width: '100%',
                        maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                                    Add New Homepage Section
                                </h2>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                    Choose from predefined components to insert into your home page.
                                </p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                            {SECTION_TEMPLATES.map(tmpl => {
                                const IconComp = tmpl.icon;
                                return (
                                    <div
                                        key={tmpl.type}
                                        onClick={() => addNewSectionFromTemplate(tmpl)}
                                        style={{
                                            padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0',
                                            background: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s',
                                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#5d0821';
                                            e.currentTarget.style.background = '#ffffff';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(93, 8, 33, 0.08)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(93, 8, 33, 0.08)', color: '#5d0821', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <IconComp size={18} />
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{tmpl.name}</h4>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                                                {tmpl.desc}
                                            </p>
                                        </div>

                                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf2f7', paddingTop: '0.75rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#5d0821', letterSpacing: '0.04em' }}>{tmpl.badge}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5d0821' }}>+ Add Section</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT SECTION DRAWER / MODAL */}
            {editingSection && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: '20px', maxWidth: '750px', width: '100%',
                        maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5d0821', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Component: {editingSection.section_type}
                                </span>
                                <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                                    Customize Section
                                </h2>
                            </div>
                            <button onClick={() => setEditingSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
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
                                    value={editingSection.title || ''}
                                    onChange={(e) => updateEditingSection('title', e.target.value)}
                                    placeholder="Enter section heading"
                                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                    Subtitle / Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={editingSection.subtitle || ''}
                                    onChange={(e) => updateEditingSection('subtitle', e.target.value)}
                                    placeholder="Enter secondary subtitle description"
                                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                        Upper Badge Text
                                    </label>
                                    <input
                                        type="text"
                                        value={editingSection.badge_text || ''}
                                        onChange={(e) => updateEditingSection('badge_text', e.target.value)}
                                        placeholder="e.g. EXCLUSIVE WEAVES"
                                        style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="sec_enabled_chk"
                                        checked={editingSection.is_enabled !== false}
                                        onChange={(e) => updateEditingSection('is_enabled', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="sec_enabled_chk" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                                        Section Visible on Storefront
                                    </label>
                                </div>
                            </div>

                            {/* Section Specific Settings */}
                            <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#5d0821' }}>
                                    Specific Component Configuration
                                </h4>

                                {/* Gallery Popup Section Customizer */}
                                {editingSection.section_type === 'gallery_popup' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input
                                                type="checkbox"
                                                id="chk_gallery_popup"
                                                checked={editingSection.settings?.enable_popup !== false}
                                                onChange={(e) => updateEditingSetting('enable_popup', e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <label htmlFor="chk_gallery_popup" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                                Enable Click-to-Zoom Lightbox Modal
                                            </label>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                                    Gallery Showcase Images (URLs)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMediaPickerConfig({
                                                            multiple: true,
                                                            onSelect: (selectedUrls) => {
                                                                const current = editingSection.settings?.images || [];
                                                                const combined = Array.from(new Set([...current, ...selectedUrls]));
                                                                updateEditingSetting('images', combined);
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        background: '#5d0821', color: '#ffffff', border: 'none',
                                                        padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem',
                                                        fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <ImageIcon size={14} /> Add from Media Library
                                                </button>
                                            </div>
                                            {(editingSection.settings?.images || []).map((imgUrl, i) => (
                                                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                    <img src={imgUrl} style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px' }} alt="" />
                                                    <input
                                                        type="text"
                                                        value={imgUrl}
                                                        onChange={(e) => {
                                                            const newImgs = [...(editingSection.settings?.images || [])];
                                                            newImgs[i] = e.target.value;
                                                            updateEditingSetting('images', newImgs);
                                                        }}
                                                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newImgs = (editingSection.settings?.images || []).filter((_, idx) => idx !== i);
                                                            updateEditingSetting('images', newImgs);
                                                        }}
                                                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = editingSection.settings?.images || [];
                                                    updateEditingSetting('images', [...current, '']);
                                                }}
                                                style={{ marginTop: '0.4rem', background: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                + Add Image Link Manually
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Image & Text / Split Banner Settings */}
                                {(editingSection.section_type === 'image_and_text' || editingSection.section_type === 'text_and_image' || editingSection.section_type === 'craftsmanship_story') && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                                    Banner Image URL
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMediaPickerConfig({
                                                            multiple: false,
                                                            onSelect: (selectedUrl) => {
                                                                updateEditingSetting('image_url', selectedUrl);
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        background: '#5d0821', color: '#ffffff', border: 'none',
                                                        padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem',
                                                        fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <ImageIcon size={14} /> Choose from Media
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                {editingSection.settings?.image_url && (
                                                    <img src={editingSection.settings?.image_url} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} alt="" />
                                                )}
                                                <input
                                                    type="text"
                                                    value={editingSection.settings?.image_url || ''}
                                                    onChange={(e) => updateEditingSetting('image_url', e.target.value)}
                                                    placeholder="e.g. /uploads/media/banner.jpg or https://..."
                                                    style={{ flex: 1, padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                                    Action Button Label
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingSection.settings?.button_text || ''}
                                                    onChange={(e) => updateEditingSetting('button_text', e.target.value)}
                                                    placeholder="e.g. EXPLORE CATALOG"
                                                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                                    Action Button Link URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingSection.settings?.button_link || ''}
                                                    onChange={(e) => updateEditingSetting('button_link', e.target.value)}
                                                    placeholder="e.g. /shop or /shop?category=Silk"
                                                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Product Carousel Limits / Delay */}
                                {(editingSection.section_type === 'best_sellers' || editingSection.section_type === 'explore_collection' || editingSection.section_type === 'featured_product_slider' || editingSection.section_type === 'all_product_slider') && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                                Maximum Products to Display
                                            </label>
                                            <input
                                                type="number"
                                                value={editingSection.settings?.limit || 8}
                                                onChange={(e) => updateEditingSetting('limit', parseInt(e.target.value) || 8)}
                                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                                Auto Scroll Delay (ms)
                                            </label>
                                            <input
                                                type="number"
                                                step={500}
                                                value={editingSection.settings?.auto_play_delay || editingSection.settings?.scroll_interval || 4000}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 4000;
                                                    updateEditingSetting('auto_play_delay', val);
                                                    updateEditingSetting('scroll_interval', val);
                                                }}
                                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Hero Banner Slides Configuration */}
                                {editingSection.section_type === 'hero_banner' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                            Hero Carousel Slides
                                        </label>
                                        {(editingSection.settings?.slides || []).map((slide, sIdx) => (
                                            <div key={sIdx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5d0821' }}>Slide #{sIdx + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSlides = (editingSection.settings?.slides || []).filter((_, idx) => idx !== sIdx);
                                                            updateEditingSetting('slides', newSlides);
                                                        }}
                                                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                                    >
                                                        Delete Slide
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Slide Title"
                                                    value={slide.title || ''}
                                                    onChange={(e) => {
                                                        const newSlides = [...(editingSection.settings?.slides || [])];
                                                        newSlides[sIdx].title = e.target.value;
                                                        updateEditingSetting('slides', newSlides);
                                                    }}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Slide Subtitle"
                                                    value={slide.subtitle || ''}
                                                    onChange={(e) => {
                                                        const newSlides = [...(editingSection.settings?.slides || [])];
                                                        newSlides[sIdx].subtitle = e.target.value;
                                                        updateEditingSetting('slides', newSlides);
                                                    }}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {slide.image && (
                                                        <img src={slide.image} style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px' }} alt="" />
                                                    )}
                                                    <input
                                                        type="text"
                                                        placeholder="Image URL"
                                                        value={slide.image || ''}
                                                        onChange={(e) => {
                                                            const newSlides = [...(editingSection.settings?.slides || [])];
                                                            newSlides[sIdx].image = e.target.value;
                                                            updateEditingSetting('slides', newSlides);
                                                        }}
                                                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMediaPickerConfig({
                                                                multiple: false,
                                                                onSelect: (selectedUrl) => {
                                                                    const newSlides = [...(editingSection.settings?.slides || [])];
                                                                    newSlides[sIdx].image = selectedUrl;
                                                                    updateEditingSetting('slides', newSlides);
                                                                }
                                                            });
                                                        }}
                                                        style={{
                                                            background: '#5d0821', color: '#ffffff', border: 'none',
                                                            padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem',
                                                            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        Media
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Button Text (e.g. SHOP NOW)"
                                                        value={slide.button_text || ''}
                                                        onChange={(e) => {
                                                            const newSlides = [...(editingSection.settings?.slides || [])];
                                                            newSlides[sIdx].button_text = e.target.value;
                                                            updateEditingSetting('slides', newSlides);
                                                        }}
                                                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Button Link (e.g. /shop)"
                                                        value={slide.button_link || slide.link || ''}
                                                        onChange={(e) => {
                                                            const newSlides = [...(editingSection.settings?.slides || [])];
                                                            newSlides[sIdx].button_link = e.target.value;
                                                            updateEditingSetting('slides', newSlides);
                                                        }}
                                                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = editingSection.settings?.slides || [];
                                                updateEditingSetting('slides', [
                                                    ...current,
                                                    { title: 'New Slide Title', subtitle: 'Slide subtitle description', image: '', button_text: 'SHOP NOW', button_link: '/shop' }
                                                ]);
                                            }}
                                            style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            + Add Slide
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                            <button
                                type="button"
                                onClick={() => setEditingSection(null)}
                                style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveEditingSectionModal}
                                style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: 'none', background: '#5d0821', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTEGRATED MEDIA PICKER MODAL */}
            {mediaPickerConfig && (
                <MediaPicker
                    isOpen={true}
                    multiple={Boolean(mediaPickerConfig.multiple)}
                    onClose={() => setMediaPickerConfig(null)}
                    onSelect={(result) => {
                        if (mediaPickerConfig.multiple) {
                            const urls = Array.isArray(result) ? result.map(m => m.url || m) : [result.url || result];
                            mediaPickerConfig.onSelect(urls);
                        } else {
                            const url = Array.isArray(result) ? (result[0]?.url || result[0]) : (result?.url || result);
                            mediaPickerConfig.onSelect(url);
                        }
                        setMediaPickerConfig(null);
                    }}
                />
            )}
        </div>
    );
}
