'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Lock, User, ShieldCheck, Loader2, Eye, EyeOff,
    Mail, ArrowLeft, RefreshCw, Sparkles, PackageCheck,
    Layers, ArrowRight, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { sanitizeAdminProfile } from '@/lib/authSanitizer';
import './admin-login.css';

export default function AdminLoginPage() {
    const router = useRouter();

    // Step state: 'credentials' | 'otp'
    const [step, setStep] = useState('credentials');

    // Step 1: Credentials
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2: 2FA OTP
    const [otpTicket, setOtpTicket] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState('');

    // Shared state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const otpInputRefs = useRef([]);

    // Check for session expiry or idle timeout redirect reasons
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const reason = params.get('reason');
            if (reason === 'idle_timeout') {
                setNotice('Your session has expired due to 30 minutes of inactivity. Please sign in again.');
            } else if (reason === 'session_expired') {
                setNotice('Your session has expired. Please sign in again.');
            }
        }
    }, []);

    // Resend cooldown timer
    useEffect(() => {
        let interval = null;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [resendCooldown]);

    // Handle Step 1: Initial Login
    const handleAdminLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setResendSuccess('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.requires_otp) {
                    // Transition to Step 2: 2FA OTP
                    setOtpTicket(data.ticket);
                    setMaskedEmail(data.masked_email || 'your registered email');
                    setOtpDigits(['', '', '', '', '', '']);
                    setStep('otp');
                    setResendCooldown(60);
                    // Focus first OTP box
                    setTimeout(() => {
                        if (otpInputRefs.current[0]) {
                            otpInputRefs.current[0].focus();
                        }
                    }, 100);
                } else {
                    // Direct login without 2FA
                    const adminData = sanitizeAdminProfile({
                        username: data.username,
                        role: data.role,
                        rawRole: data.role,
                        email: data.email,
                        full_name: data.full_name,
                        login_at: Date.now()
                    });
                    localStorage.setItem('cast_prince_admin', data.token);
                    localStorage.setItem('cast_prince_admin_user', JSON.stringify(adminData));
                    router.push('/admin');
                }
            } else {
                setError(data.error || 'Invalid username or password');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP Box Change
    const handleOtpChange = (index, value) => {
        setError('');
        const cleanVal = value.replace(/\D/g, '');

        // Handle Paste
        if (cleanVal.length > 1) {
            const pastedDigits = cleanVal.slice(0, 6).split('');
            const newDigits = [...otpDigits];
            pastedDigits.forEach((digit, i) => {
                newDigits[i] = digit;
            });
            setOtpDigits(newDigits);

            const nextFocusIndex = Math.min(pastedDigits.length, 5);
            if (otpInputRefs.current[nextFocusIndex]) {
                otpInputRefs.current[nextFocusIndex].focus();
            }

            // Auto-submit if 6 digits pasted
            if (newDigits.every(d => d !== '')) {
                submitOtpVerification(newDigits.join(''));
            }
            return;
        }

        const newDigits = [...otpDigits];
        newDigits[index] = cleanVal;
        setOtpDigits(newDigits);

        // Auto-advance focus to next input
        if (cleanVal && index < 5) {
            if (otpInputRefs.current[index + 1]) {
                otpInputRefs.current[index + 1].focus();
            }
        }

        // Auto-submit when all 6 digits filled
        if (cleanVal && newDigits.every(d => d !== '')) {
            submitOtpVerification(newDigits.join(''));
        }
    };

    // Handle Backspace in OTP boxes
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            if (otpInputRefs.current[index - 1]) {
                otpInputRefs.current[index - 1].focus();
            }
        }
    };

    // Handle Step 2: Verify OTP
    const submitOtpVerification = async (codeToVerify) => {
        const fullCode = codeToVerify || otpDigits.join('');
        if (fullCode.length !== 6) {
            setError('Please enter all 6 digits of the verification code.');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/admin-otp/verify-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket: otpTicket, otp: fullCode })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const adminData = sanitizeAdminProfile({
                    username: data.username,
                    role: data.role,
                    rawRole: data.role,
                    email: data.email,
                    full_name: data.full_name,
                    login_at: Date.now()
                });
                localStorage.setItem('cast_prince_admin', data.token);
                localStorage.setItem('cast_prince_admin_user', JSON.stringify(adminData));
                router.push('/admin');
            } else {
                setError(data.error || 'Invalid verification code. Please check and try again.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resending) return;
        setResending(true);
        setError('');
        setResendSuccess('');
        try {
            const res = await fetch('/api/auth/admin-otp/resend-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket: otpTicket })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setResendSuccess('New verification code sent to your email!');
                setResendCooldown(60);
                setOtpDigits(['', '', '', '', '', '']);
                if (otpInputRefs.current[0]) {
                    otpInputRefs.current[0].focus();
                }
            } else {
                setError(data.error || 'Failed to resend code. Please try logging in again.');
            }
        } catch (err) {
            setError('Failed to resend verification code.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="admin-login-layout">
            {/* ═══════════════════════════════════════════════════════════════
               LEFT SIDE: 50% Visual Showcase & Enterprise Branding
               ═══════════════════════════════════════════════════════════════ */}
            <div className="visual-side">
                <div className="visual-bg-overlay" />
                <div className="visual-content">
                    {/* Top Branding Pill */}
                    <div className="top-brand-pill">
                        <div className="brand-logo-circle">
                            <img
                                src="/images/vaiyaaree-logo.png"
                                alt="Vaiyaaree Logo"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                            />
                        </div>
                        <div className="brand-pill-text">
                            <strong>VAIYAAREE SAREES</strong>
                            <span>Enterprise Admin Portal</span>
                        </div>
                    </div>

                    {/* Headline Info */}
                    <div className="visual-hero-text">
                        <span className="hero-eyebrow">
                            <Sparkles size={14} /> Store Operations & Intelligence
                        </span>
                        <h2 className="hero-title">
                            Manage Authentic Weaves, Orders & Growth
                        </h2>
                        <p className="hero-desc">
                            Welcome to the centralized administration console. Control real-time order fulfillments, manage luxury silk catalogs, configure promotional campaigns, and oversee customer experiences.
                        </p>
                    </div>

                    {/* Highlights Cards */}
                    <div className="visual-feature-cards">
                        <div className="feature-card">
                            <div className="feature-icon-box">
                                <PackageCheck size={20} />
                            </div>
                            <div className="feature-text">
                                <strong>Live Order Management & Fulfillments</strong>
                                <span>Process invoices, manage couriers, track airway bills, and coordinate customer dispatches.</span>
                            </div>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-box">
                                <Layers size={20} />
                            </div>
                            <div className="feature-text">
                                <strong>Catalog, Pricing & Promotion Engine</strong>
                                <span>Control stock levels, automatic cart discounts, festive collections, and media assets.</span>
                            </div>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-box">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="feature-text">
                                <strong>Multi-Factor Security & Role Access</strong>
                                <span>2FA Email OTP verification, granular administrative permissions, and activity monitoring.</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Footer */}
                    <div className="visual-footer">
                        <span>© {new Date().getFullYear()} Vaiyaaree Sarees. All Rights Reserved.</span>
                        <div className="visual-footer-links">
                            <span>Internal Operations</span>
                            <span>•</span>
                            <span>Authorized Personnel Only</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               RIGHT SIDE: 50% Seamless Form Panel (Logo Displayed Above Form)
               ═══════════════════════════════════════════════════════════════ */}
            <div className="form-side">
                <div className="form-container">
                    {/* Header Logo & Title */}
                    <div className="form-header">
                        {/* Branded Logo Badge above the Form */}
                        <div className="form-logo-wrapper">
                            <Link href="/" className="form-brand-badge" title="Vaiyaaree Sarees - Return to Storefront">
                                <div className="form-brand-logo-frame">
                                    <img
                                        src="/images/vaiyaaree-logo.png"
                                        alt="Vaiyaaree"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                                    />
                                </div>
                                <div className="form-brand-text-block">
                                    <span className="form-brand-title">VAIYAAREE</span>
                                    <span className="form-brand-subtitle">PORTAL ACCESS</span>
                                </div>
                            </Link>
                        </div>

                        <h1 className="form-title">
                            {step === 'credentials' ? 'Administrator Login' : 'Two-Factor Verification'}
                        </h1>
                        <p className="form-subtitle">
                            {step === 'credentials'
                                ? 'Sign in with your administrator credentials to access store controls.'
                                : `Enter the 6-digit verification code sent to ${maskedEmail}`}
                        </p>
                    </div>

                    {/* Notice Alert (Idle Inactivity or Expired Session) */}
                    {notice && (
                        <div className="alert-box warning-alert">
                            <Clock size={18} style={{ flexShrink: 0 }} />
                            <span>{notice}</span>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="alert-box error-alert">
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Resend Success Alert */}
                    {resendSuccess && (
                        <div className="alert-box success-alert">
                            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                            <span>{resendSuccess}</span>
                        </div>
                    )}

                    {step === 'credentials' ? (
                        /* ── STEP 1: CREDENTIALS FORM ── */
                        <form onSubmit={handleAdminLogin} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">
                                    Username or Email
                                </label>
                                <div className="input-wrap">
                                    <div className="input-icon-slot">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter your admin username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                        className="form-input text-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="label-row">
                                    <label className="form-label">
                                        Password
                                    </label>
                                    <Link href="/admin/login/forgot-password" className="forgot-link">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="input-wrap">
                                    <div className="input-icon-slot">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className="form-input password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="eye-toggle-btn"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="submit-btn"
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
                                ) : (
                                    <>Sign In to Portal <ArrowRight size={18} /></>
                                )}
                            </button>

                            <div className="back-store-wrap">
                                <Link href="/" className="back-store-link">
                                    <ArrowLeft size={14} /> Return to Storefront
                                </Link>
                            </div>
                        </form>
                    ) : (
                        /* ── STEP 2: 2FA EMAIL OTP FORM ── */
                        <form onSubmit={(e) => { e.preventDefault(); submitOtpVerification(); }} className="auth-form">
                            <div className="otp-info-banner">
                                <div className="otp-info-icon">
                                    <Mail size={20} />
                                </div>
                                <div className="otp-info-text">
                                    <strong>Check Your Email Inbox</strong>
                                    <span>We sent a 6-digit security code to <strong style={{ color: '#0f172a' }}>{maskedEmail}</strong></span>
                                </div>
                            </div>

                            {/* 6 Individual Digit Inputs */}
                            <div className="otp-digit-grid">
                                {otpDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => (otpInputRefs.current[idx] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={digit}
                                        onChange={e => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                                        className={`otp-digit-box ${digit ? 'filled' : ''}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otpDigits.some(d => !d)}
                                className="submit-btn"
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Verifying Code...</>
                                ) : (
                                    <>Verify & Access Portal <ArrowRight size={18} /></>
                                )}
                            </button>

                            {/* Resend & Switch Account Controls */}
                            <div className="otp-actions-wrap">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={resendCooldown > 0 || resending}
                                    className="resend-btn"
                                >
                                    {resending ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={14} />
                                    )}
                                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('credentials');
                                        setError('');
                                        setResendSuccess('');
                                    }}
                                    className="switch-account-btn"
                                >
                                    <ArrowLeft size={14} /> Sign in as different administrator
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Security Notice Footer */}
                    <div className="form-security-footer">
                        <ShieldCheck size={14} />
                        <span>256-Bit Encrypted High-Security Administrative Access</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
