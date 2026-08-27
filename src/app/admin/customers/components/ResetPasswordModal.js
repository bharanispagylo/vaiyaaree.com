'use client';
import { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Sparkles, Check, X, Loader2 } from 'lucide-react';

export default function ResetPasswordModal({ isOpen, onClose, customer, onPasswordUpdated }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const generateStrongPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let generated = '';
        for (let i = 0; i < 10; i++) {
            generated += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(generated);
        setConfirmPassword(generated);
        setShowPassword(true);
        setError('');
    };

    const handleCopy = () => {
        if (!password) return;
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('New Password and Confirm Password do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/customers/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: customer?.id,
                    phone: customer?.phone,
                    newPassword: password.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (onPasswordUpdated) onPasswordUpdated(data.message);
                onClose();
            } else {
                setError(data.error || 'Failed to update customer password.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
        }}>
            <div 
                className="card shadow-premium animate-enter" 
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '2rem',
                    borderRadius: '24px',
                    background: '#ffffff',
                    position: 'relative',
                    border: '1px solid hsl(var(--border-subtle))'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-muted))',
                        padding: '4px'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'hsl(var(--primary) / 0.12)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <KeyRound size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                            {customer?.hasPassword ? 'Reset Customer Password' : 'Create Customer Password'}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                            For {customer?.name || 'Customer'} ({customer?.country_code || '+91'} {customer?.phone})
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        margin: '1rem 0'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Fast Auto-Generator Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={generateStrongPassword}
                            style={{
                                background: '#f8f4ee',
                                border: '1px solid #e7dcd3',
                                color: '#5d0821',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Sparkles size={14} /> Generate Strong Password
                        </button>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            New Password *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter at least 6 characters"
                                minLength={6}
                                required
                                className="admin-input"
                                style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.85rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Confirm New Password *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                minLength={6}
                                required
                                className="admin-input"
                                style={{ width: '100%', paddingLeft: '2.75rem' }}
                            />
                        </div>
                    </div>

                    {password && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                            <span style={{ color: '#475569' }}>Password: <strong>{showPassword ? password : '••••••••'}</strong></span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: copied ? '#10b981' : '#5d0821',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                }}
                            >
                                {copied ? '✓ Copied' : 'Copy Password'}
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '0.85rem', borderRadius: '12px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || password.length < 6 || password !== confirmPassword}
                            className="btn btn-primary"
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {loading ? 'Saving...' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
