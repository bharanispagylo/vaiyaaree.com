'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Phone, Mail, Lock, User, Eye, EyeOff, CheckCircle2, ArrowRight, 
    ShieldCheck, Sparkles, Truck, AlertCircle, ShoppingBag, Loader2 
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';
import styles from './login.module.css';

function LoginContent({ initialMode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '';
    const { setUser, showToast } = useShop();

    const [activeTab, setActiveTab] = useState(initialMode || (searchParams.get('mode') === 'register' ? 'register' : 'login')); // 'login' | 'register'

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
        if (mode === 'register' || initialMode === 'register') {
            setActiveTab('register');
        } else if (mode === 'login' || initialMode === 'login') {
            setActiveTab('login');
        }
    }, [searchParams, initialMode]);

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
                }, 1000);
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
        const rawPhone = regPhone.replace(/\D/g, '');
        if (!rawPhone || (regCountryCode === '+91' && rawPhone.length !== 10) || rawPhone.length < 7) {
            setError('Please enter a valid Mobile Number (10 digits for India).');
            return;
        }
        if (!regPassword || regPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            setError('Passwords do not match. Please re-enter your password.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regName.trim(),
                    email: regEmail.trim().toLowerCase(),
                    phone: rawPhone,
                    country_code: regCountryCode,
                    password: regPassword.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customerData = { ...data.customer, login_at: Date.now() };
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                setSuccessMessage('Account created successfully! Redirecting...');
                showToast('Welcome to Vaiyaaree! Account created.', 'success');

                setTimeout(() => {
                    if (redirectUrl) {
                        router.push(redirectUrl);
                    } else {
                        router.push('/shop');
                    }
                }, 1000);
            } else {
                setError(data.error || 'Failed to create account. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Registration Error:', err);
            setError('Connection failed. Please check your internet connection.');
            setLoading(false);
        }
    };

    return (
        <div className={styles.splitPage}>
            {/* ═══════════════════════════════════════════════════════════════
               LEFT SIDE: 50% Visual Showcase & Brand Highlights
               ═══════════════════════════════════════════════════════════════ */}
            <div className={styles.visualSide}>
                <div className={styles.visualImageOverlay} />
                <img 
                    src="/images/about-us-saree.jpg"
                    alt="Vaiyaaree Sarees Collection"
                    className={styles.visualBgImage}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=85';
                    }}
                />
                
                <div className={styles.visualContent}>
                    {/* Brand Logo Header */}
                    <Link href="/" className={styles.visualLogoLink}>
                        <img 
                            src="/images/vaiyaaree-logo.png" 
                            alt="Vaiyaaree" 
                            className={styles.visualLogo} 
                            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                        />
                        <span className={styles.visualLogoText}>VAIYAAREE</span>
                    </Link>

                    {/* Hero Title & Description */}
                    <div className={styles.visualHeroText}>
                        <span className={styles.visualSubtitle}>Timeless Heritage & Craftsmanship</span>
                        <h2 className={styles.visualTitle}>Wrap Yourself in Pure Elegance</h2>
                        <p className={styles.visualDesc}>
                            Experience authentic handpicked silks, bridal Kanchipurams, and festive weaves crafted to celebrate your moments.
                        </p>
                    </div>

                    {/* Trust Highlights */}
                    <div className={styles.visualHighlights}>
                        <div className={styles.highlightCard}>
                            <div className={styles.highlightIconBox}>
                                <Sparkles size={20} />
                            </div>
                            <div className={styles.highlightInfo}>
                                <strong>100% Authentic Handloom</strong>
                                <span>Curated directly from master artisans across India</span>
                            </div>
                        </div>

                        <div className={styles.highlightCard}>
                            <div className={styles.highlightIconBox}>
                                <Truck size={20} />
                            </div>
                            <div className={styles.highlightInfo}>
                                <strong>Express Shipping & Safe Transit</strong>
                                <span>Fast insured delivery with live SMS & WhatsApp updates</span>
                            </div>
                        </div>

                        <div className={styles.highlightCard}>
                            <div className={styles.highlightIconBox}>
                                <ShieldCheck size={20} />
                            </div>
                            <div className={styles.highlightInfo}>
                                <strong>Secure Payments & Easy Returns</strong>
                                <span>256-bit encryption with hassle-free 7-day returns</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Footer */}
                    <div className={styles.visualFooter}>
                        <span>© {new Date().getFullYear()} Vaiyaaree Sarees.</span>
                        <div className={styles.visualFooterLinks}>
                            <Link href="/privacy-policy">Privacy</Link>
                            <span>•</span>
                            <Link href="/terms-and-conditions">Terms</Link>
                            <span>•</span>
                            <Link href="/contact">Support</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               RIGHT SIDE: 50% Form Panel
               ═══════════════════════════════════════════════════════════════ */}
            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    {/* Mobile Logo & Page Header */}
                    <div className={styles.formHeader}>
                        <Link href="/" className={styles.mobileBrandLogo}>
                            <img 
                                src="/images/vaiyaaree-logo.png" 
                                alt="Vaiyaaree" 
                                className={styles.mobileLogoImg} 
                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                            />
                            <span className={styles.mobileBrandName}>VAIYAAREE</span>
                        </Link>

                        <h1 className={styles.formTitle}>
                            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p className={styles.formSubtitle}>
                            {activeTab === 'login' 
                                ? 'Sign in to access your orders, track shipments, and enjoy member rewards.' 
                                : 'Join Vaiyaaree to unlock exclusive discounts and seamless checkout.'}
                        </p>
                    </div>

                    {/* Checkout Preservation Banner */}
                    {redirectUrl.includes('checkout') && (
                        <div className={styles.checkoutNotice}>
                            <ShoppingBag size={18} style={{ flexShrink: 0 }} />
                            <span>Please login or register to complete your order. Your cart items are safely preserved!</span>
                        </div>
                    )}

                    {/* Tabs Toggle: Login vs Register */}
                    <div className={styles.tabSwitch}>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                            className={`${styles.tabBtn} ${activeTab === 'login' ? styles.tabBtnActive : ''}`}
                        >
                            <User size={16} /> Existing User Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                            className={`${styles.tabBtn} ${activeTab === 'register' ? styles.tabBtnActive : ''}`}
                        >
                            <Sparkles size={16} /> Create Account
                        </button>
                    </div>

                    {/* Error & Success Feedback Alerts */}
                    {error && (
                        <div className={styles.errorAlert}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className={styles.successAlert}>
                            <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* TAB 1: EXISTING USER LOGIN FORM */}
                    {activeTab === 'login' && (
                        <form onSubmit={handleLoginSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Mobile Number or Email
                                </label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.fieldIcon} />
                                    <input
                                        type="text"
                                        value={loginIdentifier}
                                        onChange={e => setLoginIdentifier(e.target.value)}
                                        placeholder="e.g. 9876543210 or your@email.com"
                                        className={styles.formInput}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.labelRow}>
                                    <label className={styles.formLabel}>
                                        Password
                                    </label>
                                    <Link href="/forgot-password" className={styles.forgotLink}>
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className={styles.inputWrapper}>
                                    <Lock size={18} className={styles.fieldIcon} />
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        value={loginPassword}
                                        onChange={e => setLoginPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className={`${styles.formInput} ${styles.passwordInput}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        className={styles.eyeToggleBtn}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || Boolean(successMessage)}
                                className={`${styles.submitBtn} ${successMessage ? styles.submitBtnSuccess : ''}`}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Signing In...</>
                                ) : successMessage ? (
                                    '✓ Logged In! Redirecting...'
                                ) : (
                                    <>Sign In <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>
                    )}

                    {/* TAB 2: NEW USER CREATE ACCOUNT FORM */}
                    {activeTab === 'register' && (
                        <form onSubmit={handleRegisterSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Full Name <span style={{ color: '#5d0821' }}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.fieldIcon} />
                                    <input
                                        type="text"
                                        value={regName}
                                        onChange={e => setRegName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                        placeholder="Enter your full name"
                                        className={styles.formInput}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Email Address <span style={{ color: '#5d0821' }}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <Mail size={18} className={styles.fieldIcon} />
                                    <input
                                        type="email"
                                        value={regEmail}
                                        onChange={e => setRegEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Mobile Number <span style={{ color: '#5d0821' }}>*</span>
                                </label>
                                <div className={styles.phoneRow}>
                                    <select
                                        value={regCountryCode}
                                        onChange={e => setRegCountryCode(e.target.value)}
                                        className={styles.countryCodeSelect}
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>
                                                {c.flag} {c.code}
                                            </option>
                                        ))}
                                    </select>
                                    <div className={styles.inputWrapper} style={{ flex: 1 }}>
                                        <Phone size={18} className={styles.fieldIcon} />
                                        <input
                                            type="tel"
                                            value={regPhone}
                                            onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder={regCountryCode === '+91' ? '10-digit mobile number' : 'Mobile number'}
                                            className={styles.formInput}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Password <span style={{ color: '#5d0821' }}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <Lock size={18} className={styles.fieldIcon} />
                                    <input
                                        type={showRegPassword ? "text" : "password"}
                                        value={regPassword}
                                        onChange={e => setRegPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        minLength="6"
                                        className={`${styles.formInput} ${styles.passwordInput}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRegPassword(!showRegPassword)}
                                        className={styles.eyeToggleBtn}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Confirm Password <span style={{ color: '#5d0821' }}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <Lock size={18} className={styles.fieldIcon} />
                                    <input
                                        type={showRegPassword ? "text" : "password"}
                                        value={regConfirmPassword}
                                        onChange={e => setRegConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        minLength="6"
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || Boolean(successMessage)}
                                className={`${styles.submitBtn} ${successMessage ? styles.submitBtnSuccess : ''}`}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Creating Account...</>
                                ) : successMessage ? (
                                    '✓ Account Created! Redirecting...'
                                ) : (
                                    <>Create Account <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Trust Footer */}
                    <div className={styles.trustFooter}>
                        <ShieldCheck size={16} color="#16a34a" />
                        <span><strong>256-Bit SSL Encrypted</strong> & 100% Verified Safe</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage({ initialMode }) {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <LoginContent initialMode={initialMode} />
        </Suspense>
    );
}
