'use client';

import { useState, useEffect } from 'react';
import { 
    Clock, Save, CheckCircle2, AlertCircle, Loader2, 
    Sparkles, Eye, Users, Phone, Mail, Instagram, 
    Facebook, Calendar, Power, RefreshCw, Download
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ComingSoonPage from '@/components/ComingSoonPage';

export default function AdminComingSoonPage() {
    const { fetchComingSoon } = useShop();
    const [settings, setSettings] = useState({
        enabled: false,
        title: 'We Are Weaving Something Extraordinary',
        subtitle: 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.',
        launch_date: '',
        phone: '8667793292',
        email: 'vaiyaaree@gmail.com',
        whatsapp: '8667793292',
        instagram: 'https://instagram.com/vaiyaaree',
        facebook: 'https://facebook.com/vaiyaaree',
        logo: '/images/vaiyaaree-logo.png'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [subscribers, setSubscribers] = useState([]);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchStatus();
        fetchSubscribers();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/coming-soon/status');
            const data = await res.json();
            if (data.success) {
                setSettings({
                    enabled: !!data.enabled,
                    title: data.title || '',
                    subtitle: data.subtitle || '',
                    launch_date: data.launch_date || '',
                    phone: data.phone || '8667793292',
                    email: data.email || 'vaiyaaree@gmail.com',
                    whatsapp: data.whatsapp || '8667793292',
                    instagram: data.instagram || '',
                    facebook: data.facebook || '',
                    logo: data.logo || '/images/vaiyaaree-logo.png'
                });
            }
        } catch (err) {
            console.error('Fetch coming soon status error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscribers = async () => {
        try {
            const res = await fetch('/api/coming-soon/subscribe');
            const data = await res.json();
            if (data.success) {
                setSubscribers(data.subscribers || []);
            }
        } catch (err) {
            console.error('Fetch subscribers error:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/coming-soon/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            const data = await res.json();
            if (data.success) {
                if (fetchComingSoon) await fetchComingSoon();
                setNotification({ message: 'Coming Soon settings saved successfully!', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            } else {
                throw new Error(data.error || 'Failed to save');
            }
        } catch (err) {
            setNotification({ message: err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const exportSubscribersCSV = () => {
        if (subscribers.length === 0) return;
        const headers = ['Email', 'Phone', 'Subscribed At'];
        const rows = subscribers.map(s => [
            `"${s.email || ''}"`,
            `"${s.phone || ''}"`,
            `"${s.subscribed_at ? new Date(s.subscribed_at).toLocaleString() : ''}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `vaiyaaree_coming_soon_subscribers_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" color="hsl(var(--primary))" />
                <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading Coming Soon Configuration...</p>
            </div>
        );
    }

    return (
        <div className="coming-soon-admin animate-enter">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1><Clock size={32} color="hsl(var(--primary))" /> Coming Soon Page Mode</h1>
                    <p>Enable or disable the public Coming Soon launch page for the front store.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="btn-secondary-action"
                    >
                        <Eye size={18} />
                        {showPreview ? 'Close Preview' : 'Live Preview'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary-glow"
                    >
                        {saving && <Loader2 size={18} className="animate-spin" />}
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>

            {notification && (
                <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            {/* Live Preview Modal */}
            {showPreview && (
                <div className="preview-modal-overlay">
                    <div className="preview-modal-content">
                        <div className="preview-modal-bar">
                            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={16} color="#dfaa5b" /> Live Front Page Preview (Mode: {settings.enabled ? 'Active' : 'Disabled'})
                            </span>
                            <button onClick={() => setShowPreview(false)} className="close-preview-btn">✕ Close</button>
                        </div>
                        <div className="preview-frame">
                            <ComingSoonPage settings={settings} />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Configuration Grid */}
            <div className="settings-grid">
                {/* Master Switch Card */}
                <section className="settings-card full-width shadow-premium" style={{ borderLeft: `6px solid ${settings.enabled ? '#16a34a' : '#94a3b8'}` }}>
                    <div className="switch-banner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div className={`switch-icon-box ${settings.enabled ? 'active' : ''}`}>
                                <Power size={28} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 800, color: '#111' }}>
                                    Coming Soon Mode: {settings.enabled ? (
                                        <span style={{ color: '#16a34a', textTransform: 'uppercase', letterSpacing: '1px' }}>● LIVE (Enabled)</span>
                                    ) : (
                                        <span style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>○ DISABLED (Storefront Normal)</span>
                                    )}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                                    {settings.enabled
                                        ? 'Visitors to the front page will see the Coming Soon launch screen with countdown timer and lead capture.'
                                        : 'Store is fully accessible to all customers normally.'}
                                </p>
                            </div>
                        </div>

                        {/* Interactive Toggle Button */}
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </section>

                {/* Content Settings */}
                <section className="settings-card shadow-premium">
                    <div className="card-header">
                        <Sparkles size={20} color="hsl(var(--primary))" />
                        <h3>Headlines & Story</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label>Launch Title / Headline</label>
                            <input
                                type="text"
                                value={settings.title}
                                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                placeholder="e.g. We Are Weaving Something Extraordinary"
                            />
                        </div>
                        <div className="field-group">
                            <label>Subtitle / Brand Message</label>
                            <textarea
                                rows={4}
                                value={settings.subtitle}
                                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                                placeholder="Short enticing description about the collection..."
                            />
                        </div>
                        <div className="field-group">
                            <label><Calendar size={14} color="hsl(var(--primary))" /> Target Launch Date & Time (Live Countdown)</label>
                            <input
                                type="datetime-local"
                                value={settings.launch_date ? settings.launch_date.slice(0, 16) : ''}
                                onChange={(e) => setSettings({ ...settings, launch_date: e.target.value })}
                            />
                            <p className="hint">If left blank, a default 14-day launch countdown will be displayed.</p>
                        </div>
                    </div>
                </section>

                {/* Contact & Social Settings */}
                <section className="settings-card shadow-premium">
                    <div className="card-header">
                        <Phone size={20} color="hsl(var(--primary))" />
                        <h3>Contact & Inquiries</h3>
                    </div>
                    <div className="fields-stack">
                        <div className="field-group">
                            <label><Phone size={14} color="hsl(var(--primary))" /> WhatsApp / Phone Number</label>
                            <input
                                type="text"
                                value={settings.whatsapp}
                                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value, phone: e.target.value })}
                                placeholder="8667793292"
                            />
                        </div>
                        <div className="field-group">
                            <label><Mail size={14} color="hsl(var(--primary))" /> Contact Email</label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                placeholder="vaiyaaree@gmail.com"
                            />
                        </div>
                        <div className="field-group">
                            <label><Instagram size={14} color="hsl(var(--primary))" /> Instagram Profile Link</label>
                            <input
                                type="text"
                                value={settings.instagram}
                                onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                                placeholder="https://instagram.com/vaiyaaree"
                            />
                        </div>
                        <div className="field-group">
                            <label><Facebook size={14} color="hsl(var(--primary))" /> Facebook Page Link</label>
                            <input
                                type="text"
                                value={settings.facebook}
                                onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                                placeholder="https://facebook.com/vaiyaaree"
                            />
                        </div>
                    </div>
                </section>


            </div>

            <style jsx>{`
                .coming-soon-admin { padding: 2rem; max-width: 1200px; margin: 0 auto; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
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

                .btn-secondary-action {
                    background: #ffffff; color: #334155; border: 1px solid #cbd5e1;
                    padding: 0.8rem 1.4rem; border-radius: 14px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.6rem; cursor: pointer;
                    transition: 0.25s ease;
                }
                .btn-secondary-action:hover { background: #f8fafc; border-color: #94a3b8; }

                .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 2rem; }
                .full-width { grid-column: 1 / -1; }

                .settings-card { padding: 2rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; transition: all 0.3s ease; }
                .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem; }
                .card-header h3 { margin: 0; color: #111; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }

                .switch-banner { display: flex; justify-content: space-between; align-items: center; }
                .switch-icon-box {
                    width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
                    background: #f1f5f9; color: #94a3b8; transition: all 0.3s ease;
                }
                .switch-icon-box.active { background: #dcfce7; color: #16a34a; }

                /* Toggle Switch */
                .toggle-switch { position: relative; display: inline-block; width: 68px; height: 36px; flex-shrink: 0; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .toggle-slider {
                    position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1;
                    transition: 0.3s; border-radius: 36px;
                }
                .toggle-slider:before {
                    position: absolute; content: ""; height: 28px; width: 28px; left: 4px; bottom: 4px;
                    background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                input:checked + .toggle-slider { background-color: #16a34a; }
                input:checked + .toggle-slider:before { transform: translateX(32px); }

                .fields-stack { display: flex; flex-direction: column; gap: 1.5rem; }
                .field-group label { font-size: 0.75rem; font-weight: 800; color: #111; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                .field-group .hint { font-size: 0.75rem; color: #666; margin: 0.4rem 0 0; }

                input, textarea {
                    width: 100%; padding: 0.85rem 1rem; background: #ffffff; 
                    border: 1px solid #d1d5db; border-radius: 12px; font-family: inherit;
                }
                input:focus, textarea:focus { border-color: hsl(var(--primary)); outline: none; box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15); }

                .subscribers-table { width: 100%; border-collapse: collapse; text-align: left; }
                .subscribers-table th { padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                .subscribers-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.92rem; }
                .subscribers-table tr:hover { background: #fafafa; }

                /* Preview Modal */
                .preview-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); z-index: 9999;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 1.5rem; backdrop-filter: blur(8px);
                }
                .preview-modal-content {
                    width: 100%; max-width: 1050px; height: 90vh; background: #1a0208; border-radius: 20px;
                    overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.5);
                    border: 1px solid rgba(223, 170, 91, 0.3);
                }
                .preview-modal-bar {
                    background: #2a040e; padding: 0.85rem 1.5rem; display: flex; justify-content: space-between;
                    align-items: center; color: #f3e5c8; border-bottom: 1px solid rgba(223, 170, 91, 0.2);
                }
                .close-preview-btn {
                    background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #ffffff; padding: 0.4rem 0.9rem; border-radius: 8px; font-weight: 700; cursor: pointer;
                }
                .close-preview-btn:hover { background: rgba(255, 255, 255, 0.2); }
                .preview-frame { flex: 1; overflow-y: auto; }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 10000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: #10b981; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .toast-error { background: #ef4444; color: white; }
            `}</style>
        </div>
    );
}
