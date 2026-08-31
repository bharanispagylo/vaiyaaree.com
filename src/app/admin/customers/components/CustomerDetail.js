'use client';
import { useState, useEffect } from 'react';
import { 
    ArrowLeft, Phone, Mail, MapPin, Edit2, Check, X, 
    MessageCircle, KeyRound, Trash2, Loader2, ShieldCheck, User,
    Receipt, Truck, CheckSquare, Square, Building, Globe, Copy
} from 'lucide-react';
import { COUNTRY_CODES } from '@/lib/countryCodes';
import CustomerOrders from './CustomerOrders';

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

export default function CustomerDetail({ 
    customer, 
    onBack, 
    onCustomerUpdated, 
    onResetPasswordClick,
    onDeleteCustomerClick 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [sameAsBilling, setSameAsBilling] = useState(
        customer?.same_as_billing !== undefined ? customer.same_as_billing : true
    );

    const [billingData, setBillingData] = useState({
        name: customer?.billing?.name || customer?.name || '',
        country_code: customer?.country_code || '+91',
        phone: customer?.billing?.phone || customer?.phone || '',
        whatsapp: customer?.billing?.whatsapp || customer?.phone || '',
        email: customer?.billing?.email || customer?.email || '',
        address: customer?.billing?.address || customer?.address || '',
        city: customer?.billing?.city || customer?.city || '',
        state: customer?.billing?.state || customer?.state || 'Tamil Nadu',
        pincode: customer?.billing?.pincode || customer?.pincode || '',
        country: customer?.billing?.country || 'India'
    });

    const [shippingData, setShippingData] = useState({
        name: customer?.shipping?.name || customer?.billing?.name || customer?.name || '',
        phone: customer?.shipping?.phone || customer?.billing?.phone || customer?.phone || '',
        email: customer?.shipping?.email || customer?.billing?.email || customer?.email || '',
        address: customer?.shipping?.address || customer?.lastAddress || customer?.address || '',
        city: customer?.shipping?.city || customer?.city || '',
        state: customer?.shipping?.state || customer?.state || 'Tamil Nadu',
        pincode: customer?.shipping?.pincode || customer?.pincode || '',
        country: customer?.shipping?.country || 'India'
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    // Re-sync when customer prop changes
    useEffect(() => {
        if (!customer) return;
        setSameAsBilling(customer.same_as_billing !== undefined ? customer.same_as_billing : true);
        setBillingData({
            name: customer.billing?.name || customer.name || '',
            country_code: customer.country_code || '+91',
            phone: customer.billing?.phone || customer.phone || '',
            whatsapp: customer.billing?.whatsapp || customer.phone || '',
            email: customer.billing?.email || customer.email || '',
            address: customer.billing?.address || customer.address || '',
            city: customer.billing?.city || customer.city || '',
            state: customer.billing?.state || customer.state || 'Tamil Nadu',
            pincode: customer.billing?.pincode || customer.pincode || '',
            country: customer.billing?.country || 'India'
        });
        setShippingData({
            name: customer.shipping?.name || customer.billing?.name || customer.name || '',
            phone: customer.shipping?.phone || customer.billing?.phone || customer.phone || '',
            email: customer.shipping?.email || customer.billing?.email || customer.email || '',
            address: customer.shipping?.address || customer.lastAddress || customer.address || '',
            city: customer.shipping?.city || customer.city || '',
            state: customer.shipping?.state || customer.state || 'Tamil Nadu',
            pincode: customer.shipping?.pincode || customer.pincode || '',
            country: customer.shipping?.country || 'India'
        });
    }, [customer]);

    const getTierBadge = (spent) => {
        if (spent >= 20000) return { label: 'VIP', style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } };
        if (spent >= 7000) return { label: 'Gold', style: { background: 'hsl(var(--success))', color: 'white', border: 'none' } };
        if (spent >= 2000) return { label: 'Silver', style: { background: 'hsl(var(--warning))', color: 'white', border: 'none' } };
        return { label: 'Regular', style: { background: '#64748b', color: 'white', border: 'none' } };
    };

    const tier = getTierBadge(customer?.totalSpent || 0);

    const handleSaveProfile = async () => {
        setError('');
        if (!billingData.name.trim()) {
            setError('Billing Full Name is required.');
            return;
        }

        const cleanPhone = billingData.phone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 7) {
            setError('Please enter a valid Mobile Number for Billing.');
            return;
        }

        if (billingData.email.trim() && !billingData.email.includes('@')) {
            setError('Please enter a valid Billing Email Address.');
            return;
        }

        if (!sameAsBilling) {
            if (!shippingData.name.trim()) {
                setError('Shipping Recipient Name is required.');
                return;
            }
            if (shippingData.email.trim() && !shippingData.email.includes('@')) {
                setError('Please enter a valid Shipping Email Address.');
                return;
            }
        }

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: customer?.id,
                    phone: cleanPhone,
                    country_code: billingData.country_code || '+91',
                    name: billingData.name.trim(),
                    email: billingData.email.trim() || null,
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
                setIsEditing(false);
                if (onCustomerUpdated) onCustomerUpdated('Customer details updated successfully!');
            } else {
                setError(data.error || 'Failed to update customer.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const displayCountryCode = customer?.country_code || '+91';
    const cleanDisplayPhone = customer?.phone || '';
    const fullWaPhone = `${displayCountryCode.replace('+', '')}${customer?.billing?.whatsapp || cleanDisplayPhone}`;

    return (
        <div className="animate-enter" style={{ paddingBottom: '3rem' }}>
            {/* Top Action Header */}
            <div className="admin-header-row" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <button 
                        onClick={onBack} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Back to Customers list"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isEditing ? 'Edit Customer Profile' : (customer?.name || 'Customer Profile')}
                            {!isEditing && (
                                <span className="badge" style={{ ...tier.style, fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px' }}>
                                    {tier.label}
                                </span>
                            )}
                        </h1>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--text-muted))', margin: '4px 0 0', fontSize: '0.85rem' }}>
                            <Phone size={14} /> <strong style={{ color: '#0f172a' }}>{displayCountryCode} {cleanDisplayPhone}</strong>
                            {customer?.email && <> • <Mail size={14} /> {customer?.email}</>}
                            {customer?.billing?.city && <> • <MapPin size={14} /> {customer.billing.city}, {customer.billing.state}</>}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isEditing ? (
                        <>
                            <button 
                                onClick={() => { setIsEditing(false); setError(''); }} 
                                className="btn btn-secondary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.25rem' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveProfile} 
                                disabled={isUpdating} 
                                className="btn btn-primary" 
                                style={{ background: 'hsl(var(--success))', border: 'none', borderRadius: '12px', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <a
                                href={`https://wa.me/${fullWaPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', textDecoration: 'none', fontWeight: 700 }}
                            >
                                <MessageCircle size={15} /> WhatsApp
                            </a>

                            <button 
                                onClick={() => onResetPasswordClick && onResetPasswordClick(customer)} 
                                className="btn btn-secondary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <KeyRound size={15} color="hsl(var(--primary))" /> Manage Password
                            </button>

                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="btn btn-primary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Edit2 size={15} /> Edit Details
                            </button>

                            <button 
                                onClick={() => onDeleteCustomerClick && onDeleteCustomerClick(customer)} 
                                style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '0.65rem 1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <Trash2 size={15} /> Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div style={{
                    background: '#fdf2f2',
                    border: '1px solid #f8b4b4',
                    color: '#981b1b',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.5rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Main Grid: Details Left, Orders Right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.15fr', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* Left Column: Customer Profile + Billing & Shipping Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Financial Metrics Summary */}
                    <div className="card shadow-premium" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                            <div style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                    ₹{(customer?.totalSpent || 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginTop: '3px' }}>
                                    Total Spent
                                </div>
                            </div>
                            <div style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--success))' }}>
                                    {customer?.totalOrders || 0}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginTop: '3px' }}>
                                    Total Orders
                                </div>
                            </div>
                            <div style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px' }}>
                                    {customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'N/A'}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginTop: '3px' }}>
                                    Joined Date
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────── */}
                    {/* BILLING ADDRESS SECTION                                    */}
                    {/* ─────────────────────────────────────────────────────────── */}
                    <div className="card shadow-premium" style={{ padding: '1.75rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Receipt size={18} /> Billing Address
                            </h3>
                            <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1e40af', padding: '3px 9px', borderRadius: '6px', fontWeight: 700 }}>
                                Primary Payer Details
                            </span>
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={billingData.name}
                                        onChange={(e) => setBillingData({ ...billingData, name: e.target.value })}
                                        className="admin-input"
                                        placeholder="Full Name"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Mobile Number *
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select
                                                value={billingData.country_code}
                                                onChange={(e) => setBillingData({ ...billingData, country_code: e.target.value })}
                                                className="admin-input-select"
                                                style={{ width: '100px', fontSize: '0.8rem', padding: '0.5rem 0.4rem', borderRadius: '8px', background: '#f8fafc' }}
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
                                                placeholder="Mobile"
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            WhatsApp Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={billingData.whatsapp}
                                            onChange={(e) => setBillingData({ ...billingData, whatsapp: e.target.value.replace(/\D/g, '') })}
                                            className="admin-input"
                                            placeholder="WhatsApp"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Email Address
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
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                        Street / House / Building Address
                                    </label>
                                    <textarea
                                        value={billingData.address}
                                        onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
                                        className="admin-input"
                                        rows={2}
                                        placeholder="Door no, Street name, Area"
                                        style={{ width: '100%', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={billingData.pincode}
                                            onChange={(e) => setBillingData({ ...billingData, pincode: e.target.value })}
                                            className="admin-input"
                                            placeholder="600001"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Full Name:</span>
                                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{customer?.billing?.name || customer?.name || 'N/A'}</strong>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Phone:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                        <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', color: '#475569' }}>
                                            {displayCountryCode}
                                        </span>
                                        {customer?.billing?.phone || cleanDisplayPhone}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>WhatsApp:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#16a34a' }}>
                                        <MessageCircle size={14} />
                                        {customer?.billing?.whatsapp || cleanDisplayPhone}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Email:</span>
                                    <span style={{ color: customer?.billing?.email || customer?.email ? '#0f172a' : '#94a3b8', fontWeight: 500 }}>
                                        {customer?.billing?.email || customer?.email || 'No email provided'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'start' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', paddingTop: '2px' }}>Address:</span>
                                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>
                                        {customer?.billing?.address ? (
                                            <>
                                                <div>{customer.billing.address}</div>
                                                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                                                    {[customer.billing.city, customer.billing.state].filter(Boolean).join(', ')}
                                                    {customer.billing.pincode ? ` - ${customer.billing.pincode}` : ''}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{customer.billing.country || 'India'}</div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No billing address recorded.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─────────────────────────────────────────────────────────── */}
                    {/* SHIPPING ADDRESS SECTION                                   */}
                    {/* ─────────────────────────────────────────────────────────── */}
                    <div className="card shadow-premium" style={{ padding: '1.75rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Truck size={18} /> Shipping / Delivery Address
                            </h3>
                            {sameAsBilling && !isEditing ? (
                                <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', padding: '3px 9px', borderRadius: '6px', fontWeight: 700 }}>
                                    ✓ Same as Billing
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.72rem', background: '#f0fdfa', color: '#0f766e', padding: '3px 9px', borderRadius: '6px', fontWeight: 700 }}>
                                    Delivery Destination
                                </span>
                            )}
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Same as billing toggle */}
                                <label 
                                    onClick={() => setSameAsBilling(!sameAsBilling)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        padding: '0.65rem 0.85rem',
                                        background: sameAsBilling ? '#eff6ff' : '#f8fafc',
                                        border: `1px solid ${sameAsBilling ? '#93c5fd' : '#e2e8f0'}`,
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: sameAsBilling ? '#1d4ed8' : '#475569',
                                        userSelect: 'none'
                                    }}
                                >
                                    {sameAsBilling ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} color="#94a3b8" />}
                                    Shipping address is same as billing address
                                </label>

                                {!sameAsBilling && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                                Recipient Full Name *
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
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                                    Shipping Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={shippingData.phone}
                                                    onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value.replace(/\D/g, '') })}
                                                    className="admin-input"
                                                    placeholder="Phone"
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                                    Shipping Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={shippingData.email}
                                                    onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                                                    className="admin-input"
                                                    placeholder="Email"
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                                                Street / House / Building Address
                                            </label>
                                            <textarea
                                                value={shippingData.address}
                                                onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                                                className="admin-input"
                                                rows={2}
                                                placeholder="Door no, Street name, Area"
                                                style={{ width: '100%', resize: 'vertical' }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
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
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Recipient:</span>
                                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{customer?.shipping?.name || customer?.billing?.name || customer?.name || 'N/A'}</strong>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Phone:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{customer?.shipping?.phone || customer?.billing?.phone || cleanDisplayPhone}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Email:</span>
                                    <span style={{ color: customer?.shipping?.email || customer?.billing?.email || customer?.email ? '#0f172a' : '#94a3b8', fontWeight: 500 }}>
                                        {customer?.shipping?.email || customer?.billing?.email || customer?.email || 'N/A'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'start' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', paddingTop: '2px' }}>Address:</span>
                                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>
                                        {customer?.shipping?.address || customer?.lastAddress || customer?.address ? (
                                            <>
                                                <div>{customer?.shipping?.address || customer?.lastAddress || customer?.address}</div>
                                                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                                                    {[customer?.shipping?.city || customer?.city, customer?.shipping?.state || customer?.state].filter(Boolean).join(', ')}
                                                    {customer?.shipping?.pincode || customer?.pincode ? ` - ${customer?.shipping?.pincode || customer?.pincode}` : ''}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{customer?.shipping?.country || 'India'}</div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No shipping address recorded.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Customer Orders List */}
                <CustomerOrders 
                    customerPhone={customer?.phone}
                    customerName={customer?.name}
                    initialOrders={customer?.orders}
                />
            </div>
        </div>
    );
}
