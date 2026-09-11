'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Layout,
    Save,
    RotateCcw,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Image as ImageIcon,
    Mail,
    Phone,
    MapPin,
    Instagram,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Upload,
    ExternalLink,
    Layers,
    ChevronUp,
    Globe,
    Compass
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';
import { DEFAULT_FOOTER_SETTINGS } from '@/app/api/footer-settings/route';

const WhatsAppIcon = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const QUICK_PAGE_PRESETS = [
    { label: 'Our Heritage & Story', href: '/about-us' },
    { label: 'Explore Collections', href: '/shop' },
    { label: 'Contact Our Stylists', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Return & Exchange Policy', href: '/return-policy' },
    { label: 'Shipping & Delivery Policy', href: '/shipping-policy' },
    { label: 'Terms & Conditions', href: '/terms-and-conditions' },
    { label: 'Refund Policy', href: '/refund-cancellation-policy' }
];

export default function AdminFooterSettingsPage() {
    const [settings, setSettings] = useState(DEFAULT_FOOTER_SETTINGS);
    const [navLinks, setNavLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeTab, setActiveTab] = useState('brand'); // 'brand' | 'contact' | 'links' | 'social' | 'styling'

    useEffect(() => {
        fetchFooterSettings();
    }, []);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchFooterSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/footer-settings');
            const data = await res.json();
            if (data.success && data.settings) {
                const combined = { ...DEFAULT_FOOTER_SETTINGS, ...data.settings };
                setSettings(combined);
                try {
                    const parsedLinks = typeof combined.footer_nav_links === 'string'
                        ? JSON.parse(combined.footer_nav_links)
                        : (combined.footer_nav_links || []);
                    setNavLinks(Array.isArray(parsedLinks) ? parsedLinks : []);
                } catch (e) {
                    setNavLinks(JSON.parse(DEFAULT_FOOTER_SETTINGS.footer_nav_links));
                }
            } else {
                showToast('Failed to load footer settings.', 'error');
            }
        } catch (err) {
            console.error('Footer settings fetch error:', err);
            showToast('Error connecting to settings database.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Nav Links Handlers
    const handleAddLink = (preset = null) => {
        const newLink = preset || { label: 'New Page Link', href: '/shop' };
        setNavLinks(prev => [...prev, newLink]);
    };

    const handleUpdateLink = (index, field, value) => {
        setNavLinks(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleDeleteLink = (index) => {
        setNavLinks(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleMoveLink = (index, direction) => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= navLinks.length) return;
        setNavLinks(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[target];
            next[target] = temp;
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...settings,
                footer_nav_links: JSON.stringify(navLinks)
            };

            const res = await fetch('/api/admin/footer-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: payload })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Storefront footer settings saved successfully!');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('vaiyaaree_settings_updated'));
                    window.dispatchEvent(new Event('storage'));
                }
            } else {
                showToast(data.error || 'Failed to save footer settings.', 'error');
            }
        } catch (err) {
            console.error('Save footer error:', err);
            showToast('Error saving footer settings: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = () => {
        if (!confirm('Are you sure you want to reset all footer content and links to factory defaults?')) return;
        setSettings(DEFAULT_FOOTER_SETTINGS);
        setNavLinks(JSON.parse(DEFAULT_FOOTER_SETTINGS.footer_nav_links));
        showToast('Reset to factory defaults. Click "Save Changes" to apply.');
    };

    const currentYear = new Date().getFullYear();
    const renderedCopyright = (settings.footer_copyright_text || '© {year} Vaiyaaree. Handcrafted with devotion in South India.')
        .replace('{year}', currentYear);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" color="hsl(var(--primary))" />
                <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading Storefront Footer Settings...</p>
            </div>
        );
    }

    return (
        <div className="animate-enter" style={{ padding: '0.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ background: '#5d0821', color: '#ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layout size={20} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                            Storefront Footer Settings
                        </h1>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        Customize your boutique footer branding, contact details, quick navigation links, social channels, and artisan seals.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={15} /> Reset Defaults
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#5d0821',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.65rem 1.5rem',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            cursor: saving ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(93, 8, 33, 0.3)'
                        }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Footer Changes'}
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 99999,
                    background: notification.type === 'success' ? '#16a34a' : '#dc2626',
                    color: '#ffffff',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {notification.message}
                </div>
            )}

            {/* Main Content Grid: Left 55% Form Controls, Right 45% Live Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* Left Column: Form Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Navigation Tabs */}
                    <div style={{
                        display: 'flex',
                        background: '#ffffff',
                        padding: '0.4rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        gap: '0.4rem',
                        overflowX: 'auto'
                    }}>
                        {[
                            { id: 'brand', label: '1. Brand & Logo', icon: Sparkles },
                            { id: 'contact', label: '2. Contact Info', icon: MapPin },
                            { id: 'links', label: '3. Quick Links', icon: Compass },
                            { id: 'social', label: '4. Social & Seal', icon: Instagram },
                            { id: 'styling', label: '5. Display & Copyright', icon: Layers }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '0.6rem 0.8rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: isActive ? 800 : 600,
                                        background: isActive ? '#5d0821' : 'transparent',
                                        color: isActive ? '#ffffff' : '#64748b',
                                        transition: 'all 0.18s ease',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Icon size={14} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab 1: Brand & Logo */}
                    {activeTab === 'brand' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Column 1: Brand & Logo Configuration</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Customize the logo image, title, and brand introduction shown on the left side of the footer.</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Footer Brand Logo Image
                                </label>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={settings.footer_logo_image || ''}
                                        onChange={(e) => handleUpdateField('footer_logo_image', e.target.value)}
                                        placeholder="/images/vaiyaaree-logo.png"
                                        style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowMediaPicker(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                                            background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#334155'
                                        }}
                                    >
                                        <ImageIcon size={15} /> Pick Media
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Brand Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_brand_name || ''}
                                        onChange={(e) => handleUpdateField('footer_brand_name', e.target.value)}
                                        placeholder="VAIYAAREE"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Subtitle / Badge Text
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_brand_sub || ''}
                                        onChange={(e) => handleUpdateField('footer_brand_sub', e.target.value)}
                                        placeholder="AUTHENTIC HANDLOOM SILKS"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Brand Tagline / Story Narrative
                                </label>
                                <textarea
                                    rows={3}
                                    value={settings.footer_tagline || ''}
                                    onChange={(e) => handleUpdateField('footer_tagline', e.target.value)}
                                    placeholder="Celebrating the timeless elegance of Indian handloom weaves..."
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Contact Information */}
                    {activeTab === 'contact' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Contact & Location Information</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Displayed directly underneath the brand tagline in the footer.</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Shop Address / Location
                                </label>
                                <input
                                    type="text"
                                    value={settings.footer_address || ''}
                                    onChange={(e) => handleUpdateField('footer_address', e.target.value)}
                                    placeholder="Coimbatore, Tamil Nadu - 641015."
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Support Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={settings.footer_email || ''}
                                        onChange={(e) => handleUpdateField('footer_email', e.target.value)}
                                        placeholder="vaiyaaree@gmail.com"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Support Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_phone || ''}
                                        onChange={(e) => handleUpdateField('footer_phone', e.target.value)}
                                        placeholder="+91 86677 93292"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Quick Links Manager */}
                    {activeTab === 'links' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Column 2: Quick Links & Policy Menu</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Manage links displayed in the center column.</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleAddLink()}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        background: '#5d0821', color: '#ffffff', border: 'none',
                                        padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={14} /> Add Link
                                </button>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Column Header Title
                                </label>
                                <input
                                    type="text"
                                    value={settings.footer_col2_title || ''}
                                    onChange={(e) => handleUpdateField('footer_col2_title', e.target.value)}
                                    placeholder="OUR BOUTIQUE"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                            </div>

                            {/* Quick Preset Buttons */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                                    + Add Standard Preset Pages:
                                </label>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {QUICK_PAGE_PRESETS.map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleAddLink(p)}
                                            style={{
                                                fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.6rem',
                                                borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc',
                                                color: '#334155', cursor: 'pointer'
                                            }}
                                        >
                                            + {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Links List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                                {navLinks.map((item, idx) => (
                                    <div
                                        key={`nav-link-${idx}`}
                                        style={{
                                            background: '#f8fafc',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            padding: '0.75rem 1rem',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', minWidth: '20px' }}>
                                            #{idx + 1}
                                        </span>

                                        <input
                                            type="text"
                                            value={item.label || ''}
                                            onChange={(e) => handleUpdateLink(idx, 'label', e.target.value)}
                                            placeholder="Link Title (e.g. Return Policy)"
                                            style={{ flex: 1.2, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                        />

                                        <input
                                            type="text"
                                            value={item.href || ''}
                                            onChange={(e) => handleUpdateLink(idx, 'href', e.target.value)}
                                            placeholder="URL / Path (e.g. /return-policy)"
                                            style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                        />

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveLink(idx, 'up')}
                                                disabled={idx === 0}
                                                style={{ background: 'none', border: 'none', color: idx === 0 ? '#cbd5e1' : '#64748b', cursor: idx === 0 ? 'default' : 'pointer', padding: '3px' }}
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveLink(idx, 'down')}
                                                disabled={idx === navLinks.length - 1}
                                                style={{ background: 'none', border: 'none', color: idx === navLinks.length - 1 ? '#cbd5e1' : '#64748b', cursor: idx === navLinks.length - 1 ? 'default' : 'pointer', padding: '3px' }}
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteLink(idx)}
                                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '3px' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Social Media & Artisan Seal */}
                    {activeTab === 'social' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Column 3: Social Channels & Silk Mark Seal</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Configure social channels and the golden artisan trust badge.</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Column Header Title
                                </label>
                                <input
                                    type="text"
                                    value={settings.footer_col3_title || ''}
                                    onChange={(e) => handleUpdateField('footer_col3_title', e.target.value)}
                                    placeholder="CONNECT WITH US"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Instagram Handle
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_instagram_handle || ''}
                                        onChange={(e) => handleUpdateField('footer_instagram_handle', e.target.value)}
                                        placeholder="@vaiyaaree"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Instagram Profile URL
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_instagram_url || ''}
                                        onChange={(e) => handleUpdateField('footer_instagram_url', e.target.value)}
                                        placeholder="https://www.instagram.com/vaiyaaree"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        WhatsApp Display Text
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_whatsapp_number || ''}
                                        onChange={(e) => handleUpdateField('footer_whatsapp_number', e.target.value)}
                                        placeholder="+91 86677 93292"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        WhatsApp Chat Link (wa.me)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_whatsapp_link || ''}
                                        onChange={(e) => handleUpdateField('footer_whatsapp_link', e.target.value)}
                                        placeholder="https://wa.me/918667793292"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        Facebook Page URL (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_facebook_url || ''}
                                        onChange={(e) => handleUpdateField('footer_facebook_url', e.target.value)}
                                        placeholder="https://facebook.com/vaiyaaree"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                        YouTube Channel URL (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.footer_youtube_url || ''}
                                        onChange={(e) => handleUpdateField('footer_youtube_url', e.target.value)}
                                        placeholder="https://youtube.com/@vaiyaaree"
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            {/* Artisan Seal Badge Configuration */}
                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>100% Pure Silk Mark Seal Badge</h4>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Gold bordered artisan emblem shown in column 3.</p>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.footer_show_seal !== 'false'}
                                            onChange={(e) => handleUpdateField('footer_show_seal', e.target.checked ? 'true' : 'false')}
                                            style={{ accentColor: '#5d0821' }}
                                        />
                                        Show Seal
                                    </label>
                                </div>

                                {settings.footer_show_seal !== 'false' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                                                Seal Title
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.footer_seal_title || ''}
                                                onChange={(e) => handleUpdateField('footer_seal_title', e.target.value)}
                                                placeholder="100% PURE SILK MARK"
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                                                Seal Subtitle
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.footer_seal_sub || ''}
                                                onChange={(e) => handleUpdateField('footer_seal_sub', e.target.value)}
                                                placeholder="Handloom Certified Drapes"
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Display Toggles & Copyright */}
                    {activeTab === 'styling' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Bottom Bar & Visual Ornaments</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Configure the bottom copyright line and floating utility buttons.</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Copyright Text Notice
                                </label>
                                <input
                                    type="text"
                                    value={settings.footer_copyright_text || ''}
                                    onChange={(e) => handleUpdateField('footer_copyright_text', e.target.value)}
                                    placeholder="© {year} Vaiyaaree. Handcrafted with devotion in South India."
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Tip: <code>{'{year}'}</code> will be dynamically replaced with the current year ({currentYear}).
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.footer_show_rangoli !== 'false'}
                                        onChange={(e) => handleUpdateField('footer_show_rangoli', e.target.checked ? 'true' : 'false')}
                                        style={{ width: '18px', height: '18px', accentColor: '#5d0821' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Rangoli Top Divider</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Show decorative golden Rangoli motif at footer top</div>
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.footer_show_scroll_top !== 'false'}
                                        onChange={(e) => handleUpdateField('footer_show_scroll_top', e.target.checked ? 'true' : 'false')}
                                        style={{ width: '18px', height: '18px', accentColor: '#5d0821' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Scroll to Top Button</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Floating chevron button to return to page top</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Live Storefront Footer Preview */}
                <div style={{ position: 'sticky', top: '1rem' }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        overflow: 'hidden'
                    }}>
                        {/* Preview Top Bar */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }}></span>
                                <strong style={{ fontSize: '0.82rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Live Storefront Footer Preview
                                </strong>
                            </div>
                            <Link
                                href="/"
                                target="_blank"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '0.78rem', color: '#5d0821', fontWeight: 700, textDecoration: 'none'
                                }}
                            >
                                View Live Storefront <ExternalLink size={12} />
                            </Link>
                        </div>

                        {/* Actual Rendered Footer Preview */}
                        <div style={{
                            background: '#27302b',
                            color: '#fdfbf7',
                            padding: '1.5rem 1.25rem 1rem',
                            fontSize: '0.85rem',
                            maxHeight: '75vh',
                            overflowY: 'auto'
                        }}>
                            {/* Rangoli Divider Preview */}
                            {settings.footer_show_rangoli !== 'false' && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                                    <span style={{ height: '1px', width: '60px', background: 'linear-gradient(90deg, transparent, #d47a06, transparent)' }} />
                                    <RangoliOrnament size={18} color="#d47a06" />
                                    <span style={{ height: '1px', width: '60px', background: 'linear-gradient(90deg, transparent, #d47a06, transparent)' }} />
                                </div>
                            )}

                            {/* 3 Columns Preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Column 1 Preview */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
                                        {settings.footer_logo_image && (
                                            <img
                                                src={settings.footer_logo_image}
                                                alt="Logo"
                                                style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.12em', color: '#fdfbf7', lineHeight: 1 }}>
                                                {settings.footer_brand_name || 'VAIYAAREE'}
                                            </div>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#d47a06', letterSpacing: '0.15em', marginTop: '2px' }}>
                                                {settings.footer_brand_sub || 'AUTHENTIC HANDLOOM SILKS'}
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.78rem', color: 'rgba(253, 251, 247, 0.75)', lineHeight: 1.45 }}>
                                        {settings.footer_tagline || 'Celebrating the timeless elegance of Indian handloom weaves...'}
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(253, 251, 247, 0.75)' }}>
                                        {settings.footer_address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={13} style={{ color: '#d47a06', flexShrink: 0 }} />
                                                <span>{settings.footer_address}</span>
                                            </div>
                                        )}
                                        {settings.footer_email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={13} style={{ color: '#d47a06', flexShrink: 0 }} />
                                                <span>{settings.footer_email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Column 2 Preview */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', color: '#fdfbf7', marginBottom: '0.5rem' }}>
                                        {settings.footer_col2_title || 'OUR BOUTIQUE'}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.74rem' }}>
                                        {navLinks.map((l, i) => (
                                            <span key={i} style={{ color: 'rgba(253, 251, 247, 0.75)' }}>
                                                &bull; {l.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Column 3 Preview */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', color: '#fdfbf7', marginBottom: '0.5rem' }}>
                                        {settings.footer_col3_title || 'CONNECT WITH US'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                                        {settings.footer_instagram_handle && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d47a06' }}>
                                                <Instagram size={14} /> {settings.footer_instagram_handle}
                                            </div>
                                        )}
                                        {settings.footer_whatsapp_number && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d47a06' }}>
                                                <WhatsAppIcon size={14} /> {settings.footer_whatsapp_number}
                                            </div>
                                        )}
                                    </div>

                                    {/* Silk Mark Seal Preview */}
                                    {settings.footer_show_seal !== 'false' && (
                                        <div style={{
                                            marginTop: '0.85rem',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px',
                                            background: 'rgba(253, 251, 247, 0.05)',
                                            border: '1px solid rgba(212, 122, 6, 0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: 'fit-content'
                                        }}>
                                            <LotusMotif size={18} color="#d47a06" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d47a06', letterSpacing: '0.1em' }}>
                                                    {settings.footer_seal_title || '100% PURE SILK MARK'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#fdfbf7', fontWeight: 500 }}>
                                                    {settings.footer_seal_sub || 'Handloom Certified Drapes'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Copyright Bar Preview */}
                                <div style={{
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    paddingTop: '0.85rem',
                                    textAlign: 'center',
                                    fontSize: '0.72rem',
                                    color: 'rgba(253, 251, 247, 0.55)'
                                }}>
                                    {renderedCopyright}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Picker Modal */}
            {showMediaPicker && (
                <MediaPicker
                    onSelect={(url) => {
                        handleUpdateField('footer_logo_image', url);
                        setShowMediaPicker(false);
                    }}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}
        </div>
    );
}
