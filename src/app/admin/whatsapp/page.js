'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import styles from '../page.module.css';
import { MessageSquare, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, Settings, Upload, Trash2, FileImage, Link as LinkIcon, Paperclip } from 'lucide-react';

export default function WhatsAppSettingsPage() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        setHasMounted(true);
        fetchSettings();
    }, []);

    async function handleImageUpload(key, file) {
        if (!file) return;
        setUploadingKey(key);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('skipDetection', 'true');

            const token = typeof window !== 'undefined' ? (localStorage.getItem('cast_prince_admin') || '') : '';
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.url) {
                throw new Error(data.error || 'Upload failed');
            }

            handleChange(key, data.url);
            setNotification({ message: 'Image attached successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('[WhatsApp Image Upload] Error:', err);
            setNotification({ message: 'Failed to upload image: ' + err.message, type: 'error' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setUploadingKey(null);
        }
    }

    async function fetchSettings() {
        setLoading(true);
        const { data, error } = await mysqlClient.from('app_settings').select('*');
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

            const { error } = await mysqlClient.from('app_settings').upsert(updates);
            if (error) throw error;

            setNotification({ message: 'WhatsApp configuration updated!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to save settings. Please try again.', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
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
                    {saving && <Loader2 size={18} className="animate-spin" />}
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
                        padding: '2rem', background: '#ffffff',
                        borderRadius: '20px', border: '1px solid #e5e7eb',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.75rem', color: '#111', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    <ChevronRight size={14} color="hsl(var(--primary))" /> {setting.key.replace('wa_', '').replace(/_/g, ' ')}
                                </label>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.4rem', lineHeight: 1.5 }}>
                                    {setting.description}
                                </p>
                            </div>
                        </div>

                        {setting.key.includes('image') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* File Upload Box */}
                                <div style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    flexWrap: 'wrap',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Image Preview */}
                                    {setting.value ? (
                                        <div style={{ position: 'relative', width: '110px', height: '110px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', flexShrink: 0, background: '#ffffff' }}>
                                            <img src={setting.value} alt="Attached Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                                type="button"
                                                onClick={() => handleChange(setting.key, '')}
                                                title="Remove Image"
                                                style={{
                                                    position: 'absolute', top: '6px', right: '6px',
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    background: 'rgba(239, 68, 68, 0.9)', color: '#ffffff',
                                                    border: 'none', cursor: 'pointer', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '110px', height: '110px', borderRadius: '14px',
                                            border: '1px dashed #94a3b8', background: '#ffffff',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            justifyContent: 'center', color: '#64748b', gap: '6px', flexShrink: 0
                                        }}>
                                            <FileImage size={28} />
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>No Image</span>
                                        </div>
                                    )}

                                    {/* Control Info & Attach Button */}
                                    <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                                                {setting.value ? 'Attached Welcome Image' : 'Attach Image File'}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                                                {setting.value ? 'Image file uploaded & attached. Click below to replace or update.' : 'Upload an image file (PNG, JPG, WEBP) to attach to automated welcome messages.'}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <label style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.65rem 1.25rem', borderRadius: '10px',
                                                background: uploadingKey === setting.key ? '#cbd5e1' : 'hsl(var(--primary))',
                                                color: uploadingKey === setting.key ? '#475569' : '#ffffff',
                                                fontWeight: 700, fontSize: '0.85rem', cursor: uploadingKey === setting.key ? 'not-allowed' : 'pointer',
                                                boxShadow: uploadingKey === setting.key ? 'none' : '0 4px 14px hsl(var(--primary) / 0.25)',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {uploadingKey === setting.key ? (
                                                    <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                                                ) : (
                                                    <><Upload size={16} /> {setting.value ? 'Change Image File' : 'Attach Image File'}</>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    disabled={uploadingKey === setting.key}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleImageUpload(setting.key, file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>

                                            {setting.value && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChange(setting.key, '')}
                                                    className="btn btn-secondary"
                                                    style={{
                                                        padding: '0.65rem 1rem', borderRadius: '10px',
                                                        color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)',
                                                        fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <Trash2 size={14} /> Remove Attachment
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Attachment Link Info */}
                                {setting.value && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '0.5rem 0.85rem', borderRadius: '8px' }}>
                                        <LinkIcon size={13} style={{ flexShrink: 0, color: 'hsl(var(--primary))' }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'monospace' }}>{setting.value}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                value={setting.value}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                rows={Math.max(3, setting.value.split('\n').length)}
                                style={{
                                    width: '100%', padding: '1.25rem', borderRadius: '16px',
                                    border: '1px solid #d1d5db',
                                    background: '#ffffff', color: '#111111',
                                    fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6,
                                    outline: 'none', resize: 'vertical',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .card:hover { border-color: hsl(var(--primary)) !important; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important; }
            `}</style>
        </div>
    );
}
