'use client';

import { useState } from 'react';
import { Save, Store, CreditCard, Bell, Globe, MapPin, Phone, Truck, Percent, Power, Instagram, Facebook } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('General');

    const tabs = [
        { label: 'General', icon: Store },
        { label: 'Business & Tax', icon: Percent },
        { label: 'Shipping & Delivery', icon: Truck },
        { label: 'Social & Support', icon: Phone },
    ];

    return (
        <div className="animate-enter">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800 }}>Caste Print Settings</h1>
                <p>Manage your store preferences and configuration</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
                {/* Settings Sidebar */}
                <div className="card" style={{ padding: '1rem', height: 'fit-content' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tabs.map((item) => (
                            <button key={item.label} onClick={() => setActiveTab(item.label)} style={{
                                display: 'flex', alignItems: 'center', gap: '0.85rem',
                                padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
                                background: activeTab === item.label ? 'linear-gradient(90deg, hsl(var(--primary) / 0.15), transparent)' : 'transparent',
                                color: activeTab === item.label ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                borderLeft: activeTab === item.label ? '4px solid hsl(var(--primary))' : '4px solid transparent',
                                fontWeight: activeTab === item.label ? 600 : 500,
                                textAlign: 'left', transition: 'all 0.2s', fontSize: '0.95rem'
                            }}>
                                <item.icon size={18} /> {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Settings Content */}
                <div className="card" style={{ padding: '2.5rem' }}>

                    {/* ─── GENERAL TAB ─── */}
                    {activeTab === 'General' && (
                        <>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Store size={20} color="hsl(var(--primary))" /> Store Configuration
                            </h2>
                            <div style={{ display: 'grid', gap: '1.75rem', maxWidth: '600px' }}>
                                <div>
                                    <label className="label">Store Name</label>
                                    <input className="input-field" defaultValue="Caste Print Premium" />
                                </div>
                                <div>
                                    <label className="label">Store Description (SEO)</label>
                                    <textarea className="input-field" rows={3} defaultValue="Exclusive collection of Kanjivaram, Banarasi, and Designer Sarees." />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Store Status</div>
                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Turn off to stop accepting new orders temporarily.</div>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ─── BUSINESS & TAX TAB ─── */}
                    {activeTab === 'Business & Tax' && (
                        <>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Percent size={20} color="hsl(var(--primary))" /> Business & Tax Info
                            </h2>
                            <div style={{ display: 'grid', gap: '1.75rem', maxWidth: '600px' }}>
                                <div>
                                    <label className="label">GSTIN Number</label>
                                    <input className="input-field" placeholder="e.g. 29AAAAA0000A1Z5" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label className="label">PAN Number</label>
                                        <input className="input-field" placeholder="ABCDE1234F" />
                                    </div>
                                    <div>
                                        <label className="label">Default Tax Rate (%)</label>
                                        <input className="input-field" type="number" defaultValue="5" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Registered Business Address</label>
                                    <textarea className="input-field" rows={3} defaultValue="123, Silk Street, Kanchipuram, Tamil Nadu - 631501" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ─── SHIPPING TAB ─── */}
                    {activeTab === 'Shipping & Delivery' && (
                        <>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Truck size={20} color="hsl(var(--primary))" /> Shipping Configuration
                            </h2>
                            <div style={{ display: 'grid', gap: '1.75rem', maxWidth: '600px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label className="label">Standard Shipping (₹)</label>
                                        <input className="input-field" type="number" defaultValue="100" />
                                    </div>
                                    <div>
                                        <label className="label">Free Shipping Above (₹)</label>
                                        <input className="input-field" type="number" defaultValue="5000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Delivery Partner Name</label>
                                    <input className="input-field" defaultValue="DTDC / BlueDart" />
                                </div>
                                <div>
                                    <label className="label">Estimated Delivery Time</label>
                                    <input className="input-field" defaultValue="3-5 Business Days" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ─── SOCIAL & SUPPORT TAB ─── */}
                    {activeTab === 'Social & Support' && (
                        <>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Phone size={20} color="hsl(var(--primary))" /> Contact & Social
                            </h2>
                            <div style={{ display: 'grid', gap: '1.75rem', maxWidth: '600px' }}>
                                <div>
                                    <label className="label">Support WhatsApp Number</label>
                                    <input className="input-field" defaultValue="+91 75581 89732" />
                                </div>
                                <div>
                                    <label className="label">Support Email</label>
                                    <input className="input-field" defaultValue="castprintzofficial@gmail.com" />
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Instagram size={14} /> Instagram Profile URL</label>
                                    <input className="input-field" placeholder="https://instagram.com/..." />
                                </div>
                                <div>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Facebook size={14} /> Facebook Page URL</label>
                                    <input className="input-field" placeholder="https://facebook.com/..." />
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ paddingTop: '2rem', borderTop: '1px solid hsl(var(--border-subtle))', marginTop: '2.5rem' }}>
                        <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                            <Save size={18} /> Save All Changes
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .label { display: block; font-size: 0.85rem; font-weight: 600; color: hsl(var(--text-muted)); margin-bottom: 0.5rem; }
                .input-field {
                    width: 100%; padding: 0.75rem; border-radius: var(--radius-sm);
                    background: '#f1f5f9'; border: 1px solid hsl(var(--border-subtle));
                    color: hsl(var(--text-main)); outline: none; transition: border 0.2s;
                    font-family: inherit; font-size: 0.95rem;
                }
                .input-field:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1); }
                
                /* Switch Toggle */
                .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ffffff; border: 1px solid hsl(var(--border-subtle)); transition: .4s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: hsl(var(--text-muted)); transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: hsl(var(--primary)); border-color: hsl(var(--primary)); }
                input:checked + .slider:before { transform: translateX(20px); background-color: white; }
            `}</style>
        </div>
    );
}
