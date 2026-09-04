'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, MessageCircle, Loader2, KeyRound } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ModalPortal from '@/components/ModalPortal';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';
import { sanitizeCustomerSession } from '@/lib/authSanitizer';

export default function CheckoutAuthModal({ onSuccess }) {
    const { setUser, showToast, setCheckoutForm } = useShop();

    const [activeTab, setActiveTab] = useState('otp'); // 'otp' | 'register' | 'login'

    // OTP Auth State (WhatsApp OTP)
    const [otpCountryCode, setOtpCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [otpPhone, setOtpPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpStep, setOtpStep] = useState(1); // 1 = Enter Phone, 2 = Enter 6-digit OTP
    const [otpCountdown, setOtpCountdown] = useState(0);

    // New User Sign Up State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regCountryCode, setRegCountryCode] = useState(DEFAULT_COUNTRY_CODE);
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

    useEffect(() => {
        let timer;
        if (otpCountdown > 0) {
            timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [otpCountdown]);

    const syncCustomerToForm = (customerData) => {
        if (!customerData) return;
        const phoneClean = customerData.phone ? String(customerData.phone).replace(/^91/, '').replace(/\D/g, '') : '';
        const cCode = customerData.country_code || DEFAULT_COUNTRY_CODE;
        setCheckoutForm(prev => ({
            ...prev,
            billingName: customerData.name || prev.billingName || '',
            billingCountryCode: cCode,
            billingPhone: phoneClean || prev.billingPhone || '',
            billingWhatsApp: phoneClean || prev.billingWhatsApp || '',
            billingEmail: customerData.email || prev.billingEmail || '',
            billingAddress: customerData.address || prev.billingAddress || '',
            billingCity: customerData.city || prev.billingCity || '',
            billingState: customerData.state || prev.billingState || 'Tamil Nadu',
            billingPincode: customerData.pincode || prev.billingPincode || '',
            shippingName: customerData.name || prev.shippingName || '',
            shippingPhone: phoneClean || prev.shippingPhone || '',
            shippingAddress: customerData.address || prev.shippingAddress || '',
            shippingCity: customerData.city || prev.shippingCity || '',
            shippingState: customerData.state || prev.shippingState || 'Tamil Nadu',
            shippingPincode: customerData.pincode || prev.shippingPincode || ''
        }));
    };

    // Handle Send WhatsApp OTP
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');

        const cleanDigits = otpPhone.replace(/\D/g, '');
        if (cleanDigits.length < 7 || (otpCountryCode === '+91' && cleanDigits.length !== 10)) {
            setError('Please enter a valid Mobile Number (10 digits for India).');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: cleanDigits,
                    country_code: otpCountryCode
                })
            });
            const data = await res.json();
            if (!res.ok && data.error && !data.error.includes('WA-DEBUG')) {
                setError(data.error || 'Failed to send OTP code.');
                return;
            }

            setOtpStep(2);
            setOtpCountdown(30);
            showToast('6-digit OTP sent to your WhatsApp number', 'info');
        } catch (err) {
            console.error('Send OTP Error:', err);
            setOtpStep(2);
            setOtpCountdown(30);
        } finally {
            setLoading(false);
        }
    };

    // Handle Verify 6-Digit WhatsApp OTP
    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!otpCode || otpCode.trim().length !== 6) {
            setError('Please enter the 6-digit WhatsApp OTP code.');
            return;
        }

        const cleanDigits = otpPhone.replace(/\D/g, '');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: cleanDigits, 
                    country_code: otpCountryCode,
                    code: otpCode.trim() 
                })
            });

            const data = await res.json();
            if (res.ok && data.success && data.user) {
                const customerData = sanitizeCustomerSession({
                    id: data.user.id || 'cust_' + cleanDigits,
                    name: data.user.name || '',
                    email: data.user.email || '',
                    phone: data.user.phone || cleanDigits,
                    country_code: data.user.country_code || otpCountryCode,
                    address: data.user.address || '',
                    city: data.user.city || '',
                    state: data.user.state || 'Tamil Nadu',
                    pincode: data.user.pincode || '',
                    role: data.user.role || 'user',
                    login_at: Date.now()
                });
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                syncCustomerToForm(customerData);
                showToast(
                    customerData.name 
                        ? `Welcome back, ${customerData.name}! Continuing Checkout.` 
                        : 'WhatsApp Verified! Continuing Checkout.', 
                    'success'
                );
                if (onSuccess) onSuccess(customerData);
            } else {
                setError(data.error || 'Invalid or expired 6-digit OTP code.');
            }
        } catch (err) {
            setError('Connection failed. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

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
        const cleanDigits = regPhone.replace(/\D/g, '');
        if (cleanDigits.length < 7 || (regCountryCode === '+91' && cleanDigits.length !== 10)) {
            setError('Please enter a valid Mobile Number (10 digits for India).');
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
                    country_code: regCountryCode,
                    password: regPassword
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customerData = sanitizeCustomerSession({ ...data.customer, login_at: Date.now() });
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                syncCustomerToForm(customerData);
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
                const customerData = sanitizeCustomerSession({ ...data.customer, login_at: Date.now() });
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                syncCustomerToForm(customerData);
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
        <ModalPortal>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
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
                        maxWidth: '480px',
                        width: '100%',
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        scrollbarWidth: 'none',
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 25px 60px rgba(93, 8, 33, 0.25)',
                        border: '1px solid #f0e6df',
                        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ width: '52px', height: '52px', margin: '0 auto 0.75rem', background: '#fff', borderRadius: '14px', padding: '6px', boxShadow: '0 4px 15px rgba(93, 8, 33, 0.12)' }}>
                                <img src="/images/vaiyaaree-logo.png" alt="Vaiyaaree" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                            </div>
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.25rem' }}>
                            Authenticate to Checkout
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, lineHeight: 1.4 }}>
                            Verify your WhatsApp or sign in to complete your purchase securely.
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex',
                        background: '#f8f4ee',
                        padding: '4px',
                        borderRadius: '12px',
                        marginBottom: '1.25rem',
                        border: '1px solid #efe5db'
                    }}>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('otp'); setError(''); }}
                            style={{
                                flex: 1.2,
                                padding: '0.65rem 0.3rem',
                                border: 'none',
                                borderRadius: '9px',
                                background: activeTab === 'otp' ? '#ffffff' : 'transparent',
                                color: activeTab === 'otp' ? '#16a34a' : '#777',
                                fontWeight: activeTab === 'otp' ? 800 : 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: activeTab === 'otp' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <MessageCircle size={14} /> WhatsApp OTP
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('register'); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '0.65rem 0.3rem',
                                border: 'none',
                                borderRadius: '9px',
                                background: activeTab === 'register' ? '#ffffff' : 'transparent',
                                color: activeTab === 'register' ? '#5d0821' : '#777',
                                fontWeight: activeTab === 'register' ? 700 : 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'register' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            New User
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('login'); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '0.65rem 0.3rem',
                                border: 'none',
                                borderRadius: '9px',
                                background: activeTab === 'login' ? '#ffffff' : 'transparent',
                                color: activeTab === 'login' ? '#5d0821' : '#777',
                                fontWeight: activeTab === 'login' ? 700 : 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'login' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Password
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

                    {/* TAB 1: WHATSAPP 6-DIGIT OTP AUTH */}
                    {activeTab === 'otp' && (
                        <div>
                            {otpStep === 1 ? (
                                <form onSubmit={handleSendOtp}>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#444', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Mobile / WhatsApp Number <span style={{ color: '#5d0821' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                value={otpCountryCode}
                                                onChange={e => setOtpCountryCode(e.target.value)}
                                                style={{ width: '115px', padding: '0.75rem 0.4rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 700, background: '#faf9f6', outline: 'none' }}
                                            >
                                                {COUNTRY_CODES.map(c => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.flag} {c.code}
                                                    </option>
                                                ))}
                                            </select>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                                <input
                                                    type="tel"
                                                    value={otpPhone}
                                                    onChange={e => setOtpPhone(e.target.value.replace(/\D/g, ''))}
                                                    placeholder={otpCountryCode === '+91' ? '10-digit mobile' : 'Enter mobile'}
                                                    required
                                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', background: '#faf9f6' }}
                                                />
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                                            🔒 A 6-digit verification code will be sent to your WhatsApp.
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !otpPhone}
                                        style={{
                                            width: '100%',
                                            padding: '0.9rem',
                                            background: otpPhone ? '#16a34a' : '#94a3b8',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: 800,
                                            fontSize: '0.92rem',
                                            letterSpacing: '0.04em',
                                            cursor: otpPhone ? 'pointer' : 'not-allowed',
                                            boxShadow: otpPhone ? '0 6px 20px rgba(22, 163, 74, 0.25)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {loading ? <><Loader2 size={18} className="animate-spin" /> Sending WhatsApp OTP...</> : <><MessageCircle size={18} /> Send 6-Digit WhatsApp OTP →</>}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp}>
                                    <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                                            Enter the 6-digit OTP sent to: <strong>{otpCountryCode} {otpPhone}</strong>
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            autoFocus
                                            value={otpCode}
                                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="••••••"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                fontSize: '1.75rem',
                                                fontWeight: 900,
                                                letterSpacing: '0.4em',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '2px solid #cbd5e1',
                                                background: '#f8fafc',
                                                outline: 'none',
                                                fontFamily: 'monospace',
                                                color: '#0f172a'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1.25rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                        {otpCountdown > 0 ? (
                                            <span style={{ color: '#64748b' }}>Resend in <strong>{otpCountdown}s</strong></span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                style={{ background: 'none', border: 'none', color: '#5d0821', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Resend OTP via WhatsApp
                                            </button>
                                        )}
                                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                                        <button
                                            type="button"
                                            onClick={() => { setOtpStep(1); setOtpCode(''); }}
                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                        >
                                            Change Number
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otpCode.length !== 6}
                                        style={{
                                            width: '100%',
                                            padding: '0.9rem',
                                            background: otpCode.length === 6 ? '#5d0821' : '#94a3b8',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: 800,
                                            fontSize: '0.92rem',
                                            cursor: otpCode.length === 6 ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {loading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : <>Verify OTP & Unlock Checkout →</>}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* TAB 2: NEW USER REGISTRATION */}
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
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={regCountryCode}
                                        onChange={e => setRegCountryCode(e.target.value)}
                                        style={{ width: '115px', padding: '0.75rem 0.4rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 700, background: '#faf9f6', outline: 'none' }}
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>
                                                {c.flag} {c.code}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                        <input
                                            type="tel"
                                            value={regPhone}
                                            onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder={regCountryCode === '+91' ? '10-digit mobile number' : 'Mobile number'}
                                            required
                                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '9px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                        />
                                    </div>
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

                    {/* TAB 3: EXISTING USER PASSWORD LOGIN */}
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
                                        placeholder="Enter Mobile or Email"
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
        </ModalPortal>
    );
}
