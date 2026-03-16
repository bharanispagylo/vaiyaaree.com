'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1 = enter PIN, 2 = set new password
    const [pin, setPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleVerifyPin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 500));
        // We verify PIN together with new password in one API call at step 2
        if (pin.trim().length < 1) {
            setError('Please enter your recovery PIN.');
            setLoading(false);
            return;
        }
        setStep(2);
        setLoading(false);
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, newPassword })
        });
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
            setSuccess('✅ Password changed successfully! Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        } else {
            setError(data.error || 'Something went wrong.');
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.bg}>
                <div className={styles.circle1} />
                <div className={styles.circle2} />
                <div className={styles.circle3} />
            </div>

            <div className={styles.card}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>{step === 1 ? '🔑' : '🔒'}</div>
                    <h1 className={styles.brand}>Reset Password</h1>
                    <p className={styles.subtitle}>
                        {step === 1 ? 'Enter your Recovery PIN' : 'Set a New Password'}
                    </p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleVerifyPin} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>Recovery PIN</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>🔐</span>
                                <input
                                    className={styles.input}
                                    type="number"
                                    placeholder="Enter your 4-digit PIN"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    required
                                />
                            </div>
                            <p style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
                                💡 Default PIN is <strong style={{ color: 'hsl(var(--primary))' }}>1234</strong> — change it in .env.local after reset
                            </p>
                        </div>

                        {error && <div className={styles.error}>⚠️ {error}</div>}

                        <button className={styles.btn} type="submit" disabled={loading}>
                            {loading ? <span className={styles.spinner} /> : '➡️ Next'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontSize: '14px', textAlign: 'center', marginTop: '-8px' }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>New Password</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>🔒</span>
                                <input
                                    className={styles.input}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                                <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Confirm New Password</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>🔒</span>
                                <input
                                    className={styles.input}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Re-enter new password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className={styles.error}>⚠️ {error}</div>}
                        {success && (
                            <div style={{ background: 'hsl(var(--success) / 0.12)', border: '1px solid hsl(var(--success) / 0.3)', color: 'hsl(var(--success))', borderRadius: '10px', padding: '10px 14px', fontSize: '13px' }}>
                                {success}
                            </div>
                        )}

                        <button className={styles.btn} type="submit" disabled={loading}>
                            {loading ? <span className={styles.spinner} /> : '✅ Change Password'}
                        </button>
                    </form>
                )}

                <p className={styles.footer}>🔐 Caste Print — Admin Portal</p>
            </div>
        </div>
    );
}
