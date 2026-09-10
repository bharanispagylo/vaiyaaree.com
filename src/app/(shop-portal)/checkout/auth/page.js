'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
    User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, 
    MessageCircle, Loader2, KeyRound, ShoppingBag, CheckCircle, Sparkles, Truck, ChevronRight
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/countryCodes';
import { sanitizeCustomerSession } from '@/lib/authSanitizer';
import styles from './auth.module.css';

function CheckoutAuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { 
        user, setUser, showToast, setCheckoutForm, cart, cartTotal, 
        discountData, isSessionLoading, isCartLoaded, communicationChannel, 
        isEmailOnly, isWhatsAppOnly, isHybridChannel 
    } = useShop();

    const [activeTab, setActiveTab] = useState('otp'); // 'otp' | 'register' | 'login'

    // OTP Auth State (WhatsApp or Email)
    const [otpMode, setOtpMode] = useState(isEmailOnly ? 'email' : 'whatsapp');
    const [otpEmail, setOtpEmail] = useState('');
    const [otpCountryCode, setOtpCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [otpPhone, setOtpPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpStep, setOtpStep] = useState(1); // 1 = Enter Target, 2 = Enter 6-digit OTP
    const [otpCountdown, setOtpCountdown] = useState(0);

    // Register Form State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regCountryCode, setRegCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    // Existing User Password Login State
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // UI Loading & Feedback
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // If user is already logged in, redirect directly to checkout
    useEffect(() => {
        if (!isSessionLoading && user && user.id) {
            router.replace('/checkout');
        }
    }, [user, isSessionLoading, router]);

    // Channel synchronization
    useEffect(() => {
        if (isEmailOnly) setOtpMode('email');
        else if (isWhatsAppOnly) setOtpMode('whatsapp');
    }, [isEmailOnly, isWhatsAppOnly]);

    // Countdown timer for OTP
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
            shippingWhatsApp: phoneClean || prev.shippingWhatsApp || '',
            shippingAddress: customerData.address || prev.shippingAddress || '',
            shippingCity: customerData.city || prev.shippingCity || '',
            shippingState: customerData.state || prev.shippingState || 'Tamil Nadu',
            shippingPincode: customerData.pincode || prev.shippingPincode || ''
        }));
    };

    const handleContinueAsGuest = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('vaiyaaree_checkout_guest', 'true');
        }
        router.push('/checkout?guest=true');
    };

    // ─── 1. SEND OTP ──────────────────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (otpMode === 'email') {
            const cleanEmail = otpEmail.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!cleanEmail || !emailRegex.test(cleanEmail)) {
                setError('Please enter a valid Email Address.');
                return;
            }

            setLoading(true);
            try {
                const res = await fetch('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: cleanEmail })
                });
                const data = await res.json();
                if (!res.ok && data.error) {
                    setError(data.error);
                } else {
                    setOtpStep(2);
                    setOtpCountdown(45);
                    setSuccessMessage(`A 6-digit verification code was sent to ${cleanEmail}`);
                }
            } catch (err) {
                setError('Failed to send verification code. Please check your connection.');
            } finally {
                setLoading(false);
            }
        } else {
            const cleanDigits = otpPhone.replace(/\D/g, '');
            if (cleanDigits.length !== 10) {
                setError('Please enter a valid 10-digit Mobile Number.');
                return;
            }

            setLoading(true);
            try {
                const res = await fetch('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: cleanDigits, countryCode: otpCountryCode })
                });
                const data = await res.json();
                if (!res.ok && data.error) {
                    setError(data.error);
                } else {
                    setOtpStep(2);
                    setOtpCountdown(45);
                    setSuccessMessage(`A 6-digit WhatsApp OTP was sent to +91 ${cleanDigits}`);
                }
            } catch (err) {
                setError('Failed to send WhatsApp verification code. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    // ─── 2. VERIFY OTP ────────────────────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanOtp = otpCode.replace(/\D/g, '');
        if (cleanOtp.length !== 6) {
            setError('Please enter the 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            const isEmail = otpMode === 'email';
            const payload = {
                code: cleanOtp,
                identifier: isEmail ? otpEmail.trim().toLowerCase() : otpPhone.replace(/\D/g, ''),
                channel: isEmail ? 'email' : 'whatsapp',
                countryCode: isEmail ? undefined : otpCountryCode
            };

            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customer = sanitizeCustomerSession({ ...data.customer, login_at: Date.now() });
                localStorage.setItem('cast_prince_user', JSON.stringify(customer));
                localStorage.setItem('vaiyaaree_user', JSON.stringify(customer));
                setUser(customer);
                syncCustomerToForm(customer);
                showToast('Authenticated! Redirecting to checkout...', 'success');
                router.replace('/checkout');
            } else {
                setError(data.error || 'Invalid or expired verification code.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── 3. REGISTER NEW CUSTOMER ─────────────────────────────────────────────
    const handleRegister = async (e) => {
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
        if (!isEmailOnly) {
            if (!rawPhone || (regCountryCode === '+91' && rawPhone.length !== 10) || rawPhone.length < 7) {
                setError('Please enter a valid 10-digit Mobile Number.');
                return;
            }
        } else if (rawPhone && ((regCountryCode === '+91' && rawPhone.length !== 10) || rawPhone.length < 7)) {
            setError('Please enter a valid 10-digit Mobile Number.');
            return;
        }

        if (!regPassword || regPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            setError('Passwords do not match.');
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
                    phone: rawPhone || '',
                    country_code: regCountryCode,
                    password: regPassword.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const customer = sanitizeCustomerSession({ ...data.customer, login_at: Date.now() });
                localStorage.setItem('cast_prince_user', JSON.stringify(customer));
                localStorage.setItem('vaiyaaree_user', JSON.stringify(customer));
                setUser(customer);
                syncCustomerToForm(customer);
                showToast('Welcome to Vaiyaaree! Redirecting to checkout...', 'success');
                router.replace('/checkout');
            } else {
                setError(data.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            setError('Registration failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ─── 4. PASSWORD LOGIN ────────────────────────────────────────────────────
    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!loginIdentifier.trim()) {
            setError(isEmailOnly ? 'Please enter your Email address.' : 'Please enter your Mobile Number or Email.');
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
                const customer = sanitizeCustomerSession({ ...data.customer, login_at: Date.now() });
                localStorage.setItem('cast_prince_user', JSON.stringify(customer));
                localStorage.setItem('vaiyaaree_user', JSON.stringify(customer));
                setUser(customer);
                syncCustomerToForm(customer);
                showToast('Logged in successfully! Redirecting...', 'success');
                router.replace('/checkout');
            } else {
                setError(data.error || 'Invalid credentials. Please check and try again.');
            }
        } catch (err) {
            setError('Connection failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || isSessionLoading) {
        return (
            <div className={styles.authPageWrapper}>
                <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: '#5d0821' }} />
                </div>
            </div>
        );
    }

    if (isCartLoaded && cart.length === 0) {
        return (
            <div className={styles.authPageWrapper}>
                <div style={{ textAlign: 'center', padding: '5rem 1rem', maxWidth: '500px', margin: '0 auto' }}>
                    <ShoppingBag size={56} style={{ color: '#cbd5e1', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Your Cart is Empty</h2>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>Please add some beautiful handpicked sarees to your cart before proceeding to checkout.</p>
                    <Link href="/shop" style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#5d0821', color: '#fff', borderRadius: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        Browse Saree Collection
                    </Link>
                </div>
            </div>
        );
    }

    const estimatedSavings = discountData?.totalDiscount || 0;
    const finalTotal = Math.max(0, Math.round(cartTotal - estimatedSavings));

    return (
        <div className={styles.authPageWrapper}>
            <div className={styles.authContainer}>
                
                {/* Stepper Progress Bar */}
                <div className={styles.checkoutProgress}>
                    <div className={`${styles.progressStep} ${styles.progressStepActive}`}>
                        <div className={`${styles.stepNumber} ${styles.stepNumberActive}`}>1</div>
                        <span>Authentication</span>
                    </div>
                    <div className={`${styles.progressDivider} ${styles.progressDividerActive}`} />
                    <div className={styles.progressStep}>
                        <div className={styles.stepNumber}>2</div>
                        <span>Delivery Address</span>
                    </div>
                    <div className={styles.progressDivider} />
                    <div className={styles.progressStep}>
                        <div className={styles.stepNumber}>3</div>
                        <span>Payment & Order</span>
                    </div>
                </div>

                {/* Main Grid */}
                <div className={styles.authGrid}>
                    
                    {/* LEFT COLUMN: AUTHENTICATION GATE CARD */}
                    <div className={styles.authCard}>
                        <div className={styles.authCardHeader}>
                            <h1 className={styles.authCardTitle}>Authenticate to Checkout</h1>
                            <p className={styles.authCardSubtitle}>
                                Choose your preferred sign-in method to access saved addresses and track your order in real time.
                            </p>
                        </div>

                        {/* Navigation Tabs */}
                        <div className={styles.tabsContainer}>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('otp'); setError(''); setSuccessMessage(''); }}
                                className={`${styles.tabButton} ${activeTab === 'otp' ? styles.tabButtonActive : ''}`}
                            >
                                <Sparkles size={16} color="#d97706" /> Instant OTP
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                                className={`${styles.tabButton} ${activeTab === 'register' ? styles.tabButtonActive : ''}`}
                            >
                                <User size={16} /> New User
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                                className={`${styles.tabButton} ${activeTab === 'login' ? styles.tabButtonActive : ''}`}
                            >
                                <Lock size={16} /> Password Sign In
                            </button>
                        </div>

                        {/* Alerts */}
                        {error && (
                            <div className={styles.errorAlert}>
                                <span>{error}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className={styles.successAlert}>
                                <CheckCircle size={16} />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* ── TAB 1: INSTANT OTP LOGIN ────────────────────────── */}
                        {activeTab === 'otp' && (
                            <div>
                                {isHybridChannel && (
                                    <div className={styles.channelSubToggle}>
                                        <button
                                            type="button"
                                            onClick={() => { setOtpMode('whatsapp'); setError(''); setOtpStep(1); }}
                                            className={`${styles.channelSubBtn} ${otpMode === 'whatsapp' ? styles.channelSubBtnActive : ''}`}
                                        >
                                            <MessageCircle size={15} color="#25D366" /> WhatsApp OTP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setOtpMode('email'); setError(''); setOtpStep(1); }}
                                            className={`${styles.channelSubBtn} ${otpMode === 'email' ? styles.channelSubBtnActive : ''}`}
                                        >
                                            <Mail size={15} color="#5d0821" /> Email OTP
                                        </button>
                                    </div>
                                )}

                                {otpStep === 1 ? (
                                    <form onSubmit={handleSendOtp}>
                                        {otpMode === 'email' ? (
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>
                                                    Email Address <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <div className={styles.inputWrapper}>
                                                    <Mail size={18} className={styles.fieldIcon} />
                                                    <input
                                                        type="email"
                                                        value={otpEmail}
                                                        onChange={e => setOtpEmail(e.target.value)}
                                                        placeholder="name@example.com"
                                                        className={styles.formInput}
                                                        required
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>
                                                    WhatsApp Number <span className={styles.requiredStar}>*</span>
                                                </label>
                                                <div className={styles.phoneGroup}>
                                                    <select
                                                        value={otpCountryCode}
                                                        onChange={e => setOtpCountryCode(e.target.value)}
                                                        className={styles.countryCodeSelect}
                                                    >
                                                        {COUNTRY_CODES.map(c => (
                                                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                                        ))}
                                                    </select>
                                                    <div className={styles.inputWrapper} style={{ flex: 1 }}>
                                                        <Phone size={18} className={styles.fieldIcon} />
                                                        <input
                                                            type="tel"
                                                            value={otpPhone}
                                                            onChange={e => setOtpPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                                            placeholder="10-digit mobile number"
                                                            className={styles.formInput}
                                                            required
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={loading} className={styles.primaryBtn}>
                                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                            {loading ? 'Sending Code...' : (otpMode === 'email' ? 'Send Email OTP →' : 'Send WhatsApp OTP →')}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyOtp}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>
                                                Enter 6-Digit Verification Code <span className={styles.requiredStar}>*</span>
                                            </label>
                                            <div className={styles.inputWrapper}>
                                                <KeyRound size={18} className={styles.fieldIcon} />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={otpCode}
                                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="••••••"
                                                    maxLength={6}
                                                    className={styles.formInput}
                                                    style={{ letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 800 }}
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setOtpStep(1); setOtpCode(''); setError(''); }}
                                                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                                                >
                                                    ← Change {otpMode === 'email' ? 'Email' : 'Number'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    disabled={otpCountdown > 0 || loading}
                                                    style={{ background: 'none', border: 'none', color: otpCountdown > 0 ? '#94a3b8' : '#5d0821', fontSize: '0.8rem', fontWeight: 700, cursor: otpCountdown > 0 ? 'default' : 'pointer' }}
                                                >
                                                    {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : 'Resend Code'}
                                                </button>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={loading || otpCode.length !== 6} className={styles.primaryBtn}>
                                            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                            {loading ? 'Verifying...' : 'Verify & Proceed to Checkout →'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* ── TAB 2: REGISTER NEW USER ───────────────────────── */}
                        {activeTab === 'register' && (
                            <form onSubmit={handleRegister}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Full Name <span className={styles.requiredStar}>*</span>
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
                                        Email Address <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <Mail size={18} className={styles.fieldIcon} />
                                        <input
                                            type="email"
                                            value={regEmail}
                                            onChange={e => setRegEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className={styles.formInput}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Mobile Number {isEmailOnly ? <span style={{ color: '#64748b', fontWeight: 500 }}>(Optional)</span> : <span className={styles.requiredStar}>*</span>}
                                    </label>
                                    <div className={styles.phoneGroup}>
                                        <select
                                            value={regCountryCode}
                                            onChange={e => setRegCountryCode(e.target.value)}
                                            className={styles.countryCodeSelect}
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                            ))}
                                        </select>
                                        <div className={styles.inputWrapper} style={{ flex: 1 }}>
                                            <Phone size={18} className={styles.fieldIcon} />
                                            <input
                                                type="tel"
                                                value={regPhone}
                                                onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder={regCountryCode === '+91' ? '10-digit mobile' : 'Mobile number'}
                                                className={styles.formInput}
                                                required={!isEmailOnly}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Password <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <Lock size={18} className={styles.fieldIcon} />
                                        <input
                                            type={showRegPassword ? "text" : "password"}
                                            value={regPassword}
                                            onChange={e => setRegPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            minLength={6}
                                            className={styles.formInput}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPassword(!showRegPassword)}
                                            className={styles.passwordToggle}
                                            aria-label="Toggle password visibility"
                                        >
                                            {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Confirm Password <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <Lock size={18} className={styles.fieldIcon} />
                                        <input
                                            type={showRegPassword ? "text" : "password"}
                                            value={regConfirmPassword}
                                            onChange={e => setRegConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            minLength={6}
                                            className={styles.formInput}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className={styles.primaryBtn}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                    {loading ? 'Creating Account...' : 'Create Account & Proceed →'}
                                </button>
                            </form>
                        )}

                        {/* ── TAB 3: PASSWORD LOGIN ──────────────────────────── */}
                        {activeTab === 'login' && (
                            <form onSubmit={handlePasswordLogin}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        {isEmailOnly ? 'Email Address' : 'Mobile Number or Email'} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <User size={18} className={styles.fieldIcon} />
                                        <input
                                            type="text"
                                            value={loginIdentifier}
                                            onChange={e => setLoginIdentifier(e.target.value)}
                                            placeholder={isEmailOnly ? "your@email.com" : "e.g. 9876543210 or your@email.com"}
                                            className={styles.formInput}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                                        <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                                            Password <span className={styles.requiredStar}>*</span>
                                        </label>
                                        <Link href="/forgot-password" style={{ fontSize: '0.78rem', color: '#5d0821', fontWeight: 700, textDecoration: 'none' }}>
                                            Forgot?
                                        </Link>
                                    </div>
                                    <div className={styles.inputWrapper}>
                                        <Lock size={18} className={styles.fieldIcon} />
                                        <input
                                            type={showLoginPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={e => setLoginPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className={styles.formInput}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className={styles.passwordToggle}
                                            aria-label="Toggle password visibility"
                                        >
                                            {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className={styles.primaryBtn}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                    {loading ? 'Signing In...' : 'Sign In & Proceed to Checkout →'}
                                </button>
                            </form>
                        )}

                        {/* ── GUEST CHECKOUT PROMOTION ────────────────────────── */}
                        <div className={styles.divider}>
                            <span>OR</span>
                        </div>

                        <div className={styles.guestCard}>
                            <button 
                                type="button" 
                                onClick={handleContinueAsGuest}
                                className={styles.guestBtn}
                            >
                                ⚡ Continue as Guest Checkout <ArrowRight size={17} />
                            </button>
                            <p className={styles.guestHint}>
                                No password needed. You can enter your shipping address directly and place your order.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: ORDER SUMMARY MINI-CARD */}
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryTitle}>
                            <span>Your Order Preview</span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{cart.length} {cart.length === 1 ? 'Item' : 'Items'}</span>
                        </div>

                        <div className={styles.itemsList}>
                            {cart.map((item, index) => (
                                <div key={index} className={styles.itemRow}>
                                    <img 
                                        src={item.image || '/images/placeholder.jpg'} 
                                        alt={item.name} 
                                        className={styles.itemThumb} 
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.jpg'; }} 
                                    />
                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemName}>{item.name}</div>
                                        <div className={styles.itemMeta}>Qty: {item.qty} {item.variantName ? `• ${item.variantName}` : ''}</div>
                                    </div>
                                    <div className={styles.itemPrice}>
                                        ₹{(item.price * item.qty).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.summaryDivider} />

                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Number(cartTotal || 0).toLocaleString('en-IN')}.00</span>
                        </div>

                        {estimatedSavings > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#16a34a', fontWeight: 700 }}>
                                <span>Promotional Savings</span>
                                <span>-₹{Math.round(estimatedSavings).toLocaleString('en-IN')}.00</span>
                            </div>
                        )}

                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>Calculated on next step</span>
                        </div>

                        <div className={styles.summaryTotalRow}>
                            <span>Estimated Total</span>
                            <span style={{ color: '#5d0821' }}>₹{finalTotal.toLocaleString('en-IN')}.00</span>
                        </div>

                        {/* Trust Highlights */}
                        <div className={styles.trustList}>
                            <div className={styles.trustItem}>
                                <ShieldCheck size={18} className={styles.trustIcon} />
                                <span><strong>100% Authentic Handloom Silks</strong> direct from master weavers.</span>
                            </div>
                            <div className={styles.trustItem}>
                                <Truck size={18} className={styles.trustIcon} />
                                <span><strong>Insured Shipping</strong> with live notifications & tracking.</span>
                            </div>
                            <div className={styles.trustItem}>
                                <Sparkles size={18} className={styles.trustIcon} />
                                <span><strong>256-Bit Encrypted Payments</strong> via Razorpay, UPI & NetBanking.</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function CheckoutAuthPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#5d0821' }} />
            </div>
        }>
            <CheckoutAuthContent />
        </Suspense>
    );
}
