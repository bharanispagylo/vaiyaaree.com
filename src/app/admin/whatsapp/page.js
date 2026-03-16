'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from '../page.module.css';
import { Save, MessageSquare, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, Settings } from 'lucide-react';



export default function WhatsAppSettingsPage() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        setHasMounted(true);
        fetchSettings();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        const { data, error } = await supabase.from('app_settings').select('*');
        if (data) setSettings(data);
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const updates = settings.map(s => ({
                key: s.key,
                value: s.value,
                description: s.description,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;

            setNotification({ message: 'WhatsApp configuration updated!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    function handleChange(key, value) {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    }

    if (!hasMounted) return null;

    if (loading) return <div className="safe-loading"><p>Loading settings...</p></div>;

    const groupStart = settings.find(s => s.key.includes('welcome')) ? 'Welcome Flow' : 'General';

    return (
        <div className="animate-enter" style={{ paddingBottom: '5rem' }}>
            <div className="admin-header-row" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <MessageSquare size={32} color="hsl(var(--primary))" /> WhatsApp Funnel
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>Configure automated message triggers and bot responses.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{
                        padding: '0.85rem 2rem', borderRadius: '14px',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        fontWeight: 700, boxShadow: '0 8px 25px hsl(var(--primary) / 0.25)'
                    }}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Syncing...' : 'Save Configuration'}
                </button>
            </div>

            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 1100,
                    background: 'hsl(142 70% 45%)', color: 'white',
                    padding: '1rem 2rem', borderRadius: '14px',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    fontWeight: 700, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <CheckCircle2 size={20} /> {notification.message}
                </div>
            )}

            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '900px' }}>
                {settings.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', background: 'hsl(var(--bg-panel))', borderRadius: '24px', border: '1px dashed hsl(var(--border-subtle))' }}>
                        <Settings size={40} color="hsl(var(--text-muted))" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p style={{ color: 'hsl(var(--text-muted))' }}>No WhatsApp settings detected in database.</p>
                    </div>
                )}

                {settings.filter(s => s.key.startsWith('wa_')).map(setting => (
                    <div key={setting.key} className="card shadow-premium" style={{
                        padding: '2rem', background: 'hsl(var(--bg-panel))',
                        borderRadius: '20px', border: '1px solid hsl(var(--border-subtle))',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.7rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    <ChevronRight size={14} /> {setting.key.replace('wa_', '').replace(/_/g, ' ')}
                                </label>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                                    {setting.description}
                                </p>
                            </div>
                        </div>

                        {setting.key.includes('image') ? (
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                {setting.value && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))', background: 'white', flexShrink: 0 }}>
                                        <img src={setting.value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <ImageIcon size={16} style={{ position: 'absolute', right: '1rem', top: '1rem', color: 'hsl(var(--text-muted))' }} />
                                    <input
                                        type="text"
                                        value={setting.value}
                                        onChange={(e) => handleChange(setting.key, e.target.value)}
                                        placeholder="https://..."
                                        style={{
                                            width: '100%', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <textarea
                                value={setting.value}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                rows={Math.max(3, setting.value.split('\n').length)}
                                style={{
                                    width: '100%', padding: '1.25rem', borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff',
                                    fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6,
                                    outline: 'none', resize: 'vertical',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .card:hover { border-color: hsl(var(--primary) / 0.3) !important; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.2) !important; }
            `}</style>
        </div>
    );
}
