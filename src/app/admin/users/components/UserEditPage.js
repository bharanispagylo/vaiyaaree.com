'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    ArrowLeft, Users, Key, Mail, User, Shield,
    ShieldCheck, ShieldOff, Eye, EyeOff, Save,
    Trash2, CheckCircle2, AlertCircle, Loader2,
    Check, Lock, Sparkles, Calendar, Clock
} from 'lucide-react';

const isEncryptedHash = (pwd) => {
    if (!pwd) return false;
    const str = String(pwd).trim();
    return str.startsWith('pbkdf2:') ||
           str.startsWith('$2a$') ||
           str.startsWith('$2b$') ||
           (str.length === 64 && /^[0-9a-fA-F]{64}$/.test(str)) ||
           (str.length === 128 && /^[0-9a-fA-F]{128}$/.test(str));
};

export default function UserEditPage({
    user: initialUser = null,
    userId = null,
    isNew = false,
    onBack,
    onSaved,
    onDelete
}) {
    const router = useRouter();
    const [user, setUser] = useState(initialUser);
    const [loadingUser, setLoadingUser] = useState(!initialUser && Boolean(userId));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [hasLegacyHash, setHasLegacyHash] = useState(() => isEncryptedHash(initialUser?.password));
    const [notification, setNotification] = useState(null);

    const [formData, setFormData] = useState({
        username: initialUser?.username || '',
        email: initialUser?.email || '',
        password: isEncryptedHash(initialUser?.password) ? '' : (initialUser?.password || ''),
        full_name: initialUser?.full_name || '',
        role: initialUser?.role || 'admin',
        is_active: initialUser?.is_active ?? true,
        otp_enabled: Boolean(initialUser?.otp_enabled)
    });

    // If initialUser was not passed but userId is present, fetch the user record
    useEffect(() => {
        if (!initialUser && userId) {
            const loadUser = async () => {
                setLoadingUser(true);
                try {
                    const { data, error } = await mysqlClient
                        .from('admin_users')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (error) throw error;
                    if (data) {
                        setUser(data);
                        const isHash = isEncryptedHash(data.password);
                        setHasLegacyHash(isHash);
                        setFormData({
                            username: data.username || '',
                            email: data.email || '',
                            password: isHash ? '' : (data.password || ''),
                            full_name: data.full_name || '',
                            role: data.role || 'admin',
                            is_active: data.is_active ?? true,
                            otp_enabled: Boolean(data.otp_enabled)
                        });
                    }
                } catch (err) {
                    console.error('Fetch user error:', err);
                    setNotification({ message: 'Failed to load user details: ' + err.message, type: 'error' });
                } finally {
                    setLoadingUser(false);
                }
            };
            loadUser();
        } else if (initialUser) {
            setUser(initialUser);
            const isHash = isEncryptedHash(initialUser.password);
            setHasLegacyHash(isHash);
            setFormData({
                username: initialUser.username || '',
                email: initialUser.email || '',
                password: isHash ? '' : (initialUser.password || ''),
                full_name: initialUser.full_name || '',
                role: initialUser.role || 'admin',
                is_active: initialUser.is_active ?? true,
                otp_enabled: Boolean(initialUser.otp_enabled)
            });
        }
    }, [initialUser, userId]);

    const handleGeneratePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
        let generated = '';
        for (let i = 0; i < 12; i++) {
            generated += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: generated }));
        setHasLegacyHash(false);
        setShowPassword(true);
        setNotification({ message: 'Secure password generated and revealed!', type: 'success' });
        setTimeout(() => setNotification(null), 2500);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!formData.username.trim()) {
            setNotification({ message: 'Username is required.', type: 'error' });
            return;
        }

        if (isNew && !formData.password.trim()) {
            setNotification({ message: 'Password is required for new administrators.', type: 'error' });
            return;
        }

        if (formData.email.trim() && !formData.email.includes('@')) {
            setNotification({ message: 'Please enter a valid email address.', type: 'error' });
            return;
        }

        if (formData.otp_enabled && !formData.email.trim()) {
            setNotification({ message: 'Email address is required when Two-Factor Authentication (Email OTP) is enabled.', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                username: formData.username.trim(),
                email: formData.email ? formData.email.trim() : null,
                full_name: formData.full_name ? formData.full_name.trim() : null,
                role: formData.role,
                is_active: formData.is_active ? 1 : 0,
                otp_enabled: formData.otp_enabled ? 1 : 0
            };

            // If a password was provided, save the actual password
            if (formData.password.trim()) {
                payload.password = formData.password.trim();
            }

            let isEmailSupported = true;
            const targetId = user?.id || userId;

            if (!isNew && targetId) {
                let { error } = await mysqlClient
                    .from('admin_users')
                    .update({
                        ...payload,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetId);

                if (error && (error.message?.includes('email') || error.message?.includes('schema cache'))) {
                    console.warn('[ADMIN-USERS] email column missing in admin_users table. Saving without email...');
                    isEmailSupported = false;
                    delete payload.email;
                    const fallback = await mysqlClient
                        .from('admin_users')
                        .update({
                            ...payload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', targetId);
                    error = fallback.error;
                }

                if (error) throw error;
                const msg = isEmailSupported ? 'Administrator updated successfully!' : 'User updated! (Email column pending migration)';
                setNotification({ message: msg, type: 'success' });
                if (onSaved) onSaved(msg);
            } else {
                let { error } = await mysqlClient
                    .from('admin_users')
                    .insert([payload]);

                if (error && (error.message?.includes('email') || error.message?.includes('schema cache'))) {
                    console.warn('[ADMIN-USERS] email column missing in admin_users table. Saving without email...');
                    isEmailSupported = false;
                    delete payload.email;
                    const fallback = await mysqlClient
                        .from('admin_users')
                        .insert([payload]);
                    error = fallback.error;
                }

                if (error) throw error;
                const msg = isEmailSupported ? 'New administrator created successfully!' : 'New user added! (Email column pending migration)';
                setNotification({ message: msg, type: 'success' });
                if (onSaved) onSaved(msg);
            }
        } catch (err) {
            console.error('Save user error:', err);
            setNotification({ message: 'Error saving user: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const targetId = user?.id || userId;
        if (!targetId) return;

        if (!confirm(`Are you sure you want to permanently delete administrator "${formData.username}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            if (onDelete) {
                await onDelete(targetId);
            } else {
                const { error } = await mysqlClient
                    .from('admin_users')
                    .delete()
                    .eq('id', targetId);

                if (error) throw error;
                if (onBack) onBack();
                else router.push('/admin/users');
            }
        } catch (err) {
            console.error('Delete user error:', err);
            setNotification({ message: 'Failed to delete user: ' + err.message, type: 'error' });
            setDeleting(false);
        }
    };

    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/admin/users');
        }
    };

    if (loadingUser) {
        return (
            <div className="card shadow-premium" style={{ padding: '5rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '20px' }}>
                <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1.25rem', color: 'hsl(var(--primary))' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Loading Administrator Profile...</h3>
            </div>
        );
    }

    const roleBadgeStyles = {
        admin: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Administrator' },
        super_admin: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Super Admin' },
        manager: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Manager' }
    };

    const currentBadge = roleBadgeStyles[formData.role] || roleBadgeStyles.admin;

    return (
        <div className="animate-enter" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 4000,
                    padding: '1rem 1.5rem',
                    borderRadius: '14px',
                    background: notification.type === 'success' ? '#059669' : '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    animation: 'slideUp 0.3s ease'
                }}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {notification.message}
                </div>
            )}

            {/* Breadcrumb & Navigation Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <button
                        type="button"
                        onClick={handleBackClick}
                        className="btn-back-nav"
                        title="Back to User Management"
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                            User Management / {isNew ? 'New User' : 'Edit User'}
                        </div>
                        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isNew ? 'Add New Administrator' : (formData.full_name || formData.username || 'Edit Administrator')}
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: currentBadge.bg,
                                color: currentBadge.color,
                                border: `1px solid ${currentBadge.border}`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {currentBadge.label}
                            </span>
                        </h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!isNew && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                padding: '0.7rem 1.15rem',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete User
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleBackClick}
                        style={{
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '0.7rem 1.25rem',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary-glow"
                        style={{
                            background: 'hsl(var(--primary))',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0.7rem 1.5rem',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)'
                        }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isNew ? 'Create Administrator' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Form Body Layout (2 Columns) */}
            <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1.75rem', alignItems: 'start' }}>

                    {/* Left Column: Credentials & Personal Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Card 1: Core Credentials */}
                        <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '18px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle, #e2e8f0))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Key size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Login Credentials</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>Username and password used to access the admin portal</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.4rem' }}>
                                        Username *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Users size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="e.g. admin_rajesh"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '12px',
                                                fontSize: '0.92rem',
                                                fontWeight: 600,
                                                color: '#0f172a',
                                                background: '#f8fafc'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', margin: 0 }}>
                                            {isNew ? 'Password *' : 'Password'}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleGeneratePassword}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'hsl(var(--primary))',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: 0
                                            }}
                                        >
                                            <Sparkles size={12} /> Generate Secure Password
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required={isNew}
                                            value={formData.password}
                                            onChange={e => {
                                                setFormData({ ...formData, password: e.target.value });
                                                if (e.target.value) setHasLegacyHash(false);
                                            }}
                                            placeholder={
                                                hasLegacyHash && !formData.password
                                                    ? '•••••••• (Encrypted hash stored — enter actual password to update)'
                                                    : isNew
                                                        ? 'Enter password'
                                                        : 'Enter actual password (leave blank to keep current)'
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 3rem 0.75rem 2.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '12px',
                                                fontSize: '0.92rem',
                                                fontWeight: 600,
                                                color: '#0f172a',
                                                background: '#f8fafc',
                                                letterSpacing: showPassword ? 'normal' : '0.1em'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '1rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={showPassword ? 'Hide password' : 'Show actual password'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {hasLegacyHash && !formData.password ? (
                                        <div style={{
                                            marginTop: '0.6rem',
                                            padding: '0.6rem 0.85rem',
                                            borderRadius: '10px',
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            color: '#b45309',
                                            fontSize: '0.78rem',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            lineHeight: 1.4
                                        }}>
                                            <Lock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <strong>Encrypted Hash Stored:</strong> This password was previously hashed into an irreversible PBKDF2 string. Enter your actual password here to update and display it in readable format.
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                            {isNew
                                                ? 'Actual password will be saved. Click the eye icon to view or hide plaintext.'
                                                : 'Click the eye icon to view or hide actual password. Leave blank if unchanged.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Contact Information */}
                        <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '18px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle, #e2e8f0))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identity & Email</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>Personal name and verified email address for OTP security</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.4rem' }}>
                                        Full Name
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="e.g. Rajesh Kumar"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '12px',
                                                fontSize: '0.92rem',
                                                color: '#0f172a'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.4rem' }}>
                                        Email Address
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="e.g. rajesh@vaiyaaree.com"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '12px',
                                                fontSize: '0.92rem',
                                                color: '#0f172a'
                                            }}
                                        />
                                    </div>
                                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                        Required for 2FA Two-Factor Authentication codes and administrative notifications.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Role, Account Status & 2FA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Card 3: Role & Permission Level */}
                        <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '18px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle, #e2e8f0))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Role & Permissions</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>Determines portal access boundaries</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    {
                                        value: 'admin',
                                        title: 'Administrator',
                                        badge: roleBadgeStyles.admin,
                                        desc: 'Standard administrative control over products, inventory, orders, customer details, and discounts.'
                                    },
                                    {
                                        value: 'super_admin',
                                        title: 'Super Admin',
                                        badge: roleBadgeStyles.super_admin,
                                        desc: 'Full unrestricted portal root access, managing other administrators, credentials, and system settings.'
                                    },
                                    {
                                        value: 'manager',
                                        title: 'Manager',
                                        badge: roleBadgeStyles.manager,
                                        desc: 'Catalog, orders, and customer operations. Administrative user and credential controls are restricted.'
                                    }
                                ].map(r => {
                                    const isSelected = formData.role === r.value;
                                    return (
                                        <div
                                            key={r.value}
                                            onClick={() => setFormData({ ...formData, role: r.value })}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                border: `2px solid ${isSelected ? 'hsl(var(--primary))' : '#e2e8f0'}`,
                                                background: isSelected ? 'hsl(var(--primary) / 0.03)' : '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? 'hsl(var(--primary))' : '#cbd5e1'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: isSelected ? 'hsl(var(--primary))' : '#ffffff'
                                                    }}>
                                                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />}
                                                    </div>
                                                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{r.title}</strong>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: r.badge.bg,
                                                    color: r.badge.color
                                                }}>
                                                    {r.badge.label}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 0 26px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                                                {r.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Active Account Switch */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                <label
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        padding: '0.75rem 1rem',
                                        background: formData.is_active ? '#f0fdf4' : '#f8fafc',
                                        border: `1px solid ${formData.is_active ? '#bbf7d0' : '#e2e8f0'}`,
                                        borderRadius: '12px'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: formData.is_active ? '#15803d' : '#475569' }}>
                                            {formData.is_active ? 'Account is Active' : 'Account is Disabled'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {formData.is_active ? 'User can log in to admin portal' : 'Access blocked; user cannot log in'}
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Card 4: 2FA Email OTP */}
                        <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '18px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle, #e2e8f0))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Two-Factor Authentication</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>Require email verification code on sign in</p>
                                </div>
                            </div>

                            <label
                                onClick={() => {
                                    if (formData.email.trim()) {
                                        setFormData({ ...formData, otp_enabled: !formData.otp_enabled });
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: formData.email.trim() ? 'pointer' : 'not-allowed',
                                    padding: '0.85rem 1rem',
                                    background: formData.otp_enabled ? '#f0fdf4' : '#f8fafc',
                                    border: `1px solid ${formData.otp_enabled ? '#86efac' : '#e2e8f0'}`,
                                    borderRadius: '12px',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {formData.otp_enabled ? <ShieldCheck size={18} color="#16a34a" /> : <ShieldOff size={18} color="#94a3b8" />}
                                    <div>
                                        <strong style={{ fontSize: '0.88rem', color: formData.otp_enabled ? '#15803d' : '#475569', display: 'block' }}>
                                            6-Digit Email OTP Login
                                        </strong>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {formData.otp_enabled ? 'Enabled • High security' : 'Disabled • Password only'}
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.otp_enabled)}
                                    onChange={e => {
                                        if (formData.email.trim()) {
                                            setFormData({ ...formData, otp_enabled: e.target.checked });
                                        }
                                    }}
                                    disabled={!formData.email.trim()}
                                    style={{ width: '18px', height: '18px', cursor: formData.email.trim() ? 'pointer' : 'not-allowed' }}
                                />
                            </label>

                            <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', lineHeight: 1.5, color: formData.email.trim() ? '#64748b' : '#dc2626' }}>
                                {formData.email.trim() ? (
                                    <span>Upon entering correct password, a one-time passcode will be delivered to <strong>{formData.email}</strong> to authenticate.</span>
                                ) : (
                                    <span>⚠️ Please specify an Email Address above in order to enable Two-Factor Authentication.</span>
                                )}
                            </div>
                        </div>

                        {/* Card 5: Metadata (only when editing existing user) */}
                        {!isNew && user && (
                            <div className="card shadow-premium" style={{ padding: '1.25rem 1.5rem', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>User ID:</span>
                                        <strong style={{ color: '#0f172a' }}>#{user.id}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Created Date:</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Last Login:</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                            {user.last_login ? new Date(user.last_login).toLocaleString('en-IN') : 'Never'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                </div>

                {/* Bottom Sticky Action Bar */}
                <div style={{
                    marginTop: '2.5rem',
                    padding: '1.25rem 2rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Ensure all credentials and permissions are accurate before saving.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={handleBackClick}
                            style={{
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '12px',
                                padding: '0.7rem 1.25rem',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary-glow"
                            style={{
                                background: 'hsl(var(--primary))',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '0.7rem 1.75rem',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isNew ? 'Create Administrator' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
