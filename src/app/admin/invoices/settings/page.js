'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Loader2, Printer, Save, ArrowLeft, Image, MapPin,
    Hash, Info, CheckCircle2, MessageSquare, Settings, Upload
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MediaPicker from '@/components/MediaPicker';

export default function InvoiceSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState({
        shop_name: 'Cast Printz',
        shop_logo: '',
        shop_address: '',
        shop_gstin: '',
        bill_terms: '',
        bill_footer: 'Thank you for shopping with us!',
        business_phone: '15551678232'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data } = await supabase.from('app_settings').select('*');
                if (data) {
                    const mapped = {};
                    data.forEach(item => mapped[item.key] = item.value);
                    setSettings(prev => ({ ...prev, ...mapped }));
                }
            } catch (err) {
                console.error('Settings load error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const saveSettings = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'shop_name', value: settings.shop_name },
                { key: 'shop_logo', value: settings.shop_logo },
                { key: 'shop_address', value: settings.shop_address },
                { key: 'shop_gstin', value: settings.shop_gstin },
                { key: 'bill_terms', value: settings.bill_terms },
                { key: 'bill_footer', value: settings.bill_footer },
                { key: 'business_phone', value: settings.business_phone }
            ];
            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;
            setNotification({ message: 'Invoice settings updated!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to save settings: ' + err.message, type: 'error' });
            setTimeout(() => setNotification(null), 3500);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={24} className="animate-spin" /> <span style={{ marginLeft: '1rem' }}>Loading configuration...</span>
            </div>
        );
    }

    return (
        <div className="animate-enter" style={{ padding: '0' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link href="/admin/invoices" style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-subtle))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                        transition: 'all 0.2s'
                    }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Invoice Settings</h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>Customize the look and feel of your Cast Printz invoices</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', minWidth: '180px', boxShadow: '0 8px 20px hsl(var(--primary)/0.2)' }}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save All Changes
                    </button>
                </div>
            </div>

            {notification && (
                <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 1100, background: 'hsl(142 70% 45%)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <CheckCircle2 size={20} /> {notification.message}
                </div>
            )}

            <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
                {/* SETTINGS EDITOR */}
                <div className="card" style={{ flex: '0 0 450px', padding: '2rem', background: 'hsl(var(--bg-panel)/0.3)', border: '1px solid hsl(var(--border-subtle))' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'hsl(var(--primary))' }}>
                        <Settings size={18} /> Branding Controls
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Shop Branding Name</label>
                            <input type="text" value={settings.shop_name} onChange={e => setSettings({ ...settings, shop_name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Logo Image URL</label>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <input type="text" value={settings.shop_logo} onChange={e => setSettings({ ...settings, shop_logo: e.target.value })} placeholder="https://..." style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                                <button type="button" onClick={() => setShowMediaPicker(true)} className="btn btn-secondary" style={{ padding: '0.75rem', height: 'auto' }} title="Open Media Library">
                                    <Upload size={18} />
                                </button>
                                {settings.shop_logo && (
                                    <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))', background: 'white' }}>
                                        <img src={settings.shop_logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Store Physical Address</label>
                            <textarea rows={3} value={settings.shop_address} onChange={e => setSettings({ ...settings, shop_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>GSTIN Number</label>
                                <input type="text" value={settings.shop_gstin} onChange={e => setSettings({ ...settings, shop_gstin: e.target.value })} placeholder="Optional" style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>WhatsApp Contact</label>
                                <input type="text" value={settings.business_phone} onChange={e => setSettings({ ...settings, business_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Personalized Footer Greeting</label>
                            <input type="text" value={settings.bill_footer} onChange={e => setSettings({ ...settings, bill_footer: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Terms & Conditions (Official)</label>
                            <textarea rows={6} value={settings.bill_terms} onChange={e => setSettings({ ...settings, bill_terms: e.target.value })} placeholder="One rule per line..." style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', lineHeight: 1.6, fontSize: '0.85rem', outline: 'none' }} />
                        </div>
                    </div>
                </div>

                {/* REAL-TIME INVOICE PREVIEW */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: '#6366f1', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, width: 'fit-content', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Info size={14} /> LIVE SAMPLE PREVIEW (REAL-TIME)
                    </div>

                    <div style={{
                        background: 'white', width: '100%', maxWidth: '800px',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.2)', padding: '3.5rem',
                        borderRadius: '2px', fontFamily: 'var(--font-body)', color: 'black'
                    }}>
                        {/* Bill Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #6366f1', paddingBottom: '2.5rem', marginBottom: '2.5rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                    {settings.shop_logo ? (
                                        <img src={settings.shop_logo} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ fontSize: '2.5rem' }}>💮</div>
                                    )}
                                    <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>{settings.shop_name}</h1>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0, maxWidth: '350px', lineHeight: 1.6 }}>{settings.shop_address || 'Handloom Hub, Artisan Square, Chennai'}</p>
                                {settings.shop_gstin && <p style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 700, marginTop: '0.6rem', letterSpacing: '0.05em' }}>GSTIN: {settings.shop_gstin}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#6366f1', margin: 0, letterSpacing: '0.05em' }}>TAX INVOICE</h2>
                                <p style={{ margin: '0.75rem 0 0', fontWeight: 800, fontSize: '1rem', color: '#1f2937' }}>#SAMPLE-9442</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>

                        {/* Customer Details section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Billed To</div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>Ananya Iyer</div>
                                <div style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.4rem', fontWeight: 500 }}>+91 98400 12345</div>
                                <div style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.6rem', lineHeight: 1.6 }}>Tower A, Olympus Residency,<br />Anna Nagar, Chennai 600040</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Order Context</div>
                                <div style={{ fontSize: '0.9rem', color: '#1f2937' }}>Payment: <strong>Prepaid (UPI)</strong></div>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#1f2937' }}>Mode: <strong>Express Shipping</strong></div>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Status: <span style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>SHIPPED</span></div>
                            </div>
                        </div>

                        {/* Items table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', marginBottom: '3rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #6366f1' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Description</th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '1rem' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right', padding: '1rem' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1f2937' }}>Handwoven Banarasi Silk Saree</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>SKU: SILK-BAN-001 • Color: Royal Blue</div>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>1</td>
                                    <td style={{ textAlign: 'right', padding: '1.25rem 1rem' }}>₹14,999</td>
                                    <td style={{ textAlign: 'right', padding: '1.25rem 1rem', fontWeight: 800 }}>₹14,999</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1f2937' }}>Matching Designer Blouse Piece</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Custom Stitched • Size: 38</div>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>1</td>
                                    <td style={{ textAlign: 'right', padding: '1.25rem 1rem' }}>₹2,500</td>
                                    <td style={{ textAlign: 'right', padding: '1.25rem 1rem', fontWeight: 800 }}>₹2,500</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Calculations */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
                            <div style={{ width: '300px', background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#4b5563' }}>
                                    <span>Subtotal</span><span>₹17,499</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#4b5563' }}>
                                    <span>Shipping</span><span>₹0 (Free)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', pt: '1rem', borderTop: '2px solid #e2e8f0', fontWeight: 900, fontSize: '1.25rem', color: '#6366f1', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                    <span>Total Amount</span><span>₹17,499</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Terms & Branding) */}
                        <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '2.5rem', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '3rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Terms & Conditions</div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{settings.bill_terms || '• Terms not configured yet'}</div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#1f2937', margin: '0 0 0.4rem 0' }}>{settings.bill_footer}</p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', color: '#6366f1', fontWeight: 700, fontSize: '0.85rem' }}>
                                    <MessageSquare size={14} /> +{settings.business_phone}
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.5rem', fontWeight: 600 }}>Digitally generated on behalf of {settings.shop_name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showMediaPicker && (
                <MediaPicker
                    currentImage={settings.shop_logo}
                    onSelect={(url) => {
                        setSettings({ ...settings, shop_logo: url });
                        setShowMediaPicker(false);
                    }}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}

            <style jsx>{`
                @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-enter { animation: fade 0.4s ease-out; }
            `}</style>
        </div>
    );
}
