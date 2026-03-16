'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Store, Save, Image, FileText, MapPin,
    Hash, Info, CheckCircle2, AlertCircle, Loader2,
    Upload, Globe, Phone, Mail
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

export default function ShopSettingsPage() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*');

            if (error) throw error;

            const settingsMap = {};
            data.forEach(item => {
                settingsMap[item.key] = item.value;
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

            const { error } = await supabase
                .from('app_settings')
                .upsert(updates);

            if (error) throw error;

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
                    <p>Manage shop details, invoice appearance, and business legal information.</p>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="btn-primary-glow"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
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
                        <Store size={20} />
                        <h3>General Identification</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label><Info size={14} /> Shop Name</label>
                            <input
                                type="text"
                                value={settings.shop_name || ''}
                                onChange={(e) => handleUpdate('shop_name', e.target.value)}
                                placeholder="Caste Print"
                            />
                        </div>
                        <div className="field-group">
                            <label><Image size={14} /> Shop Logo</label>
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
                                        <img src={settings.shop_logo} alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Billing & Tax */}
                <section className="settings-card card shadow-premium">
                    <div className="card-header">
                        <FileText size={20} />
                        <h3>Billing & Taxation</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label><Hash size={14} /> Business GSTIN</label>
                            <input
                                type="text"
                                value={settings.shop_gstin || ''}
                                onChange={(e) => handleUpdate('shop_gstin', e.target.value)}
                                placeholder="Enter GST Number"
                            />
                        </div>
                        <div className="field-group">
                            <label><MapPin size={14} /> Shop Address</label>
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
                        <Phone size={20} />
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
                        <Mail size={20} />
                        <h3>Support Contact</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label>Contact Support Content</label>
                            <p className="hint">This is sent when user asks for contact info.</p>
                            <textarea
                                rows={6}
                                value={settings.wa_contact_message || ''}
                                onChange={(e) => handleUpdate('wa_contact_message', e.target.value)}
                            />
                        </div>
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
                .page-header h1 { font-size: 2.2rem; display: flex; align-items: center; gap: 1rem; margin: 0; font-weight: 800; }
                .page-header p { color: hsl(var(--text-muted)); margin: 0.5rem 0 0; }
                
                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none;
                    padding: 0.8rem 1.75rem; border-radius: 14px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
                    box-shadow: 0 0 20px hsl(var(--primary) / 0.3); transition: 0.3s;
                }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 0 30px hsl(var(--primary) / 0.5); }
                .btn-primary-glow:disabled { opacity: 0.6; cursor: not-allowed; }

                .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 2rem; }
                .full-width { grid-column: 1 / -1; }

                .settings-card { padding: 2rem; background: hsl(var(--bg-panel)); border: 1px solid hsl(var(--border-subtle)); }
                .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; border-bottom: 1px solid hsl(var(--border-subtle)); padding-bottom: 1rem; color: hsl(var(--primary)); }
                .card-header h3 { margin: 0; color: #fff; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; }

                .fields-stack { display: flex; flex-direction: column; gap: 1.5rem; }
                .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                
                .label { display: block; font-size: 0.75rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .field-group label { font-size: 0.75rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .field-group .hint { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); margin: 0 0 0.5rem; }

                input, textarea {
                    width: 100%; padding: 0.85rem 1rem; background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; 
                    color: #ffffff; font-size: 0.95rem; outline: none; transition: 0.2s;
                }
                input:focus, textarea:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 15px hsl(var(--primary) / 0.1); background: rgba(255, 255, 255, 0.08); }
                textarea { resize: none; }

                .input-with-preview { display: flex; gap: 1rem; align-items: flex-start; }
                .logo-preview { 
                    width: 80px; height: 80px; background: #222; border-radius: 12px; 
                    overflow: hidden; border: 1px solid hsl(var(--border-subtle));
                    display: flex; align-items: center; justify-content: center;
                }
                .logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 1000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: hsl(142 70% 45%); color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .toast-error { background: hsl(0 84% 60%); color: white; }
                
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
