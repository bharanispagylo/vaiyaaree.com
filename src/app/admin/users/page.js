'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import {
    Users, Plus, Trash2, Edit2, Shield,
    CheckCircle2, AlertCircle, Loader2,
    UserPlus, ShieldCheck, ShieldOff
} from 'lucide-react';
import UserEditPage from './components/UserEditPage';

export default function UserManagementPage() {
    return (
        <Suspense fallback={
            <div className="card shadow-premium" style={{ padding: '5rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '20px', maxWidth: '1200px', margin: '2rem auto' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'hsl(var(--primary))' }} />
                <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading User Management...</p>
            </div>
        }>
            <UserManagementContent />
        </Suspense>
    );
}

function UserManagementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [currentAdmin, setCurrentAdmin] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                return JSON.parse(localStorage.getItem('cast_prince_admin_user') || '{}');
            } catch (e) { }
        }
        return {};
    });

    const isManager = String(currentAdmin?.rawRole || currentAdmin?.role || '').toLowerCase().includes('manager');

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    // Page View Modes: 'list' | 'edit' | 'create'
    const [viewMode, setViewMode] = useState('list');
    const [editingUser, setEditingUser] = useState(null);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST204') {
                    setUsers([]);
                    return;
                }
                throw error;
            }
            setUsers(data || []);
            return data || [];
        } catch (err) {
            console.error('Fetch users error:', err);
            showToast('Failed to load users', 'error');
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isManager) {
            setLoading(false);
            return;
        }
        fetchUsers().then(loadedUsers => {
            // Check if URL has ?edit=xxx or ?action=new
            const editId = searchParams?.get('edit');
            const action = searchParams?.get('action');

            if (action === 'new') {
                setViewMode('create');
                setEditingUser(null);
            } else if (editId && loadedUsers.length > 0) {
                const found = loadedUsers.find(u => String(u.id) === String(editId));
                if (found) {
                    setEditingUser(found);
                    setViewMode('edit');
                }
            }
        });
    }, [isManager, searchParams]);

    const handleOpenCreatePage = () => {
        setEditingUser(null);
        setViewMode('create');
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/admin/users?action=new');
        }
    };

    const handleOpenEditPage = (user) => {
        setEditingUser(user);
        setViewMode('edit');
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', `/admin/users?edit=${user.id}`);
        }
    };

    const handleBackToList = () => {
        setViewMode('list');
        setEditingUser(null);
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/admin/users');
        }
    };

    const handleUserSaved = (message) => {
        showToast(message, 'success');
        handleBackToList();
        fetchUsers();
    };

    const handleToggleOtp = async (user, e) => {
        if (e) e.stopPropagation();
        if (!user) return;

        if (!user.email && !user.otp_enabled) {
            showToast(`Please add an email address for ${user.username} before enabling Email OTP.`, 'error');
            handleOpenEditPage(user);
            return;
        }

        const newOtpStatus = !user.otp_enabled;
        try {
            const { error } = await mysqlClient
                .from('admin_users')
                .update({
                    otp_enabled: newOtpStatus ? 1 : 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, otp_enabled: newOtpStatus ? 1 : 0 } : u));
            showToast(`Email OTP ${newOtpStatus ? 'Enabled' : 'Disabled'} for ${user.username}`, 'success');
        } catch (err) {
            console.error('Toggle OTP error:', err);
            showToast('Failed to update OTP status: ' + err.message, 'error');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const { error } = await mysqlClient
                .from('admin_users')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('User deleted successfully', 'success');
            if (viewMode !== 'list') {
                handleBackToList();
            }
            fetchUsers();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Failed to delete user: ' + err.message, 'error');
        }
    };

    if (isManager) {
        return (
            <div className="user-management-page animate-enter" style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center' }}>
                <div className="card shadow-premium" style={{ padding: '3.5rem 2.5rem', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}>
                        <Shield size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                        Access Restricted
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 2rem' }}>
                        You are signed in with <strong>Manager</strong> credentials. Administrative user management and credential controls are restricted to <strong>Super Administrators</strong>.
                    </p>
                    <button
                        onClick={() => window.location.href = '/admin'}
                        className="btn-primary-glow"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Dedicated Edit or Create User Page View
    // ─────────────────────────────────────────────────────────────────────────────
    if (viewMode === 'edit' || viewMode === 'create') {
        return (
            <div className="user-management-page animate-enter">
                <UserEditPage
                    user={editingUser}
                    isNew={viewMode === 'create'}
                    onBack={handleBackToList}
                    onSaved={handleUserSaved}
                    onDelete={handleDeleteUser}
                />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Main User List Table View
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="user-management-page animate-enter">
            <div className="page-header">
                <div>
                    <h1><Users size={32} color="hsl(var(--primary))" /> Admin User Management</h1>
                    <p>Manage portal administrators, access credentials, and 2FA Email OTP security.</p>
                </div>
                <button className="btn-primary-glow" onClick={handleOpenCreatePage}>
                    <UserPlus size={18} />
                    Create New Admin
                </button>
            </div>

            {notification && (
                <div className={`toast ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            <div className="users-card card shadow-premium">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="animate-spin" color="hsl(var(--primary))" />
                        <p>Fetching administrators...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} color="hsl(var(--text-muted))" />
                        <h3>No extra administrators found</h3>
                        <p>Create your first administrator to manage the portal with separate credentials.</p>
                        <button className="btn-outline" onClick={handleOpenCreatePage}>Get Started</button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Full Name</th>
                                    <th>Role</th>
                                    <th>Email OTP (2FA)</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr 
                                        key={user.id} 
                                        onClick={() => handleOpenEditPage(user)} 
                                        style={{ cursor: 'pointer', transition: 'background 0.2s' }} 
                                        onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} 
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td>
                                            <div className="user-info">
                                                <div className="avatar">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style={{ display: 'block', color: '#0f172a' }}>{user.username}</strong>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: #{user.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{user.email || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No email set</span>}</td>
                                        <td>{user.full_name || '—'}</td>
                                        <td>
                                            <span className={`badge badge-${user.role}`}>
                                                <Shield size={10} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleOtp(user, e)}
                                                title={user.otp_enabled ? "Click to Disable Email OTP" : "Click to Enable Email OTP"}
                                                style={{
                                                    background: user.otp_enabled ? '#f0fdf4' : '#f8fafc',
                                                    color: user.otp_enabled ? '#16a34a' : '#64748b',
                                                    border: `1px solid ${user.otp_enabled ? '#bbf7d0' : '#e2e8f0'}`,
                                                    borderRadius: '20px',
                                                    padding: '3px 10px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {user.otp_enabled ? (
                                                    <><ShieldCheck size={13} /> Enabled</>
                                                ) : (
                                                    <><ShieldOff size={13} /> Disabled</>
                                                )}
                                            </button>
                                        </td>
                                        <td>
                                            <span className={`status-indicator ${user.is_active ? 'active' : 'inactive'}`}>
                                                {user.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>{user.last_login ? new Date(user.last_login).toLocaleString('en-IN') : 'Never'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="actions-group">
                                                <button 
                                                    className="btn-icon" 
                                                    title="Edit Administrator" 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditPage(user); }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    className="btn-icon danger" 
                                                    title="Delete Administrator" 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx>{`
                .user-management-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
                .page-header h1 { font-size: 2.2rem; display: flex; align-items: center; gap: 1rem; margin: 0; font-weight: 800; color: #111; }
                .page-header p { color: #666; margin: 0.5rem 0 0; }

                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none;
                    padding: 0.8rem 1.75rem; border-radius: 14px; font-weight: 700;
                    display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
                    box-shadow: 0 4px 12px hsl(var(--primary) / 0.2); transition: 0.3s;
                }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 8px 20px hsl(var(--primary) / 0.4); }
                .btn-primary-glow:disabled { opacity: 0.6; cursor: not-allowed; }

                .btn-outline {
                    background: transparent; border: 1px solid #cbd5e1;
                    padding: 0.65rem 1.25rem; border-radius: 12px; font-weight: 700;
                    cursor: pointer; transition: 0.2s;
                }
                .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

                .users-card { background: white; border-radius: 20px; border: 1px solid #e5e7eb; overflow: hidden; }
                
                .loading-state, .empty-state { padding: 5rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .empty-state h3 { margin: 1rem 0 0; color: #111; }
                .empty-state p { color: #666; max-width: 400px; }

                .table-responsive { width: 100%; overflow-x: auto; }
                .users-table { width: 100%; border-collapse: collapse; text-align: left; }
                .users-table th { padding: 0.75rem 1.25rem; background: #f9fafb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-weight: 800; border-bottom: 1px solid #e5e7eb; }
                .users-table td { padding: 0.85rem 1.25rem; border-bottom: 1px solid #f3f4f6; color: #444; font-size: 0.88rem; vertical-align: middle; }
                
                .user-info { display: flex; align-items: center; gap: 1rem; }
                .avatar { width: 36px; height: 36px; border-radius: 50%; background: hsl(var(--primary)); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 800; }
                
                .badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
                .badge-admin { background: #eff6ff; color: #2563eb; }
                .badge-super_admin { background: #fef2f2; color: #dc2626; }
                .badge-manager { background: #f0fdf4; color: #16a34a; }

                .status-indicator { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 600; }
                .status-indicator::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
                .status-indicator.active { color: #059669; }
                .status-indicator.active::before { background: #10b981; box-shadow: 0 0 0 3px #10b98122; }
                .status-indicator.inactive { color: #9ca3af; }
                .status-indicator.inactive::before { background: #d1d5db; }

                .actions-group { display: flex; justify-content: flex-end; gap: 0.5rem; }
                .btn-icon { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e5e7eb; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: #666; }
                .btn-icon:hover { border-color: hsl(var(--primary)); color: hsl(var(--primary)); background: #eff6ff; }
                .btn-icon.danger:hover { border-color: #fca5a5; color: #ef4444; background: #fef2f2; }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 3000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: #10b981; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .toast-error { background: #ef4444; color: white; }

                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
