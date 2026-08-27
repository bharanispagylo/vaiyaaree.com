'use client';
import { useState } from 'react';
import { Users, Mail, Phone, MapPin, Lock, X, Check, Loader2 } from 'lucide-react';

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim() || !formData.phone.trim()) {
            setError('Full Name and Phone Number are required.');
            return;
        }

        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (formData.email.trim() && !formData.email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    email: formData.email.trim() || null,
                    address: formData.address.trim() || null,
                    password: formData.password.trim() || null
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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
                    maxWidth: '520px',
                    padding: '2.25rem 2rem',
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
                <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>
                    Create a customer profile for order management and WhatsApp sync.
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Full Name <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="admin-input"
                            placeholder="e.g. Priyadharshini"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Phone Number <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="admin-input"
                                    placeholder="e.g. 9876543210"
                                    required
                                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Email Address (Optional)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="admin-input"
                                    placeholder="e.g. customer@gmail.com"
                                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Shipping Address (Optional)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="admin-input"
                                placeholder="Door no, Street, City, State, Pincode"
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Initial Password (Optional)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="admin-input"
                                placeholder="Optional account password (min 6 characters)"
                                minLength={6}
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            />
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                            Leave empty if customer will log in via WhatsApp OTP.
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="btn btn-secondary" 
                            disabled={loading}
                            style={{ padding: '0.85rem 1.5rem', borderRadius: '12px' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading}
                            style={{ 
                                padding: '0.85rem 1.75rem', 
                                borderRadius: '12px',
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px' 
                            }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                            {loading ? 'Saving...' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
