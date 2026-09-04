'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Lock, User, ShieldCheck, Loader2, Eye, EyeOff,
    Mail, ArrowLeft, RefreshCw, Sparkles, PackageCheck,
    Layers, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { sanitizeAdminProfile } from '@/lib/authSanitizer';

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

    const otpInputRefs = useRef([]);

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

            <style jsx>{`
                .admin-login-layout {
                    min-height: 100vh;
                    display: flex;
                    width: 100vw;
                    max-width: 100%;
                    background: #ffffff;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow-x: hidden;
                }

                /* ═══════════════════════════════════════════════════════════════
                   LEFT SIDE: Visual Showcase Panel (50%)
                   ═══════════════════════════════════════════════════════════════ */
                .visual-side {
                    width: 50%;
                    min-height: 100vh;
                    background: #5d0821;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 3.5rem 4rem;
                    color: #ffffff;
                    overflow: hidden;
                    background-image: url('/images/about-us-saree.jpg');
                    background-size: cover;
                    background-position: center;
                }

                .visual-bg-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(145deg, rgba(74, 5, 25, 0.94) 0%, rgba(38, 2, 13, 0.97) 100%);
                    backdrop-filter: blur(2px);
                    z-index: 1;
                }

                .visual-content {
                    position: relative;
                    z-index: 2;
                    max-width: 540px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2.25rem;
                }

                .top-brand-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    padding: 8px 18px 8px 10px;
                    border-radius: 50px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    width: fit-content;
                }

                .brand-logo-circle {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    padding: 2px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }

                .brand-logo-circle img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .brand-pill-text {
                    display: flex;
                    flex-direction: column;
                }

                .brand-pill-text strong {
                    font-size: 0.85rem;
                    letter-spacing: 0.08em;
                    color: #ffffff;
                }

                .brand-pill-text span {
                    font-size: 0.72rem;
                    color: rgba(255, 255, 255, 0.75);
                }

                .visual-hero-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .hero-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #fbd38d;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                }

                .hero-title {
                    font-size: 2.35rem;
                    font-weight: 800;
                    line-height: 1.22;
                    margin: 0;
                    color: #ffffff;
                    letter-spacing: -0.02em;
                }

                .hero-desc {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.82);
                    margin: 0;
                }

                .visual-feature-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .feature-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    background: rgba(255, 255, 255, 0.07);
                    backdrop-filter: blur(10px);
                    padding: 1rem 1.25rem;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    transition: transform 0.2s, background 0.2s;
                }

                .feature-card:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(4px);
                }

                .feature-icon-box {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: rgba(251, 211, 141, 0.18);
                    color: #fbd38d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .feature-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .feature-text strong {
                    font-size: 0.92rem;
                    color: #ffffff;
                }

                .feature-text span {
                    font-size: 0.78rem;
                    color: rgba(255, 255, 255, 0.75);
                    line-height: 1.45;
                }

                .visual-footer {
                    margin-top: 0.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .visual-footer-links {
                    display: flex;
                    gap: 8px;
                }

                /* ═══════════════════════════════════════════════════════════════
                   RIGHT SIDE: Seamless Form Panel (Logo Displayed Above Form)
                   ═══════════════════════════════════════════════════════════════ */
                .form-side {
                    width: 50%;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3.5rem 4rem;
                    background: linear-gradient(180deg, #ffffff 0%, #fdfbf8 100%);
                    position: relative;
                    overflow-y: auto;
                    box-sizing: border-box;
                }

                .form-container {
                    width: 100%;
                    max-width: 460px;
                    margin: auto;
                    background: transparent;
                    padding: 0;
                    border-radius: 0;
                    box-shadow: none;
                    border: none;
                }

                .form-header {
                    margin-bottom: 2.25rem;
                }

                .form-logo-wrapper {
                    margin-bottom: 1.5rem;
                }

                .form-brand-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    text-decoration: none;
                    padding: 6px 14px 6px 8px;
                    background: #fdfbf7;
                    border: 1px solid #f3e8d2;
                    border-radius: 50px;
                    box-shadow: 0 4px 14px rgba(93, 8, 33, 0.06);
                    transition: all 0.2s ease;
                }

                .form-brand-badge:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(93, 8, 33, 0.1);
                    border-color: #e8d5b5;
                }

                .form-brand-logo-frame {
                    width: 100px;
                    height: 100px;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .form-brand-logo-frame img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    margin-bottom:10px;
                }

                .form-brand-text-block {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                }

                .form-brand-title {
                    font-size: 0.88rem;
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    color: #5d0821;
                    line-height: 1.2;
                }

                .form-brand-subtitle {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #92400e;
                    text-transform: uppercase;
                }

                .form-title {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #111827;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.02em;
                }

                .form-subtitle {
                    font-size: 0.92rem;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.55;
                }

                .auth-form {
                    width: 100%;
                }

                /* Alert Boxes */
                .alert-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0.9rem 1.1rem;
                    border-radius: 12px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    animation: slideDown 0.2s ease-out;
                }

                .error-alert {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #b91c1c;
                }

                .success-alert {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #15803d;
                }

                /* Form Fields */
                .form-group {
                    margin-bottom: 1.5rem;
                    width: 100%;
                }

                .label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .form-label {
                    display: block;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #374151;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .forgot-link {
                    font-size: 0.82rem;
                    color: #5d0821;
                    font-weight: 700;
                    text-decoration: none;
                    transition: opacity 0.2s;
                }

                .forgot-link:hover {
                    text-decoration: underline;
                    opacity: 0.85;
                }

                .input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }

                .input-icon-slot {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                    pointer-events: none;
                    z-index: 3;
                    width: 20px;
                    height: 20px;
                }

                .form-input {
                    width: 100% !important;
                    padding: 0.95rem 1rem 0.95rem 2.85rem !important;
                    border-radius: 12px;
                    border: 1.5px solid #e5e7eb;
                    background: #fdfdfd;
                    color: #111827;
                    font-size: 0.95rem;
                    font-weight: 500;
                    outline: none;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                    font-family: inherit;
                    display: block;
                }

                .form-input:focus {
                    background: #ffffff;
                    border-color: #5d0821;
                    box-shadow: 0 0 0 4px rgba(93, 8, 33, 0.08);
                }

                .password-input {
                    padding-right: 3.2rem !important;
                }

                .eye-toggle-btn {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    transition: color 0.2s;
                    z-index: 3;
                }

                .eye-toggle-btn:hover {
                    color: #374151;
                }

                .submit-btn {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    background: #5d0821;
                    color: #ffffff;
                    border: none;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.98rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 6px 18px rgba(93, 8, 33, 0.2);
                    font-family: inherit;
                    margin-top: 0.75rem;
                }

                .submit-btn:hover:not(:disabled) {
                    background: #460518;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px rgba(93, 8, 33, 0.3);
                }

                .submit-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .back-store-wrap {
                    text-align: center;
                    margin-top: 1.75rem;
                }

                .back-store-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: #6b7280;
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.15s;
                }

                .back-store-link:hover {
                    color: #5d0821;
                }

                /* 2FA OTP Specific Styles */
                .otp-info-banner {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 1.1rem 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 2rem;
                }

                .otp-info-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: #eff6ff;
                    color: #2563eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .otp-info-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .otp-info-text strong {
                    font-size: 0.92rem;
                    color: #0f172a;
                }

                .otp-info-text span {
                    font-size: 0.82rem;
                    color: #64748b;
                    line-height: 1.4;
                }

                .otp-digit-grid {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 2rem;
                }

                .otp-digit-box {
                    width: 52px;
                    height: 58px;
                    text-align: center;
                    font-size: 1.45rem;
                    font-weight: 800;
                    border-radius: 14px;
                    border: 1.5px solid #cbd5e1;
                    background: #ffffff;
                    color: #0f172a;
                    outline: none;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                    font-family: inherit;
                }

                .otp-digit-box:focus {
                    border-color: #5d0821;
                    box-shadow: 0 0 0 4px rgba(93, 8, 33, 0.08);
                    background: #fdfbf8;
                }

                .otp-digit-box.filled {
                    border-color: #5d0821;
                    background: rgba(93, 8, 33, 0.02);
                }

                .otp-actions-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.85rem;
                    margin-top: 1.5rem;
                }

                .resend-btn {
                    background: none;
                    border: none;
                    color: #5d0821;
                    font-size: 0.86rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: inherit;
                    transition: opacity 0.15s;
                }

                .resend-btn:disabled {
                    color: #9ca3af;
                    cursor: default;
                }

                .switch-account-btn {
                    background: none;
                    border: none;
                    color: #6b7280;
                    font-size: 0.82rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-family: inherit;
                    transition: color 0.15s;
                }

                .switch-account-btn:hover {
                    color: #111827;
                }

                .form-security-footer {
                    margin-top: 3rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: #9ca3af;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                @keyframes slideDown {
                    from { transform: translateY(-8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Responsive Breakpoint */
                @media (max-width: 960px) {
                    .visual-side {
                        display: none;
                    }
                    .form-side {
                        width: 100%;
                        padding: 3rem 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
