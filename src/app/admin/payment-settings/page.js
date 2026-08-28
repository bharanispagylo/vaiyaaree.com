'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    CreditCard, Save, CheckCircle2, AlertCircle, Loader2,
    ShieldCheck, Lock, Globe, Server, Info, Copy, Check, Zap,
    Key, Eye, EyeOff, Sparkles, TestTube, Activity
} from 'lucide-react';

export default function AdminPaymentSettingsPage() {
    const [settings, setSettings] = useState({
        razorpay_enabled: 'true',
        razorpay_mode: 'test', // 'test' | 'live'
        razorpay_test_key_id: '',
        razorpay_test_key_secret: '',
        razorpay_live_key_id: '',
        razorpay_live_key_secret: '',
        razorpay_title: 'Pay Online (UPI, Credit/Debit Cards, NetBanking)',
        default_gateway: 'razorpay'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [originUrl, setOriginUrl] = useState('');
    const [showTestSecret, setShowTestSecret] = useState(false);
    const [showLiveSecret, setShowLiveSecret] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOriginUrl(window.location.origin);
        }
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('app_settings')
                .select('*')
                .in('key', [
                    'razorpay_enabled', 'razorpay_mode',
                    'razorpay_test_key_id', 'razorpay_test_key_secret',
                    'razorpay_live_key_id', 'razorpay_live_key_secret',
                    'razorpay_key_id', 'razorpay_key_secret',
                    'razorpay_title', 'default_gateway'
                ]);

            if (error) throw error;

            const map = {};
            (data || []).forEach(item => {
                map[item.key] = item.value;
            });

            setSettings({
                razorpay_enabled: map.razorpay_enabled !== 'false' ? 'true' : 'false',
                razorpay_mode: map.razorpay_mode || 'test',
                razorpay_test_key_id: map.razorpay_test_key_id || map.razorpay_key_id || '',
                razorpay_test_key_secret: map.razorpay_test_key_secret || map.razorpay_key_secret || '',
                razorpay_live_key_id: map.razorpay_live_key_id || '',
                razorpay_live_key_secret: map.razorpay_live_key_secret || '',
                razorpay_title: map.razorpay_title || 'Pay Online (UPI, Credit/Debit Cards, NetBanking)',
                default_gateway: map.default_gateway || 'razorpay'
            });
        } catch (err) {
            console.error('Fetch Payment Settings Error:', err);
            setNotification({ message: 'Failed to load Razorpay payment settings', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const savePaymentSettings = async () => {
        setSaving(true);
        setNotification(null);
        try {
            const activeKeyId = settings.razorpay_mode === 'live' 
                ? (settings.razorpay_live_key_id || settings.razorpay_test_key_id)
                : (settings.razorpay_test_key_id);
            
            const activeKeySecret = settings.razorpay_mode === 'live'
                ? (settings.razorpay_live_key_secret || settings.razorpay_test_key_secret)
                : (settings.razorpay_test_key_secret);

            const payload = {
                ...settings,
                razorpay_key_id: activeKeyId,
                razorpay_key_secret: activeKeySecret
            };

            const updates = Object.entries(payload).map(([key, value]) => ({
                key,
                value: value?.toString() || '',
                updated_at: new Date().toISOString()
            }));

            const { error } = await mysqlClient
                .from('app_settings')
                .upsert(updates);

            if (error) throw error;

            setNotification({ 
                message: `Razorpay settings saved successfully! Active mode: ${settings.razorpay_mode.toUpperCase()}`, 
                type: 'success' 
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (err) {
            console.error('Save Payment Settings Error:', err);
            setNotification({ message: 'Error saving settings: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const webhookUrl = `${originUrl}/api/payment/verify`;

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2500);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" color="hsl(var(--primary))" />
            <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading Razorpay Payment Configuration...</p>
        </div>
    );

    const isLive = settings.razorpay_mode === 'live';
    const isEnabled = settings.razorpay_enabled === 'true';

    return (
        <div className="payment-settings-page animate-enter" style={{ maxWidth: '1150px', margin: '0 auto', paddingBottom: '4rem' }}>
            
            {/* Top Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '10px', display: 'flex' }}>
                            <CreditCard size={28} color="#0284c7" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>Razorpay Payment Settings</h1>
                    </div>
                    <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        Configure Razorpay API credentials, switch between Sandbox (Test) & Live environments, and customize checkout options.
                    </p>
                </div>
                <button
                    onClick={savePaymentSettings}
                    disabled={saving}
                    className="btn-primary-glow"
                    style={{ padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', fontWeight: 700 }}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving Settings...' : 'Save All Changes'}
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: '1.5rem' }}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            {/* Active Status & Environment Control Banner */}
            <div style={{
                background: isEnabled ? (isLive ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)') : '#7f1d1d',
                borderRadius: '16px',
                padding: '1.5rem 1.75rem',
                color: '#ffffff',
                marginBottom: '2rem',
                boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ShieldCheck size={28} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                backgroundColor: isEnabled ? '#4ade80' : '#ef4444',
                                display: 'inline-block',
                                boxShadow: isEnabled ? '0 0 12px #4ade80' : 'none'
                            }} />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                                {isEnabled ? (isLive ? 'RAZORPAY LIVE MODE ACTIVE' : 'RAZORPAY SANDBOX (TEST) MODE ACTIVE') : 'RAZORPAY GATEWAY DISABLED'}
                            </h3>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                            {isEnabled 
                                ? (isLive ? 'Accepting real customer payments via Razorpay Live API credentials.' : 'Test environment active. Customers can test checkout without real payment.')
                                : 'Razorpay gateway option is currently hidden on customer checkout page.'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => handleUpdate('razorpay_mode', 'test')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '10px',
                            border: !isLive ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.25)',
                            background: !isLive ? '#0284c7' : 'rgba(255,255,255,0.1)',
                            color: !isLive ? '#ffffff' : '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <TestTube size={16} /> Sandbox (Test)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleUpdate('razorpay_mode', 'live')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '10px',
                            border: isLive ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.25)',
                            background: isLive ? '#22c55e' : 'rgba(255,255,255,0.1)',
                            color: isLive ? '#ffffff' : '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Activity size={16} /> Live (Production)
                    </button>
                </div>
            </div>

            {/* Gateway Status & Preferences */}
            <div className="settings-card card shadow-premium" style={{ marginBottom: '2rem', borderLeft: '5px solid #0284c7' }}>
                <div className="card-header" style={{ marginBottom: '1.25rem' }}>
                    <Zap size={20} color="#0284c7" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Gateway Status & Preference Settings</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div className="field-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                            <ShieldCheck size={15} color="#0284c7" /> Gateway Status
                        </label>
                        <select
                            value={settings.razorpay_enabled}
                            onChange={(e) => handleUpdate('razorpay_enabled', e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                        >
                            <option value="true">Enabled (Accept Online Payments)</option>
                            <option value="false">Disabled (Hide Razorpay on Checkout)</option>
                        </select>
                    </div>

                    <div className="field-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                            <Server size={15} color="#0284c7" /> Active Environment Mode
                        </label>
                        <select
                            value={settings.razorpay_mode}
                            onChange={(e) => handleUpdate('razorpay_mode', e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                        >
                            <option value="test">Sandbox / Test Mode (rzp_test_...)</option>
                            <option value="live">Production / Live Mode (rzp_live_...)</option>
                        </select>
                    </div>

                    <div className="field-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                            <CreditCard size={15} color="#0284c7" /> Gateway Display Title
                        </label>
                        <input
                            type="text"
                            value={settings.razorpay_title}
                            onChange={(e) => handleUpdate('razorpay_title', e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                        />
                    </div>
                </div>
            </div>

            {/* API Credentials Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Sandbox Credentials Card */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: !isLive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    boxShadow: !isLive ? '0 10px 25px -5px rgba(2, 132, 199, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Key size={18} color="#0284c7" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Sandbox (Test) API Credentials</h3>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>For development & staging checkout tests</span>
                                </div>
                            </div>
                            {!isLive ? (
                                <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={12} /> ACTIVE MODE
                                </span>
                            ) : (
                                <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px' }}>
                                    INACTIVE
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                            <div className="field-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    <Key size={14} color="#0284c7" /> Test Key ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="rzp_test_..."
                                    value={settings.razorpay_test_key_id}
                                    onChange={(e) => handleUpdate('razorpay_test_key_id', e.target.value)}
                                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                                />
                            </div>

                            <div className="field-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    <Lock size={14} color="#0284c7" /> Test Key Secret
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showTestSecret ? 'text' : 'password'}
                                        placeholder="Enter Test Key Secret"
                                        value={settings.razorpay_test_key_secret}
                                        onChange={(e) => handleUpdate('razorpay_test_key_secret', e.target.value)}
                                        style={{ width: '100%', padding: '0.7rem 2.75rem 0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowTestSecret(!showTestSecret)}
                                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                    >
                                        {showTestSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Credentials Card */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: isLive ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    boxShadow: isLive ? '0 10px 25px -5px rgba(22, 163, 74, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldCheck size={18} color="#16a34a" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Live (Production) API Credentials</h3>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>For real customer payments & transactions</span>
                                </div>
                            </div>
                            {isLive ? (
                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={12} /> ACTIVE MODE
                                </span>
                            ) : (
                                <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px' }}>
                                    INACTIVE
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                            {/* Live Key ID */}
                            <div className="field-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    <Key size={14} color="#16a34a" /> Live Key ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="rzp_live_..."
                                    value={settings.razorpay_live_key_id}
                                    onChange={(e) => handleUpdate('razorpay_live_key_id', e.target.value)}
                                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                                />
                                <p className="hint" style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>Starts with <code>rzp_live_</code>. Found in Razorpay Dashboard → Live Mode.</p>
                            </div>

                            {/* Live Key Secret */}
                            <div className="field-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    <Lock size={14} color="#16a34a" /> Live Key Secret
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showLiveSecret ? 'text' : 'password'}
                                        placeholder="Enter Live Key Secret"
                                        value={settings.razorpay_live_key_secret}
                                        onChange={(e) => handleUpdate('razorpay_live_key_secret', e.target.value)}
                                        style={{ width: '100%', padding: '0.7rem 2.75rem 0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLiveSecret(!showLiveSecret)}
                                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                        title={showLiveSecret ? 'Hide secret' : 'Show secret'}
                                    >
                                        {showLiveSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="hint" style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>Encrypted & used server-side for verifying real online payments.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Card: Checkout Customization Title */}
            <div className="settings-card card shadow-premium" style={{ marginBottom: '2rem', borderLeft: '5px solid #8b5cf6' }}>
                <div className="card-header" style={{ marginBottom: '1rem' }}>
                    <CreditCard size={20} color="#8b5cf6" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Checkout Customization</h3>
                </div>

                <div className="field-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                        Checkout Gateway Display Title
                    </label>
                    <input
                        type="text"
                        placeholder="Pay Online (UPI, Credit/Debit Cards, NetBanking)"
                        value={settings.razorpay_title}
                        onChange={(e) => handleUpdate('razorpay_title', e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                    />
                    <p className="hint" style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>
                        Title displayed next to the online payment option on the customer checkout screen.
                    </p>
                </div>
            </div>

            {/* Card: Webhook Endpoint Guide */}
            <div className="settings-card card shadow-premium" style={{ borderLeft: '5px solid #f59e0b' }}>
                <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                    <Globe size={20} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Webhook Endpoint & Setup Guide</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                    Configure this Webhook URL inside your Razorpay Dashboard under <strong>Settings → Webhooks</strong> to automatically verify and confirm payments.
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: '#1e293b', wordBreak: 'break-all', fontWeight: 600 }}>
                        {webhookUrl}
                    </div>
                    <button
                        type="button"
                        onClick={copyWebhookUrl}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            background: copiedWebhook ? '#22c55e' : '#0284c7', color: '#ffffff',
                            border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                        }}
                    >
                        {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                        {copiedWebhook ? 'Copied!' : 'Copy Webhook URL'}
                    </button>
                </div>
            </div>

            {/* Sticky Bottom Save Bar */}
            <div style={{
                position: 'sticky',
                bottom: '1.5rem',
                marginTop: '2.5rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1rem 1.75rem',
                boxShadow: '0 12px 30px -5px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#64748b' }}>
                    <Info size={18} color="#0284c7" />
                    <span>Mode: <strong style={{ color: '#0f172a' }}>{isLive ? 'LIVE PRODUCTION' : 'SANDBOX TEST'}</strong> | Gateway: <strong style={{ color: isEnabled ? '#16a34a' : '#dc2626' }}>{isEnabled ? 'ENABLED' : 'DISABLED'}</strong></span>
                </div>

                <button
                    onClick={savePaymentSettings}
                    disabled={saving}
                    className="btn-primary-glow"
                    style={{ padding: '0.7rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', fontWeight: 700 }}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

        </div>
    );
}
