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
        shop_name: 'Vaiyaaree',
        shop_logo: '',
        shop_address: '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.',
        shop_gstin: '8473939083',
        bill_terms: '',
        bill_footer: 'Thank you for shopping with Vaiyaaree!',
        business_phone: '+91 86677 93292',
        company_vat_tin: '33132028969',
        company_cst_no: '1091562',
        company_pan_no: 'AAIFG6568K',
        bank_name: 'STATE BANK INDIA',
        bank_account: '170902000000962',
        bank_ifsc: 'SBI0001709',
        bank_upi: 'vaiyaaree@upi'
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
                { key: 'shop_name', value: String(settings.shop_name || '') },
                { key: 'shop_logo', value: String(settings.shop_logo || '') },
                { key: 'shop_address', value: String(settings.shop_address || '') },
                { key: 'shop_gstin', value: String(settings.shop_gstin || '') },
                { key: 'bill_terms', value: String(settings.bill_terms || '') },
                { key: 'bill_footer', value: String(settings.bill_footer || '') },
                { key: 'business_phone', value: String(settings.business_phone || '') },
                { key: 'company_vat_tin', value: String(settings.company_vat_tin || '') },
                { key: 'company_cst_no', value: String(settings.company_cst_no || '') },
                { key: 'company_pan_no', value: String(settings.company_pan_no || '') },
                { key: 'bank_name', value: String(settings.bank_name || '') },
                { key: 'bank_account', value: String(settings.bank_account || '') },
                { key: 'bank_ifsc', value: String(settings.bank_ifsc || '') },
                { key: 'bank_upi', value: String(settings.bank_upi || '') }
            ];

            const { error } = await supabase
                .from('app_settings')
                .upsert(updates, { onConflict: 'key' });

            if (error) throw error;

            setNotification({ message: 'Invoice settings saved successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('Invoice settings save error:', err);
            const errMsg = err?.message || err?.details || err?.hint || (typeof err === 'object' && Object.keys(err).length > 0 ? JSON.stringify(err) : String(err)) || 'Failed to save settings';
            setNotification({ message: 'Failed to save settings: ' + errMsg, type: 'error' });
            setTimeout(() => setNotification(null), 4000);
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
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>Customize the look and feel of your Vaiyaaree invoices</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', minWidth: '180px', boxShadow: '0 8px 20px hsl(var(--primary)/0.2)' }}>
                        {saving && <Loader2 size={18} className="animate-spin" />} Save All Changes
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
                                <input type="tel" value={settings.business_phone} onChange={e => setSettings({ ...settings, business_phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })} pattern="[0-9]{10}" maxLength="10" minLength="10" style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', outline: 'none' }} />
                            </div>
                        </div>



                        {/* BANK DETAILS SECTION */}
                        <div style={{ borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--primary))', marginBottom: '0.8rem' }}>Bank Details (Payment Info)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Bank Name</label>
                                    <input type="text" value={settings.bank_name || ''} onChange={e => setSettings({ ...settings, bank_name: e.target.value })} placeholder="e.g. STATE BANK INDIA" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Bank A/C Number</label>
                                        <input type="text" value={settings.bank_account || ''} onChange={e => setSettings({ ...settings, bank_account: e.target.value })} placeholder="e.g. 170902000000962" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Branch & IFSC Code</label>
                                        <input type="text" value={settings.bank_ifsc || ''} onChange={e => setSettings({ ...settings, bank_ifsc: e.target.value })} placeholder="e.g. SBI0001709" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>UPI ID</label>
                                    <input type="text" value={settings.bank_upi || ''} onChange={e => setSettings({ ...settings, bank_upi: e.target.value })} placeholder="e.g. vaiyaaree@upi" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
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
                        boxShadow: '0 30px 80px rgba(0,0,0,0.2)', padding: '10mm',
                        borderRadius: '2px', color: 'black', fontFamily: 'Arial, sans-serif'
                    }}>
                        <div style={{ border: '1px solid black' }}>
                            {/* Top Company Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', minHeight: '80px', position: 'relative' }}>
                                {settings.shop_logo && (
                                    <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <img src={settings.shop_logo}
                                            alt="Logo" style={{ maxHeight: '75px', maxWidth: '160px', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}
                                <div style={{ textAlign: 'center', width: '100%', paddingLeft: settings.shop_logo ? '160px' : '0', paddingRight: settings.shop_logo ? '160px' : '0' }}>
                                    <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{settings.shop_name}</h1>
                                    {settings.shop_address && <div style={{ fontSize: '12px', marginTop: '4px', whiteSpace: 'pre-line' }}>{settings.shop_address}</div>}
                                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                                        {settings.shop_gstin && <span><strong>GSTIN:</strong> {settings.shop_gstin}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* TAX INVOICE Bar */}
                            <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', background: '#f0f0f0', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>
                                TAX INVOICE
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <tbody>
                                    {/* Info Row */}
                                    <tr>
                                        <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', verticalAlign: 'top' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '5px' }}>
                                                <div><strong>Invoice No</strong></div><div>: SAMPLE-9442</div>
                                                <div><strong>Invoice Date</strong></div><div>: {new Date().toLocaleDateString('en-IN')}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '5px' }}>
                                                <div><strong>Payment Method</strong></div><div>: Prepaid (UPI)</div>
                                                <div><strong>Order Status</strong></div><div>: SHIPPED</div>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Details Headers */}
                                    <tr>
                                        <td style={{ padding: '3px 5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', fontWeight: 'bold', background: '#f9f9f9' }}>
                                            Billing Address :
                                        </td>
                                        <td style={{ padding: '3px 5px', width: '50%', borderBottom: '1px solid black', fontWeight: 'bold', background: '#f9f9f9' }}>
                                            Shipping Address :
                                        </td>
                                    </tr>

                                    {/* Details Content */}
                                    <tr>
                                        <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', verticalAlign: 'top' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px' }}>
                                                <div><strong>Name</strong></div><div>: Ananya Iyer</div>
                                                <div><strong>Address</strong></div><div>: Tower A, Olympus Residency, Anna Nagar, Chennai 600040</div>
                                                <div><strong>Phone</strong></div><div>: +91 98400 12345</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px' }}>
                                                <div><strong>Name</strong></div><div>: Ananya Iyer</div>
                                                <div><strong>Address</strong></div><div>: Tower A, Olympus Residency, Anna Nagar, Chennai 600040</div>
                                                <div><strong>Phone</strong></div><div>: +91 98400 12345</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Items Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f0f0f0' }}>
                                        <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '5%', textAlign: 'center' }}>S.No</th>
                                        <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '50%', textAlign: 'left' }}>Description</th>
                                        <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '15%', textAlign: 'right' }}>Price</th>
                                        <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '10%', textAlign: 'center' }}>Qty</th>
                                        <th style={{ borderBottom: '1px solid black', padding: '5px', width: '20%', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', verticalAlign: 'top' }}>Handwoven Banarasi Silk Saree (Royal Blue)</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>14999.00</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                                        <td style={{ padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>14999.00</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>2</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', verticalAlign: 'top' }}>Matching Designer Blouse Piece (Size 38)</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>2500.00</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                                        <td style={{ padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>2500.00</td>
                                    </tr>
                                    {Array.from({ length: 1 }).map((_, i) => (
                                        <tr key={`empty-${i}`}>
                                            <td style={{ borderRight: '1px solid black', padding: '5px', color: 'transparent' }}>.</td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ padding: '5px' }}></td>
                                        </tr>
                                    ))}

                                    {/* Total Row */}
                                    <tr style={{ borderTop: '1px solid black', borderBottom: '1px solid black' }}>
                                        <td colSpan={3} style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                                        <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>2</td>
                                        <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>17499.00</td>
                                    </tr>

                                    {/* Amount in words */}
                                    <tr style={{ borderBottom: '1px solid black' }}>
                                        <td colSpan={5} style={{ padding: '5px' }}>
                                            <strong>Amount Chargeable (in words): </strong> 
                                            Rupees Seventeen Thousand Four Hundred and Ninety Nine Only
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Company Address & Bank Details Section */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderBottom: '1px solid black' }}>
                                <thead>
                                    <tr style={{ background: '#f0f0f0', borderBottom: '1px solid black' }}>
                                        <th style={{ borderRight: '1px solid black', padding: '4px 8px', width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                                            Company Address
                                        </th>
                                        <th style={{ padding: '4px 8px', width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                                            Bank Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black', padding: '6px 8px', verticalAlign: 'top', width: '50%' }}>
                                            <div style={{ lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                                                {settings.shop_address || '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '6px 8px', verticalAlign: 'top', width: '50%' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 10px 1fr', gap: '2px', lineHeight: '1.6' }}>
                                                <div><strong>Bank Name</strong></div><div>:</div><div>{settings.bank_name || 'STATE BANK INDIA'}</div>
                                                <div><strong>Bank A/C</strong></div><div>:</div><div>{settings.bank_account || '170902000000962'}</div>
                                                <div><strong>Branch & IFSC Code</strong></div><div>:</div><div>{settings.bank_ifsc || 'SBI0001709'}</div>
                                                <div><strong>UPI ID</strong></div><div>:</div><div>{settings.bank_upi || 'vaiyaaree@upi'}</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Footer sections */}
                            <div style={{ display: 'flex' }}>
                                <div style={{ width: '50%', borderRight: '1px solid black', padding: '5px' }}>
                                    <div style={{ paddingBottom: '2px', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Terms & Conditions / Declarations :
                                    </div>
                                    <div style={{ fontSize: '11px', whiteSpace: 'pre-line' }}>
                                        {settings.bill_terms || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                                    </div>
                                </div>
                                <div style={{ width: '50%', padding: '5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold', width: '100%', textAlign: 'right', paddingRight: '20px' }}>For {settings.shop_name}</div>
                                    <div style={{ marginTop: '50px', fontWeight: 'bold', width: '100%', textAlign: 'right', paddingRight: '20px' }}>Authorized Signatory</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#666' }}>
                            {settings.bill_footer}
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
