'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Truck, Plus, Trash2, Edit2, Save, X, 
    Search, Globe, Phone, Mail, CheckCircle2, 
    XCircle, Loader2, ExternalLink 
} from 'lucide-react';

export default function CouriersPage() {
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCourier, setEditingCourier] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        tracking_url_template: '',
        phone: '',
        email: '',
        is_active: true
    });
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('couriers')
                .select('*')
                .order('name');
            
            if (error) {
                // If table doesn't exist, we'll handle it gracefully
                if (error.code === 'PGRST116' || error.message.includes('relation "couriers" does not exist')) {
                    console.error('Couriers table does not exist. Please run the migration.');
                }
                throw error;
            }
            setCouriers(data || []);
        } catch (err) {
            console.error('Fetch couriers error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (courier = null) => {
        if (courier) {
            setEditingCourier(courier);
            setFormData({
                name: courier.name,
                tracking_url_template: courier.tracking_url_template || '',
                phone: courier.phone || '',
                email: courier.email || '',
                is_active: courier.is_active
            });
            setIsFormOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setEditingCourier(null);
            setFormData({
                name: '',
                tracking_url_template: '',
                phone: '',
                email: '',
                is_active: true
            });
            setIsFormOpen(true);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingCourier(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCourier) {
                const { error } = await supabase
                    .from('couriers')
                    .update(formData)
                    .eq('id', editingCourier.id);
                if (error) throw error;
                showNotification('Courier updated successfully', 'success');
            } else {
                const { error } = await supabase
                    .from('couriers')
                    .insert([formData]);
                if (error) throw error;
                showNotification('Courier added successfully', 'success');
            }
            fetchCouriers();
            handleCloseForm();
        } catch (err) {
            console.error('Save courier error:', err);
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this courier?')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('couriers')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showNotification('Courier deleted successfully', 'success');
            fetchCouriers();
        } catch (err) {
            console.error('Delete courier error:', err);
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredCouriers = couriers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="couriers-container">
            <header className="page-header">
                <div>
                    <div className="breadcrumb">Logistics / Carriers</div>
                    <h1>Courier Management</h1>
                    <p>Manage your delivery partners and tracking services.</p>
                </div>
                {!editingCourier && !isFormOpen && (
                    <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                        <Plus size={18} />
                        <span>Add New Courier</span>
                    </button>
                )}
            </header>

            {(isFormOpen || editingCourier) && (
                <div className="form-card animate-enter" style={{ marginBottom: '2rem' }}>
                    <div className="card-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editingCourier ? 'Edit Courier Partner' : 'Add New Courier Partner'}</h2>
                        <button className="close-btn" onClick={handleCloseForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label>Service Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. Delhivery, BlueDart"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tracking URL Template</label>
                                <p className="help-text">Use <code>{'{tracking_number}'}</code> as placeholder.</p>
                                <input 
                                    type="text" 
                                    value={formData.tracking_url_template}
                                    onChange={(e) => setFormData({...formData, tracking_url_template: e.target.value})}
                                    placeholder="https://track.com/?tn={tracking_number}"
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Phone</label>
                                <input 
                                    type="text" 
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="+91..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Email</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="support@courier.com"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                            <div className="form-group checkbox" style={{ margin: 0 }}>
                                <label>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                    />
                                    <span style={{ marginLeft: '0.5rem' }}>Active Partner</span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={handleCloseForm}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    <span>{editingCourier ? 'Update Partner' : 'Save Partner'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {notification.message}
                </div>
            )}

            {!(isFormOpen || editingCourier) && (
                <div className="search-bar">
                    <Search size={20} />
                    <input 
                        type="text" 
                        placeholder="Search couriers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {!(isFormOpen || editingCourier) && (
                <div className="couriers-grid">
                    {loading && couriers.length === 0 ? (
                        <div className="loading-state">
                            <Loader2 className="animate-spin" size={32} />
                            <p>Loading partners...</p>
                        </div>
                    ) : filteredCouriers.length === 0 ? (
                        <div className="empty-state">
                            <Truck size={48} />
                            <p>No couriers found. Add your first partner!</p>
                        </div>
                    ) : (
                        filteredCouriers.map(courier => (
                            <div key={courier.id} className="courier-card">
                                <div className="card-header">
                                    <div className="courier-badge">
                                        <Truck size={20} />
                                    </div>
                                    <div className={`status-pill ${courier.is_active ? 'active' : 'inactive'}`}>
                                        {courier.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                    <div className="card-actions">
                                        <button onClick={() => handleOpenForm(courier)} title="Edit"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(courier.id)} title="Delete" className="delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <h3>{courier.name}</h3>
                                    {courier.phone && (
                                        <div className="info-row">
                                            <Phone size={14} />
                                            <span>{courier.phone}</span>
                                        </div>
                                    )}
                                    {courier.email && (
                                        <div className="info-row">
                                            <Mail size={14} />
                                            <span>{courier.email}</span>
                                        </div>
                                    )}
                                    {courier.tracking_url_template && (
                                        <div className="info-row template">
                                            <Globe size={14} />
                                            <span>{courier.tracking_url_template}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style jsx>{`
                .form-card {
                    background: white;
                    padding: 2rem;
                    border-radius: 20px;
                    border: 1px solid hsl(var(--border-subtle));
                    box-shadow: var(--shadow-card);
                }
                .couriers-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 2rem;
                }
                .breadcrumb {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: hsl(var(--primary));
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.5rem;
                }
                h1 {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: 900;
                    color: hsl(var(--text-main));
                }
                .page-header p {
                    color: hsl(var(--text-muted));
                    margin: 0.5rem 0 0;
                }
                .btn-primary {
                    background: hsl(var(--primary));
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: 0.2s;
                    box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px hsl(var(--primary) / 0.4);
                }
                .btn-secondary {
                    background: #f1f5f9;
                    color: #64748b;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .search-bar {
                    background: white;
                    padding: 0.75rem 1.25rem;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border: 1px solid hsl(var(--border-subtle));
                    margin-bottom: 2rem;
                    box-shadow: var(--shadow-sm);
                }
                .search-bar input {
                    border: none;
                    outline: none;
                    width: 100%;
                    font-size: 1rem;
                    color: hsl(var(--text-main));
                }
                .search-bar svg {
                    color: hsl(var(--text-dim));
                }

                .couriers-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .courier-card {
                    background: white;
                    border: 1px solid hsl(var(--border-subtle));
                    border-radius: 20px;
                    padding: 1.5rem;
                    transition: 0.3s;
                    box-shadow: var(--shadow-sm);
                }
                .courier-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-card);
                    border-color: hsl(var(--primary) / 0.3);
                }
                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                }
                .courier-badge {
                    width: 40px;
                    height: 40px;
                    background: hsl(var(--primary) / 0.1);
                    color: hsl(var(--primary));
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .status-pill {
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 0.2rem 0.6rem;
                    border-radius: 99px;
                    text-transform: uppercase;
                }
                .status-pill.active { background: #dcfce7; color: #166534; }
                .status-pill.inactive { background: #fee2e2; color: #991b1b; }
                
                .card-actions {
                    margin-left: auto;
                    display: flex;
                    gap: 0.5rem;
                }
                .card-actions button {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .card-actions button:hover {
                    background: #f1f5f9;
                    color: hsl(var(--primary));
                }
                .card-actions button.delete:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    border-color: #fecaca;
                }

                .card-body h3 {
                    margin: 0 0 0.75rem;
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: hsl(var(--text-main));
                }
                .info-row {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    color: hsl(var(--text-muted));
                    font-size: 0.85rem;
                    margin-bottom: 0.4rem;
                }
                .info-row.template {
                    margin-top: 0.75rem;
                    padding: 0.5rem;
                    background: #f8fafc;
                    border-radius: 8px;
                    word-break: break-all;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 500px;
                    padding: 2rem;
                    box-shadow: var(--shadow-premium);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 900; }
                .close-btn { background: none; border: none; cursor: pointer; color: #64748b; }

                .form-group { margin-bottom: 1.25rem; }
                .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; }
                .form-group input[type="text"], 
                .form-group input[type="email"] {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    outline: none;
                }
                .form-group input:focus { border-color: hsl(var(--primary)); }
                .help-text { font-size: 0.7rem; color: #94a3b8; margin: -0.25rem 0 0.5rem; }
                .help-text code { background: #f1f5f9; padding: 1px 4px; border-radius: 4px; }

                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .checkbox { display: flex; align-items: center; }
                .checkbox label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
                .checkbox input { width: 18px; height: 18px; }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 2rem;
                }

                .notification {
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: white;
                    font-weight: 700;
                    z-index: 2000;
                    animation: slideIn 0.3s ease-out;
                }
                .notification.success { background: #22c55e; box-shadow: 0 8px 16px rgba(34,197,94,0.3); }
                .notification.error { background: #ef4444; box-shadow: 0 8px 16px rgba(239,68,68,0.3); }

                @keyframes slideIn {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-pop { animation: pop 0.2s ease-out; }

                .loading-state, .empty-state {
                    grid-column: 1 / -1;
                    padding: 4rem;
                    text-align: center;
                    color: #94a3b8;
                }
                .empty-state svg { margin-bottom: 1.5rem; opacity: 0.2; }
            `}</style>
        </div>
    );
}
