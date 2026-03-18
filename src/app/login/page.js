'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock, User, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function UnifiedLoginPage() {
    const router = useRouter();
    const { setUser } = useShop();
    const [role, setRole] = useState('admin'); // 'user' or 'admin'

    // Admin Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // User Login State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: phone, 2: otp

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                // Save to LocalStorage (No Cookies)
                localStorage.setItem('cast_prince_admin', 'true');
                localStorage.setItem('cast_prince_user', JSON.stringify(data));
                setUser(data);
                router.push('/admin');
            } else {
                setError(data.error || 'Invalid username or password');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                // Save to LocalStorage (No Cookies)
                localStorage.setItem('cast_prince_user', JSON.stringify(data.customer));
                setUser(data.customer);
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
            background: 'hsl(var(--bg-app))', padding: '1.5rem', fontFamily: 'sans-serif', color: 'hsl(var(--text-main))'
        }}>
            <div style={{
                maxWidth: '440px', width: '100%', background: 'hsl(var(--bg-card))', padding: '2.5rem',
                borderRadius: '1.5rem', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'var(--shadow-card)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '64px', height: '64px', background: 'hsl(var(--primary))', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 20px hsl(var(--primary) / 0.2)'
                        }}>
                            <span style={{ fontSize: '2rem' }}>💮</span>
                        </div>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '1rem 0 0.5rem' }}>Cast Print</h1>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        {role === 'admin' ? 'Business Admin Portal' : 'Customer Shop Portal'}
                    </p>
                </div>

                {/* Role Switcher */}
                <div style={{ display: 'flex', background: 'hsl(var(--bg-app))', padding: '5px', borderRadius: '14px', marginBottom: '2.5rem', border: '1px solid hsl(var(--border-subtle))' }}>
                    <button
                        onClick={() => { setRole('admin'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: role === 'admin' ? 'hsl(var(--primary))' : 'transparent',
                            color: role === 'admin' ? 'white' : 'hsl(var(--text-muted))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <ShieldCheck size={18} /> Admin
                    </button>
                    <button
                        onClick={() => { setRole('user'); setError(''); setStep(1); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: role === 'user' ? 'hsl(var(--primary))' : 'transparent',
                            color: role === 'user' ? 'white' : 'hsl(var(--text-muted))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <User size={18} /> Customer
                    </button>
                </div>

                {/* ADMIN LOGIN FORM */}
                {role === 'admin' && (
                    <form onSubmit={handleAdminLogin}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                                Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={20} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))' }} />
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '1rem 1rem 1rem 3.25rem',
                                        borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                        background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                        fontSize: '0.95rem', outline: 'none', transition: '0.2s'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={20} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '1rem 3.25rem 1rem 3.25rem',
                                        borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                        background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                        fontSize: '0.95rem', outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1.1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'hsl(var(--text-dim))', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: '#fff',
                            border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', transition: 'transform 0.1s active:scale-95', marginBottom: '1.5rem',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <>🚀 Login to Dashboard</>}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <a href="#" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'underline' }}>Forgot Password?</a>
                        </div>
                    </form>
                )}

                {/* USER LOGIN FORM (Phone + OTP) */}
                {role === 'user' && (
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
                                            onChange={e => setPhone(e.target.value)}
                                            required
                                            style={{
                                                width: '100%', padding: '1rem 1rem 1rem 3.5rem',
                                                borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                                background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                                fontSize: '1rem', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {error && <div style={{ color: 'hsl(var(--danger))', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}


                                <button type="submit" disabled={loading} style={{
                                    width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: '#fff',
                                    border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    cursor: 'pointer', marginBottom: '1.5rem'
                                }}>

                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Login with Phone <ArrowRight size={18} /></>}

                                </button>

                                <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
                                        New customer? Send any message to our WhatsApp and your account will be created automatically! 🌸
                                    </p>
                                </div>
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
                                            fontSize: '1.5rem', outline: 'none', letterSpacing: '8px', textAlign: 'center'
                                        }}
                                    />
                                </div>

                                {error && <div style={{ color: 'hsl(var(--danger))', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>⚠️ {error}</div>}

                                <button type="submit" disabled={loading} style={{
                                    width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: 'white',
                                    border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1.1rem',
                                    cursor: 'pointer', boxShadow: '0 5px 15px hsl(var(--primary) / 0.2)'
                                }}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Continue'}
                                </button>

                                <button type="button" onClick={() => setStep(1)} style={{
                                    width: '100%', marginTop: '1.5rem', background: 'none', border: 'none',
                                    color: 'hsl(var(--text-dim))', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
                                }}>
                                    Try a different number
                                </button>
                            </form>
                        )}
                    </>
                )}

                <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ShieldCheck size={14} /> Secure Admin Access Only
                    </p>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 480px) {
                    div[style*="padding: 2.5rem"] {
                        padding: 1.5rem !important;
                    }
                    h1 {
                        font-size: 1.5rem !important;
                    }
                    div[style*="padding: 1.5rem"] {
                        padding: 1rem !important;
                    }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
