'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    MessageCircle, Lock, KeyRound, CheckCircle2, ArrowLeft, Eye, EyeOff, 
    Loader2, Phone, ShieldCheck, RefreshCw, UserCheck, Mail
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useShop();

    const urlToken = searchParams.get('token') || '';
    const urlIdentifier = searchParams.get('identifier') || searchParams.get('email') || searchParams.get('phone') || '';

    // 4-step flow: 1 = Phone/WhatsApp, 2 = Verify OTP, 3 = New Password, 4 = Success
    const [step, setStep] = useState(1);

    const [phone, setPhone] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLinkMode, setIsLinkMode] = useState(false);
    const [linkCustomer, setLinkCustomer] = useState(null);

    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // If reset token is in URL (from Admin / Email / WhatsApp link), verify it directly on load
    useEffect(() => {
        if (!urlToken) return;

        const verifyDirectToken = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch('/api/auth/customer/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify-token',
                        token: urlToken,
                        identifier: urlIdentifier
                    })
                });

                const data = await res.json();
                if (res.ok && data.success && data.verified) {
                    setIsLinkMode(true);
                    setLinkCustomer(data.customer || null);
                    setStep(3); // Jump straight to Step 3: Set New Password
                    setSuccessMessage(`Reset link verified for ${data.customer?.name || 'Customer'}. Please choose your new password.`);
                } else {
                    setError(data.error || 'This password reset link is invalid or has expired. You can request a new one below.');
                    setStep(1);
                }
            } catch (err) {
                setError('Failed to verify reset link. Please try again.');
                setStep(1);
            } finally {
                setLoading(false);
            }
        };

        verifyDirectToken();
    }, [urlToken, urlIdentifier]);

    // Timer effect for Resend OTP cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Clean phone number (extract digits)
    const cleanDigits = phone.replace(/\D/g, '');

    // Step 1: Send Verification OTP via WhatsApp
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccessMessage('');

        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
            setError('Please enter a valid 10-digit WhatsApp Mobile Number.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send-otp',
                    phone: digits.slice(-10)
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setMaskedPhone(data.maskedPhone || `+91 ******${digits.slice(-4)}`);
                setSuccessMessage(data.message || 'Verification OTP sent to your WhatsApp number.');
                setResendCooldown(45);
                setStep(2);
            } else {
                setError(data.error || 'Failed to send WhatsApp verification code. Please check your number.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP handler
    const handleResendOTP = async () => {
        if (resendCooldown > 0 || resending) return;
        setError('');
        setSuccessMessage('');
        setResending(true);

        const digits = phone.replace(/\D/g, '');
        try {
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send-otp',
                    phone: digits.slice(-10)
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessMessage('A new verification code has been sent to your WhatsApp!');
                setResendCooldown(45);
            } else {
                setError(data.error || 'Failed to resend code. Please wait a moment and try again.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setResending(false);
        }
    };

    // Step 2: Verify WhatsApp OTP Code
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Please enter the 6-digit WhatsApp OTP code.');
            return;
        }

        setLoading(true);
        try {
            const digits = phone.replace(/\D/g, '');
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify-otp',
                    phone: digits.slice(-10),
                    otp: otp.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessMessage('WhatsApp OTP verified successfully! Please set your new password.');
                setStep(3);
            } else {
                setError(data.error || 'Invalid or expired WhatsApp OTP code.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Update Password (works for both OTP flow and direct Link token flow)
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New Password and Confirm Password do not match.');
            return;
        }

        setLoading(true);
        try {
            let payload = {};

            if (isLinkMode && urlToken) {
                payload = {
                    action: 'reset-with-token',
                    token: urlToken,
                    newPassword
                };
            } else {
                const digits = phone.replace(/\D/g, '');
                payload = {
                    action: 'update-password',
                    phone: digits.slice(-10),
                    otp: otp.trim(),
                    newPassword
                };
            }

            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setStep(4);
                showToast('Password Updated Successfully!', 'success');
                setTimeout(() => {
                    router.push('/login');
                }, 2500);
            } else {
                setError(data.error || 'Failed to update password.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
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
                maxWidth: '460px',
                width: '100%',
                margin: '0 auto',
                background: '#ffffff',
                padding: '2.5rem 2rem',
                borderRadius: '24px',
                border: '1px solid #f0e6df',
                boxShadow: '0 20px 50px rgba(93, 8, 33, 0.08)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '18px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(93, 8, 33, 0.12)',
                            background: '#ffffff',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img 
                                src="/images/vaiyaaree-logo.png" 
                                alt="Vaiyaaree" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                            />
                        </div>
                    </div>
                    
                    <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.4rem' }}>
                        Reset Password
                    </h1>
                    
                    {/* Stepper Indicator Badge */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f8f4ee',
                        border: '1px solid #e7dcd3',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        color: '#5d0821',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                    }}>
                        {step === 1 && <><MessageCircle size={14} color="#25D366" /> Step 1: Mobile / WhatsApp</>}
                        {step === 2 && <><KeyRound size={14} /> Step 2: Verification Code</>}
                        {step === 3 && <><Lock size={14} /> Step 3: New Password</>}
                        {step === 4 && <><CheckCircle2 size={14} color="#166534" /> Completed</>}
                    </div>
                </div>

                {/* Verified Customer Card in Link Mode */}
                {isLinkMode && linkCustomer && step === 3 && (
                    <div style={{
                        background: '#f8f4ee',
                        border: '1px solid #e7dcd3',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#5d0821',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800
                        }}>
                            {linkCustomer.name ? linkCustomer.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: '#1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {linkCustomer.name || 'Vaiyaaree Customer'}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.78rem' }}>
                                {linkCustomer.email || linkCustomer.phone}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error & Success Messages */}
                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚠️</span> {error}
                    </div>
                )}
                {successMessage && step !== 4 && (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>✅</span> {successMessage}
                    </div>
                )}

                {/* STEP 1: ENTER WHATSAPP NUMBER */}
                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                WhatsApp Mobile Number <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#faf9f6',
                                    border: '1px solid #ddd',
                                    borderRadius: '12px',
                                    padding: '0.85rem 0.9rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: '#444'
                                }}>
                                    <span style={{ fontSize: '1rem' }}>🇮🇳</span> +91
                                </div>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit mobile number"
                                        maxLength="10"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem 1rem 0.85rem 2.6rem',
                                            borderRadius: '12px',
                                            border: '1px solid #ddd',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            background: '#faf9f6',
                                            letterSpacing: '0.04em'
                                        }}
                                    />
                                    <MessageCircle 
                                        size={18} 
                                        style={{ 
                                             position: 'absolute', 
                                            left: '0.9rem', 
                                            top: '50%', 
                                            transform: 'translateY(-50%)', 
                                            color: '#25D366' 
                                        }} 
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#777', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🔒 A 6-digit OTP will be sent to your WhatsApp account.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || cleanDigits.length !== 10}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: cleanDigits.length === 10 ? '#5d0821' : '#94a3b8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                cursor: cleanDigits.length === 10 ? 'pointer' : 'not-allowed',
                                boxShadow: cleanDigits.length === 10 ? '0 6px 20px rgba(93, 8, 33, 0.25)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? (
                                <><Loader2 size={18} className="animate-spin" /> Sending WhatsApp OTP...</>
                            ) : (
                                <><MessageCircle size={18} /> Send WhatsApp OTP →</>
                            )}
                        </button>
                    </form>
                )}

                {/* STEP 2: VERIFY WHATSAPP OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOTP}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                6-Digit WhatsApp Verification OTP
                            </label>
                            
                            <div style={{ position: 'relative' }}>
                                <KeyRound size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#5d0821' }} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="••••••"
                                    maxLength="6"
                                    minLength="6"
                                    autoFocus
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.9rem 1rem 0.9rem 2.85rem',
                                        borderRadius: '12px',
                                        border: '1px solid #5d0821',
                                        fontSize: '1.25rem',
                                        letterSpacing: '0.3em',
                                        fontWeight: 800,
                                        outline: 'none',
                                        background: '#faf9f6',
                                        color: '#1a1a1a',
                                        fontFamily: 'monospace, sans-serif'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', flexWrap: 'wrap', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                    Sent to <strong>{maskedPhone || phone}</strong>
                                </span>
                                
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={resendCooldown > 0 || resending}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: resendCooldown > 0 ? '#94a3b8' : '#25D366',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {resending ? (
                                        <><Loader2 size={13} className="animate-spin" /> Sending...</>
                                    ) : resendCooldown > 0 ? (
                                        `Resend OTP in ${resendCooldown}s`
                                    ) : (
                                        <><RefreshCw size={13} /> Resend via WhatsApp</>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                style={{
                                    padding: '0.9rem 1.25rem',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Change Number
                            </button>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                style={{
                                    flex: 1,
                                    padding: '0.9rem',
                                    background: otp.length === 6 ? '#5d0821' : '#94a3b8',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    cursor: otp.length === 6 ? 'pointer' : 'not-allowed',
                                    boxShadow: otp.length === 6 ? '0 6px 20px rgba(93, 8, 33, 0.2)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                                ) : (
                                    <>Verify OTP →</>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* STEP 3: GENERATE NEW PASSWORD */}
                {step === 3 && (
                    <form onSubmit={handleUpdatePassword}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                New Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    minLength="6"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: '#faf9f6'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Confirm New Password <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    minLength="6"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: '#faf9f6'
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: (newPassword.length >= 6 && newPassword === confirmPassword) ? '#5d0821' : '#94a3b8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                cursor: (newPassword.length >= 6 && newPassword === confirmPassword) ? 'pointer' : 'not-allowed',
                                boxShadow: (newPassword.length >= 6 && newPassword === confirmPassword) ? '0 6px 20px rgba(93, 8, 33, 0.2)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? (
                                <><Loader2 size={18} className="animate-spin" /> Updating Password...</>
                            ) : (
                                <>Update Password & Save →</>
                            )}
                        </button>
                    </form>
                )}

                {/* STEP 4: SUCCESS SCREEN */}
                {step === 4 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#166534' }}>
                            <CheckCircle2 size={64} />
                        </div>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>
                            Password Successfully Updated!
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.75rem', lineHeight: '1.5' }}>
                            Your password has been changed. Redirecting you to login...
                        </p>
                        <Link 
                            href="/login" 
                            style={{
                                display: 'inline-block',
                                padding: '0.85rem 2.25rem',
                                background: '#5d0821',
                                color: '#fff',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                boxShadow: '0 6px 18px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            Click Here to Login
                        </Link>
                    </div>
                )}

                {/* Back to Login Footer Link */}
                {step !== 4 && (
                    <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #efe5db' }}>
                        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#5d0821', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <ForgotPasswordContent />
        </Suspense>
    );
}
