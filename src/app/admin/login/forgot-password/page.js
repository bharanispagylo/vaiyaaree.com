'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    
    const [recoveryPin, setRecoveryPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pin: recoveryPin, 
                    newPassword: newPassword 
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                setSuccess('Password reset successful! Redirecting to login...');
                setTimeout(() => {
                    router.push('/admin/login');
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password');
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
                <div style={{ marginBottom: '2rem' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
                            cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem'
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </button>
                    
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '60px', height: '60px', background: 'hsl(var(--primary) / 0.1)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <Key size={28} style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Reset Password</h1>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                            Enter your recovery PIN and new password
                        </p>
                    </div>
                </div>

                <form onSubmit={handleResetPassword}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                            Recovery PIN
                        </label>
                        <input
                            type="text"
                            placeholder="Enter recovery PIN"
                            value={recoveryPin}
                            onChange={e => setRecoveryPin(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '1rem',
                                borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-body)'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                            New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '1rem 3rem 1rem 1rem',
                                    borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                    background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                    fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-body)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'hsl(var(--text-dim))', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                            Confirm New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '1rem 3rem 1rem 1rem',
                                    borderRadius: '0.9rem', border: '1px solid hsl(var(--border-subtle))',
                                    background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', boxSizing: 'border-box',
                                    fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-body)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'hsl(var(--text-dim))', cursor: 'pointer' }}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', background: 'hsl(var(--danger) / 0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>{error}</div>}
                    
                    {success && <div style={{ color: '#059669', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', background: 'hsl(var(--success) / 0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>{success}</div>}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: '#fff',
                        border: 'none', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        cursor: 'pointer', transition: 'transform 0.1s', marginBottom: '1rem',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)', fontFamily: 'var(--font-body)'
                    }}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <>Reset Password</>}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'hsl(var(--bg-app))', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))', margin: 0 }}>
                        Contact your administrator if you don't have the recovery PIN
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
