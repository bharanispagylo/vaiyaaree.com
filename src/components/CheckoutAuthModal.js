'use client';
import { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function CheckoutAuthModal({ onSuccess }) {
    const { setUser, showToast, setCheckoutForm } = useShop();

    const [activeTab, setActiveTab] = useState('register'); // Default to 'register' for new user signup

    // New User Sign Up State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    // Existing User Login State
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // UI Loading & Error States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle New User Registration
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!regName.trim()) {
            setError('Please enter your Full Name.');
            return;
        }
        if (!regEmail.trim() || !regEmail.includes('@')) {
            setError('Please enter a valid Email Address.');
            return;
        }
        const cleanDigits = regPhone.replace(/\D/g, '').slice(-10);
        if (cleanDigits.length !== 10) {
            setError('Please enter a valid 10-digit Mobile Number.');
            return;
        }
        if (!regPassword || regPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            setError('New Password and Confirm Password do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regName.trim(),
                    email: regEmail.trim(),
                    phone: cleanDigits,
                    password: regPassword
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customerData = { ...data.customer, login_at: Date.now() };
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);

                // Auto populate customer details into checkout form
                setCheckoutForm(prev => ({
                    ...prev,
                    billingName: customerData.name || prev.billingName || '',
                    billingPhone: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.billingPhone || ''),
                    billingWhatsApp: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.billingWhatsApp || ''),
                    billingEmail: customerData.email || prev.billingEmail || '',
                    shippingName: customerData.name || prev.shippingName || '',
                    shippingPhone: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.shippingPhone || '')
                }));

                showToast('Account Created Successfully! Continuing Checkout.', 'success');
                if (onSuccess) onSuccess(customerData);
            } else {
                setError(data.error || 'Account creation failed. Please try again.');
            }
        } catch (err) {
            setError('Connection failed. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Existing User Login
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!loginIdentifier.trim()) {
            setError('Please enter your Mobile Number or Email address.');
            return;
        }
        if (!loginPassword.trim()) {
            setError('Please enter your Password.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: loginIdentifier.trim(),
                    password: loginPassword.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customerData = { ...data.customer, login_at: Date.now() };
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);

                // Auto populate customer details into checkout form
                setCheckoutForm(prev => ({
                    ...prev,
                    billingName: customerData.name || prev.billingName || '',
                    billingPhone: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.billingPhone || ''),
                    billingWhatsApp: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.billingWhatsApp || ''),
                    billingEmail: customerData.email || prev.billingEmail || '',
                    billingAddress: customerData.address || prev.billingAddress || '',
                    billingCity: customerData.city || prev.billingCity || '',
                    billingState: customerData.state || prev.billingState || 'Tamil Nadu',
                    billingPincode: customerData.pincode || prev.billingPincode || '',
                    shippingName: customerData.name || prev.shippingName || '',
                    shippingPhone: customerData.phone ? customerData.phone.replace(/^91/, '') : (prev.shippingPhone || '')
                }));

                showToast('Login Successful! Continuing Checkout.', 'success');
                if (onSuccess) onSuccess(customerData);
            } else {
                setError(data.error || 'Invalid Mobile/Email or Password. Please try again.');
            }
        } catch (err) {
            setError('Connection failed. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(25, 10, 15, 0.75)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            fontFamily: 'var(--font-roboto), sans-serif'
        }}>
            <div 
                className="no-scrollbar"
                style={{
                    maxWidth: '450px',
                    width: '100%',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '1.75rem 1.6rem',
                    boxShadow: '0 25px 60px rgba(93, 8, 33, 0.25)',
                    border: '1px solid #f0e6df',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', background: '#fff', borderRadius: '12px', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <img src="/images/vaiyaaree-logo.png" alt="Vaiyaaree" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.25rem' }}>
                        Sign Up to Complete Checkout
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, lineHeight: 1.4 }}>
                        Please create an account or sign in to continue with your purchase.
                    </p>
                </div>

                {/* Lock Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: 'rgba(93, 8, 33, 0.06)',
                    border: '1px solid rgba(93, 8, 33, 0.18)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.78rem',
                    color: '#5d0821',
                    fontWeight: 700,
                    marginBottom: '1rem'
                }}>
                    <ShieldCheck size={15} /> Checkout Page Locked Until Authentication
                </div>

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    background: '#f8f4ee',
                    padding: '4px',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    border: '1px solid #efe5db'
                }}>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('register'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.7rem 0.5rem',
                            border: 'none',
                            borderRadius: '9px',
                            background: activeTab === 'register' ? '#ffffff' : 'transparent',
                            color: activeTab === 'register' ? '#5d0821' : '#777',
                            fontWeight: activeTab === 'register' ? 700 : 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'register' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Create Account
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('login'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.7rem 0.5rem',
                            border: 'none',
                            borderRadius: '9px',
                            background: activeTab === 'login' ? '#ffffff' : 'transparent',
                            color: activeTab === 'login' ? '#5d0821' : '#777',
                            fontWeight: activeTab === 'login' ? 700 : 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'login' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Existing User Login
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* TAB 1: NEW USER CREATE ACCOUNT */}
                {activeTab === 'register' && (
                    <form onSubmit={handleRegisterSubmit}>
                        <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Full Name <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={e => setRegName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                    placeholder="Enter your full name"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email Address <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="email"
                                    value={regEmail}
                                    onChange={e => setRegEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Mobile Number <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="tel"
                                    value={regPhone}
                                    onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                    placeholder="10-digit mobile number"
                                    maxLength="10"
                                    minLength="10"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                New Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showRegPassword ? "text" : "password"}
                                    value={regPassword}
                                    onChange={e => setRegPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    minLength="6"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegPassword(!showRegPassword)}
                                    style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Confirm Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showRegPassword ? "text" : "password"}
                                    value={regConfirmPassword}
                                    onChange={e => setRegConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    minLength="6"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            {loading ? 'Creating Account...' : 'Create Account & Continue Checkout →'}
                        </button>
                    </form>
                )}

                {/* TAB 2: EXISTING USER LOGIN */}
                {activeTab === 'login' && (
                    <form onSubmit={handleLoginSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Mobile Number or Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    value={loginIdentifier}
                                    onChange={e => setLoginIdentifier(e.target.value)}
                                    placeholder="Enter 10-digit Mobile or Email"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Password
                                </label>
                                <Link href="/forgot-password" target="_blank" style={{ fontSize: '0.75rem', color: '#5d0821', fontWeight: 700, textDecoration: 'none' }}>
                                    Forgot Password?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showLoginPassword ? "text" : "password"}
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            {loading ? 'Logging in...' : 'Login & Continue Checkout →'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
