'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    Store, Save, Image, FileText, MapPin,
    Hash, Info, CheckCircle2, AlertCircle, Loader2,
    Upload, Globe, Phone, Mail, Clock, ArrowRight, CreditCard, ShieldCheck, Lock,
    MessageCircle, Bot, Sparkles, Radio, ShieldAlert, Truck, Sliders, Type, Palette,
    Layout, Layers, Send, HelpCircle, Key, Server
} from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import MediaPicker from '@/components/MediaPicker';
import { GOOGLE_FONTS_LIST, FONT_PAIRING_PRESETS, getGoogleFontsStylesheetUrl } from '@/lib/googleFontsList';

// Settings Groups and Vertical Tabs
const SETTINGS_GROUPS = [
    {
        groupTitle: 'STORE & BRANDING',
        tabs: [
            { id: 'general', label: 'General Identity & Info', icon: Store, desc: 'Logo, shop name & tax info' },
            { id: 'typography', label: 'Typography & Fonts', icon: Type, desc: 'Google Fonts & pairings' },
            { id: 'coming_soon', label: 'Coming Soon Mode', icon: Clock, desc: 'Launch page toggle' }
        ]
    },
    {
        groupTitle: 'CHANNELS & COMMUNICATION',
        tabs: [
            { id: 'channels', label: 'Auth & Channel Gateway', icon: Sparkles, desc: 'WhatsApp vs Email login' },
            { id: 'whatsapp', label: 'WhatsApp Funnel & Bot', icon: MessageCircle, desc: 'Welcome & automated greetings' }
        ]
    },
    {
        groupTitle: 'EMAIL & NOTIFICATIONS',
        tabs: [
            { id: 'smtp', label: 'SMTP Server & Email', icon: Mail, desc: 'Mail server & test delivery' }
        ]
    },
    {
        groupTitle: 'CHECKOUT & PAYMENTS',
        tabs: [
            { id: 'checkout', label: 'Checkout & COD Rules', icon: Truck, desc: 'Cash on delivery & advance' }
        ]
    }
];

export default function ShopSettingsPage() {
    const { fetchComingSoon } = useShop();
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [testEmailRecipient, setTestEmailRecipient] = useState('vaiyaaree@gmail.com');
    const [testingEmail, setTestingEmail] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const activeBodyFont = settings.theme_font_body || 'Plus Jakarta Sans';
    const activeHeadingFont = settings.theme_font_heading || 'Cinzel';

    // Live preview: Dynamically load Google Fonts into Admin for immediate rendering
    useEffect(() => {
        if (!hasMounted) return;
        const linkId = 'admin-preview-google-fonts';
        let link = document.getElementById(linkId);
        const url = getGoogleFontsStylesheetUrl(activeBodyFont, activeHeadingFont);
        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
        } else if (link.href !== url) {
            link.href = url;
        }
    }, [activeBodyFont, activeHeadingFont, hasMounted]);

    const handleSendTestEmail = async () => {
        if (!testEmailRecipient || !testEmailRecipient.trim()) {
            setNotification({ message: 'Please enter a valid recipient email address', type: 'error' });
            return;
        }
        setTestingEmail(true);
        setNotification(null);
        try {
            const res = await fetch('/api/admin/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipient: testEmailRecipient.trim(),
                    smtpConfig: {
                        host: settings.smtp_host,
                        port: settings.smtp_port,
                        user: settings.smtp_user,
                        pass: settings.smtp_pass,
                        from: settings.smtp_from
                    }
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNotification({ message: data.message || 'Test email sent successfully!', type: 'success' });
            } else {
                setNotification({ message: data.message || data.error || 'Failed to send test email', type: 'error' });
            }
        } catch (err) {
            setNotification({ message: 'Test email error: ' + err.message, type: 'error' });
        } finally {
            setTestingEmail(false);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('app_settings')
                .select('*');

            if (error) throw error;

            const defaultSettings = {
                smtp_host: 'smtp.gmail.com',
                smtp_port: '587',
                smtp_user: '',
                smtp_pass: '',
                smtp_from: '"Vaiyaaree Sarees" <vaiyaaree@gmail.com>',
                support_email: 'vaiyaaree@gmail.com',
                support_phone: '918667793292',
                theme_font_body: 'Plus Jakarta Sans',
                theme_font_heading: 'Cinzel',
                shop_name: 'Vaiyaaree Sarees',
                shop_logo: '/images/vaiyaaree-logo.png',
                shop_address: 'Coimbatore, Tamil Nadu - 641015.',
                shop_gstin: '',
                communication_channel: 'whatsapp',
                wa_chatbot_enabled: 'true',
                coming_soon_enabled: 'false',
                cod_enabled: 'true',
                cod_title: 'Cash on Delivery (COD)',
                cod_fee: '0',
                cod_min_order: '0',
                cod_max_order: '0',
                cod_advance_enabled: 'false',
                cod_advance_amount: '200',
                cod_advance_note: 'A partial advance of ₹{amount} is required online via UPI/Card to confirm your COD order. The remaining balance of ₹{balance} will be collected in cash upon delivery.',
                guest_checkout_enabled: 'true',
                checkout_order_notes_enabled: 'true',
                checkout_create_account_enabled: 'true',
                wa_catalog_header: 'Welcome to Vaiyaaree Sarees',
                wa_welcome_message: 'Namaste! Welcome to Vaiyaaree Sarees. Explore our handcrafted bridal and festive drapes.',
                wa_contact_message: 'Our customer stylists are available Mon-Sat (10 AM - 8 PM). Call or WhatsApp us at +91 86677 93292.'
            };

            const settingsMap = { ...defaultSettings };
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item && item.key) {
                        settingsMap[item.key] = item.value !== null && item.value !== undefined ? String(item.value) : '';
                    }
                });
            }
            setSettings(settingsMap);
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to load settings', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value: value?.toString() || '',
                updated_at: new Date().toISOString()
            }));

            const { error } = await mysqlClient
                .from('app_settings')
                .upsert(updates);

            if (error) throw error;

            if (fetchComingSoon) await fetchComingSoon();

            if (typeof window !== 'undefined') {
                localStorage.setItem('vaiyaaree_communication_channel', settings.communication_channel || 'whatsapp');
                localStorage.setItem('vaiyaaree_wa_chatbot_enabled', settings.wa_chatbot_enabled || 'true');
                localStorage.setItem('vaiyaaree_theme_font_body', settings.theme_font_body || 'Plus Jakarta Sans');
                localStorage.setItem('vaiyaaree_theme_font_heading', settings.theme_font_heading || 'Cinzel');
                window.dispatchEvent(new Event('vaiyaaree_settings_updated'));
                window.dispatchEvent(new Event('storage'));
            }

            setNotification({ message: 'All shop settings saved successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3500);
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Error saving settings: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!hasMounted) return null;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" color="hsl(var(--primary))" />
            <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading shop configurations...</p>
        </div>
    );

    return (
        <div className="shop-settings-page animate-enter">
            {/* Header Toolbar */}
            <div className="page-header">
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#5d0821', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Store size={22} />
                        </div>
                        Shop Settings
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                        Configure your store identity, typography, communication gateways, and checkout policies.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                        href="/admin/settings/footer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            color: '#5d0821',
                            border: '1.5px solid #5d0821',
                            padding: '0.65rem 1.15rem',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Layout size={15} /> Footer Customizer
                    </Link>

                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="btn-primary-glow"
                        style={{
                            background: '#5d0821',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.7rem 1.6rem',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: saving ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(93, 8, 33, 0.25)'
                        }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save All Changes'}
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

            {/* Main Layout: Left Vertical Tab Groups (280px), Right Tab Content */}
            <div className="settings-layout-wrapper">
                
                {/* Left Column: Grouped Vertical Navigation Tabs */}
                <div className="vertical-nav-sidebar">
                    {SETTINGS_GROUPS.map((group, gIdx) => (
                        <div key={gIdx} className="nav-group-section">
                            <div className="nav-group-title">
                                {group.groupTitle}
                            </div>
                            <div className="nav-group-items">
                                {group.tabs.map(tab => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`vertical-tab-btn ${isActive ? 'active' : ''}`}
                                        >
                                            <div className="tab-icon-box">
                                                <Icon size={17} />
                                            </div>
                                            <div className="tab-text-box">
                                                <span className="tab-label">{tab.label}</span>
                                                <span className="tab-desc">{tab.desc}</span>
                                            </div>
                                            {isActive && <div className="active-pill-bar" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Tab Content Pane */}
                <div className="tab-content-pane">
                    
                    {/* 1. GENERAL IDENTITY & INFO */}
                    {activeTab === 'general' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#fdf2f4', color: '#5d0821' }}>
                                    <Store size={22} />
                                </div>
                                <div>
                                    <h2 className="pane-title">General Shop Identity & Information</h2>
                                    <p className="pane-subtitle">Configure your store name, official logo, GSTIN, and physical boutique address.</p>
                                </div>
                            </div>

                            <div className="fields-stack" style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                    <div className="field-group">
                                        <label><Info size={14} color="#5d0821" /> Shop Display Name</label>
                                        <input
                                            type="text"
                                            value={settings.shop_name || ''}
                                            onChange={(e) => handleUpdate('shop_name', e.target.value)}
                                            placeholder="Vaiyaaree Sarees"
                                        />
                                        <p className="hint">Used across customer emails, SMS, invoices, and browser tabs.</p>
                                    </div>

                                    <div className="field-group">
                                        <label><Hash size={14} color="#5d0821" /> Business GSTIN Number</label>
                                        <input
                                            type="text"
                                            value={settings.shop_gstin || ''}
                                            onChange={(e) => handleUpdate('shop_gstin', e.target.value)}
                                            placeholder="e.g. 33AAAAA0000A1Z5"
                                        />
                                        <p className="hint">Printed on customer GST invoices and tax audit reports.</p>
                                    </div>
                                </div>

                                <div className="field-group">
                                    <label><Image size={14} color="#5d0821" /> Official Shop Logo</label>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={settings.shop_logo || ''}
                                            onChange={(e) => handleUpdate('shop_logo', e.target.value)}
                                            placeholder="/images/vaiyaaree-logo.png"
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowMediaPicker(true)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '0.75rem 1.25rem', borderRadius: '10px',
                                                border: '1px solid #cbd5e1', background: '#f8fafc',
                                                color: '#334155', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                            }}
                                        >
                                            <Upload size={16} /> Choose Media
                                        </button>
                                    </div>

                                    {settings.shop_logo && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
                                            <img
                                                src={settings.shop_logo.startsWith('http') || settings.shop_logo.startsWith('/') ? settings.shop_logo : `/images/${settings.shop_logo}`}
                                                alt="Shop Logo"
                                                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                                            />
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Active Logo Preview</span>
                                        </div>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label><MapPin size={14} color="#5d0821" /> Shop Registered Boutique Address</label>
                                    <textarea
                                        rows={3}
                                        value={settings.shop_address || ''}
                                        onChange={(e) => handleUpdate('shop_address', e.target.value)}
                                        placeholder="Full boutique address, street, city, pin code..."
                                    />
                                    <p className="hint">Printed on shipping labels, invoices, and the customer contact page.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. TYPOGRAPHY & GOOGLE FONTS */}
                    {activeTab === 'typography' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                                    <Type size={22} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h2 className="pane-title">Storefront Typography & Google Fonts</h2>
                                        <p className="pane-subtitle">Dynamically customize fonts across all titles, banners, product cards, and descriptions.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <span className="badge-pill" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                                            HEADINGS: {activeHeadingFont.toUpperCase()}
                                        </span>
                                        <span className="badge-pill" style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
                                            BODY: {activeBodyFont.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 1-Click Designer Presets */}
                            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Sparkles size={14} color="#f59e0b" />
                                    <span>1-Click Designer Font Pairings (Recommended for Saree Store)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                    {FONT_PAIRING_PRESETS.map((preset) => {
                                        const isSelected = activeHeadingFont === preset.heading && activeBodyFont === preset.body;
                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => {
                                                    handleUpdate('theme_font_heading', preset.heading);
                                                    handleUpdate('theme_font_body', preset.body);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '1rem 1.15rem',
                                                    borderRadius: '14px',
                                                    border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                                                    background: isSelected ? '#f5f3ff' : '#ffffff',
                                                    boxShadow: isSelected ? '0 4px 14px rgba(79, 70, 229, 0.15)' : 'none',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                    <strong style={{ fontSize: '0.92rem', color: isSelected ? '#4338ca' : '#0f172a' }}>{preset.name}</strong>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isSelected ? '#e0e7ff' : '#f1f5f9', color: isSelected ? '#4338ca' : '#64748b', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {preset.badge}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 700 }}>Title:</span> {preset.heading} + <span style={{ fontWeight: 700 }}>Body:</span> {preset.body}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                                                    {preset.tagline}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dropdown Selectors */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                <div className="field-group">
                                    <label><Type size={14} color="#4f46e5" /> Storefront Body & UI Font</label>
                                    <select
                                        value={GOOGLE_FONTS_LIST.some(f => f.name.toLowerCase() === activeBodyFont.toLowerCase()) ? activeBodyFont : 'custom'}
                                        onChange={(e) => {
                                            if (e.target.value !== 'custom') handleUpdate('theme_font_body', e.target.value);
                                        }}
                                        style={{ width: '100%', padding: '0.85rem 1rem', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}
                                    >
                                        <optgroup label="Modern Sans-Serif (Recommended for Body)">
                                            {GOOGLE_FONTS_LIST.filter(f => f.category === 'Sans-Serif').map(f => (
                                                <option key={f.name} value={f.name}>{f.name} — {f.description}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Royal & Classic Serif">
                                            {GOOGLE_FONTS_LIST.filter(f => f.category === 'Serif').map(f => (
                                                <option key={f.name} value={f.name}>{f.name} — {f.description}</option>
                                            ))}
                                        </optgroup>
                                        <option value="custom">✏️ Custom Google Font Name...</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Or type custom Google font..."
                                        value={settings.theme_font_body || ''}
                                        onChange={(e) => handleUpdate('theme_font_body', e.target.value)}
                                        style={{ marginTop: '0.4rem', fontSize: '0.82rem', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>

                                <div className="field-group">
                                    <label><Palette size={14} color="#4f46e5" /> Headings & Titles Font</label>
                                    <select
                                        value={GOOGLE_FONTS_LIST.some(f => f.name.toLowerCase() === activeHeadingFont.toLowerCase()) ? activeHeadingFont : 'custom'}
                                        onChange={(e) => {
                                            if (e.target.value !== 'custom') handleUpdate('theme_font_heading', e.target.value);
                                        }}
                                        style={{ width: '100%', padding: '0.85rem 1rem', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}
                                    >
                                        <optgroup label="Royal & Editorial Serif (Recommended for Saree Titles)">
                                            {GOOGLE_FONTS_LIST.filter(f => f.category === 'Serif').map(f => (
                                                <option key={f.name} value={f.name}>{f.name} — {f.description}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Modern Sans-Serif">
                                            {GOOGLE_FONTS_LIST.filter(f => f.category === 'Sans-Serif').map(f => (
                                                <option key={f.name} value={f.name}>{f.name} — {f.description}</option>
                                            ))}
                                        </optgroup>
                                        <option value="custom">✏️ Custom Google Font Name...</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Or type custom Google font..."
                                        value={settings.theme_font_heading || ''}
                                        onChange={(e) => handleUpdate('theme_font_heading', e.target.value)}
                                        style={{ marginTop: '0.4rem', fontSize: '0.82rem', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                            </div>

                            {/* Live Typography Preview Box */}
                            <div style={{ padding: '1.5rem', borderRadius: '16px', background: '#fdfbf7', border: '1.5px dashed #cbd5e1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #ebdcd0', paddingBottom: '0.65rem' }}>
                                    <strong style={{ fontSize: '0.8rem', color: '#2b2623', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Live Storefront Typography Preview
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: '#6e645e' }}>
                                        Headings: <strong>{activeHeadingFont}</strong> | Body: <strong>{activeBodyFont}</strong>
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ fontFamily: `"${activeHeadingFont}", serif`, fontSize: '1.75rem', fontWeight: 700, color: '#2b2623', lineHeight: 1.2 }}>
                                        Pure Kanjivaram Handloom Silk Sarees
                                    </div>
                                    <div style={{ fontFamily: `"${activeHeadingFont}", serif`, fontSize: '1.05rem', fontWeight: 600, color: '#a06650' }}>
                                        Woven with Authentic Zari & Timeless Indian Heritage
                                    </div>
                                    <p style={{ fontFamily: `"${activeBodyFont}", sans-serif`, fontSize: '0.9rem', color: '#6e645e', lineHeight: 1.6, margin: 0 }}>
                                        Discover the finest selection of handcrafted silk and soft cotton sarees at Vaiyaaree. Each masterpiece is authentically hand-woven with pure zari borders, intricate pallu detailing, and celebratory elegance tailored for festive weddings and royal occasions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. COMING SOON MODE */}
                    {activeTab === 'coming_soon' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: settings.coming_soon_enabled === 'true' ? '#dcfce7' : '#f1f5f9', color: settings.coming_soon_enabled === 'true' ? '#16a34a' : '#64748b' }}>
                                    <Clock size={22} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h2 className="pane-title">Coming Soon Mode</h2>
                                        <p className="pane-subtitle">Toggle to show or hide the grand launch splash page for visitors.</p>
                                    </div>
                                    <Link
                                        href="/admin/coming-soon"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#5d0821', textDecoration: 'none' }}
                                    >
                                        Full Coming Soon Editor <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                        Status: {settings.coming_soon_enabled === 'true' ? (
                                            <span style={{ color: '#16a34a' }}>● ENABLED (Coming Soon page is live for public)</span>
                                        ) : (
                                            <span style={{ color: '#64748b' }}>○ DISABLED (Storefront is normal)</span>
                                        )}
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                        When enabled, all storefront visitors are redirected to the Coming Soon countdown page. Admin users can still view the admin dashboard.
                                    </p>
                                </div>

                                <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.coming_soon_enabled === 'true'}
                                        onChange={(e) => handleUpdate('coming_soon_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', inset: 0,
                                        backgroundColor: settings.coming_soon_enabled === 'true' ? '#16a34a' : '#cbd5e1',
                                        borderRadius: '30px', transition: '0.3s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '22px', width: '22px', left: '4px', bottom: '4px',
                                            backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                            transform: settings.coming_soon_enabled === 'true' ? 'translateX(26px)' : 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                        }}></span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 4. AUTH & CHANNELS GATEWAY */}
                    {activeTab === 'channels' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#fdf2f4', color: '#5d0821' }}>
                                    <Sparkles size={22} />
                                </div>
                                <div>
                                    <h2 className="pane-title">Store Communication & Auth Channel Gateway</h2>
                                    <p className="pane-subtitle">Select whether customer login, OTP verification, order receipts operate via WhatsApp, Email, or Both.</p>
                                </div>
                            </div>

                            {/* Mode Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                                {/* Option 1: WhatsApp */}
                                <div
                                    onClick={() => handleUpdate('communication_channel', 'whatsapp')}
                                    style={{
                                        cursor: 'pointer', padding: '1.25rem', borderRadius: '16px',
                                        border: `2px solid ${(settings.communication_channel || 'whatsapp') === 'whatsapp' ? '#22c55e' : '#e2e8f0'}`,
                                        background: (settings.communication_channel || 'whatsapp') === 'whatsapp' ? '#f0fdf4' : '#ffffff',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MessageCircle size={20} color="#16a34a" />
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534' }}>WhatsApp Primary</span>
                                        </div>
                                        {(settings.communication_channel || 'whatsapp') === 'whatsapp' && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45 }}>
                                        Customers log in with <strong>WhatsApp OTP</strong>. Receipts & order notifications deliver directly to WhatsApp.
                                    </p>
                                </div>

                                {/* Option 2: Email */}
                                <div
                                    onClick={() => handleUpdate('communication_channel', 'email')}
                                    style={{
                                        cursor: 'pointer', padding: '1.25rem', borderRadius: '16px',
                                        border: `2px solid ${settings.communication_channel === 'email' ? '#3b82f6' : '#e2e8f0'}`,
                                        background: settings.communication_channel === 'email' ? '#eff6ff' : '#ffffff',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Mail size={20} color="#2563eb" />
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e40af' }}>Email Primary</span>
                                        </div>
                                        {settings.communication_channel === 'email' && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45 }}>
                                        Store operates 100% via <strong>Email</strong> without WhatsApp. Ideal during WhatsApp outages or number bans.
                                    </p>
                                </div>

                                {/* Option 3: Both */}
                                <div
                                    onClick={() => handleUpdate('communication_channel', 'both')}
                                    style={{
                                        cursor: 'pointer', padding: '1.25rem', borderRadius: '16px',
                                        border: `2px solid ${settings.communication_channel === 'both' ? '#8b5cf6' : '#e2e8f0'}`,
                                        background: settings.communication_channel === 'both' ? '#f5f3ff' : '#ffffff',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Radio size={20} color="#7c3aed" />
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#5b21b6' }}>Both (Customer Choice)</span>
                                        </div>
                                        {settings.communication_channel === 'both' && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45 }}>
                                        Shoppers can authenticate and receive updates via either WhatsApp or Email at their preference.
                                    </p>
                                </div>
                            </div>

                            {/* Chatbot Toggle */}
                            <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={22} color={(settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#16a34a' : '#ef4444'} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                                            Automated WhatsApp Chatbot Assistant
                                        </h4>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                            Auto-replies to customer product queries, live catalog requests, and tracking inquiries.
                                        </p>
                                    </div>
                                </div>

                                <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0'}
                                        onChange={(e) => handleUpdate('wa_chatbot_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', inset: 0,
                                        backgroundColor: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#16a34a' : '#cbd5e1',
                                        borderRadius: '30px', transition: '0.3s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '22px', width: '22px', left: '4px', bottom: '4px',
                                            backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                            transform: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? 'translateX(26px)' : 'none'
                                        }}></span>
                                    </span>
                                </label>
                            </div>

                            {/* Fallback Contacts */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                                <div className="field-group">
                                    <label><Mail size={14} color="#5d0821" /> Store Support Email</label>
                                    <input
                                        type="email"
                                        value={settings.support_email ?? ''}
                                        onChange={(e) => handleUpdate('support_email', e.target.value)}
                                        placeholder="support@vaiyaaree.com"
                                    />
                                </div>
                                <div className="field-group">
                                    <label><Phone size={14} color="#5d0821" /> Store WhatsApp / Mobile Phone</label>
                                    <input
                                        type="tel"
                                        value={settings.support_phone ?? ''}
                                        onChange={(e) => handleUpdate('support_phone', e.target.value)}
                                        placeholder="918667793292"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. WHATSAPP FUNNEL & GREETINGS */}
                    {activeTab === 'whatsapp' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                                    <MessageCircle size={22} />
                                </div>
                                <div>
                                    <h2 className="pane-title">WhatsApp Interaction & Bot Messaging</h2>
                                    <p className="pane-subtitle">Customize greetings and automated text sent through the WhatsApp funnel.</p>
                                </div>
                            </div>

                            <div className="fields-stack" style={{ marginTop: '1.5rem' }}>
                                <div className="field-group">
                                    <label>Welcome Message Header</label>
                                    <input
                                        type="text"
                                        value={settings.wa_catalog_header || ''}
                                        onChange={(e) => handleUpdate('wa_catalog_header', e.target.value)}
                                        placeholder="Welcome to Vaiyaaree Sarees"
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Welcome Greeting Body</label>
                                    <textarea
                                        rows={4}
                                        value={settings.wa_welcome_message || ''}
                                        onChange={(e) => handleUpdate('wa_welcome_message', e.target.value)}
                                        placeholder="Namaste! Welcome to Vaiyaaree Sarees..."
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Customer Support Auto-Response</label>
                                    <textarea
                                        rows={5}
                                        value={settings.wa_contact_message || ''}
                                        onChange={(e) => handleUpdate('wa_contact_message', e.target.value)}
                                        placeholder="Our customer stylists are available Mon-Sat (10 AM - 8 PM)..."
                                    />
                                    <p className="hint">Delivered when a customer asks for support or contact details via chat.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. SMTP EMAIL & NOTIFICATIONS */}
                    {activeTab === 'smtp' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                                    <Mail size={22} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h2 className="pane-title">SMTP Mail Server & Customer Notifications</h2>
                                        <p className="pane-subtitle">Configure mail server credentials used for order receipts, invoices, and password resets.</p>
                                    </div>
                                    <Link
                                        href="/admin/emails"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                                    >
                                        Open 9-Status Email Simulator <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                                <div className="field-group">
                                    <label><Server size={14} color="#2563eb" /> SMTP Host Server</label>
                                    <input
                                        type="text"
                                        placeholder="smtp.gmail.com or mail.yourdomain.com"
                                        value={settings.smtp_host ?? ''}
                                        onChange={(e) => handleUpdate('smtp_host', e.target.value)}
                                    />
                                </div>

                                <div className="field-group">
                                    <label>SMTP Port</label>
                                    <input
                                        type="text"
                                        placeholder="587 (TLS) or 465 (SSL)"
                                        value={settings.smtp_port ?? ''}
                                        onChange={(e) => handleUpdate('smtp_port', e.target.value)}
                                    />
                                </div>

                                <div className="field-group">
                                    <label><Mail size={14} color="#2563eb" /> SMTP Username / Email</label>
                                    <input
                                        type="email"
                                        placeholder="orders@vaiyaaree.com"
                                        value={settings.smtp_user ?? ''}
                                        onChange={(e) => handleUpdate('smtp_user', e.target.value)}
                                    />
                                </div>

                                <div className="field-group">
                                    <label><Key size={14} color="#2563eb" /> SMTP Password / App Password</label>
                                    <input
                                        type="password"
                                        placeholder="Gmail 16-char App Password"
                                        value={settings.smtp_pass ?? ''}
                                        onChange={(e) => handleUpdate('smtp_pass', e.target.value)}
                                    />
                                    <p className="hint">For Gmail: use 16-character App Password without spaces.</p>
                                </div>

                                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Sender From Header Title</label>
                                    <input
                                        type="text"
                                        placeholder='"Vaiyaaree Sarees" <orders@vaiyaaree.com>'
                                        value={settings.smtp_from ?? ''}
                                        onChange={(e) => handleUpdate('smtp_from', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Test Email Dispatcher */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <input
                                    type="email"
                                    placeholder="Enter test recipient email address..."
                                    value={testEmailRecipient}
                                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                                    style={{ flex: 1, minWidth: '240px', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSendTestEmail}
                                    disabled={testingEmail}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '0.65rem 1.25rem', backgroundColor: '#2563eb', color: '#ffffff',
                                        borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.86rem', cursor: testingEmail ? 'wait' : 'pointer'
                                    }}
                                >
                                    {testingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    {testingEmail ? 'Dispatching Test...' : 'Send Test Email'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 7. CHECKOUT & CASH ON DELIVERY (COD) */}
                    {activeTab === 'checkout' && (
                        <div className="tab-pane-card">
                            <div className="pane-header">
                                <div className="pane-header-icon" style={{ background: '#fdf2f4', color: '#5d0821' }}>
                                    <Truck size={22} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h2 className="pane-title">Checkout & Cash on Delivery (COD) Rules</h2>
                                        <p className="pane-subtitle">Configure Cash on Delivery fees, order limits, and optional partial advance payments.</p>
                                    </div>
                                    <Link
                                        href="/admin/settings/checkout"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#5d0821', textDecoration: 'none' }}
                                    >
                                        Open Checkout Simulator <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            {/* COD Toggle Bar */}
                            <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '14px', background: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#bbf7d0' : '#fecaca'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#166534' : '#991b1b' }}>
                                        {settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '● Cash on Delivery (COD) Active' : '○ Cash on Delivery (COD) Disabled'}
                                    </div>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                        Allow shoppers to choose COD during online checkout.
                                    </p>
                                </div>

                                <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.cod_enabled !== 'false' && settings.cod_enabled !== '0'}
                                        onChange={(e) => handleUpdate('cod_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', inset: 0,
                                        backgroundColor: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#16a34a' : '#cbd5e1',
                                        borderRadius: '30px', transition: '0.3s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '18px', width: '18px', left: '4px', bottom: '4px',
                                            backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                            transform: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? 'translateX(24px)' : 'none'
                                        }}></span>
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                                <div className="field-group">
                                    <label>COD Title</label>
                                    <input
                                        type="text"
                                        value={settings.cod_title || 'Cash on Delivery (COD)'}
                                        onChange={(e) => handleUpdate('cod_title', e.target.value)}
                                        placeholder="Cash on Delivery (COD)"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>COD Surcharge (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={settings.cod_fee !== undefined ? settings.cod_fee : '0'}
                                        onChange={(e) => handleUpdate('cod_fee', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Minimum Order (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={settings.cod_min_order !== undefined ? settings.cod_min_order : '0'}
                                        onChange={(e) => handleUpdate('cod_min_order', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Maximum Order (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={settings.cod_max_order !== undefined ? settings.cod_max_order : '0'}
                                        onChange={(e) => handleUpdate('cod_max_order', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Partial Advance Online Surcharge */}
                            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: settings.cod_advance_enabled === 'true' ? '#f0fdf4' : '#f8fafc', border: `1px solid ${settings.cod_advance_enabled === 'true' ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: settings.cod_advance_enabled === 'true' ? '1rem' : 0 }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                            ⚡ Partial Advance Payment via Razorpay for COD
                                        </h4>
                                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                            Require a small partial amount online to reduce COD cancellations. Remainder collected on delivery.
                                        </p>
                                    </div>
                                    <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', margin: 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.cod_advance_enabled === 'true'}
                                            onChange={(e) => handleUpdate('cod_advance_enabled', e.target.checked ? 'true' : 'false')}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute', cursor: 'pointer', inset: 0,
                                            backgroundColor: settings.cod_advance_enabled === 'true' ? '#16a34a' : '#cbd5e1',
                                            borderRadius: '30px', transition: '0.3s'
                                        }}>
                                            <span style={{
                                                position: 'absolute', content: '""', height: '18px', width: '18px', left: '4px', bottom: '4px',
                                                backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                                transform: settings.cod_advance_enabled === 'true' ? 'translateX(24px)' : 'none'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>

                                {settings.cod_advance_enabled === 'true' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                                        <div className="field-group">
                                            <label>Advance Amount Online (₹)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={settings.cod_advance_amount !== undefined ? settings.cod_advance_amount : '200'}
                                                onChange={(e) => handleUpdate('cod_advance_amount', e.target.value)}
                                                placeholder="200"
                                            />
                                        </div>
                                        <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                                            <label>Frontend Customer Note</label>
                                            <textarea
                                                rows={2}
                                                value={settings.cod_advance_note !== undefined ? settings.cod_advance_note : ''}
                                                onChange={(e) => handleUpdate('cod_advance_note', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Checkout Toggles */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.guest_checkout_enabled !== 'false'}
                                        onChange={(e) => handleUpdate('guest_checkout_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ accentColor: '#5d0821' }}
                                    />
                                    Allow Guest Checkout
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.checkout_order_notes_enabled !== 'false'}
                                        onChange={(e) => handleUpdate('checkout_order_notes_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ accentColor: '#5d0821' }}
                                    />
                                    Enable Delivery Notes
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showMediaPicker && (
                <MediaPicker
                    currentImage={settings.shop_logo}
                    onSelect={(url) => {
                        handleUpdate('shop_logo', url);
                        setShowMediaPicker(false);
                    }}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}

            <style jsx>{`
                .shop-settings-page {
                    padding: 1.5rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .settings-layout-wrapper {
                    display: grid;
                    grid-template-columns: 290px 1fr;
                    gap: 2rem;
                    align-items: start;
                }
                @media (max-width: 900px) {
                    .settings-layout-wrapper {
                        grid-template-columns: 1fr;
                    }
                }
                .vertical-nav-sidebar {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.25rem 0.85rem;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.03);
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    position: sticky;
                    top: 1rem;
                }
                .nav-group-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .nav-group-title {
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: #94a3b8;
                    padding: 0 0.65rem 0.35rem;
                    text-transform: uppercase;
                }
                .nav-group-items {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }
                .vertical-tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.65rem 0.85rem;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: #475569;
                    cursor: pointer;
                    text-align: left;
                    width: 100%;
                    transition: all 0.18s ease;
                    position: relative;
                }
                .vertical-tab-btn:hover {
                    background: #f8fafc;
                    color: #0f172a;
                }
                .vertical-tab-btn.active {
                    background: #fdf2f4;
                    color: #5d0821;
                    font-weight: 700;
                }
                .tab-icon-box {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f1f5f9;
                    color: #64748b;
                    flex-shrink: 0;
                    transition: all 0.18s ease;
                }
                .vertical-tab-btn.active .tab-icon-box {
                    background: #5d0821;
                    color: #ffffff;
                }
                .tab-text-box {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .tab-label {
                    font-size: 0.86rem;
                    font-weight: 700;
                    line-height: 1.25;
                }
                .tab-desc {
                    font-size: 0.72rem;
                    color: #94a3b8;
                    margin-top: 1px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .vertical-tab-btn.active .tab-desc {
                    color: #8b1136;
                }
                .active-pill-bar {
                    position: absolute;
                    right: 0;
                    top: 15%;
                    bottom: 15%;
                    width: 4px;
                    border-radius: 4px 0 0 4px;
                    background: #5d0821;
                }

                .tab-content-pane {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .tab-pane-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 2rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    animation: fadeIn 0.2s ease;
                }
                .pane-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                }
                .pane-header-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .pane-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .pane-subtitle {
                    margin: 3px 0 0;
                    font-size: 0.84rem;
                    color: #64748b;
                }
                .badge-pill {
                    font-size: 0.72rem;
                    font-weight: 800;
                    padding: 0.3rem 0.75rem;
                    border-radius: 20px;
                    letter-spacing: 0.04em;
                }

                .fields-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .field-group label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #334155;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }
                .field-group .hint {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin: 0;
                }
                input, textarea, select {
                    width: 100%;
                    padding: 0.7rem 0.9rem;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    font-size: 0.88rem;
                    color: #0f172a;
                    outline: none;
                    transition: border-color 0.2s;
                }
                input:focus, textarea:focus, select:focus {
                    border-color: #5d0821;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
