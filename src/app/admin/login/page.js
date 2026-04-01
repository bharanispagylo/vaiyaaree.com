'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function AdminLoginPage() {
    const router = useRouter();
    const { setUser } = useShop();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                            width: '80px', height: '80px', background: 'transparent', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 20px hsl(var(--primary) / 0.2)', overflow: 'hidden'
                        }}>
                            <img src="/images/cp-logo.png" alt="CP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '1rem 0 0.5rem' }}>Cast Printz</h1>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        Business Admin Portal
                    </p>
                </div>

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
                                    fontSize: '0.95rem', outline: 'none', transition: '0.2s', fontFamily: 'var(--font-body)'
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
                                    fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-body)'
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

                    {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: '#fff',
                        border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        cursor: 'pointer', transition: 'transform 0.1s', marginBottom: '1.5rem',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)', fontFamily: 'var(--font-body)'
                    }}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <>Login</>}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <a href="#" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'underline' }}>Forgot Password?</a>
                    </div>
                </form>

                <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ShieldCheck size={14} /> Secure Admin Access Only
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
