'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, Mail, Lock, User, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '';
    const { setUser, showToast } = useShop();

    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

    // Login Form State
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Register Form State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regCountryCode, setRegCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    // UI Loading & Error States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'register') {
            setActiveTab('register');
        }
    }, [searchParams]);

    // Handle Existing User Login (Mobile / Email + Password)
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

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
                setSuccessMessage('Logged in successfully! Redirecting...');
                showToast('Login Successful! Welcome back.', 'success');

                setTimeout(() => {
                    if (redirectUrl) {
                        router.push(redirectUrl);
                    } else {
                        router.push('/shop');
                    }
                }, 1200);
            } else {
                setError(data.error || 'Invalid Mobile/Email or Password. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login Error:', err);
            setError('Connection failed. Please check your internet connection.');
            setLoading(false);
        }
    };

    // Handle New User Registration (Create Account)
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

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
                const customerData = { ...data.customer, login_at: Date.now() };
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                setSuccessMessage('Account created successfully! Redirecting to shop page...');
                showToast('Account Created Successfully! Welcome to Vaiyaaree.', 'success');

                setTimeout(() => {
                    if (redirectUrl) {
                        router.push(redirectUrl);
                    } else {
                        router.push('/shop');
                    }
                }, 1400);
            } else {
                setError(data.error || 'Account creation failed. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Register Error:', err);
            setError('Connection failed. Please check your internet connection.');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fdfbf7 0%, #f7eae1 100%)',
            padding: '2rem 1rem',
            fontFamily: 'var(--font-roboto), sans-serif',
            color: '#2b2623'
        }}>
            <div style={{
                maxWidth: '480px',
                width: '100%',
                margin: '0 auto',
                background: '#ffffff',
                padding: '2.5rem 2rem',
                borderRadius: '20px',
                border: '1px solid #f0e6df',
                boxShadow: '0 15px 45px rgba(93, 8, 33, 0.08)'
            }}>
                {/* Logo & Title Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 20px rgba(93, 8, 33, 0.12)',
                            background: '#ffffff',
                            padding: '6px'
                        }}>
                            <img src="/images/vaiyaaree-logo.png" alt="Vaiyaaree" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.35rem' }}>Vaiyaaree</h1>
                    <p style={{ fontSize: '0.85rem', color: '#5d0821', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                        {redirectUrl.includes('checkout') ? 'Checkout Authorization' : 'Customer Shop Portal'}
                    </p>
                </div>

                {/* Redirect Info Banner */}
                {redirectUrl.includes('checkout') && (
                    <div style={{
                        background: 'rgba(93, 8, 33, 0.06)',
                        border: '1px solid rgba(93, 8, 33, 0.2)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.85rem',
                        color: '#5d0821',
                        fontWeight: 600,
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        Please login or create an account to complete your purchase. Your cart is preserved!
                    </div>
                )}

                {/* Tabs Toggle: Login vs Create Account */}
                <div style={{
                    display: 'flex',
                    background: '#f8f4ee',
                    padding: '4px',
                    borderRadius: '12px',
                    marginBottom: '1.75rem',
                    border: '1px solid #efe5db'
                }}>
                    <button
                        onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: '9px',
                            background: activeTab === 'login' ? '#ffffff' : 'transparent',
                            color: activeTab === 'login' ? '#5d0821' : '#777',
                            fontWeight: activeTab === 'login' ? 700 : 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'login' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.25s ease'
                        }}
                    >
                        Existing User Login
                    </button>
                    <button
                        onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: '9px',
                            background: activeTab === 'register' ? '#ffffff' : 'transparent',
                            color: activeTab === 'register' ? '#5d0821' : '#777',
                            fontWeight: activeTab === 'register' ? 700 : 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'register' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.25s ease'
                        }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error & Success Messages */}
                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem'
                    }}>
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        padding: '0.9rem 1.1rem',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.12)'
                    }}>
                        <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* TAB 1: EXISTING USER LOGIN FORM */}
                {activeTab === 'login' && (
                    <form onSubmit={handleLoginSubmit}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Mobile Number or Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    value={loginIdentifier}
                                    onChange={e => setLoginIdentifier(e.target.value)}
                                    placeholder="Enter Mobile or Email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: '#faf9f6'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Password
                                </label>
                                <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: '#5d0821', fontWeight: 700, textDecoration: 'none' }}>
                                    Forgot Password?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showLoginPassword ? "text" : "password"}
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: '#faf9f6'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || Boolean(successMessage)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                marginTop: '1rem',
                                background: successMessage ? '#16a34a' : '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: successMessage ? 'default' : 'pointer',
                                boxShadow: successMessage ? '0 6px 20px rgba(22, 163, 74, 0.25)' : '0 6px 20px rgba(93, 8, 33, 0.2)',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            {successMessage ? '✓ Logged In! Redirecting...' : (loading ? 'Signing In...' : 'Login →')}
                        </button>
                    </form>
                )}

                {/* TAB 2: NEW USER CREATE ACCOUNT FORM */}
                {activeTab === 'register' && (
                    <form onSubmit={handleRegisterSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Full Name <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={e => setRegName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                    placeholder="Enter your full name"
                                    required
                                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email Address <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="email"
                                    value={regEmail}
                                    onChange={e => setRegEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Mobile Number <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={regCountryCode}
                                    onChange={e => setRegCountryCode(e.target.value)}
                                    style={{ width: '120px', padding: '0.8rem 0.4rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 700, background: '#faf9f6', outline: 'none' }}
                                >
                                    {COUNTRY_CODES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                    <input
                                        type="tel"
                                        value={regPhone}
                                        onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder={regCountryCode === '+91' ? '10-digit mobile number' : 'Mobile number'}
                                        required
                                        style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                New Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showRegPassword ? "text" : "password"}
                                    value={regPassword}
                                    onChange={e => setRegPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    minLength="6"
                                    required
                                    style={{ width: '100%', padding: '0.8rem 2.75rem 0.8rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegPassword(!showRegPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Confirm Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showRegPassword ? "text" : "password"}
                                    value={regConfirmPassword}
                                    onChange={e => setRegConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    minLength="6"
                                    required
                                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || Boolean(successMessage)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: successMessage ? '#16a34a' : '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: successMessage ? 'default' : 'pointer',
                                boxShadow: successMessage ? '0 6px 20px rgba(22, 163, 74, 0.25)' : '0 6px 20px rgba(93, 8, 33, 0.2)',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            {successMessage ? '✓ Account Created! Redirecting...' : (loading ? 'Creating Account...' : 'Create Account →')}
                        </button>
                    </form>
                )}

                {/* Footer Security Badges */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f0e6df', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#888', fontSize: '0.78rem' }}>
                    <ShieldCheck size={16} color="#16a34a" />
                    <span>256-Bit Encrypted & 100% Safe Checkout</span>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
