'use client';

import { useState, useEffect } from 'react';
import {
    Clock, Package, Send, Loader2, Search, Trash2, Edit,
    CheckCircle2, AlertCircle, Calendar, Play, Pause,
    Facebook, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ModalPortal from '@/components/ModalPortal';

export default function SchedulePostPage() {
    const [products, setProducts] = useState([]);
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);
    const [fbConfig, setFbConfig] = useState({ pageId: '', accessToken: '', pageName: '' });

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [caption, setCaption] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filter
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [notification, setNotification] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'postnow', payload }

    useEffect(() => {
        setHasMounted(true);
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch products
            const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
            setProducts(prodData || []);

            // Fetch scheduled posts
            const { data: schedData } = await supabase.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true });
            setScheduledPosts(schedData || []);

            // Fetch FB config
            const { data: fbData } = await supabase.from('app_settings').select('*').in('key', ['fb_page_id', 'fb_page_access_token', 'fb_page_name']);
            const config = { pageId: '', accessToken: '', pageName: '' };
            (fbData || []).forEach(item => {
                if (item.key === 'fb_page_id') config.pageId = item.value;
                if (item.key === 'fb_page_access_token') config.accessToken = item.value;
                if (item.key === 'fb_page_name') config.pageName = item.value;
            });
            setFbConfig(config);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Generate default caption
    const generateCaption = (product) => {
        if (!product) return '';
        const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://castprintz.vercel.app';
        return `${product.name}\n\nPrice: ₹${(product.price || 0).toLocaleString()}\n\n${product.description || 'Premium quality saree from our exclusive collection.'}\n\nShop now: ${shopUrl}/shop?pid=${product.id}\n\n#CastPrintz #Sarees #Fashion #IndianWear`;
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        if (!caption || caption === generateCaption(selectedProduct)) {
            setCaption(generateCaption(product));
        }
    };

    // Get minimum datetime (now + 10 minutes)
    const getMinDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const getMinTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // Save scheduled post
    const handleSave = async () => {
        if (!selectedProduct) { setNotification({ message: 'Please select a product.', type: 'error' }); setTimeout(() => setNotification(null), 3000); return; }
        if (!caption.trim()) { setNotification({ message: 'Please enter a caption.', type: 'error' }); setTimeout(() => setNotification(null), 3000); return; }
        if (!scheduleDate || !scheduleTime) { setNotification({ message: 'Please select a date and time.', type: 'error' }); setTimeout(() => setNotification(null), 3000); return; }

        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (scheduledAt <= new Date()) { setNotification({ message: 'Scheduled time must be in the future.', type: 'error' }); setTimeout(() => setNotification(null), 3000); return; }

        if (!fbConfig.pageId || !fbConfig.accessToken) {
            setNotification({ message: 'Facebook is not connected. Go to Meta Connect to link your account first.', type: 'error' }); setTimeout(() => setNotification(null), 4000); return;
        }

        setSaving(true);
        try {
            const postData = {
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                product_image: selectedProduct.image_url,
                product_price: selectedProduct.price,
                caption: caption,
                scheduled_at: scheduledAt.toISOString(),
                platform: 'facebook',
                status: 'PENDING'
            };

            if (editingId) {
                await supabase.from('scheduled_posts').update(postData).eq('id', editingId);
            } else {
                await supabase.from('scheduled_posts').insert([postData]);
            }

            // Reset form
            setShowForm(false);
            setSelectedProduct(null);
            setCaption('');
            setScheduleDate('');
            setScheduleTime('');
            setEditingId(null);
            await fetchAll();
        } catch (err) {
            console.error('Save error:', err);
            setNotification({ message: 'Failed to save scheduled post.', type: 'error' }); setTimeout(() => setNotification(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    // Edit scheduled post
    const handleEdit = (post) => {
        const product = products.find(p => p.id === post.product_id);
        setSelectedProduct(product || { id: post.product_id, name: post.product_name, image_url: post.product_image, price: post.product_price });
        setCaption(post.caption);
        const dt = new Date(post.scheduled_at);
        setScheduleDate(dt.toISOString().split('T')[0]);
        setScheduleTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
        setEditingId(post.id);
        setShowForm(true);
    };

    // Delete scheduled post
    const handleDelete = async (id) => {
        setConfirmAction({ type: 'delete', payload: id });
    };

    const handleDeleteConfirmed = async (id) => {
        setConfirmAction(null);
        await supabase.from('scheduled_posts').delete().eq('id', id);
        await fetchAll();
        setNotification({ message: 'Post deleted.', type: 'success' }); setTimeout(() => setNotification(null), 2500);
    };

    // Cancel scheduled post
    const handleCancel = async (id) => {
        await supabase.from('scheduled_posts').update({ status: 'CANCELLED' }).eq('id', id);
        await fetchAll();
    };

    // Post now (immediate)
    const handlePostNow = async (post) => {
        setConfirmAction({ type: 'postnow', payload: post });
    };

    const handlePostNowConfirmed = async (post) => {
        setConfirmAction(null);
        try {
            await supabase.from('scheduled_posts').update({ status: 'POSTING' }).eq('id', post.id);
            await fetchAll();

            const res = await fetch('/api/facebook/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: post.product_image,
                    name: post.product_name,
                    price: post.product_price,
                    description: post.caption,
                    pageId: fbConfig.pageId,
                    accessToken: fbConfig.accessToken
                })
            });

            const data = await res.json();
            if (data.success) {
                await supabase.from('scheduled_posts').update({ status: 'POSTED', fb_post_id: data.postId }).eq('id', post.id);
            } else {
                await supabase.from('scheduled_posts').update({ status: 'FAILED', error_message: data.error || 'Unknown error' }).eq('id', post.id);
            }
            await fetchAll();
        } catch (err) {
            await supabase.from('scheduled_posts').update({ status: 'FAILED', error_message: err.message }).eq('id', post.id);
            await fetchAll();
        }
    };

    // Filter posts
    const filteredPosts = scheduledPosts.filter(p => statusFilter === 'ALL' || p.status === statusFilter);

    // Filtered products for selection
    const filteredProducts = products.filter(p =>
        !productSearch || (p.name || '').toLowerCase().includes(productSearch.toLowerCase())
    );

    // Stats
    const pendingCount = scheduledPosts.filter(p => p.status === 'PENDING').length;
    const postedCount = scheduledPosts.filter(p => p.status === 'POSTED').length;
    const failedCount = scheduledPosts.filter(p => p.status === 'FAILED').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return { label: 'Pending', cls: 'badge badge-placed', color: 'hsl(var(--warning))' };
            case 'POSTING': return { label: 'Posting...', cls: 'badge badge-shipped', color: 'hsl(var(--primary))' };
            case 'POSTED': return { label: 'Posted', cls: 'badge badge-delivered', color: 'hsl(var(--success))' };
            case 'FAILED': return { label: 'Failed', cls: 'badge badge-cancelled', color: 'hsl(var(--danger))' };
            case 'CANCELLED': return { label: 'Cancelled', cls: 'badge', color: 'hsl(var(--text-muted))' };
            default: return { label: status, cls: 'badge', color: 'hsl(var(--text-muted))' };
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
        background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
    };

    const pillStyle = (active) => ({
        padding: '0.35rem 0.9rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s', border: 'none',
        background: active ? 'hsl(var(--primary))' : '#ffffff',
        color: active ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
        outline: active ? 'none' : '1px solid hsl(var(--border-subtle))',
    });

    if (!hasMounted || loading) {
        return (
            <div className="animate-enter">
                <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
                    <p>Loading schedule...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="animate-enter">
            {/* Header */}
            <div className="admin-header-row">
                <div>
                    <h1>Schedule Posts</h1>
                    <p>Schedule product posts to Facebook at the perfect time</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditingId(null); setSelectedProduct(null); setCaption(''); setScheduleDate(''); setScheduleTime(''); }} className="btn btn-primary">
                    <Clock size={18} /> New Scheduled Post
                </button>
            </div>

            {/* FB Connection Warning */}
            {!fbConfig.pageId && (
                <div style={{
                    padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '12px',
                    background: 'hsl(var(--warning) / 0.1)', border: '1px solid hsl(var(--warning) / 0.3)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'hsl(var(--warning))'
                }}>
                    <AlertCircle size={20} />
                    <span>Facebook not connected. <a href="/admin/facebook" style={{ color: '#1877F2', fontWeight: 700 }}>Connect Meta Account</a> to enable posting.</span>
                </div>
            )}

            {/* Stats */}
            <div className="admin-grid-3" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Pending', value: pendingCount, icon: <Clock size={18} />, color: 'hsl(var(--warning))' },
                    { label: 'Posted', value: postedCount, icon: <CheckCircle2 size={18} />, color: 'hsl(var(--success))' },
                    { label: 'Failed', value: failedCount, icon: <AlertCircle size={18} />, color: 'hsl(var(--danger))' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', borderTop: `3px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `color-mix(in srgb, ${s.color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                    </div>
                ))}
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['ALL', 'PENDING', 'POSTED', 'FAILED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={pillStyle(statusFilter === s)}>
                        {s === 'ALL' ? 'All Posts' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Scheduled Posts List */}
            <div className="card" style={{ padding: 0 }}>
                {filteredPosts.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Clock size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '0.9rem' }}>No scheduled posts yet.</p>
                        <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ marginTop: '0.75rem' }}>Create Your First Post</button>
                    </div>
                ) : (
                    <table style={{ margin: 0 }}>
                        <thead style={{ background: '#f1f5f9' }}>
                            <tr style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th>Product</th>
                                <th>Scheduled For</th>
                                <th>Platform</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.map(post => {
                                const badge = getStatusBadge(post.status);
                                const scheduledDate = new Date(post.scheduled_at);
                                const isPast = scheduledDate <= new Date();
                                return (
                                    <tr key={post.id}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, border: '1px solid hsl(var(--border-subtle))' }}>
                                                    {post.product_image ? (
                                                        <img src={post.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{post.product_name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>₹{(post.product_price || 0).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                {scheduledDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                {isPast && post.status === 'PENDING' && (
                                                    <span style={{ color: 'hsl(var(--warning))', marginLeft: '6px', fontWeight: 700 }}>Overdue</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Facebook size={14} color="#1877F2" />
                                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Facebook</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={badge.cls} style={{ fontSize: '0.72rem' }}>{badge.label}</span>
                                            {post.error_message && (
                                                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--danger))', marginTop: '3px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    title={post.error_message}>
                                                    {post.error_message}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                                {post.status === 'PENDING' && (
                                                    <>
                                                        <button onClick={() => handlePostNow(post)} title="Post Now" className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', color: 'hsl(var(--success))' }}>
                                                            <Play size={13} /> Post Now
                                                        </button>
                                                        <button onClick={() => handleEdit(post)} title="Edit" className="btn btn-secondary" style={{ padding: '0.35rem' }}>
                                                            <Edit size={13} />
                                                        </button>
                                                        <button onClick={() => handleCancel(post.id)} title="Cancel" className="btn btn-secondary" style={{ padding: '0.35rem', color: 'hsl(var(--warning))' }}>
                                                            <Pause size={13} />
                                                        </button>
                                                    </>
                                                )}
                                                {(post.status === 'FAILED' || post.status === 'CANCELLED') && (
                                                    <button onClick={() => handleEdit(post)} title="Reschedule" className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem' }}>
                                                        <Clock size={13} /> Reschedule
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(post.id)} title="Delete" className="btn btn-secondary" style={{ padding: '0.35rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ═══ SCHEDULE POST MODAL ═══ */}
            {showForm && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowForm(false)}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', padding: 0, border: '1px solid hsl(var(--primary) / 0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

                        {/* Modal Header */}
                        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '8px', background: '#1877F2', borderRadius: '10px', color: 'white' }}><Facebook size={18} /></div>
                                <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{editingId ? 'Edit Scheduled Post' : 'Schedule New Post'}</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '24px', lineHeight: 1 }}>&times;</button>
                        </div>

                        <div style={{ padding: '1.5rem 1.75rem' }}>
                            {/* Step 1: Select Product */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <Package size={14} /> Select Product
                                </label>

                                {selectedProduct ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'hsl(var(--primary) / 0.08)', borderRadius: '12px', border: '2px solid hsl(var(--primary))' }}>
                                        <img src={selectedProduct.image_url} alt="" style={{ width: '55px', height: '55px', borderRadius: '10px', objectFit: 'cover' }}
                                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=60'; }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{selectedProduct.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>₹{(selectedProduct.price || 0).toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '18px', lineHeight: 1 }}>&times;</button>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Search */}
                                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                            <input type="text" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                                style={{ ...inputStyle, paddingLeft: '2rem', fontSize: '0.82rem' }} />
                                        </div>
                                        {/* Product Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem', maxHeight: '220px', overflowY: 'auto' }}>
                                            {filteredProducts.slice(0, 20).map(p => (
                                                <div key={p.id} onClick={() => selectProduct(p)}
                                                    style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', background: '#f1f5f9', transition: 'all 0.15s' }}>
                                                    <div style={{ height: '70px', borderRadius: '7px', overflow: 'hidden', marginBottom: '0.3rem' }}>
                                                        <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=60'; }} />
                                                    </div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>₹{(p.price || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Caption */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <Edit size={14} /> Post Caption
                                </label>
                                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={5}
                                    placeholder="Write your Facebook post caption..."
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>{caption.length} characters</div>
                            </div>

                            {/* Step 3: Date & Time */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <Calendar size={14} /> Schedule Date & Time
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Date</div>
                                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={getMinDate()}
                                            style={{ ...inputStyle, cursor: 'pointer' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Time</div>
                                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                                            style={{ ...inputStyle, cursor: 'pointer' }} />
                                    </div>
                                </div>
                                {scheduleDate && scheduleTime && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>
                                        Will post on {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                                <button onClick={handleSave} disabled={saving || !selectedProduct || !caption || !scheduleDate || !scheduleTime}
                                    className="btn btn-primary"
                                    style={{
                                        background: '#1877F2', borderColor: '#1877F2',
                                        opacity: (saving || !selectedProduct || !caption || !scheduleDate || !scheduleTime) ? 0.5 : 1
                                    }}>
                                    {saving ? (
                                        <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> Saving...</>
                                    ) : (
                                        <><Clock size={16} style={{ marginRight: '6px' }} /> {editingId ? 'Update Schedule' : 'Schedule Post'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
        <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
            
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 5000,
                    padding: '1rem 1.5rem', borderRadius: '14px',
                    background: notification.type === 'success' ? 'hsl(142 70% 40%)' : 'hsl(var(--danger))',
                    color: 'white', fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideUp 0.3s ease'
                }}>
                    {notification.message}
                </div>
            )}

            {/* Confirm Action Modal */}
            {confirmAction && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => setConfirmAction(null)}>
                    <div className="card shadow-premium animate-enter" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center', borderRadius: '24px', background: 'hsl(var(--bg-card))', border: `1px solid ${confirmAction.type === 'delete' ? 'hsl(var(--danger) / 0.3)' : 'hsl(var(--primary) / 0.3)'}` }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: confirmAction.type === 'delete' ? 'hsl(var(--danger) / 0.1)' : 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: confirmAction.type === 'delete' ? 'hsl(var(--danger))' : 'hsl(var(--primary))' }}>
                            {confirmAction.type === 'delete' ? <Trash2 size={40} /> : <Send size={40} />}
                        </div>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 900 }}>
                            {confirmAction.type === 'delete' ? 'Delete Post?' : 'Post to Facebook Now?'}
                        </h3>
                        <p style={{ margin: '0 0 2rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>
                            {confirmAction.type === 'delete'
                                ? 'This will permanently remove the scheduled post.'
                                : 'This will immediately post the product to your Facebook page. This cannot be undone.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setConfirmAction(null)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '14px', fontWeight: 700 }}>Cancel</button>
                            <button
                                onClick={() => confirmAction.type === 'delete' ? handleDeleteConfirmed(confirmAction.payload) : handlePostNowConfirmed(confirmAction.payload)}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '1rem', borderRadius: '14px', fontWeight: 800, background: confirmAction.type === 'delete' ? 'hsl(var(--danger))' : '#1877F2', border: 'none' }}
                            >
                                {confirmAction.type === 'delete' ? 'Delete' : 'Post Now'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </>
    );
}
