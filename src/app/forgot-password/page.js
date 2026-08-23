'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, KeyRound, CheckCircle2, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function ResetPasswordPage() {
    const router = useRouter();
    const { showToast } = useShop();

    // 4-step state: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Success
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Step 1: Send Verification OTP to Email
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid Email Address.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send-otp',
                    email: email.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessMessage(data.message || 'Verification OTP sent to your email.');
                setStep(2);
            } else {
                setError(data.error || 'Failed to send verification code. Please check your email.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP Code
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Please enter the 6-digit Verification OTP code.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify-otp',
                    email: email.trim(),
                    otp: otp.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessMessage('OTP Verified Successfully! Please set your new password.');
                setStep(3);
            } else {
                setError(data.error || 'Invalid or expired OTP code.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Update Password
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
            const res = await fetch('/api/auth/customer/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-password',
                    email: email.trim(),
                    otp: otp.trim(),
                    newPassword
                })
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
                maxWidth: '440px',
                width: '100%',
                margin: '0 auto',
                background: '#ffffff',
                padding: '2.5rem 2rem',
                borderRadius: '20px',
                border: '1px solid #f0e6df',
                boxShadow: '0 15px 45px rgba(93, 8, 33, 0.08)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 20px rgba(93, 8, 33, 0.12)',
                            background: '#ffffff',
                            padding: '6px'
                        }}>
                            <img src="/images/vaiyaaree-logo.png" alt="Vaiyaaree" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.35rem' }}>Reset Password</h1>
                    <p style={{ fontSize: '0.85rem', color: '#5d0821', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                        {step === 1 && 'Step 1: Enter Registered Email'}
                        {step === 2 && 'Step 2: Enter Verification OTP'}
                        {step === 3 && 'Step 3: Generate New Password'}
                        {step === 4 && 'Password Updated Successfully'}
                    </p>
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
                        ⚠️ {error}
                    </div>
                )}
                {successMessage && step !== 4 && (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem'
                    }}>
                        ✅ {successMessage}
                    </div>
                )}

                {/* STEP 1: ENTER EMAIL */}
                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email Address <span style={{ color: '#5d0821' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Enter your registered email"
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

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            {loading ? 'Sending Code...' : 'Send Verification OTP →'}
                        </button>
                    </form>
                )}

                {/* STEP 2: VERIFY OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOTP}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                6-Digit Verification OTP
                            </label>
                            <div style={{ position: 'relative' }}>
                                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    placeholder="Enter 6-digit OTP code"
                                    maxLength="6"
                                    minLength="6"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid #ddd',
                                        fontSize: '1.1rem',
                                        letterSpacing: '0.2em',
                                        fontWeight: 700,
                                        outline: 'none',
                                        background: '#faf9f6'
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.5rem' }}>
                                Code sent to <strong>{email}</strong>
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP Code →'}
                        </button>
                    </form>
                )}

                {/* STEP 3: GENERATE NEW PASSWORD */}
                {step === 3 && (
                    <form onSubmit={handleUpdatePassword}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                                    style={{ width: '100%', padding: '0.85rem 2.75rem 0.85rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', background: '#faf9f6' }}
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
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', background: '#faf9f6' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(93, 8, 33, 0.2)'
                            }}
                        >
                            {loading ? 'Updating Password...' : 'Update Password →'}
                        </button>
                    </form>
                )}

                {/* STEP 4: SUCCESS SCREEN */}
                {step === 4 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#166534' }}>
                            <CheckCircle2 size={64} />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>Password Successfully Updated!</h2>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
                            Your password has been changed. Redirecting you to the Login page...
                        </p>
                        <Link href="/login" style={{ display: 'inline-block', padding: '0.75rem 2rem', background: '#5d0821', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
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
