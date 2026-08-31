'use client';
import { useState } from 'react';
import { 
    Users, Mail, Phone, MapPin, Lock, X, Check, Loader2, 
    Globe, MessageCircle, Receipt, Truck, CheckSquare, Square, Building
} from 'lucide-react';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';

const INDIAN_STATES = [
    "Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", 
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", 
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Other"
];

const COUNTRIES = [
    "India", "United States", "United Kingdom", "United Arab Emirates", 
    "Singapore", "Malaysia", "Australia", "Canada", "Germany", "France", "Other"
];

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
    const [sameAsBilling, setSameAsBilling] = useState(true);

    const [billingData, setBillingData] = useState({
        name: '',
        country_code: DEFAULT_COUNTRY_CODE,
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        country: 'India',
        password: ''
    });

    const [shippingData, setShippingData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        country: 'India'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!billingData.name.trim() || !billingData.phone.trim()) {
            setError('Full Name and Mobile Number are required.');
            return;
        }

        const cleanPhone = billingData.phone.replace(/\D/g, '');
        if (cleanPhone.length < 7 || (billingData.country_code === '+91' && cleanPhone.length !== 10)) {
            setError('Please enter a valid Mobile Number (10 digits for India).');
            return;
        }

        if (billingData.email.trim() && !billingData.email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        if (!sameAsBilling) {
            if (!shippingData.name.trim()) {
                setError('Shipping Recipient Full Name is required when separate.');
                return;
            }
            if (shippingData.email.trim() && !shippingData.email.includes('@')) {
                setError('Please enter a valid shipping email address.');
                return;
            }
        }

        if (billingData.password && billingData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: billingData.name.trim(),
                    country_code: billingData.country_code || DEFAULT_COUNTRY_CODE,
                    phone: cleanPhone,
                    email: billingData.email.trim() || null,
                    password: billingData.password.trim() || null,
                    billing: {
                        ...billingData,
                        phone: cleanPhone,
                        whatsapp: (billingData.whatsapp || cleanPhone).replace(/\D/g, '')
                    },
                    shipping: sameAsBilling ? {
                        name: billingData.name.trim(),
                        phone: cleanPhone,
                        email: billingData.email.trim() || null,
                        address: billingData.address.trim(),
                        city: billingData.city.trim(),
                        state: billingData.state.trim(),
                        pincode: billingData.pincode.trim(),
                        country: billingData.country.trim()
                    } : {
                        ...shippingData,
                        phone: (shippingData.phone || cleanPhone).replace(/\D/g, '')
                    },
                    same_as_billing: sameAsBilling
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (onCustomerAdded) onCustomerAdded(data.message || 'Customer added successfully!');
                onClose();
            } else {
                setError(data.error || 'Failed to add customer.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
        }}>
            <div 
                className="card shadow-premium animate-enter" 
                style={{
                    width: '100%',
                    maxWidth: '680px',
                    padding: '2rem',
                    borderRadius: '24px',
                    background: '#ffffff',
                    position: 'relative',
                    border: '1px solid hsl(var(--border-subtle))',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={onClose}
                    disabled={loading}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-muted))',
                        padding: '4px'
                    }}
                >
                    <X size={20} />
                </button>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                    <Users size={22} color="hsl(var(--primary))" /> Add New Customer
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '1.25rem' }}>
                    Create customer profile with separate billing & shipping address data.
                </p>

                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* SECTION: BILLING / CUSTOMER INFO */}
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 1rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Receipt size={16} /> 1. Billing Details & Contact
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                    Full Name <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={billingData.name}
                                    onChange={(e) => setBillingData({ ...billingData, name: e.target.value })}
                                    className="admin-input"
                                    placeholder="e.g. Priyadharshini"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Mobile Number <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                            value={billingData.country_code}
                                            onChange={(e) => setBillingData({ ...billingData, country_code: e.target.value })}
                                            className="admin-input-select"
                                            style={{ width: '110px', padding: '0.55rem 0.4rem', fontWeight: 700, fontSize: '0.8rem', borderRadius: '8px', background: '#ffffff' }}
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>
                                                    {c.flag} {c.code}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="tel"
                                            value={billingData.phone}
                                            onChange={(e) => setBillingData({ ...billingData, phone: e.target.value.replace(/\D/g, '') })}
                                            className="admin-input"
                                            placeholder={billingData.country_code === '+91' ? '9876543210' : 'Mobile'}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={billingData.whatsapp}
                                        onChange={(e) => setBillingData({ ...billingData, whatsapp: e.target.value.replace(/\D/g, '') })}
                                        className="admin-input"
                                        placeholder="Same as mobile or alt"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                    Email Address (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={billingData.email}
                                    onChange={(e) => setBillingData({ ...billingData, email: e.target.value })}
                                    className="admin-input"
                                    placeholder="customer@gmail.com"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                    Billing Street Address
                                </label>
                                <textarea
                                    value={billingData.address}
                                    onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
                                    className="admin-input"
                                    placeholder="Door no, Street name, Area"
                                    rows={2}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        City / Town
                                    </label>
                                    <input
                                        type="text"
                                        value={billingData.city}
                                        onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
                                        className="admin-input"
                                        placeholder="City"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Pincode
                                    </label>
                                    <input
                                        type="text"
                                        value={billingData.pincode}
                                        onChange={(e) => setBillingData({ ...billingData, pincode: e.target.value })}
                                        className="admin-input"
                                        placeholder="Pincode"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        State
                                    </label>
                                    <select
                                        value={billingData.state}
                                        onChange={(e) => setBillingData({ ...billingData, state: e.target.value })}
                                        className="admin-input-select"
                                        style={{ width: '100%', borderRadius: '8px', padding: '0.55rem 0.6rem' }}
                                    >
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Country
                                    </label>
                                    <select
                                        value={billingData.country}
                                        onChange={(e) => setBillingData({ ...billingData, country: e.target.value })}
                                        className="admin-input-select"
                                        style={{ width: '100%', borderRadius: '8px', padding: '0.55rem 0.6rem' }}
                                    >
                                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: SHIPPING ADDRESS */}
                    <div style={{ background: '#f0fdfa', padding: '1.25rem', borderRadius: '14px', border: '1px solid #ccfbf1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Truck size={16} /> 2. Shipping Address
                            </h4>
                        </div>

                        {/* Same as billing checkbox */}
                        <label 
                            onClick={() => setSameAsBilling(!sameAsBilling)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                padding: '0.65rem 0.85rem',
                                background: sameAsBilling ? '#e0f2fe' : '#ffffff',
                                border: `1px solid ${sameAsBilling ? '#7dd3fc' : '#cbd5e1'}`,
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: sameAsBilling ? '#0369a1' : '#475569',
                                userSelect: 'none',
                                marginBottom: sameAsBilling ? 0 : '1rem'
                            }}
                        >
                            {sameAsBilling ? <CheckSquare size={18} color="#0284c7" /> : <Square size={18} color="#94a3b8" />}
                            Shipping address is same as billing address
                        </label>

                        {!sameAsBilling && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Recipient Full Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={shippingData.name}
                                        onChange={(e) => setShippingData({ ...shippingData, name: e.target.value })}
                                        className="admin-input"
                                        placeholder="Recipient Name"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Shipping Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={shippingData.phone}
                                            onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value.replace(/\D/g, '') })}
                                            className="admin-input"
                                            placeholder="Recipient Phone"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Shipping Email
                                        </label>
                                        <input
                                            type="email"
                                            value={shippingData.email}
                                            onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                                            className="admin-input"
                                            placeholder="Shipping email"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Shipping Street Address
                                    </label>
                                    <textarea
                                        value={shippingData.address}
                                        onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                                        className="admin-input"
                                        placeholder="Door no, Street name, Area"
                                        rows={2}
                                        style={{ width: '100%', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            City / Town
                                        </label>
                                        <input
                                            type="text"
                                            value={shippingData.city}
                                            onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                                            className="admin-input"
                                            placeholder="City"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={shippingData.pincode}
                                            onChange={(e) => setShippingData({ ...shippingData, pincode: e.target.value })}
                                            className="admin-input"
                                            placeholder="Pincode"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            State
                                        </label>
                                        <select
                                            value={shippingData.state}
                                            onChange={(e) => setShippingData({ ...shippingData, state: e.target.value })}
                                            className="admin-input-select"
                                            style={{ width: '100%', borderRadius: '8px', padding: '0.55rem 0.6rem' }}
                                        >
                                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Country
                                        </label>
                                        <select
                                            value={shippingData.country}
                                            onChange={(e) => setShippingData({ ...shippingData, country: e.target.value })}
                                            className="admin-input-select"
                                            style={{ width: '100%', borderRadius: '8px', padding: '0.55rem 0.6rem' }}
                                        >
                                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION: PASSWORD / ACCOUNT SECURITY */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                            Account Password (Optional)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                value={billingData.password}
                                onChange={(e) => setBillingData({ ...billingData, password: e.target.value })}
                                className="admin-input"
                                placeholder="Optional password (min 6 characters)"
                                minLength={6}
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                            Leave blank if customer will log in via OTP.
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="btn btn-secondary" 
                            disabled={loading}
                            style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading}
                            style={{ 
                                padding: '0.8rem 1.75rem', 
                                borderRadius: '12px',
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: 'hsl(var(--primary))'
                            }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                            {loading ? 'Saving Customer...' : 'Save Customer Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
