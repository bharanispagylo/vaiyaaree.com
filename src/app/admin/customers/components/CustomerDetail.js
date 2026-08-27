'use client';
import { useState } from 'react';
import { 
    ArrowLeft, Phone, Mail, MapPin, Edit2, Check, X, 
    MessageCircle, KeyRound, Trash2, Loader2, ShieldCheck, User 
} from 'lucide-react';
import CustomerOrders from './CustomerOrders';

export default function CustomerDetail({ 
    customer, 
    onBack, 
    onCustomerUpdated, 
    onResetPasswordClick,
    onDeleteCustomerClick 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        address: customer?.lastAddress || customer?.address || ''
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    const getTierBadge = (spent) => {
        if (spent >= 20000) return { label: 'VIP', style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } };
        if (spent >= 7000) return { label: 'Gold', style: { background: 'hsl(var(--success))', color: 'white', border: 'none' } };
        if (spent >= 2000) return { label: 'Silver', style: { background: 'hsl(var(--warning))', color: 'white', border: 'none' } };
        return { label: 'Regular', style: { background: '#64748b', color: 'white', border: 'none' } };
    };

    const tier = getTierBadge(customer?.totalSpent || 0);

    const handleSaveProfile = async () => {
        setError('');
        if (!formData.name.trim()) {
            setError('Full Name is required.');
            return;
        }

        if (formData.email.trim() && !formData.email.includes('@')) {
            setError('Please enter a valid Email Address.');
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: customer?.id,
                    phone: customer?.phone,
                    name: formData.name.trim(),
                    email: formData.email.trim() || null,
                    address: formData.address.trim() || null
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

    return (
        <div className="animate-enter" style={{ paddingBottom: '3rem' }}>
            {/* Top Action Header */}
            <div className="admin-header-row" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <button 
                        onClick={onBack} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isEditing ? 'Editing Profile' : (customer?.name || 'Customer Profile')}
                            {!isEditing && (
                                <span className="badge" style={{ ...tier.style, fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px' }}>
                                    {tier.label}
                                </span>
                            )}
                        </h1>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--text-muted))', margin: '4px 0 0', fontSize: '0.85rem' }}>
                            <Phone size={14} /> {customer?.phone}
                            {customer?.email && <> • <Mail size={14} /> {customer?.email}</>}
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
                            <button 
                                onClick={() => onResetPasswordClick && onResetPasswordClick(customer)} 
                                className="btn btn-secondary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <KeyRound size={15} color="hsl(var(--primary))" /> Set Password
                            </button>

                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="btn btn-primary"
                                style={{ borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Edit2 size={15} /> Edit Profile
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

            {/* 2-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.75rem', alignItems: 'start' }}>
                {/* Left Column: Customer Profile Card */}
                <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} /> Customer Details
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Full Name
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="admin-input"
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                                    {customer?.name || 'WhatsApp Customer'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                WhatsApp Mobile Number
                            </label>
                            <div style={{ fontSize: '1rem', color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                {customer?.phone}
                                <span style={{ fontSize: '0.65rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                    PRIMARY ID
                                </span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Email Address
                            </label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="admin-input"
                                    placeholder="Enter customer email address"
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div style={{ fontSize: '0.95rem', color: customer?.email ? '#0f172a' : 'hsl(var(--text-muted))', fontWeight: customer?.email ? 600 : 400 }}>
                                    {customer?.email || 'No email address registered.'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Shipping Address
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="admin-input"
                                    rows={3}
                                    placeholder="Enter full shipping address"
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            ) : (
                                <div style={{ fontSize: '0.92rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: 1.6, color: '#334155' }}>
                                    {customer?.lastAddress || customer?.address || 'No address saved.'}
                                </div>
                            )}
                        </div>

                        {/* Financial Metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ textAlign: 'center', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                    {customer?.totalOrders || 0}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase' }}>
                                    ORDERS
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--success))' }}>
                                    ₹{(customer?.totalSpent || 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase' }}>
                                    REVENUE
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Direct Chat Button */}
                        <a 
                            href={`https://wa.me/${customer?.phone}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{
                                background: '#25D366',
                                color: '#ffffff',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '0.9rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                textDecoration: 'none',
                                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                                marginTop: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <MessageCircle size={20} /> Chat with Customer on WhatsApp
                        </a>
                    </div>
                </div>

                {/* Right Column: Order History Component */}
                <CustomerOrders 
                    orders={customer?.orders || []} 
                    onOrderUpdated={onCustomerUpdated} 
                />
            </div>
        </div>
    );
}
