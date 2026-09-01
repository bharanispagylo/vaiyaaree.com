'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Download, Database, Calendar, FileSpreadsheet, FileCode, FileText, 
    RefreshCw, Trash2, Clock, ShieldCheck, CheckCircle2, AlertCircle, 
    UploadCloud, SlidersHorizontal, Layers, Eye, X, Loader2, ArrowLeft,
    Check, PlayCircle, Settings
} from 'lucide-react';

export default function OrderBackupPage() {
    const [backups, setBackups] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalLineItems: 0,
        earliestOrder: null,
        latestOrder: null,
        totalBackups: 0,
        lastBackup: null,
        autoBackupConfig: { enabled: false, frequency: 'daily' }
    });

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    // Backup Generation Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [format, setFormat] = useState('JSON'); // 'JSON' | 'CSV' | 'SQL'
    const [dateRange, setDateRange] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [notes, setNotes] = useState('');

    // Restore & Preview State
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreFile, setRestoreFile] = useState(null);
    const [restorePreview, setRestorePreview] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    const fetchBackupsAndStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/orders/backup');
            const data = await res.json();
            if (res.ok && data.success) {
                setBackups(data.backups || []);
                setStats(data.stats || {});
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to load backups' });
            }
        } catch (err) {
            console.error('Fetch Backups error:', err);
            setAlertMsg({ type: 'error', text: 'Error connecting to backup server' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackupsAndStats();
    }, []);

    const handleCreateBackup = async (e) => {
        if (e) e.preventDefault();
        setGenerating(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    format,
                    dateRange,
                    startDate: dateRange === 'custom' ? startDate : undefined,
                    endDate: dateRange === 'custom' ? endDate : undefined,
                    status: statusFilter,
                    paymentStatus: paymentStatusFilter,
                    source: sourceFilter,
                    notes
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Backup snapshot created successfully!' });
                setShowCreateModal(false);
                fetchBackupsAndStats();

                // Trigger instant download
                if (data.backup?.downloadUrl) {
                    const downloadLink = document.createElement('a');
                    downloadLink.href = data.backup.downloadUrl;
                    downloadLink.download = data.backup.filename;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to generate backup' });
            }
        } catch (err) {
            console.error('Create Backup error:', err);
            setAlertMsg({ type: 'error', text: 'Connection failed while creating backup' });
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteBackup = async (id) => {
        if (!confirm('Are you sure you want to delete this backup archive? This action cannot be undone.')) return;

        setDeletingId(id);
        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: 'Backup archive removed successfully' });
                setBackups(prev => prev.filter(b => b.id !== id));
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to delete backup' });
            }
        } catch (err) {
            console.error('Delete error:', err);
            setAlertMsg({ type: 'error', text: 'Connection error while deleting backup' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleViewPreview = async (backup) => {
        setPreviewTitle(`${backup.filename} (${backup.format})`);
        setShowPreviewModal(true);
        setPreviewContent('Loading backup preview...');

        try {
            const res = await fetch(`/api/admin/orders/backup?id=${backup.id}`);
            const data = await res.json();
            if (res.ok && data.success && data.backup) {
                setPreviewContent(data.backup.backup_content || 'No content found');
            } else {
                setPreviewContent('Error loading preview content.');
            }
        } catch (e) {
            setPreviewContent('Connection error while fetching preview.');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setRestoreFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const orderCount = Array.isArray(parsed.orders) ? parsed.orders.length : (Array.isArray(parsed) ? parsed.length : 0);
                setRestorePreview({
                    store: parsed.metadata?.store || 'Unknown Store',
                    date: parsed.metadata?.generated_at || 'N/A',
                    ordersCount: orderCount,
                    data: parsed
                });
            } catch (err) {
                alert('Invalid JSON file format. Please upload a valid JSON backup file created by Vaiyaaree.');
                setRestoreFile(null);
                setRestorePreview(null);
            }
        };
        reader.readAsText(file);
    };

    const handleExecuteRestore = async () => {
        if (!restorePreview || !restorePreview.data) return;
        if (!confirm(`Warning: Restoring will insert or update ${restorePreview.ordersCount} orders in your database. Continue?`)) return;

        setRestoring(true);
        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'restore',
                    backupData: restorePreview.data
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Orders restored successfully!' });
                setShowRestoreModal(false);
                setRestoreFile(null);
                setRestorePreview(null);
                fetchBackupsAndStats();
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to restore backup' });
            }
        } catch (err) {
            console.error('Restore error:', err);
            setAlertMsg({ type: 'error', text: 'Error connecting during restoration' });
        } finally {
            setRestoring(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-body, sans-serif)', color: 'hsl(var(--text-main, #1e293b))' }}>
            {/* Header Breadcrumb & Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'hsl(var(--text-muted, #64748b))', marginBottom: '0.35rem' }}>
                        <Link href="/admin/orders" style={{ color: 'inherit', textDecoration: 'none' }}>Orders</Link>
                        <span>/</span>
                        <Link href="/admin/settings" style={{ color: 'inherit', textDecoration: 'none' }}>Settings</Link>
                        <span>/</span>
                        <span style={{ color: 'hsl(var(--primary, #5d0821))', fontWeight: 700 }}>Order Backup & Data Recovery</span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'hsl(var(--text-main, #0f172a))' }}>
                        Order Backup & Export
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'hsl(var(--text-muted, #64748b))' }}>
                        Generate database dumps, spreadsheet archives, and restore historical order records safely.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={fetchBackupsAndStats}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.65rem 1rem', background: 'hsl(var(--bg-card, #ffffff))',
                            border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                            borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                            cursor: 'pointer', color: 'hsl(var(--text-main, #334155))'
                        }}
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setShowRestoreModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.65rem 1.1rem', background: '#f8fafc',
                            border: '1px solid #cbd5e1', borderRadius: '10px',
                            fontSize: '0.88rem', fontWeight: 700, color: '#334155',
                            cursor: 'pointer'
                        }}
                    >
                        <UploadCloud size={16} color="#0284c7" />
                        Restore Backup
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.65rem 1.25rem', background: 'hsl(var(--primary, #5d0821))',
                            color: '#ffffff', border: 'none', borderRadius: '10px',
                            fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(93, 8, 33, 0.25)'
                        }}
                    >
                        <Database size={16} />
                        Create Backup Now
                    </button>
                </div>
            </div>

            {/* Alert Notification */}
            {alertMsg.text && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem', borderRadius: '12px', marginBottom: '1.75rem',
                    background: alertMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${alertMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: alertMsg.type === 'success' ? '#15803d' : '#b91c1c',
                    fontSize: '0.9rem', fontWeight: 600
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {alertMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span>{alertMsg.text}</span>
                    </div>
                    <button onClick={() => setAlertMsg({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* KPI Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: 'hsl(var(--bg-card, #ffffff))', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted, #64748b))', textTransform: 'uppercase' }}>Total Orders</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                            <Layers size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'hsl(var(--text-main, #0f172a))' }}>
                        {stats.totalOrders.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        {stats.totalLineItems.toLocaleString()} total item rows
                    </div>
                </div>

                <div style={{ background: 'hsl(var(--bg-card, #ffffff))', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted, #64748b))', textTransform: 'uppercase' }}>Total Revenue Value</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                            <ShieldCheck size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d' }}>
                        ₹{stats.totalRevenue.toLocaleString()}.00
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Cumulative sales recorded
                    </div>
                </div>

                <div style={{ background: 'hsl(var(--bg-card, #ffffff))', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted, #64748b))', textTransform: 'uppercase' }}>Stored Snapshots</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                            <Database size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'hsl(var(--text-main, #0f172a))' }}>
                        {backups.length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Ready for instant restore & download
                    </div>
                </div>

                <div style={{ background: 'hsl(var(--bg-card, #ffffff))', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted, #64748b))', textTransform: 'uppercase' }}>Last Backup Run</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                            <Clock size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--text-main, #0f172a))' }}>
                        {stats.lastBackup ? new Date(stats.lastBackup).toLocaleString() : 'No backups yet'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Database in sync
                    </div>
                </div>
            </div>

            {/* Backup Archives Table */}
            <div style={{
                background: 'hsl(var(--bg-card, #ffffff))',
                borderRadius: '16px',
                border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Available Order Backups</h2>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Download snapshots in SQL, JSON, or CSV spreadsheet formats</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0.75rem', background: '#f1f5f9', borderRadius: '20px', color: '#475569' }}>
                        {backups.length} Archives
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'hsl(var(--primary, #5d0821))' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Loading backup records...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                        <Database size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>No Order Backups Yet</h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.88rem' }}>
                            Click &quot;Create Backup Now&quot; above to create your first order archive snapshot.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                padding: '0.65rem 1.25rem', background: 'hsl(var(--primary, #5d0821))',
                                color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Create First Backup
                        </button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Archive / Filename</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>Format</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>Scope / Range</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>Orders Count</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>Total Value</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>File Size</th>
                                    <th style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>Created At</th>
                                    <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map((b) => {
                                    let formatBadgeBg = '#eff6ff';
                                    let formatBadgeColor = '#1d4ed8';
                                    let formatIcon = <FileCode size={14} />;

                                    if (b.format === 'CSV') {
                                        formatBadgeBg = '#f0fdf4';
                                        formatBadgeColor = '#15803d';
                                        formatIcon = <FileSpreadsheet size={14} />;
                                    } else if (b.format === 'SQL') {
                                        formatBadgeBg = '#faf5ff';
                                        formatBadgeColor = '#7e22ce';
                                        formatIcon = <Database size={14} />;
                                    }

                                    return (
                                        <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.filename}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>ID: {b.id}</div>
                                            </td>

                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                    background: formatBadgeBg, color: formatBadgeColor,
                                                    fontWeight: 800, fontSize: '0.76rem'
                                                }}>
                                                    {formatIcon} {b.format}
                                                </span>
                                            </td>

                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                                    {b.date_range_label || 'All Time'}
                                                </span>
                                            </td>

                                            <td style={{ padding: '1rem' }}>
                                                <strong style={{ color: '#0f172a' }}>{Number(b.total_orders || 0).toLocaleString()}</strong> orders
                                            </td>

                                            <td style={{ padding: '1rem', fontWeight: 700, color: '#16a34a' }}>
                                                ₹{Number(b.total_revenue || 0).toLocaleString()}.00
                                            </td>

                                            <td style={{ padding: '1rem', color: '#64748b' }}>
                                                {formatBytes(b.file_size_bytes)}
                                            </td>

                                            <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.82rem' }}>
                                                {new Date(b.created_at).toLocaleString()}
                                            </td>

                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                    <a
                                                        href={`/api/admin/orders/backup?id=${b.id}&download=1`}
                                                        download={b.filename}
                                                        title="Download File"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            padding: '0.45rem 0.85rem', background: '#0284c7',
                                                            color: '#fff', borderRadius: '8px', fontSize: '0.8rem',
                                                            fontWeight: 700, textDecoration: 'none', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Download size={14} /> Download
                                                    </a>

                                                    <button
                                                        onClick={() => handleViewPreview(b)}
                                                        title="Inspect Preview"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center',
                                                            padding: '0.45rem', background: '#f1f5f9',
                                                            border: '1px solid #e2e8f0', borderRadius: '8px',
                                                            color: '#475569', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Eye size={15} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteBackup(b.id)}
                                                        disabled={deletingId === b.id}
                                                        title="Delete Archive"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center',
                                                            padding: '0.45rem', background: '#fef2f2',
                                                            border: '1px solid #fee2e2', borderRadius: '8px',
                                                            color: '#dc2626', cursor: 'pointer'
                                                        }}
                                                    >
                                                        {deletingId === b.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               MODAL 1: CREATE BACKUP MODAL
               ═══════════════════════════════════════════════════════════════ */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '560px',
                        borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                                    Create Order Backup
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                    Select format and filters to extract orders into a secure snapshot.
                                </p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBackup}>
                            {/* Format Selector */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                    Export Format
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[
                                        { id: 'JSON', name: 'JSON (Full DB)', desc: 'Complete structure + restore ready', icon: <FileCode size={18} /> },
                                        { id: 'CSV', name: 'CSV (Excel)', desc: 'Formatted spreadsheet report', icon: <FileSpreadsheet size={18} /> },
                                        { id: 'SQL', name: 'SQL (Dump)', desc: 'MySQL raw INSERT statements', icon: <Database size={18} /> }
                                    ].map((f) => (
                                        <div
                                            key={f.id}
                                            onClick={() => setFormat(f.id)}
                                            style={{
                                                padding: '0.85rem', borderRadius: '12px',
                                                border: `2px solid ${format === f.id ? 'hsl(var(--primary, #5d0821))' : '#e2e8f0'}`,
                                                background: format === f.id ? 'rgba(93, 8, 33, 0.04)' : '#ffffff',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ color: format === f.id ? 'hsl(var(--primary, #5d0821))' : '#64748b', marginBottom: '4px' }}>
                                                {f.icon}
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{f.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{f.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Selector */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                    Date Range
                                </label>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.8rem', borderRadius: '10px',
                                        border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                                    }}
                                >
                                    <option value="all">All Time (Full Database)</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="this_month">This Month</option>
                                    <option value="custom">Custom Date Range...</option>
                                </select>
                            </div>

                            {/* Custom Date Inputs */}
                            {dateRange === 'custom' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Status Filters */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Order Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
                                    >
                                        <option value="ALL">All Order Statuses</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="SHIPPED">Shipped</option>
                                        <option value="DELIVERED">Delivered</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Status</label>
                                    <select
                                        value={paymentStatusFilter}
                                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
                                    >
                                        <option value="ALL">All Payment Statuses</option>
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Archive Notes */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes / Tag (Optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Pre-festive audit backup"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
                                />
                            </div>

                            {/* Submit CTAs */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: '0.75rem 1.25rem', background: '#f1f5f9',
                                        border: 'none', borderRadius: '10px', fontWeight: 700,
                                        color: '#475569', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    style={{
                                        padding: '0.75rem 1.5rem', background: 'hsl(var(--primary, #5d0821))',
                                        color: '#ffffff', border: 'none', borderRadius: '10px',
                                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    {generating ? (
                                        <><Loader2 size={16} className="animate-spin" /> Generating Archive...</>
                                    ) : (
                                        <><Download size={16} /> Generate & Download</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               MODAL 2: RESTORE BACKUP MODAL
               ═══════════════════════════════════════════════════════════════ */}
            {showRestoreModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '540px',
                        borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                                    Restore Orders from Backup
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                    Import orders and line items from a JSON backup file.
                                </p>
                            </div>
                            <button onClick={() => setShowRestoreModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* File Upload Drop Area */}
                        <div style={{
                            border: '2px dashed #cbd5e1', borderRadius: '14px',
                            padding: '2rem', textAlign: 'center', marginBottom: '1.5rem',
                            background: '#f8fafc', cursor: 'pointer'
                        }}>
                            <UploadCloud size={36} color="#0284c7" style={{ margin: '0 auto 0.75rem' }} />
                            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                                {restoreFile ? restoreFile.name : 'Choose or drop JSON backup file'}
                            </p>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Only structured .json backup files are supported</span>
                            <input
                                type="file"
                                accept=".json,application/json"
                                onChange={handleFileChange}
                                style={{ display: 'block', margin: '1rem auto 0', fontSize: '0.82rem' }}
                            />
                        </div>

                        {/* Restore Verification Preview */}
                        {restorePreview && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem', marginBottom: '4px' }}>
                                    ✓ Backup Verified & Ready
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
                                    • Store: <strong>{restorePreview.store}</strong><br />
                                    • Orders in Archive: <strong>{restorePreview.ordersCount} orders</strong><br />
                                    • Created At: <strong>{new Date(restorePreview.date).toLocaleString()}</strong>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowRestoreModal(false)}
                                style={{ padding: '0.75rem 1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteRestore}
                                disabled={!restorePreview || restoring}
                                style={{
                                    padding: '0.75rem 1.5rem', background: '#0284c7',
                                    color: '#ffffff', border: 'none', borderRadius: '10px',
                                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                    opacity: !restorePreview || restoring ? 0.6 : 1
                                }}
                            >
                                {restoring ? <><Loader2 size={16} className="animate-spin" /> Restoring...</> : <>Execute Restore</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               MODAL 3: PREVIEW ARCHIVE MODAL
               ═══════════════════════════════════════════════════════════════ */}
            {showPreviewModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '850px',
                        borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        maxHeight: '85vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                {previewTitle}
                            </h3>
                            <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{
                            flex: 1, background: '#0f172a', color: '#38bdf8',
                            borderRadius: '12px', padding: '1.25rem', overflow: 'auto',
                            fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.5,
                            whiteSpace: 'pre'
                        }}>
                            {previewContent}
                        </div>

                        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
