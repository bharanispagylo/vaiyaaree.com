'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './customer.module.css';

export default function CustomerLoginPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [step, setStep] = useState(1); // 1 = Enter Phone, 2 = Enter OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    async function handleSendOTP(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone.trim() })
        });

        const data = await res.json();
        setLoading(false);

        if (res.ok) {
            setStep(2);
            setSuccessMessage('OTP sent successfully to your WhatsApp!');
        } else {
            setError(data.error || 'Failed to send OTP. Please try again.');
        }
    }

    async function handleVerifyOTP(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim() })
        });

        const data = await res.json();
        setLoading(false);

        if (res.ok) {
            router.push('/shop'); // Redirect to shop after login
        } else {
            setError(data.error || 'Invalid or expired OTP. Please try again.');
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
                    <div className={styles.logoIcon}>💮</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '1rem 0 0.5rem' }}>Vaiyaaree</h1>
                    <p className={styles.subtitle}>Welcome Back!</p>
                </div>

                {successMessage && (
                    <div className={styles.success}>✅ {successMessage}</div>
                )}
                {error && (
                    <div className={styles.error}>⚠️ {error}</div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>WhatsApp Number</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>📱</span>
                                <input
                                    className={styles.input}
                                    type="tel"
                                    placeholder="Enter mobile number"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                    pattern="[0-9]{10}"
                                    maxLength="10"
                                    minLength="10"
                                    required
                                    autoComplete="tel"
                                />
                            </div>
                            <p className={styles.desc}>We'll send a code to your WhatsApp for verification.</p>
                        </div>

                        <button className={styles.btn} type="submit" disabled={loading}>
                            {loading ? <span className={styles.spinner} /> : 'Send OTP via WhatsApp'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>Enter 6-digit Code</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>🔢</span>
                                <input
                                    className={styles.input}
                                    type="text"
                                    placeholder="Enter verification code"
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value)}
                                    required
                                    maxLength={6}
                                />
                            </div>
                            <p className={styles.desc}>Check your WhatsApp for the verification code.</p>
                        </div>

                        <button className={styles.btn} type="submit" disabled={loading}>
                            {loading ? <span className={styles.spinner} /> : 'Verify & Continue'}
                        </button>

                        <button
                            type="button"
                            className={styles.backBtn}
                            onClick={() => { setStep(1); setError(''); }}
                        >
                            Change Number
                        </button>
                    </form>
                )}

                <p className={styles.footer}>🔐 Secure Authentication via WhatsApp</p>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className={styles.linkButton}
                    >
                        Are you an Admin? Login Here
                    </button>
                </div>
            </div>
        </div>
    );
}
