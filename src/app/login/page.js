'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Lock, User, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function CustomerLoginPage() {
    const router = useRouter();
    const { setUser } = useShop();

    // User Login State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: phone, 2: otp

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, role: 'user' })
            });
            const data = await res.json();
            if (res.ok) setStep(2);
            else setError(data.error || 'Failed to send OTP');
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, role: 'user' })
            });
            const data = await res.json();
            if (res.ok) {
                const customerData = { ...data.customer, login_at: Date.now() };
                localStorage.setItem('cast_prince_user', JSON.stringify(customerData));
                setUser(customerData);
                router.push('/shop');
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Verification failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'hsl(var(--bg-app))', padding: '1.5rem', fontFamily: 'var(--font-body)', color: 'hsl(var(--text-main))'
        }}>
            <div style={{
                maxWidth: '440px', width: '100%', background: 'hsl(var(--bg-card))', padding: '2.5rem',
                borderRadius: '1.5rem', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'var(--shadow-card)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '130px', height: '130px', background: 'transparent', borderRadius: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 25px hsl(var(--primary) / 0.2)', overflow: 'hidden', padding: '0.25rem'
                        }}>
                            <img src="/images/cp-logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '1rem 0 0.5rem' }}>Vaiyaaree</h1>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        Customer Shop Portal
                    </p>
                </div>

                {/* USER LOGIN FORM (Phone + OTP) */}
                <>
                    {step === 1 ? (
                        <form onSubmit={handleSendOTP}>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                                    WhatsApp Number
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))' }} />
                                    <input
                                        type="tel"
                                        placeholder="Enter mobile number"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        minLength="10"
                                        required
                                        style={{
                                            width: '100%', padding: '1rem 1rem 1rem 3.5rem',
                                            borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                            background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                            fontSize: '1rem', outline: 'none', fontFamily: 'var(--font-body)'
                                        }}
                                    />
                                </div>
                            </div>

                            {error && <div style={{ color: 'hsl(var(--danger))', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}


                            <button type="submit" disabled={loading} style={{
                                width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: '#fff',
                                border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                cursor: 'pointer', fontFamily: 'var(--font-body)'
                            }}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Login <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP}>
                            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: 'hsl(var(--success) / 0.1)', borderRadius: '50px', color: 'hsl(var(--success))', fontSize: '0.85rem', fontWeight: 700 }}>
                                    <CheckCircle2 size={18} /> Verifying {phone}
                                </div>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                                    Enter 6-Digit Code
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '1.1rem',
                                        borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                        background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                        fontSize: '1.5rem', outline: 'none', letterSpacing: '8px', textAlign: 'center', fontFamily: 'var(--font-body)'
                                    }}
                                />
                            </div>

                            {error && <div style={{ color: 'hsl(var(--danger))', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

                            <button type="submit" disabled={loading} style={{
                                width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: 'white',
                                border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1.1rem',
                                cursor: 'pointer', boxShadow: '0 5px 15px hsl(var(--primary) / 0.2)', fontFamily: 'var(--font-body)'
                            }}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Continue'}
                            </button>

                            <button type="button" onClick={() => setStep(1)} style={{
                                width: '100%', marginTop: '1.5rem', background: 'none', border: 'none',
                                color: 'hsl(var(--text-dim))', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)'
                            }}>
                                Try a different number
                            </button>
                        </form>
                    )}
                </>

                <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ShieldCheck size={14} /> Secure Customer Portal
                    </p>
                </div>
            </div>

            <style jsx>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
