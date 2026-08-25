'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    Store, Save, Image, FileText, MapPin,
    Hash, Info, CheckCircle2, AlertCircle, Loader2,
    Upload, Globe, Phone, Mail, Clock, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import MediaPicker from '@/components/MediaPicker';

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
                body: JSON.stringify({ recipient: testEmailRecipient.trim() })
            });
            const data = await res.json();
            if (data.success) {
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

            const settingsMap = {};
            data.forEach(item => {
                let val = item.value;
                if (typeof val === 'string') {
                    val = val.replaceAll('vaiyaaree.official@gmail.com', 'vaiyaaree@gmail.com')
                             .replaceAll('vaiyaaree.cbe@gmail.com', 'vaiyaaree@gmail.com')
                             .replaceAll('info@vaiyaaree.com', 'vaiyaaree@gmail.com');
                }
                settingsMap[item.key] = val;
            });
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
                                placeholder="smtp.gmail.com"
                                value={settings.smtp_host || 'smtp.gmail.com'}
                                onChange={(e) => handleUpdate('smtp_host', e.target.value)}
                            />
                        </div>
                        <div className="field-group">
                            <label>SMTP Port</label>
                            <input
                                type="text"
                                placeholder="587"
                                value={settings.smtp_port || '587'}
                                onChange={(e) => handleUpdate('smtp_port', e.target.value)}
                            />
                        </div>
                        <div className="field-group">
                            <label>SMTP Sender Email / User</label>
                            <input
                                type="email"
                                placeholder="vaiyaaree@gmail.com"
                                value={settings.smtp_user || ''}
                                onChange={(e) => handleUpdate('smtp_user', e.target.value)}
                            />
                        </div>
                        <div className="field-group">
                            <label>Gmail App Password (16-char)</label>
                            <input
                                type="password"
                                placeholder="voix hxje uahf slti"
                                value={settings.smtp_pass || ''}
                                onChange={(e) => handleUpdate('smtp_pass', e.target.value)}
                            />
                            <p className="hint">For Gmail: Enable 2-Step Verification & generate an App Password at myaccount.google.com/apppasswords</p>
                        </div>
                        <div className="field-group full-width">
                            <label>Sender From Header Title</label>
                            <input
                                type="text"
                                placeholder='"Vaiyaaree Sarees" <vaiyaaree@gmail.com>'
                                value={settings.smtp_from || '"Vaiyaaree Sarees" <vaiyaaree@gmail.com>'}
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
                    </div>
                </section>

                {/* Coming Soon Mode Card */}
                <section className="settings-card card shadow-premium full-width" style={{ borderLeft: `6px solid ${settings.coming_soon_enabled === 'true' ? '#16a34a' : '#94a3b8'}` }}>
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
