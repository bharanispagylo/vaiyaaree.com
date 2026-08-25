'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { 
    Users, Plus, Trash2, Edit2, Shield, 
    CheckCircle2, AlertCircle, Loader2, 
    Search, UserPlus, Mail, Lock, Key,
    MoreVertical, X, Save
} from 'lucide-react';

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'admin',
        is_active: true
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST204') {
                    // Table doesn't exist yet, show a helpful message
                    setUsers([]);
                    return;
                }
                throw error;
            }
            setUsers(data || []);
        } catch (err) {
            console.error('Fetch users error:', err);
            setNotification({ message: 'Failed to load users', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email || '',
                password: user.password,
                full_name: user.full_name || '',
                role: user.role || 'admin',
                is_active: user.is_active ?? true
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                full_name: '',
                role: 'admin',
                is_active: true
            });
        }
        setShowModal(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                role: formData.role,
                is_active: formData.is_active
            };

            let isEmailSupported = true;

            if (editingUser) {
                let { error } = await mysqlClient
                    .from('admin_users')
                    .update({
                        ...payload,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingUser.id);

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
                        .eq('id', editingUser.id);
                    error = fallback.error;
                }

                if (error) throw error;
                setNotification({ 
                    message: isEmailSupported ? 'User updated successfully!' : 'User updated! Run SQL migration in MySQL to enable email field.', 
                    type: 'success' 
                });
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
                setNotification({ 
                    message: isEmailSupported ? 'New user added successfully!' : 'New user added! Run SQL migration in MySQL to enable email field.', 
                    type: 'success' 
                });
            }
            
            setShowModal(false);
            fetchUsers();
            setTimeout(() => setNotification(null), 4000);
        } catch (err) {
            console.error('Save error:', err);
            setNotification({ message: 'Error saving user: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
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
            setNotification({ message: 'User deleted successfully', type: 'success' });
            fetchUsers();
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('Delete error:', err);
            setNotification({ message: 'Failed to delete user', type: 'error' });
        }
    };

    return (
        <div className="user-management-page animate-enter">
            <div className="page-header">
                <div>
                    <h1><Users size={32} color="hsl(var(--primary))" /> Admin User Management</h1>
                    <p>Manage portal administrators, roles, and access credentials.</p>
                </div>
                <button className="btn-primary-glow" onClick={() => handleOpenModal()}>
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
                        <button className="btn-outline" onClick={() => handleOpenModal()}>Get Started</button>
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
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} onClick={() => handleOpenModal(user)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td>
                                            <div className="user-info">
                                                <div className="avatar">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <strong>{user.username}</strong>
                                            </div>
                                        </td>
                                        <td>{user.email || '—'}</td>
                                        <td>{user.full_name || '—'}</td>
                                        <td>
                                            <span className={`badge badge-${user.role}`}>
                                                <Shield size={10} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-indicator ${user.is_active ? 'active' : 'inactive'}`}>
                                                {user.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="actions-group">
                                                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(user); }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}>
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

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-slide-up">
                        <div className="modal-header">
                            <h3>{editingUser ? 'Edit Administrator' : 'Add New Administrator'}</h3>
                            <button className="btn-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveUser}>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>Username</label>
                                    <div className="input-with-icon">
                                        <Users size={16} />
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.username}
                                            onChange={e => setFormData({...formData, username: e.target.value})}
                                            placeholder="johndoe"
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>Password</label>
                                    <div className="input-with-icon">
                                        <Key size={16} />
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value})}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="field-group full-width">
                                    <label>Email Address</label>
                                    <div className="input-with-icon">
                                        <Mail size={16} />
                                        <input 
                                            type="email" 
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="field-group full-width">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.full_name}
                                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Role</label>
                                    <select 
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                    >
                                        <option value="admin">Administrator</option>
                                        <option value="super_admin">Super Admin</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>Access Status</label>
                                    <div className="toggle-field">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.is_active}
                                            onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                        />
                                        <span>Active Account</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary-glow" disabled={saving}>
                                    {saving && <Loader2 size={18} className="animate-spin" />}
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

                .users-card { background: white; border-radius: 20px; border: 1px solid #e5e7eb; overflow: hidden; }
                
                .loading-state, .empty-state { padding: 5rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .empty-state h3 { margin: 1rem 0 0; color: #111; }
                .empty-state p { color: #666; max-width: 400px; }

                .table-responsive { width: 100%; overflow-x: auto; }
                .users-table { width: 100%; border-collapse: collapse; text-align: left; }
                .users-table th { padding: 0.65rem 1rem; background: #f9fafb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-weight: 800; border-bottom: 1px solid #e5e7eb; }
                .users-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #f3f4f6; color: #444; font-size: 0.88rem; }
                
                .user-info { display: flex; align-items: center; gap: 1rem; }
                .avatar { width: 32px; height: 32px; border-radius: 50%; background: hsl(var(--primary)); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; }
                
                .badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
                .badge-admin { background: #eff6ff; color: #2563eb; }
                .badge-super_admin { background: #fef2f2; color: #dc2626; }
                .badge-manager { background: #f0fdf4; color: #16a34a; }

                .status-indicator { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 500; }
                .status-indicator::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
                .status-indicator.active { color: #059669; }
                .status-indicator.active::before { background: #10b981; box-shadow: 0 0 0 3px #10b98122; }
                .status-indicator.inactive { color: #9ca3af; }
                .status-indicator.inactive::before { background: #d1d5db; }

                .actions-group { display: flex; justify-content: flex-end; gap: 0.5rem; }
                .btn-icon { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e5e7eb; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: #666; }
                .btn-icon:hover { border-color: hsl(var(--primary)); color: hsl(var(--primary)); background: #eff6ff; }
                .btn-icon.danger:hover { border-color: #fca5a5; color: #ef4444; background: #fef2f2; }

                /* Modal Styles */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
                .modal-content { background: white; width: 500px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
                .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; }
                .btn-close { background: none; border: none; cursor: pointer; color: #999; }
                
                .form-grid { padding: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .full-width { grid-column: 1 / -1; }
                .field-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; color: #444; }
                
                .input-with-icon { position: relative; }
                .input-with-icon :global(svg) { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #999; }
                .input-with-icon input { padding-left: 2.75rem; }
                
                input, select { width: 100%; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 12px; font-size: 0.95rem; }
                
                .toggle-field { display: flex; align-items: center; gap: 0.75rem; }
                .toggle-field input { width: auto; }
                .toggle-field span { font-size: 0.9rem; font-weight: 600; color: #444; }

                .modal-footer { padding: 1.5rem 2rem; background: #f9fafb; display: flex; justify-content: flex-end; gap: 1rem; }
                .btn-secondary { background: white; border: 1px solid #d1d5db; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; cursor: pointer; }

                .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; z-index: 3000; animation: slideUp 0.3s ease-out; }
                .toast-success { background: #10b981; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .toast-error { background: #ef4444; color: white; }

                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
