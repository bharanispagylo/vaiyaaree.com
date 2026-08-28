'use client';
import { useState, useEffect } from 'react';
import { 
    KeyRound, Lock, Eye, EyeOff, Sparkles, Check, X, Loader2, 
    Send, Mail, MessageCircle, Link2, Copy, CheckCircle2, ShieldAlert, Clock
} from 'lucide-react';

export default function ResetPasswordModal({ isOpen, onClose, customer, onPasswordUpdated }) {
    // Mode tabs: 'generate' (Set/Generate Password) | 'link' (Send Reset Link)
    const [activeTab, setActiveTab] = useState('generate');

    // Tab 1: Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copiedPassword, setCopiedPassword] = useState(false);

    // Tab 2: Reset Link State
    const [expiryHours, setExpiryHours] = useState('24');
    const [generatedResetUrl, setGeneratedResetUrl] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);

    // Notification Options (default to true if channel available)
    const hasEmail = Boolean(customer?.email && customer.email.trim());
    const hasPhone = Boolean(customer?.phone && customer.phone.trim());

    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

    // Status / Feedback
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successBanner, setSuccessBanner] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setCopiedPassword(false);
            setGeneratedResetUrl('');
            setCopiedLink(false);
            setError('');
            setSuccessBanner('');
            setSendEmail(hasEmail);
            setSendWhatsApp(hasPhone);
        }
    }, [isOpen, customer, hasEmail, hasPhone]);

    if (!isOpen) return null;

    const generateStrongPassword = () => {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghijkmnpqrstuvwxyz';
        const numbers = '23456789';
        const symbols = '!@#$%&*';

        let generated = '';
        generated += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        generated += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        generated += numbers.charAt(Math.floor(Math.random() * numbers.length));
        generated += symbols.charAt(Math.floor(Math.random() * symbols.length));

        const allChars = uppercase + lowercase + numbers + symbols;
        for (let i = 0; i < 6; i++) {
            generated += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        // Shuffle
        generated = generated.split('').sort(() => 0.5 - Math.random()).join('');

        setPassword(generated);
        setConfirmPassword(generated);
        setShowPassword(true);
        setError('');
    };

    const handleCopyPassword = () => {
        if (!password) return;
        navigator.clipboard.writeText(password);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2500);
    };

    const handleCopyLink = () => {
        if (!generatedResetUrl) return;
        navigator.clipboard.writeText(generatedResetUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    // Handle Setting Direct Password
    const handleSetPasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessBanner('');

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
                    action: 'set-password',
                    id: customer?.id,
                    phone: customer?.phone,
                    email: customer?.email,
                    newPassword: password.trim(),
                    sendEmail: sendEmail && hasEmail,
                    sendWhatsApp: sendWhatsApp && hasPhone
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessBanner(data.message || 'Password updated and notifications dispatched successfully!');
                if (onPasswordUpdated) onPasswordUpdated(data.message);
                setTimeout(() => {
                    onClose();
                }, 1800);
            } else {
                setError(data.error || 'Failed to update customer password.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Generating & Sending Reset Link
    const handleSendResetLinkSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessBanner('');

        setLoading(true);
        try {
            const res = await fetch('/api/admin/customers/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send-reset-link',
                    id: customer?.id,
                    phone: customer?.phone,
                    email: customer?.email,
                    expiryHours: Number(expiryHours) || 24,
                    sendEmail: sendEmail && hasEmail,
                    sendWhatsApp: sendWhatsApp && hasPhone
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setGeneratedResetUrl(data.resetUrl || '');
                setSuccessBanner(data.message || 'Password reset link sent to customer!');
                if (onPasswordUpdated) onPasswordUpdated(data.message);
            } else {
                setError(data.error || 'Failed to generate reset link.');
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
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
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
                    maxWidth: '520px',
                    padding: '2.25rem 2rem',
                    borderRadius: '24px',
                    background: '#ffffff',
                    position: 'relative',
                    border: '1px solid hsl(var(--border-subtle))',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-muted))'
                    }}
                >
                    <X size={18} />
                </button>

                {/* Modal Title & Customer Info Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(93, 8, 33, 0.1)',
                        color: '#5d0821',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <KeyRound size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                            Customer Password Manager
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>
                            For <strong>{customer?.name || 'Customer'}</strong> • {customer?.country_code || '+91'} {customer?.phone}
                        </p>
                    </div>
                </div>

                {/* Tabs: Set Password vs Send Reset Link */}
                <div style={{
                    display: 'flex',
                    background: '#f8f4ee',
                    padding: '4px',
                    borderRadius: '14px',
                    marginBottom: '1.5rem',
                    border: '1px solid #efe5db'
                }}>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('generate'); setError(''); setSuccessBanner(''); }}
                        style={{
                            flex: 1,
                            padding: '0.7rem 0.5rem',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === 'generate' ? '#ffffff' : 'transparent',
                            color: activeTab === 'generate' ? '#5d0821' : '#64748b',
                            fontWeight: activeTab === 'generate' ? 800 : 600,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'generate' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Lock size={15} /> Set / Generate Password
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('link'); setError(''); setSuccessBanner(''); }}
                        style={{
                            flex: 1,
                            padding: '0.7rem 0.5rem',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === 'link' ? '#ffffff' : 'transparent',
                            color: activeTab === 'link' ? '#5d0821' : '#64748b',
                            fontWeight: activeTab === 'link' ? 800 : 600,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: activeTab === 'link' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Link2 size={15} /> Send Reset Link
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        background: '#fdf2f2',
                        border: '1px solid #f8b4b4',
                        color: '#981b1b',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <ShieldAlert size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success Banner */}
                {successBanner && (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#166534',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <span>{successBanner}</span>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 1: SET / GENERATE PASSWORD */}
                {/* ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'generate' && (
                    <form onSubmit={handleSetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        {/* Auto-generator Sparkle Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Customer Password
                            </span>
                            <button
                                type="button"
                                onClick={generateStrongPassword}
                                style={{
                                    background: '#f8f4ee',
                                    border: '1px solid #e7dcd3',
                                    color: '#5d0821',
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Sparkles size={14} /> Auto-Generate Strong Password
                            </button>
                        </div>

                        {/* New Password Input */}
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
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

                        {/* Confirm Password Input */}
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                                Confirm Password *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    minLength={6}
                                    required
                                    className="admin-input"
                                    style={{ width: '100%', paddingLeft: '2.75rem' }}
                                />
                            </div>
                        </div>

                        {/* Copy Password Helper */}
                        {password && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.65rem 0.9rem',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.82rem'
                            }}>
                                <span style={{ color: '#475569' }}>
                                    Password: <strong>{showPassword ? password : '••••••••'}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyPassword}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: copiedPassword ? '#10b981' : '#5d0821',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {copiedPassword ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Password</>}
                                </button>
                            </div>
                        )}

                        {/* Dispatch Notification Channels */}
                        <div style={{
                            background: '#faf9f6',
                            border: '1px solid #f0e6df',
                            borderRadius: '14px',
                            padding: '1rem 1.1rem',
                            marginTop: '0.2rem'
                        }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#5d0821', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Send Info to Customer
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {/* Send to Email */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: hasEmail ? '#1e293b' : '#94a3b8', cursor: hasEmail ? 'pointer' : 'not-allowed' }}>
                                    <input
                                        type="checkbox"
                                        checked={sendEmail && hasEmail}
                                        disabled={!hasEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#5d0821', cursor: hasEmail ? 'pointer' : 'not-allowed' }}
                                    />
                                    <Mail size={16} color={hasEmail ? '#5d0821' : '#94a3b8'} />
                                    <span>
                                        Email: <strong>{customer?.email || 'No email registered'}</strong>
                                    </span>
                                </label>

                                {/* Send to WhatsApp */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: hasPhone ? '#1e293b' : '#94a3b8', cursor: hasPhone ? 'pointer' : 'not-allowed' }}>
                                    <input
                                        type="checkbox"
                                        checked={sendWhatsApp && hasPhone}
                                        disabled={!hasPhone}
                                        onChange={(e) => setSendWhatsApp(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#25D366', cursor: hasPhone ? 'pointer' : 'not-allowed' }}
                                    />
                                    <MessageCircle size={16} color={hasPhone ? '#25D366' : '#94a3b8'} />
                                    <span>
                                        WhatsApp: <strong>{customer?.country_code || '+91'} {customer?.phone || 'No mobile registered'}</strong>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
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
                                    flex: 1.4,
                                    padding: '0.85rem',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 800
                                }}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {loading ? 'Saving & Sending...' : 'Update & Send Info'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ══════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 2: SEND RESET LINK */}
                {/* ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'link' && (
                    <form onSubmit={handleSendResetLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                            Generate a secure, single-use password reset link. The customer can click the link to set their own password directly.
                        </p>

                        {/* Expiry Selector */}
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <Clock size={14} /> Link Expiration
                            </label>
                            <select
                                value={expiryHours}
                                onChange={(e) => setExpiryHours(e.target.value)}
                                className="admin-input"
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', fontWeight: 600 }}
                            >
                                <option value="24">24 Hours (Recommended)</option>
                                <option value="48">48 Hours</option>
                                <option value="72">72 Hours</option>
                                <option value="168">7 Days</option>
                            </select>
                        </div>

                        {/* Dispatch Notification Channels */}
                        <div style={{
                            background: '#faf9f6',
                            border: '1px solid #f0e6df',
                            borderRadius: '14px',
                            padding: '1rem 1.1rem'
                        }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#5d0821', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Send Reset Link Via
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {/* Send to Email */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: hasEmail ? '#1e293b' : '#94a3b8', cursor: hasEmail ? 'pointer' : 'not-allowed' }}>
                                    <input
                                        type="checkbox"
                                        checked={sendEmail && hasEmail}
                                        disabled={!hasEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#5d0821', cursor: hasEmail ? 'pointer' : 'not-allowed' }}
                                    />
                                    <Mail size={16} color={hasEmail ? '#5d0821' : '#94a3b8'} />
                                    <span>
                                        Email: <strong>{customer?.email || 'No email registered'}</strong>
                                    </span>
                                </label>

                                {/* Send to WhatsApp */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: hasPhone ? '#1e293b' : '#94a3b8', cursor: hasPhone ? 'pointer' : 'not-allowed' }}>
                                    <input
                                        type="checkbox"
                                        checked={sendWhatsApp && hasPhone}
                                        disabled={!hasPhone}
                                        onChange={(e) => setSendWhatsApp(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#25D366', cursor: hasPhone ? 'pointer' : 'not-allowed' }}
                                    />
                                    <MessageCircle size={16} color={hasPhone ? '#25D366' : '#94a3b8'} />
                                    <span>
                                        WhatsApp: <strong>{customer?.country_code || '+91'} {customer?.phone || 'No mobile registered'}</strong>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Generated Link Display & Copy Button */}
                        {generatedResetUrl && (
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '12px',
                                padding: '0.85rem 1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                                        Generated Password Reset Link:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        style={{
                                            background: copiedLink ? '#10b981' : '#5d0821',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {copiedLink ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Link</>}
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#5d0821', wordBreak: 'break-all', fontFamily: 'monospace', background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    {generatedResetUrl}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px' }}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '0.85rem',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 800
                                }}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {loading ? 'Generating & Sending...' : 'Generate & Send Link'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
