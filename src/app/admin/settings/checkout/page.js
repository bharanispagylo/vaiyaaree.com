'use client';

import { useState, useEffect, useMemo } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    CreditCard, Truck, Save, CheckCircle2, AlertCircle, Loader2,
    ShieldCheck, Lock, Info, Check, Sparkles, TestTube, ShoppingBag,
    Users, UserCheck, FileText, ArrowRight, HelpCircle, DollarSign,
    RefreshCw, Zap, ShieldAlert, Sliders, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSettingsPage() {
    const [settings, setSettings] = useState({
        cod_enabled: 'true',
        cod_title: 'Cash on Delivery (COD)',
        cod_description: 'Pay with cash upon delivery',
        cod_fee: '0',
        cod_min_order: '0',
        cod_max_order: '0',
        cod_advance_enabled: 'false',
        cod_advance_amount: '200',
        cod_advance_note: 'A partial advance of ₹{amount} is required online via UPI/Card to confirm your COD order. The remaining balance of ₹{balance} will be collected in cash upon delivery.',
        default_gateway: 'razorpay',
        guest_checkout_enabled: 'true',
        checkout_create_account_enabled: 'true',
        checkout_order_notes_enabled: 'true',
        checkout_separate_shipping_enabled: 'true',
        checkout_whatsapp_updates_enabled: 'true'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    // Live Checkout Testing & Simulation state
    const [testCartSubtotal, setTestCartSubtotal] = useState('1499');
    const [testPaymentChoice, setTestPaymentChoice] = useState('COD');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('app_settings')
                .select('*')
                .in('key', [
                    'cod_enabled', 'cod_title', 'cod_description',
                    'cod_fee', 'cod_min_order', 'cod_max_order',
                    'cod_advance_enabled', 'cod_advance_amount', 'cod_advance_note',
                    'default_gateway', 'guest_checkout_enabled',
                    'checkout_create_account_enabled', 'checkout_order_notes_enabled',
                    'checkout_separate_shipping_enabled', 'checkout_whatsapp_updates_enabled',
                    'razorpay_enabled'
                ]);

            if (error) throw error;

            const map = {};
            (data || []).forEach(item => {
                map[item.key] = item.value;
            });

            setSettings({
                cod_enabled: map.cod_enabled !== 'false' ? 'true' : 'false',
                cod_title: map.cod_title || 'Cash on Delivery (COD)',
                cod_description: map.cod_description || 'Pay with cash upon delivery',
                cod_fee: map.cod_fee !== undefined && map.cod_fee !== null ? String(map.cod_fee) : '0',
                cod_min_order: map.cod_min_order !== undefined && map.cod_min_order !== null ? String(map.cod_min_order) : '0',
                cod_max_order: map.cod_max_order !== undefined && map.cod_max_order !== null ? String(map.cod_max_order) : '0',
                cod_advance_enabled: map.cod_advance_enabled === 'true' ? 'true' : 'false',
                cod_advance_amount: map.cod_advance_amount !== undefined && map.cod_advance_amount !== null ? String(map.cod_advance_amount) : '200',
                cod_advance_note: map.cod_advance_note || 'A partial advance of ₹{amount} is required online via UPI/Card to confirm your COD order. The remaining balance of ₹{balance} will be collected in cash upon delivery.',
                default_gateway: map.default_gateway || 'razorpay',
                guest_checkout_enabled: map.guest_checkout_enabled !== 'false' ? 'true' : 'false',
                checkout_create_account_enabled: map.checkout_create_account_enabled !== 'false' ? 'true' : 'false',
                checkout_order_notes_enabled: map.checkout_order_notes_enabled !== 'false' ? 'true' : 'false',
                checkout_separate_shipping_enabled: map.checkout_separate_shipping_enabled !== 'false' ? 'true' : 'false',
                checkout_whatsapp_updates_enabled: map.checkout_whatsapp_updates_enabled !== 'false' ? 'true' : 'false',
                razorpay_enabled: map.razorpay_enabled !== 'false' ? 'true' : 'false'
            });
        } catch (err) {
            console.error('Fetch Checkout Settings Error:', err);
            setNotification({ message: 'Failed to load checkout settings', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setNotification(null);
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value: value !== undefined && value !== null ? value.toString() : '',
                updated_at: new Date().toISOString()
            }));

            const { error } = await mysqlClient
                .from('app_settings')
                .upsert(updates);

            if (error) throw error;

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('vaiyaaree_settings_updated'));
            }

            setNotification({
                message: 'Checkout settings saved successfully!',
                type: 'success'
            });
            setTimeout(() => setNotification(null), 3500);
        } catch (err) {
            console.error('Save Checkout Settings Error:', err);
            setNotification({ message: 'Error saving settings: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Live Checkout Simulation Calculations
    const simulationResult = useMemo(() => {
        const subtotal = Math.max(0, parseFloat(testCartSubtotal) || 0);
        const codEnabled = settings.cod_enabled === 'true';
        const codFee = Math.max(0, parseFloat(settings.cod_fee) || 0);
        const minOrder = Math.max(0, parseFloat(settings.cod_min_order) || 0);
        const maxOrder = Math.max(0, parseFloat(settings.cod_max_order) || 0);

        let codEligible = codEnabled;
        let codIneligibleReason = '';

        if (!codEnabled) {
            codEligible = false;
            codIneligibleReason = 'Cash on Delivery is currently disabled in store settings.';
        } else if (minOrder > 0 && subtotal < minOrder) {
            codEligible = false;
            codIneligibleReason = `Order subtotal (₹${subtotal.toLocaleString('en-IN')}) is below minimum COD requirement of ₹${minOrder.toLocaleString('en-IN')}.`;
        } else if (maxOrder > 0 && subtotal > maxOrder) {
            codEligible = false;
            codIneligibleReason = `Order subtotal (₹${subtotal.toLocaleString('en-IN')}) exceeds maximum COD limit of ₹${maxOrder.toLocaleString('en-IN')}.`;
        }

        const effectivePayment = (testPaymentChoice === 'COD' && codEligible) ? 'COD' : 'RAZORPAY';
        const appliedCodFee = (effectivePayment === 'COD' && codEligible) ? codFee : 0;
        const estTax = Math.round(subtotal * 0.05); // Standard 5% GST
        const estShipping = subtotal >= 5000 || subtotal === 0 ? 0 : 50;
        const finalPayable = Math.round(subtotal + estTax + estShipping + appliedCodFee);

        return {
            subtotal,
            codEligible,
            codIneligibleReason,
            effectivePayment,
            appliedCodFee,
            estTax,
            estShipping,
            finalPayable
        };
    }, [testCartSubtotal, testPaymentChoice, settings]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" color="hsl(var(--primary))" />
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Loading checkout configurations...</p>
            </div>
        );
    }

    return (
        <div className="checkout-settings-page animate-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Store Preferences
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Payment & Checkout Flow</span>
                    </div>
                    <h1>
                        <Truck size={32} color="hsl(var(--primary))" />
                        Checkout & COD Settings
                    </h1>
                    <p>
                        Configure Cash on Delivery (COD), payment method rules, guest checkout policies, and simulate live checkout calculations.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link
                        href="/admin/payment-settings"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                        <CreditCard size={16} /> Razorpay Keys &rarr;
                    </Link>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="btn-primary-glow"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            <div className="settings-layout">
                <div className="main-settings-column">

                    {/* ══════════════════════════════════════════════════════════
                        CARD 1: Cash on Delivery (COD) Master Configuration
                    ══════════════════════════════════════════════════════════ */}
                    <section className="settings-card card shadow-premium">
                        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: settings.cod_enabled === 'true' ? '#dcfce7' : '#fee2e2',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Truck size={22} color={settings.cod_enabled === 'true' ? '#16a34a' : '#dc2626'} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Cash on Delivery (COD)</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                        Allow customers to pay in cash upon receiving their order at the delivery address.
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge & Master Switch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{
                                    fontSize: '0.76rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px', letterSpacing: '0.04em',
                                    background: settings.cod_enabled === 'true' ? '#f0fdf4' : '#fef2f2',
                                    color: settings.cod_enabled === 'true' ? '#16a34a' : '#b91c1c',
                                    border: `1px solid ${settings.cod_enabled === 'true' ? '#bbf7d0' : '#fecaca'}`
                                }}>
                                    {settings.cod_enabled === 'true' ? '● COD ENABLED' : '○ COD DISABLED'}
                                </span>

                                <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.cod_enabled === 'true'}
                                        onChange={(e) => handleUpdate('cod_enabled', e.target.checked ? 'true' : 'false')}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', inset: 0,
                                        backgroundColor: settings.cod_enabled === 'true' ? '#16a34a' : '#cbd5e1',
                                        borderRadius: '30px', transition: '0.3s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '22px', width: '22px', left: '4px', bottom: '4px',
                                            backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                                            transform: settings.cod_enabled === 'true' ? 'translateX(26px)' : 'translateX(0)',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                                        }} />
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="fields-stack" style={{ marginTop: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                <div className="field-group">
                                    <label>COD Title Display (Frontend)</label>
                                    <input
                                        type="text"
                                        value={settings.cod_title}
                                        onChange={(e) => handleUpdate('cod_title', e.target.value)}
                                        placeholder="Cash on Delivery (COD)"
                                    />
                                    <p className="hint">The payment option title presented to the customer during checkout.</p>
                                </div>

                                <div className="field-group">
                                    <label>COD Subtitle / Description</label>
                                    <input
                                        type="text"
                                        value={settings.cod_description}
                                        onChange={(e) => handleUpdate('cod_description', e.target.value)}
                                        placeholder="Pay with cash upon delivery"
                                    />
                                    <p className="hint">Short instruction shown beneath the COD checkbox.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                <div className="field-group">
                                    <label>COD Convenience Fee (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            style={{ paddingLeft: '28px' }}
                                            value={settings.cod_fee}
                                            onChange={(e) => handleUpdate('cod_fee', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="hint">Extra fee added when COD is selected. Set to 0 for free COD.</p>
                                </div>

                                <div className="field-group">
                                    <label>Minimum Order for COD (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            style={{ paddingLeft: '28px' }}
                                            value={settings.cod_min_order}
                                            onChange={(e) => handleUpdate('cod_min_order', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="hint">Minimum cart subtotal required. Set 0 for no minimum.</p>
                                </div>

                                <div className="field-group">
                                    <label>Maximum Order for COD (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            style={{ paddingLeft: '28px' }}
                                            value={settings.cod_max_order}
                                            onChange={(e) => handleUpdate('cod_max_order', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="hint">Upper order limit for COD (mitigates fraud). Set 0 for unlimited.</p>
                                </div>
                            </div>

                            {/* COD Advance Payment via Razorpay Sub-Section */}
                            <div style={{
                                marginTop: '1.25rem',
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
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    style={{ paddingLeft: '28px' }}
                                                    value={settings.cod_advance_amount}
                                                    onChange={(e) => handleUpdate('cod_advance_amount', e.target.value)}
                                                    placeholder="200"
                                                />
                                            </div>
                                            <p className="hint">The customer pays this amount via Razorpay. Automatically capped at order total if cart total is less.</p>
                                        </div>
                                        <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontWeight: 700 }}>Note Below COD Button (Frontend Checkout)</label>
                                            <textarea
                                                rows={2}
                                                value={settings.cod_advance_note}
                                                onChange={(e) => handleUpdate('cod_advance_note', e.target.value)}
                                                placeholder="Pay ₹{amount} advance online to confirm. Pay balance ₹{balance} on delivery."
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                            />
                                            <p className="hint">This note will appear directly below the COD button/option in checkout. Supports <code>{'{amount}'}</code> and <code>{'{balance}'}</code> variables.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Default Payment Gateway Selector */}
                            <div style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                                    Default Pre-Selected Payment Gateway
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                    <div
                                        onClick={() => handleUpdate('default_gateway', 'razorpay')}
                                        style={{
                                            cursor: 'pointer', padding: '1rem', borderRadius: '12px',
                                            border: `2px solid ${settings.default_gateway === 'razorpay' ? 'hsl(var(--primary))' : '#e2e8f0'}`,
                                            background: settings.default_gateway === 'razorpay' ? 'hsl(var(--primary) / 0.04)' : '#ffffff',
                                            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.85rem'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            border: `2px solid ${settings.default_gateway === 'razorpay' ? 'hsl(var(--primary))' : '#cbd5e1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {settings.default_gateway === 'razorpay' && (
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>Razorpay Online Gateway</div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Pre-select online UPI / Cards / NetBanking</div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => handleUpdate('default_gateway', 'cod')}
                                        style={{
                                            cursor: 'pointer', padding: '1rem', borderRadius: '12px',
                                            border: `2px solid ${settings.default_gateway === 'cod' ? '#16a34a' : '#e2e8f0'}`,
                                            background: settings.default_gateway === 'cod' ? '#f0fdf4' : '#ffffff',
                                            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.85rem'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            border: `2px solid ${settings.default_gateway === 'cod' ? '#16a34a' : '#cbd5e1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {settings.default_gateway === 'cod' && (
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>Cash on Delivery (COD)</div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Pre-select Cash on Delivery by default</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ══════════════════════════════════════════════════════════
                        CARD 2: Checkout Policy & Experience Preferences
                    ══════════════════════════════════════════════════════════ */}
                    <section className="settings-card card shadow-premium">
                        <div className="card-header">
                            <Sliders size={20} color="hsl(var(--primary))" />
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Checkout Experience & Customer Policies</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Feature 1: Guest Checkout */}
                            <div className="toggle-row">
                                <div style={{ flex: 1 }}>
                                    <div className="toggle-title">
                                        <Users size={18} color="hsl(var(--primary))" />
                                        <span>Guest Checkout Option</span>
                                        <span className={`status-pill ${settings.guest_checkout_enabled === 'true' ? 'pill-active' : 'pill-inactive'}`}>
                                            {settings.guest_checkout_enabled === 'true' ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="toggle-desc">
                                        Allow visitors to bypass sign-in and proceed directly to entering shipping address as a guest.
                                    </p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.guest_checkout_enabled === 'true'}
                                        onChange={(e) => handleUpdate('guest_checkout_enabled', e.target.checked ? 'true' : 'false')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {/* Feature 2: In-Checkout Account Creation */}
                            <div className="toggle-row">
                                <div style={{ flex: 1 }}>
                                    <div className="toggle-title">
                                        <UserCheck size={18} color="#2563eb" />
                                        <span>In-Checkout Account Creation</span>
                                        <span className={`status-pill ${settings.checkout_create_account_enabled === 'true' ? 'pill-active' : 'pill-inactive'}`}>
                                            {settings.checkout_create_account_enabled === 'true' ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="toggle-desc">
                                        Offer guest shoppers an optional "Create an account" checkbox to choose a password without leaving the checkout page.
                                    </p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.checkout_create_account_enabled === 'true'}
                                        onChange={(e) => handleUpdate('checkout_create_account_enabled', e.target.checked ? 'true' : 'false')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {/* Feature 3: Order Notes / Delivery Instructions */}
                            <div className="toggle-row">
                                <div style={{ flex: 1 }}>
                                    <div className="toggle-title">
                                        <FileText size={18} color="#d97706" />
                                        <span>Order Delivery Notes & Gifting Instructions</span>
                                        <span className={`status-pill ${settings.checkout_order_notes_enabled === 'true' ? 'pill-active' : 'pill-inactive'}`}>
                                            {settings.checkout_order_notes_enabled === 'true' ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="toggle-desc">
                                        Display a special instructions textarea on the checkout page for delivery notes, landmarks, or gift messages.
                                    </p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.checkout_order_notes_enabled === 'true'}
                                        onChange={(e) => handleUpdate('checkout_order_notes_enabled', e.target.checked ? 'true' : 'false')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {/* Feature 4: WhatsApp Order Notifications */}
                            <div className="toggle-row">
                                <div style={{ flex: 1 }}>
                                    <div className="toggle-title">
                                        <Sparkles size={18} color="#16a34a" />
                                        <span>Instant WhatsApp Order Updates</span>
                                        <span className={`status-pill ${settings.checkout_whatsapp_updates_enabled === 'true' ? 'pill-active' : 'pill-inactive'}`}>
                                            {settings.checkout_whatsapp_updates_enabled === 'true' ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="toggle-desc">
                                        Send real-time order confirmation receipts and shipment tracking links directly to the customer's WhatsApp number.
                                    </p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.checkout_whatsapp_updates_enabled === 'true'}
                                        onChange={(e) => handleUpdate('checkout_whatsapp_updates_enabled', e.target.checked ? 'true' : 'false')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    </section>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    SIDEBAR COLUMN: Interactive Checkout Testing & Simulator
                    ("checkout testing" tool)
                ══════════════════════════════════════════════════════════ */}
                <div className="testing-sidebar-column">
                    <section className="settings-card card shadow-premium" style={{ borderTop: '4px solid hsl(var(--primary))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TestTube size={18} color="hsl(var(--primary))" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Checkout Testing & Simulator</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Test live order rules & COD validation</p>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                            Simulate customer cart totals to test whether COD rules, handling charges, and gateway selectors calculate properly under your current settings.
                        </p>

                        {/* Test Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="field-group">
                                <label>Test Cart Subtotal (₹)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        style={{ paddingLeft: '28px' }}
                                        value={testCartSubtotal}
                                        onChange={(e) => setTestCartSubtotal(e.target.value)}
                                        placeholder="1499"
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label>Simulated Payment Method</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTestPaymentChoice('COD')}
                                        style={{
                                            flex: 1, padding: '0.55rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                                            border: `1px solid ${testPaymentChoice === 'COD' ? '#16a34a' : '#cbd5e1'}`,
                                            background: testPaymentChoice === 'COD' ? '#f0fdf4' : '#ffffff',
                                            color: testPaymentChoice === 'COD' ? '#16a34a' : '#475569', cursor: 'pointer'
                                        }}
                                    >
                                        COD
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTestPaymentChoice('RAZORPAY')}
                                        style={{
                                            flex: 1, padding: '0.55rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                                            border: `1px solid ${testPaymentChoice === 'RAZORPAY' ? 'hsl(var(--primary))' : '#cbd5e1'}`,
                                            background: testPaymentChoice === 'RAZORPAY' ? 'hsl(var(--primary) / 0.08)' : '#ffffff',
                                            color: testPaymentChoice === 'RAZORPAY' ? 'hsl(var(--primary))' : '#475569', cursor: 'pointer'
                                        }}
                                    >
                                        Online
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Test Live Output Box */}
                        <div style={{
                            marginTop: '1.25rem', padding: '1rem', borderRadius: '12px',
                            background: simulationResult.codEligible ? '#f8fafc' : '#fef2f2',
                            border: `1px solid ${simulationResult.codEligible ? '#e2e8f0' : '#fecaca'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                                    COD Eligibility Check
                                </span>
                                <span style={{
                                    fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px',
                                    background: simulationResult.codEligible ? '#dcfce7' : '#fee2e2',
                                    color: simulationResult.codEligible ? '#15803d' : '#b91c1c'
                                }}>
                                    {simulationResult.codEligible ? '✓ ELIGIBLE' : '✗ NOT AVAILABLE'}
                                </span>
                            </div>

                            {!simulationResult.codEligible && (
                                <p style={{ fontSize: '0.78rem', color: '#b91c1c', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                                    {simulationResult.codIneligibleReason}
                                </p>
                            )}

                            {/* Cost Breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Subtotal:</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{simulationResult.subtotal.toLocaleString('en-IN')}.00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Est. 5% GST:</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{simulationResult.estTax.toLocaleString('en-IN')}.00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Shipping:</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{simulationResult.estShipping === 0 ? 'FREE' : `₹${simulationResult.estShipping}.00`}</span>
                                </div>
                                {simulationResult.appliedCodFee > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                                        <span>COD Fee:</span>
                                        <span>+₹{simulationResult.appliedCodFee.toLocaleString('en-IN')}.00</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                    <span>Calculated Total:</span>
                                    <span style={{ color: 'hsl(var(--primary))' }}>₹{simulationResult.finalPayable.toLocaleString('en-IN')}.00</span>
                                </div>
                            </div>
                        </div>

                        {/* Storefront Direct Link */}
                        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                            <Link
                                href="/checkout"
                                target="_blank"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--primary))', textDecoration: 'none'
                                }}
                            >
                                Open Storefront Checkout Page <ExternalLink size={14} />
                            </Link>
                        </div>
                    </section>
                </div>
            </div>

            <style jsx>{`
                .checkout-settings-page { padding: 2rem; max-width: 1240px; margin: 0 auto; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
                .page-header h1 { font-size: 2rem; display: flex; align-items: center; gap: 0.85rem; margin: 0; font-weight: 800; color: #111; }
                .page-header p { color: #64748b; margin: 0.35rem 0 0; font-size: 0.95rem; }

                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none;
                    padding: 0.75rem 1.6rem; border-radius: 12px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.65rem; cursor: pointer;
                    box-shadow: 0 4px 12px hsl(var(--primary) / 0.25); transition: 0.2s;
                }
                .btn-primary-glow:hover { transform: translateY(-1px); box-shadow: 0 6px 18px hsl(var(--primary) / 0.35); }
                .btn-primary-glow:disabled { opacity: 0.6; cursor: not-allowed; }

                .btn-secondary {
                    background: #f8fafc; color: #334155; border: 1px solid #cbd5e1;
                    padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700;
                    cursor: pointer; font-size: 0.88rem; transition: 0.2s;
                }
                .btn-secondary:hover { background: #f1f5f9; border-color: #94a3b8; }

                .settings-layout { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; }
                @media (max-width: 1024px) {
                    .settings-layout { grid-template-columns: 1fr; }
                }

                .main-settings-column { display: flex; flex-direction: column; gap: 2rem; }
                .testing-sidebar-column { display: flex; flex-direction: column; gap: 2rem; }

                .settings-card { padding: 2rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; transition: all 0.25s ease; }
                .settings-card:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.05); }

                .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; }

                .fields-stack { display: flex; flex-direction: column; gap: 1.25rem; }
                
                .field-group label { font-size: 0.76rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 0.45rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.45rem; }
                .field-group .hint { font-size: 0.76rem; color: #64748b; margin: 0.35rem 0 0; line-height: 1.4; }

                input, textarea {
                    width: 100%; padding: 0.75rem 1rem; background: #ffffff; 
                    border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.92rem;
                    color: #1e293b; outline: none; transition: border 0.2s;
                }
                input:focus, textarea:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1); }

                .toggle-row {
                    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
                    padding: 1.1rem 1.25rem; background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 14px; transition: background 0.2s;
                }
                .toggle-row:hover { background: #f1f5f9; }
                .toggle-title { display: flex; align-items: center; gap: 0.65rem; font-weight: 800; font-size: 0.95rem; color: #1e293b; margin-bottom: 0.25rem; }
                .toggle-desc { margin: 0; font-size: 0.8rem; color: #64748b; line-height: 1.4; }

                .status-pill { font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; letter-spacing: 0.04em; text-transform: uppercase; }
                .pill-active { background: #dcfce7; color: #15803d; }
                .pill-inactive { background: #f1f5f9; color: #64748b; }

                /* Toggle Switch */
                .toggle-switch { position: relative; display: inline-block; width: 50px; height: 26px; flex-shrink: 0; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
                input:checked + .slider { background-color: #16a34a; }
                input:checked + .slider:before { transform: translateX(24px); }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.8rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 1000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: #10b981; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .toast-error { background: #ef4444; color: white; }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
