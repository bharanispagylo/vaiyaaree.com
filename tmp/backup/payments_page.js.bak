'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    CreditCard, Search, Filter, RefreshCw, Loader2,
    CheckCircle, XCircle, Clock, IndianRupee, TrendingUp,
    Download, Eye, Smartphone, Globe, ChevronDown, Settings,
    Shield, Key, Link as LinkIcon, Save, AlertCircle, CheckCircle2, Store,
    ArrowLeft
} from 'lucide-react';

const STATUS_COLORS = {
    PAID: { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.3)', label: 'Paid' },
    PENDING: { bg: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', border: 'hsl(var(--accent) / 0.3)', label: 'Pending' },
    FAILED: { bg: 'hsl(var(--danger) / 0.12)', color: 'hsl(var(--danger))', border: 'hsl(var(--danger) / 0.3)', label: 'Failed' },
    PLACED: { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.3)', label: 'Placed' },
    CANCELLED: { bg: 'hsl(var(--danger) / 0.12)', color: 'hsl(var(--danger))', border: 'hsl(var(--danger) / 0.3)', label: 'Cancelled' },
};

const METHOD_ICONS = {
    Razorpay: { color: '#3395FF', label: 'Razorpay', icon: '' },
    PhonePe: { color: '#5e17eb', label: 'PhonePe', icon: '' },
    UPI: { color: '#00b300', label: 'UPI', icon: '' },
    COD: { color: '#f59e0b', label: 'COD', icon: '' },
    WhatsApp: { color: 'hsl(var(--primary))', label: 'WhatsApp', icon: '' },
};

export default function PaymentGatewayPage() {
    const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'integration'
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 });

    const [gatewaySettings, setGatewaySettings] = useState({
        razorpay_key_id: '',
        razorpay_key_secret: '',
        razorpay_enabled: 'true',
        razorpay_title: 'Pay with Razorpay',
        razorpay_logo: '',
        phonepe_merchant_id: '',
        phonepe_salt_key: '',
        phonepe_salt_index: '1',
        phonepe_env: 'sandbox',
        phonepe_enabled: 'true',
        phonepe_title: 'Pay with PhonePe',
        phonepe_logo: '',
        default_gateway: 'razorpay'
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [notification, setNotification] = useState(null);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select('id, customer_name, customer_phone, total_amount, status, payment_method, created_at, razorpay_payment_id, transaction_id, delivery_address, order_items(*)')
                .order('created_at', { ascending: false });

            if (dateFilter === 'today') {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                query = query.gte('created_at', today.toISOString());
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', weekAgo.toISOString());
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', monthAgo.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            const list = data || [];
            setPayments(list);

            const paid = list.filter(o => o.status === 'PAID' || o.status === 'PLACED');
            const pending = list.filter(o => o.status === 'PENDING');
            const failed = list.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED');
            const revenue = paid.reduce((s, o) => s + (o.total_amount || 0), 0);
            setStats({ total: list.length, paid: paid.length, pending: pending.length, failed: failed.length, revenue });
        } catch (err) { console.error('Error fetching payments:', err); }
        finally { setLoading(false); }
    };

    const fetchGatewaySettings = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .in('key', [
                    'razorpay_key_id', 'razorpay_key_secret', 'razorpay_enabled', 'razorpay_title', 'razorpay_logo',
                    'phonepe_merchant_id', 'phonepe_salt_key',
                    'phonepe_salt_index', 'phonepe_env', 'phonepe_enabled', 'phonepe_title', 'phonepe_logo',
                    'default_gateway'
                ]);

            if (error) throw error;
            const settingsMap = { ...gatewaySettings };
            data.forEach(item => { settingsMap[item.key] = item.value; });
            setGatewaySettings(settingsMap);
        } catch (err) { console.error('Error fetching gateway settings:', err); }
    };

    useEffect(() => {
        fetchPayments();
        fetchGatewaySettings();
    }, [dateFilter]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const updates = Object.entries(gatewaySettings).map(([key, value]) => ({
                key,
                value: value?.toString() || '',
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;

            setNotification({ message: 'Gateway integration updated successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ message: 'Error saving: ' + err.message, type: 'error' });
        } finally {
            setSavingSettings(false);
        }
    };

    const filtered = payments.filter(p => {
        const matchSearch = !search || [p.customer_name, p.customer_phone, p.id, p.razorpay_payment_id, p.transaction_id]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
        const matchMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;
        return matchSearch && matchStatus && matchMethod;
    });

    const exportCSV = () => {
        const rows = [['Order ID', 'Customer', 'Phone', 'Amount', 'Status', 'Method', 'Date', 'Transaction ID']];
        filtered.forEach(p => rows.push([
            p.id, p.customer_name, p.customer_phone,
            p.total_amount, p.status, p.payment_method || 'N/A',
            new Date(p.created_at).toLocaleDateString('en-IN'),
            p.razorpay_payment_id || p.transaction_id || 'N/A'
        ]));
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `payments_${Date.now()}.csv`; a.click();
    };

    // Shared Styles
    const sStyle = { padding: '0.6rem 0.85rem', borderRadius: 10, background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' };
    const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', marginBottom: '0.5rem' };

    return (
        <div className="animate-enter" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>

            {/* Notification Toast */}
            {notification && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: notification.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '1rem 2rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out' }}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            {!selectedPayment ? (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                                <CreditCard size={32} color="hsl(var(--text-main))" />
                                Payment Gateway Integration
                            </h1>
                            <p style={{ color: 'hsl(var(--text-muted))', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                                Manage transactions and configure your Razorpay & PhonePe accounts.
                            </p>
                        </div>
                        {activeTab === 'transactions' && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={fetchPayments} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                                    <RefreshCw size={15} /> Refresh
                                </button>
                                <button onClick={exportCSV} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                                    <Download size={15} /> Export CSV
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', marginBottom: '2rem' }}>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'transactions' ? '2px solid hsl(var(--primary))' : 'none', color: activeTab === 'transactions' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))', fontWeight: 700, cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem' }}
                        >
                            <Smartphone size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Transactions History
                        </button>
                        <button
                            onClick={() => setActiveTab('integration')}
                            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'integration' ? '2px solid hsl(var(--primary))' : 'none', color: activeTab === 'integration' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))', fontWeight: 700, cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem' }}
                        >
                            <Settings size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Gateway Credentials
                        </button>
                    </div>

                    {/* TAB: Transactions History */}
                    {activeTab === 'transactions' && (
                        <div style={{ animation: 'fadeEnter 0.3s' }}>
                            {/* Stat Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {[
                                    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee },
                                    { label: 'Paid Orders', value: stats.paid, icon: CheckCircle },
                                    { label: 'Pending', value: stats.pending, icon: Clock },
                                    { label: 'Failed / Cancelled', value: stats.failed, icon: XCircle },
                                ].map((s, i) => (
                                    <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12,
                                            background: 'hsl(var(--primary))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}>
                                            <s.icon size={22} color="#ffffff" />
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ position: 'relative', flex: '2 1 220px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                    <input
                                        placeholder="Search by name, phone, order ID, txn ID..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="admin-input"
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                </div>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 120px' }}>
                                    <option value="ALL">All Status</option>
                                    <option value="PAID">Paid</option>
                                    <option value="PLACED">Placed</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="FAILED">Failed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 130px' }}>
                                    <option value="ALL">All Methods</option>
                                    <option value="Razorpay">Razorpay</option>
                                    <option value="PhonePe">PhonePe</option>
                                    <option value="UPI">UPI</option>
                                    <option value="COD">COD</option>
                                    <option value="WhatsApp">WhatsApp</option>
                                </select>
                                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...sStyle, flex: '1 1 120px' }}>
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                </select>
                            </div>

                            {/* Payments Table */}
                            <div className="card" style={{ overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))' }}>
                                {loading ? (
                                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                                        <Loader2 size={36} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 1rem' }} />
                                        <p style={{ color: 'hsl(var(--text-muted))' }}>Loading payments...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                                        <CreditCard size={48} style={{ color: 'hsl(var(--text-muted))', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
                                        <p style={{ color: 'hsl(var(--text-muted))' }}>No payments found</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f1f5f9' }}>
                                                <tr>
                                                    {['Order', 'Customer', 'Amount', 'Status', 'Method', 'Transaction ID', 'Date', 'Actions'].map(h => (
                                                        <th key={h} style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((p) => {
                                                    const statusMeta = STATUS_COLORS[p.status] || STATUS_COLORS.PENDING;
                                                    const methodMeta = METHOD_ICONS[p.payment_method] || { color: '#888', label: p.payment_method || 'N/A', icon: '💳' };
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                                            <td style={{ padding: '1rem 1.25rem' }}><code style={{ background: 'hsl(var(--bg-app))', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.8rem', color: 'hsl(var(--primary))' }}>#{String(p.id).slice(0, 8)}</code></td>
                                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.customer_name || 'Unknown'}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.customer_phone}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem 1.25rem' }}><span style={{ fontWeight: 800, fontSize: '1rem' }}>₹{p.total_amount?.toLocaleString()}</span></td>
                                                            <td style={{ padding: '1rem 1.25rem' }}><span style={{ background: statusMeta.bg, color: statusMeta.color, padding: '0.3rem 0.8rem', borderRadius: 30, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{statusMeta.label}</span></td>
                                                            <td style={{ padding: '1rem 1.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: methodMeta.color, fontWeight: 700, fontSize: '0.8rem' }}>{methodMeta.icon} {methodMeta.label}</div></td>
                                                            <td style={{ padding: '1rem 1.25rem' }}><code style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{p.transaction_id || p.razorpay_payment_id || '-'}</code></td>
                                                            <td style={{ padding: '1rem 1.25rem', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                                                            <td style={{ padding: '1rem 1.25rem' }}><button onClick={() => setSelectedPayment(p)} className="btn-icon primary"><Eye size={16} /></button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: Gateway Configuration */}
                    {activeTab === 'integration' && (
                        <div style={{ animation: 'fadeEnter 0.3s' }}>
                            <div style={{ marginBottom: '2rem', background: 'hsl(var(--bg-card))', padding: '1.5rem', borderRadius: 20, border: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Default Gateway</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Which gateway should be highlighted by default?</p>
                                </div>
                                <select
                                    value={gatewaySettings.default_gateway}
                                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, default_gateway: e.target.value }))}
                                    style={{ ...sStyle, width: 'auto', minWidth: 200 }}
                                >
                                    <option value="razorpay">Razorpay</option>
                                    <option value="phonepe">PhonePe</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                                {/* Razorpay Config */}
                                <div className="card" style={{ padding: '2rem', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1rem' }}>
                                        <div style={{ width: 40, height: 40, background: '#072654', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3395FF', fontWeight: 900 }}>R</div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Razorpay Integration</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Accept Cards, UPI, Net Banking & Wallets</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(51,149,255,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(51,149,255,0.1)' }}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Enable Razorpay</p>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Accept cards and UPI via Razorpay</p>
                                            </div>
                                            <button
                                                onClick={() => setGatewaySettings(prev => ({ ...prev, razorpay_enabled: prev.razorpay_enabled === 'true' ? 'false' : 'true' }))}
                                                style={{ width: 44, height: 24, borderRadius: 20, background: gatewaySettings.razorpay_enabled === 'true' ? '#3395FF' : '#333', border: 'none', position: 'relative', cursor: 'pointer', transition: '0.3s' }}
                                            >
                                                <div style={{ position: 'absolute', top: 3, left: gatewaySettings.razorpay_enabled === 'true' ? 22 : 4, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: '0.3s' }} />
                                            </button>
                                        </div>

                                        <div className="field-group">
                                            <label style={labelStyle}>Display Name</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.razorpay_title}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, razorpay_title: e.target.value }))}
                                                style={sStyle}
                                            />
                                        </div>

                                        <div className="field-group">
                                            <label style={labelStyle}>Logo URL (Optional)</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.razorpay_logo}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, razorpay_logo: e.target.value }))}
                                                placeholder="https://..."
                                                style={sStyle}
                                            />
                                        </div>
                                        <div className="field-group">
                                            <label style={labelStyle}><Key size={14} /> Razorpay Key ID</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.razorpay_key_id}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, razorpay_key_id: e.target.value }))}
                                                placeholder="rzp_test_..."
                                                style={sStyle}
                                            />
                                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Get this from Razorpay Dashboard → Settings → API Keys</p>
                                        </div>
                                        <div className="field-group">
                                            <label style={labelStyle}><Shield size={14} /> Razorpay Key Secret</label>
                                            <input
                                                type="password"
                                                value={gatewaySettings.razorpay_key_secret}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, razorpay_key_secret: e.target.value }))}
                                                placeholder="••••••••••••••••"
                                                style={sStyle}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PhonePe Config */}
                                <div className="card" style={{ padding: '2rem', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1rem' }}>
                                        <div style={{ width: 40, height: 40, background: '#5e17eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>Pe</div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>PhonePe Business</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Accept Direct PhonePe & UPI Payments</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(94,23,235,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(94,23,235,0.1)' }}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Enable PhonePe</p>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Accept direct PhonePe & UPI payments</p>
                                            </div>
                                            <button
                                                onClick={() => setGatewaySettings(prev => ({ ...prev, phonepe_enabled: prev.phonepe_enabled === 'true' ? 'false' : 'true' }))}
                                                style={{ width: 44, height: 24, borderRadius: 20, background: gatewaySettings.phonepe_enabled === 'true' ? '#5e17eb' : '#333', border: 'none', position: 'relative', cursor: 'pointer', transition: '0.3s' }}
                                            >
                                                <div style={{ position: 'absolute', top: 3, left: gatewaySettings.phonepe_enabled === 'true' ? 22 : 4, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: '0.3s' }} />
                                            </button>
                                        </div>

                                        <div className="field-group">
                                            <label style={labelStyle}>Display Name</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.phonepe_title}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_title: e.target.value }))}
                                                style={sStyle}
                                            />
                                        </div>

                                        <div className="field-group">
                                            <label style={labelStyle}>Logo URL (Optional)</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.phonepe_logo}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_logo: e.target.value }))}
                                                placeholder="https://..."
                                                style={sStyle}
                                            />
                                        </div>
                                        <div className="field-group">
                                            <label style={labelStyle}><Store size={14} /> Merchant ID</label>
                                            <input
                                                type="text"
                                                value={gatewaySettings.phonepe_merchant_id}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_merchant_id: e.target.value }))}
                                                placeholder="PGMD..."
                                                style={sStyle}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '1rem' }}>
                                            <div className="field-group">
                                                <label style={labelStyle}><Key size={14} /> Salt Key</label>
                                                <input
                                                    type="password"
                                                    value={gatewaySettings.phonepe_salt_key}
                                                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_salt_key: e.target.value }))}
                                                    placeholder="••••••••••••••••"
                                                    style={sStyle}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label style={labelStyle}>Index</label>
                                                <input
                                                    type="text"
                                                    value={gatewaySettings.phonepe_salt_index}
                                                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_salt_index: e.target.value }))}
                                                    style={{ ...sStyle, textAlign: 'center' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label style={labelStyle}><Globe size={14} /> Environment</label>
                                            <select
                                                value={gatewaySettings.phonepe_env}
                                                onChange={(e) => setGatewaySettings(prev => ({ ...prev, phonepe_env: e.target.value }))}
                                                style={sStyle}
                                            >
                                                <option value="sandbox">Sandbox (Testing)</option>
                                                <option value="production">Production (Real Payments)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    style={{ padding: '1rem 3rem', background: 'hsl(var(--primary))', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 30px hsl(var(--primary) / 0.3)' }}
                                >
                                    {savingSettings ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                    Update Gateway Integration
                                </button>
                            </div>

                            <div style={{ marginTop: '2rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '1.25rem', borderRadius: 16 }}>
                                <h4 style={{ margin: '0 0 0.5rem', color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={18} /> Important Note
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                                    <li>These keys are used directly for payment processing. Ensure they are correct before going live.</li>
                                    <li>For Razorpay, find your keys in **Settings &gt; API Keys** on the Razorpay dashboard.</li>
                                    <li>For PhonePe, your Merchant ID and Salt details are provided by the PhonePe onboarding team.</li>
                                    <li>Make sure your website URL is correctly configured in your gateway dashboard.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="animate-enter" style={{ padding: '1rem 0' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setSelectedPayment(null)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'none', border: 'none', color: 'hsl(var(--primary))',
                                fontWeight: 800, cursor: 'pointer', fontSize: '1rem'
                            }}
                        >
                            <ArrowLeft size={20} /> Back to Transactions
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2.5rem' }}>
                        <div className="card shadow-premium" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Transaction Summary</h2>
                                <span style={{
                                    background: (STATUS_COLORS[selectedPayment.status] || STATUS_COLORS.PENDING).bg,
                                    color: (STATUS_COLORS[selectedPayment.status] || STATUS_COLORS.PENDING).color,
                                    padding: '0.6rem 1.5rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase'
                                }}>
                                    {selectedPayment.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: '1.25rem' }}>
                                {[
                                    ['Transaction ID', selectedPayment.transaction_id || selectedPayment.razorpay_payment_id || 'N/A', LinkIcon],
                                    ['Invoice Amount', `₹${selectedPayment.total_amount?.toLocaleString()}`, IndianRupee],
                                    ['Payment Method', selectedPayment.payment_method || 'N/A', CreditCard],
                                    ['Date & Time', new Date(selectedPayment.created_at).toLocaleString('en-IN'), Clock],
                                    ['Merchant Status', selectedPayment.status, CheckCircle],
                                ].map(([label, value, Icon]) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Icon size={18} color="hsl(var(--primary))" />
                                            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
                                        </div>
                                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Customer Info</h3>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</p>
                                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>{selectedPayment.customer_name || 'Anonymous'}</p>
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number</p>
                                    <p style={{ margin: 0, fontWeight: 800 }}>{selectedPayment.customer_phone}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Shipping Address</p>
                                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.6, color: '#475569', border: '1px solid #f1f5f9' }}>
                                        {selectedPayment.delivery_address || 'No address provided'}
                                    </div>
                                </div>
                            </div>

                            {selectedPayment.order_items && selectedPayment.order_items.length > 0 && (
                                <div className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Items</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {selectedPayment.order_items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span style={{ color: '#64748b' }}>{item.quantity}x {item.product_name || 'Product'}</span>
                                                <span style={{ fontWeight: 700 }}>₹{item.price?.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes fadeEnter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
