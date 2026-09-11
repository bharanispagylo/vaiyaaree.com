'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    Store, Save, Image, FileText, MapPin,
    Hash, Info, CheckCircle2, AlertCircle, Loader2,
    Upload, Globe, Phone, Mail, Clock, ArrowRight, CreditCard, ShieldCheck, Lock,
    MessageCircle, Bot, Sparkles, Radio, ShieldAlert, Truck, Sliders, Type, Palette
} from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import MediaPicker from '@/components/MediaPicker';
import { GOOGLE_FONTS_LIST, FONT_PAIRING_PRESETS, getGoogleFontsStylesheetUrl } from '@/lib/googleFontsList';

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
                theme_font_heading: 'Cinzel'
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

            setNotification({ message: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
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
            <Loader2 size={32} className="animate-spin" color="hsl(var(--primary))" />
            <p style={{ color: 'hsl(var(--text-muted))' }}>Loading shop configurations...</p>
        </div>
    );

    return (
        <div className="shop-settings-page animate-enter">
            <div className="page-header">
                <div>
                    <h1><Store size={32} color="hsl(var(--primary))" /> Shop Settings</h1>
                    <p>Configure your shop details for Vaiyaaree, invoice appearance, and business legal information.</p>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="btn-primary-glow"
                >
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    Save All Changes
                </button>
            </div>

            {notification && (
                <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            <div className="settings-grid">
                {/* Store Communication Channel & WhatsApp Chatbot Gateway Card */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: '6px solid hsl(var(--primary))', background: 'linear-gradient(180deg, rgba(93, 8, 33, 0.02) 0%, rgba(255, 255, 255, 1) 100%)' }}>
                    <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={20} color="hsl(var(--primary))" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Store Communication & Auth Channel Gateway</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                    Control whether customer authentication, OTP codes, order receipts, and customer service operate via WhatsApp, Email, or Both.
                                </p>
                            </div>
                        </div>
                        <span style={{
                            fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px', letterSpacing: '0.05em',
                            background: settings.communication_channel === 'email' ? '#eff6ff' : (settings.communication_channel === 'both' ? '#f5f3ff' : '#f0fdf4'),
                            color: settings.communication_channel === 'email' ? '#2563eb' : (settings.communication_channel === 'both' ? '#7c3aed' : '#16a34a'),
                            border: `1px solid ${settings.communication_channel === 'email' ? '#bfdbfe' : (settings.communication_channel === 'both' ? '#ddd6fe' : '#bbf7d0')}`
                        }}>
                            CURRENT: {((settings.communication_channel || 'whatsapp').toUpperCase())} ACTIVE
                        </span>
                    </div>

                    {/* Mode Selector Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                        {/* Option 1: WhatsApp Only */}
                        <div
                            onClick={() => handleUpdate('communication_channel', 'whatsapp')}
                            style={{
                                cursor: 'pointer',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                border: `2px solid ${(settings.communication_channel || 'whatsapp') === 'whatsapp' ? '#22c55e' : '#e2e8f0'}`,
                                background: (settings.communication_channel || 'whatsapp') === 'whatsapp' ? '#f0fdf4' : '#ffffff',
                                transition: 'all 0.2s ease',
                                boxShadow: (settings.communication_channel || 'whatsapp') === 'whatsapp' ? '0 4px 15px rgba(34, 197, 94, 0.15)' : 'none',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageCircle size={22} color="#16a34a" />
                                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#166534' }}>WhatsApp Primary</span>
                                </div>
                                {(settings.communication_channel || 'whatsapp') === 'whatsapp' && (
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#4b5563', lineHeight: 1.45 }}>
                                Customers log in and verify with <strong>WhatsApp OTP</strong>. Order confirmations and notifications are delivered directly to their WhatsApp.
                            </p>
                        </div>

                        {/* Option 2: Email Only */}
                        <div
                            onClick={() => handleUpdate('communication_channel', 'email')}
                            style={{
                                cursor: 'pointer',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                border: `2px solid ${settings.communication_channel === 'email' ? '#3b82f6' : '#e2e8f0'}`,
                                background: settings.communication_channel === 'email' ? '#eff6ff' : '#ffffff',
                                transition: 'all 0.2s ease',
                                boxShadow: settings.communication_channel === 'email' ? '0 4px 15px rgba(59, 130, 246, 0.15)' : 'none',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={22} color="#2563eb" />
                                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1e40af' }}>Email Primary (No WhatsApp)</span>
                                </div>
                                {settings.communication_channel === 'email' && (
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#4b5563', lineHeight: 1.45 }}>
                                Entire store runs on <strong>Email</strong>. Login, sign-up, OTPs, password reset, and order receipts operate 100% via Email without WhatsApp. Ideal during WhatsApp outages.
                            </p>
                        </div>

                        {/* Option 3: Both (Customer Choice) */}
                        <div
                            onClick={() => handleUpdate('communication_channel', 'both')}
                            style={{
                                cursor: 'pointer',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                border: `2px solid ${settings.communication_channel === 'both' ? '#8b5cf6' : '#e2e8f0'}`,
                                background: settings.communication_channel === 'both' ? '#f5f3ff' : '#ffffff',
                                transition: 'all 0.2s ease',
                                boxShadow: settings.communication_channel === 'both' ? '0 4px 15px rgba(139, 92, 246, 0.15)' : 'none',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Radio size={22} color="#7c3aed" />
                                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#5b21b6' }}>Both WhatsApp & Email</span>
                                </div>
                                {settings.communication_channel === 'both' && (
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#4b5563', lineHeight: 1.45 }}>
                                Customers can choose to authenticate, receive OTPs, and get order updates via either <strong>WhatsApp or Email</strong>.
                            </p>
                        </div>
                    </div>

                    {/* WhatsApp Chatbot Assistant Toggle Section */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.25rem 1.5rem',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={24} color={(settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#16a34a' : '#ef4444'} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Automated WhatsApp Chatbot Assistant
                                    <span style={{
                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                                        background: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#dcfce7' : '#fee2e2',
                                        color: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '#15803d' : '#b91c1c'
                                    }}>
                                        {(settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? '● ONLINE & ACTIVE' : '○ PAUSED / OFF'}
                                    </span>
                                </h4>
                                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                    When enabled, customer messages to WhatsApp receive automatic catalog browsing, order inquiry, and FAQ replies. Disable if managing WhatsApp manually or dealing with number restrictions.
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
                                    transform: (settings.wa_chatbot_enabled !== 'false' && settings.wa_chatbot_enabled !== '0') ? 'translateX(26px)' : 'translateX(0)'
                                }} />
                            </span>
                        </label>
                    </div>

                    {/* Support Contact Fallbacks */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                        <div className="field-group">
                            <label><Mail size={14} color="hsl(var(--primary))" /> Store Support Email (Used in Email Mode)</label>
                            <input
                                type="email"
                                value={settings.support_email ?? ''}
                                onChange={(e) => handleUpdate('support_email', e.target.value)}
                                placeholder="support@vaiyaaree.com"
                            />
                        </div>
                        <div className="field-group">
                            <label><Phone size={14} color="hsl(var(--primary))" /> Store WhatsApp / Support Mobile</label>
                            <input
                                type="tel"
                                value={settings.support_phone ?? ''}
                                onChange={(e) => handleUpdate('support_phone', e.target.value)}
                                placeholder="918667793292"
                            />
                        </div>
                    </div>
                </section>

                {/* Storefront Typography & Google Fonts Section */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: '6px solid #4f46e5', background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.02) 0%, #ffffff 100%)' }}>
                    <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Type size={22} color="#4f46e5" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Storefront Typography & Google Fonts</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                    Customize your storefront font dynamically using Google Fonts. Choose separate fonts for titles & body text, or pick a 1-click designer pairing.
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px',
                                background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', letterSpacing: '0.04em'
                            }}>
                                HEADINGS: {activeHeadingFont.toUpperCase()}
                            </span>
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px',
                                background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', letterSpacing: '0.04em'
                            }}>
                                BODY: {activeBodyFont.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Quick 1-Click Designer Font Pairings */}
                    <div style={{ marginBottom: '1.5rem' }}>
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
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
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

                    {/* Font Selectors (Dropdown + Custom Write-In Option) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* 1. Body & UI Font */}
                        <div className="field-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><Type size={14} color="#4f46e5" /> Storefront Body & UI Font</span>
                                <span style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'none', fontWeight: 600 }}>Google Fonts</span>
                            </label>
                            <select
                                value={GOOGLE_FONTS_LIST.some(f => f.name.toLowerCase() === activeBodyFont.toLowerCase()) ? activeBodyFont : 'custom'}
                                onChange={(e) => {
                                    if (e.target.value !== 'custom') {
                                        handleUpdate('theme_font_body', e.target.value);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '0.85rem 1rem', background: '#ffffff',
                                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem',
                                    fontWeight: 600, color: '#0f172a', outline: 'none'
                                }}
                            >
                                <optgroup label="Modern Sans-Serif (Recommended for Body)">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Sans-Serif').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Royal & Classic Serif">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Serif').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Distinctive Display">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Display').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <option value="custom">✏️ Custom Google Font Name...</option>
                            </select>

                            {/* Optional Custom Font Write-in */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Or type any Google Font name (e.g. Poppins, Manrope, Nunito Sans)"
                                    value={settings.theme_font_body || ''}
                                    onChange={(e) => handleUpdate('theme_font_body', e.target.value)}
                                    style={{
                                        fontSize: '0.85rem', padding: '0.6rem 0.85rem', borderRadius: '8px',
                                        border: '1px solid #e2e8f0', background: '#f8fafc'
                                    }}
                                />
                            </div>
                            <p className="hint">Controls all storefront product cards, descriptions, menus, cart, checkout, buttons and paragraph text.</p>
                        </div>

                        {/* 2. Heading & Title Font */}
                        <div className="field-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><Palette size={14} color="#4f46e5" /> Storefront Headings & Titles Font</span>
                                <span style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'none', fontWeight: 600 }}>Google Fonts</span>
                            </label>
                            <select
                                value={GOOGLE_FONTS_LIST.some(f => f.name.toLowerCase() === activeHeadingFont.toLowerCase()) ? activeHeadingFont : 'custom'}
                                onChange={(e) => {
                                    if (e.target.value !== 'custom') {
                                        handleUpdate('theme_font_heading', e.target.value);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '0.85rem 1rem', background: '#ffffff',
                                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem',
                                    fontWeight: 600, color: '#0f172a', outline: 'none'
                                }}
                            >
                                <optgroup label="Royal & Editorial Serif (Recommended for Saree Titles)">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Serif').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Modern Sans-Serif">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Sans-Serif').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Distinctive Display">
                                    {GOOGLE_FONTS_LIST.filter(f => f.category === 'Display').map(f => (
                                        <option key={f.name} value={f.name}>
                                            {f.name} — {f.description}
                                        </option>
                                    ))}
                                </optgroup>
                                <option value="custom">✏️ Custom Google Font Name...</option>
                            </select>

                            {/* Optional Custom Font Write-in */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Or type any Google Font name (e.g. Cinzel, Playfair Display)"
                                    value={settings.theme_font_heading || ''}
                                    onChange={(e) => handleUpdate('theme_font_heading', e.target.value)}
                                    style={{
                                        fontSize: '0.85rem', padding: '0.6rem 0.85rem', borderRadius: '8px',
                                        border: '1px solid #e2e8f0', background: '#f8fafc'
                                    }}
                                />
                            </div>
                            <p className="hint">Controls storefront banner headlines, category titles, section headings (H1-H6), and hero banners.</p>
                        </div>
                    </div>

                    {/* Live Storefront Font Render Preview Box */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '16px',
                        background: '#fdfbf7',
                        border: '1.5px dashed #cbd5e1',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ebdcd0', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                                <strong style={{ fontSize: '0.8rem', color: '#2b2623', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Live Storefront Typography Preview
                                </strong>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#6e645e' }}>
                                Headings: <strong style={{ color: '#0f172a' }}>{activeHeadingFont}</strong> | Body: <strong style={{ color: '#0f172a' }}>{activeBodyFont}</strong>
                            </span>
                        </div>

                        {/* Rendered live with inline fontFamily styles using selected Google Fonts */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{
                                fontFamily: `"${activeHeadingFont}", serif`,
                                fontSize: '1.85rem',
                                fontWeight: 700,
                                color: '#2b2623',
                                lineHeight: 1.2
                            }}>
                                Pure Kanjivaram Handloom Silk Sarees
                            </div>

                            <div style={{
                                fontFamily: `"${activeHeadingFont}", serif`,
                                fontSize: '1.15rem',
                                fontWeight: 600,
                                color: '#a06650',
                                letterSpacing: '0.02em'
                            }}>
                                Woven with Authentic Zari & Timeless Indian Heritage
                            </div>

                            <p style={{
                                fontFamily: `"${activeBodyFont}", sans-serif`,
                                fontSize: '0.95rem',
                                color: '#6e645e',
                                lineHeight: 1.6,
                                margin: 0
                            }}>
                                Discover the finest selection of handcrafted silk and soft cotton sarees at Vaiyaaree. Each masterpiece is authentically hand-woven with pure zari borders, intricate pallu detailing, and celebratory elegance tailored for festive weddings and royal occasions.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    style={{
                                        fontFamily: `"${activeBodyFont}", sans-serif`,
                                        background: '#a06650',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.65rem 1.4rem',
                                        borderRadius: '50px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'default'
                                    }}
                                >
                                    Explore Saree Collection &rarr;
                                </button>
                                <span style={{
                                    fontFamily: `"${activeBodyFont}", sans-serif`,
                                    fontSize: '1.1rem',
                                    fontWeight: 800,
                                    color: '#2b2623'
                                }}>
                                    ₹4,499.00
                                </span>
                                <span style={{
                                    fontFamily: `"${activeBodyFont}", sans-serif`,
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.04em'
                                }}>
                                    100% PURE SILK CERTIFIED
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* General Shop Info */}
                <section className="settings-card card shadow-premium">
                    <div className="card-header">
                        <Store size={20} color="hsl(var(--primary))" />
                        <h3>General Identification</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label><Info size={14} color="hsl(var(--primary))" /> Shop Name</label>
                            <input
                                type="text"
                                value={settings.shop_name || ''}
                                onChange={(e) => handleUpdate('shop_name', e.target.value)}
                                placeholder="Vaiyaaree"
                            />
                        </div>
                        <div className="field-group">
                            <label><Image size={14} color="hsl(var(--primary))" /> Shop Logo</label>
                            <div className="input-with-preview">
                                <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={settings.shop_logo || ''}
                                        onChange={(e) => handleUpdate('shop_logo', e.target.value)}
                                        placeholder="https://your-domain.com/logo.png"
                                    />
                                    <button
                                        type="button"
                                        className="btn-primary-glow"
                                        style={{ padding: '0.5rem 1rem', width: 'auto', boxShadow: 'none' }}
                                        onClick={() => setShowMediaPicker(true)}
                                    >
                                        <Upload size={16} />
                                    </button>
                                </div>
                                {settings.shop_logo && (
                                    <div className="logo-preview">
                                        <img src={settings.shop_logo.startsWith('http') || settings.shop_logo.startsWith('/') ? settings.shop_logo : `/images/${settings.shop_logo}`} alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Billing & Tax */}
                <section className="settings-card card shadow-premium">
                    <div className="card-header">
                        <FileText size={20} color="hsl(var(--primary))" />
                        <h3>Billing & Taxation</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label><Hash size={14} color="hsl(var(--primary))" /> Business GSTIN</label>
                            <input
                                type="text"
                                value={settings.shop_gstin || ''}
                                onChange={(e) => handleUpdate('shop_gstin', e.target.value)}
                                placeholder="Enter GST Number"
                            />
                        </div>
                        <div className="field-group">
                            <label><MapPin size={14} color="hsl(var(--primary))" /> Shop Address</label>
                            <textarea
                                rows={3}
                                value={settings.shop_address || ''}
                                onChange={(e) => handleUpdate('shop_address', e.target.value)}
                                placeholder="Full shop address..."
                            />
                        </div>
                    </div>
                </section>

                {/* WhatsApp Funnel Settings */}
                <section className="settings-card card shadow-premium">
                    <div className="card-header">
                        <Phone size={20} color="hsl(var(--primary))" />
                        <h3>WhatsApp Funnel (Interaction)</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label>Welcome Message Header</label>
                            <input
                                type="text"
                                value={settings.wa_catalog_header || ''}
                                onChange={(e) => handleUpdate('wa_catalog_header', e.target.value)}
                            />
                        </div>
                        <div className="field-group">
                            <label>Welcome Greeting Body</label>
                            <textarea
                                rows={4}
                                value={settings.wa_welcome_message || ''}
                                onChange={(e) => handleUpdate('wa_welcome_message', e.target.value)}
                            />
                        </div>
                    </div>
                </section>


                {/* Contact Settings */}
                <section className="settings-card card shadow-premium">
                    <div className="card-header">
                        <Mail size={20} color="hsl(var(--primary))" />
                        <h3>Support Contact</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label>Contact Support Content</label>
                            <p className="hint">This is sent when user asks for contact info.</p>
                            <textarea
                                id="contact-support-field"
                                rows={6}
                                value={settings.wa_contact_message || ''}
                                onChange={(e) => handleUpdate('wa_contact_message', e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* SMTP Email Server & Order Notifications Settings Card */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: '6px solid #2563eb' }}>
                    <div className="card-header">
                        <Mail size={20} color="#2563eb" />
                        <h3>SMTP Email & Customer Order Notifications Settings</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '-0.5rem 0 1.5rem' }}>
                        Configure SMTP mail credentials used to dispatch order confirmations, shipping tracking emails, return updates, and invoices to customers.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <div className="field-group">
                            <label>SMTP Host Server</label>
                            <input
                                type="text"
                                placeholder="mail.vaiyaaree.com or smtp.gmail.com"
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
                            <label>SMTP Sender Email / User</label>
                            <input
                                type="email"
                                placeholder="orders@vaiyaaree.com"
                                value={settings.smtp_user ?? ''}
                                onChange={(e) => handleUpdate('smtp_user', e.target.value)}
                            />
                        </div>
                        <div className="field-group">
                            <label>SMTP Password / App Password</label>
                            <input
                                type="password"
                                placeholder="Webmail password or Gmail App Password"
                                value={settings.smtp_pass ?? ''}
                                onChange={(e) => handleUpdate('smtp_pass', e.target.value)}
                            />
                            <p className="hint">For custom hosting: enter your webmail password. For Gmail: enter 16-character App Password.</p>
                        </div>
                        <div className="field-group full-width">
                            <label>Sender From Header Title</label>
                            <input
                                type="text"
                                placeholder='"Vaiyaaree Sarees" <orders@vaiyaaree.com>'
                                value={settings.smtp_from ?? ''}
                                onChange={(e) => handleUpdate('smtp_from', e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                            <input
                                type="email"
                                placeholder="Enter recipient email to test..."
                                value={testEmailRecipient}
                                onChange={(e) => setTestEmailRecipient(e.target.value)}
                                style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                            <button
                                type="button"
                                onClick={handleSendTestEmail}
                                disabled={testingEmail}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 1.25rem', backgroundColor: '#2563eb', color: '#ffffff',
                                    borderRadius: '8px', border: 'none', fontWeight: 600, cursor: testingEmail ? 'wait' : 'pointer'
                                }}
                            >
                                {testingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                {testingEmail ? 'Sending Test...' : 'Send Test Email'}
                            </button>
                        </div>
                        <Link
                            href="/admin/emails"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.65rem 1.25rem', backgroundColor: '#5d0821', color: '#ffffff',
                                borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem'
                            }}
                        >
                            <Mail size={16} /> Open Email Simulator (9 Statuses) &rarr;
                        </Link>
                    </div>
                </section>

                {/* Coming Soon Mode Card */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: `6px solid ${settings.coming_soon_enabled === 'true' ? '#16a34a' : '#000000'}` }}>
                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Clock size={20} color="hsl(var(--primary))" />
                            <h3>Coming Soon Page Mode</h3>
                        </div>
                        <Link href="/admin/coming-soon" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--primary))', textDecoration: 'none' }}>
                            Full Coming Soon Controls <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                                Status: {settings.coming_soon_enabled === 'true' ? (
                                    <span style={{ color: '#16a34a' }}>● ENABLED (Front Page displays Coming Soon)</span>
                                ) : (
                                    <span style={{ color: '#64748b' }}>○ DISABLED (Storefront Normal)</span>
                                )}
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                Toggle to instantly show/hide the public Coming Soon launch page for visitors.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px' }}>
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
                </section>

                {/* Checkout & Cash on Delivery (COD) Settings Card */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: `6px solid ${settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#16a34a' : '#ef4444'}` }}>
                    <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px',
                                background: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#dcfce7' : '#fee2e2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Truck size={20} color={settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#16a34a' : '#ef4444'} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Checkout & Cash on Delivery (COD) Settings</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                    Enable or disable Cash on Delivery (COD), configure order limits, handling fees, and checkout policies.
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px', letterSpacing: '0.04em',
                                background: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#f0fdf4' : '#fef2f2',
                                color: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#16a34a' : '#b91c1c',
                                border: `1px solid ${settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '#bbf7d0' : '#fecaca'}`
                            }}>
                                {settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? '● COD ENABLED' : '○ COD DISABLED'}
                            </span>

                            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', margin: 0 }}>
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
                                        position: 'absolute', content: '""', height: '22px', width: '22px', left: '4px', bottom: '4px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                        transform: settings.cod_enabled !== 'false' && settings.cod_enabled !== '0' ? 'translateX(26px)' : 'none',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}></span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                        <div className="field-group">
                            <label>COD Display Title</label>
                            <input
                                type="text"
                                value={settings.cod_title || 'Cash on Delivery (COD)'}
                                onChange={(e) => handleUpdate('cod_title', e.target.value)}
                                placeholder="Cash on Delivery (COD)"
                            />
                        </div>
                        <div className="field-group">
                            <label>COD Extra Fee / Surcharge (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={settings.cod_fee !== undefined ? settings.cod_fee : '0'}
                                onChange={(e) => handleUpdate('cod_fee', e.target.value)}
                                placeholder="0"
                            />
                            <p className="hint">Optional fee added when COD is selected (0 = free).</p>
                        </div>
                        <div className="field-group">
                            <label>Minimum Order for COD (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={settings.cod_min_order !== undefined ? settings.cod_min_order : '0'}
                                onChange={(e) => handleUpdate('cod_min_order', e.target.value)}
                                placeholder="0"
                            />
                            <p className="hint">0 = no minimum required.</p>
                        </div>
                        <div className="field-group">
                            <label>Maximum Order for COD (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={settings.cod_max_order !== undefined ? settings.cod_max_order : '0'}
                                onChange={(e) => handleUpdate('cod_max_order', e.target.value)}
                                placeholder="0"
                            />
                            <p className="hint">0 = unlimited cart total.</p>
                        </div>
                    </div>

                    {/* COD Advance Payment via Razorpay Sub-Section */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.25rem',
                        background: settings.cod_advance_enabled === 'true' ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${settings.cod_advance_enabled === 'true' ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: settings.cod_advance_enabled === 'true' ? '1rem' : 0 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>⚡</span> Require Partial Advance Payment via Razorpay for COD
                                </h4>
                                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                    Customers must pay a fixed advance amount online via Razorpay/UPI to confirm their COD order. The remaining balance is collected in cash upon delivery.
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
                                        transform: settings.cod_advance_enabled === 'true' ? 'translateX(24px)' : 'none',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></span>
                                </span>
                            </label>
                        </div>

                        {settings.cod_advance_enabled === 'true' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                                <div className="field-group">
                                    <label style={{ fontWeight: 700 }}>Advance Amount to Pay Online (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settings.cod_advance_amount !== undefined ? settings.cod_advance_amount : '200'}
                                        onChange={(e) => handleUpdate('cod_advance_amount', e.target.value)}
                                        placeholder="200"
                                    />
                                    <p className="hint">The customer pays this amount via Razorpay. Automatically capped at order total if cart total is less.</p>
                                </div>
                                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontWeight: 700 }}>Note Below COD Button (Frontend Checkout)</label>
                                    <textarea
                                        rows={2}
                                        value={settings.cod_advance_note !== undefined ? settings.cod_advance_note : 'A partial advance of ₹{amount} is required online via UPI/Card to confirm your COD order. The remaining balance of ₹{balance} will be collected in cash upon delivery.'}
                                        onChange={(e) => handleUpdate('cod_advance_note', e.target.value)}
                                        placeholder="Pay ₹{amount} advance online to confirm. Pay balance ₹{balance} on delivery."
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                    <p className="hint">This note will appear directly below the COD button/option in checkout. Supports <code>{'{amount}'}</code> and <code>{'{balance}'}</code> variables.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{
                        marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    style={{ width: 'auto', margin: 0 }}
                                    checked={settings.guest_checkout_enabled !== 'false'}
                                    onChange={(e) => handleUpdate('guest_checkout_enabled', e.target.checked ? 'true' : 'false')}
                                />
                                Allow Guest Checkout
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    style={{ width: 'auto', margin: 0 }}
                                    checked={settings.checkout_order_notes_enabled !== 'false'}
                                    onChange={(e) => handleUpdate('checkout_order_notes_enabled', e.target.checked ? 'true' : 'false')}
                                />
                                Enable Order Delivery Notes
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    style={{ width: 'auto', margin: 0 }}
                                    checked={settings.checkout_create_account_enabled !== 'false'}
                                    onChange={(e) => handleUpdate('checkout_create_account_enabled', e.target.checked ? 'true' : 'false')}
                                />
                                Allow Account Creation at Checkout
                            </label>
                        </div>

                        <Link
                            href="/admin/settings/checkout"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '0.65rem 1.25rem', backgroundColor: 'hsl(var(--primary))', color: '#ffffff',
                                borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.86rem'
                            }}
                        >
                            Open Full Checkout Settings & Simulator <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>
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
                .shop-settings-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
                .page-header h1 { font-size: 2.2rem; display: flex; align-items: center; gap: 1rem; margin: 0; font-weight: 800; color: #111; }
                .page-header p { color: #666; margin: 0.5rem 0 0; }
                
                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none;
                    padding: 0.8rem 1.75rem; border-radius: 14px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
                    box-shadow: 0 4px 12px hsl(var(--primary) / 0.2); transition: 0.3s;
                }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 8px 20px hsl(var(--primary) / 0.4); }
                .btn-primary-glow:disabled { opacity: 0.6; cursor: not-allowed; }

                .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 2rem; }
                .full-width { grid-column: 1 / -1; }

                .settings-card { padding: 2rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; transition: all 0.3s ease; }
                .settings-card:hover { border-color: hsl(var(--primary)); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
                .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem; }
                .card-header h3 { margin: 0; color: #111; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }

                .fields-stack { display: flex; flex-direction: column; gap: 1.5rem; }
                
                .field-group label { font-size: 0.75rem; font-weight: 800; color: #111; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                .field-group .hint { font-size: 0.75rem; color: #666; margin: 0 0 0.5rem; }

                input, textarea {
                    width: 100%; padding: 0.85rem 1rem; background: #ffffff; 
                    border: 1px solid #d1d5db; border-radius: 12px; 
                }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 1000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: #10b981; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .toast-error { background: #ef4444; color: white; }
            `}</style>


        </div>
    );
}
