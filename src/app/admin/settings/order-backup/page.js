'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Download, Database, Calendar, FileSpreadsheet, FileCode, FileText, 
    RefreshCw, Trash2, Clock, ShieldCheck, CheckCircle2, AlertCircle, 
    UploadCloud, SlidersHorizontal, Layers, Eye, X, Loader2, ArrowLeft,
    Check, PlayCircle, Settings, Mail, Send, Bell, Sparkles, CheckCheck
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
        autoBackupConfig: { enabled: false, frequency: 'daily', format: 'JSON', recipient_emails: '', scope: 'all' },
        orderNotificationConfig: { enabled: true, recipient_emails: '', send_pdf_invoice: true }
    });

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [emailingBackup, setEmailingBackup] = useState(false);
    const [savingAutoConfig, setSavingAutoConfig] = useState(false);
    const [savingNotifConfig, setSavingNotifConfig] = useState(false);
    const [testingNotif, setTestingNotif] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    // Active Settings Form States
    const [autoConfig, setAutoConfig] = useState({
        enabled: false,
        frequency: 'daily',
        format: 'JSON',
        recipient_emails: '',
        scope: 'all'
    });

    const [notifConfig, setNotifConfig] = useState({
        enabled: true,
        recipient_emails: '',
        send_pdf_invoice: true
    });

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
    const [sendEmailCopy, setSendEmailCopy] = useState(false);
    const [emailCopyAddress, setEmailCopyAddress] = useState('');

    // Restore & Preview State
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreFile, setRestoreFile] = useState(null);
    const [restorePreview, setRestorePreview] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    // Quick Email Send Modal for existing archive
    const [emailArchiveModal, setEmailArchiveModal] = useState(null);
    const [archiveRecipientEmail, setArchiveRecipientEmail] = useState('');
    const [sendingArchiveEmail, setSendingArchiveEmail] = useState(false);

    const fetchBackupsAndStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/orders/backup');
            const data = await res.json();
            if (res.ok && data.success) {
                setBackups(data.backups || []);
                setStats(data.stats || {});
                if (data.stats?.autoBackupConfig) {
                    setAutoConfig(prev => ({ ...prev, ...data.stats.autoBackupConfig }));
                }
                if (data.stats?.orderNotificationConfig) {
                    setNotifConfig(prev => ({ ...prev, ...data.stats.orderNotificationConfig }));
                }
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

    // ── Save Automated Backup Settings ───────────────────────────────────────
    const handleSaveAutoConfig = async (e) => {
        if (e) e.preventDefault();
        setSavingAutoConfig(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save-auto-backup-config',
                    autoBackupConfig: autoConfig
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Automated backup settings saved successfully!' });
                fetchBackupsAndStats();
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to save settings' });
            }
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Connection error while saving settings' });
        } finally {
            setSavingAutoConfig(false);
        }
    };

    // ── Send Backup to Email Now (Test/Instant Trigger) ───────────────────────
    const handleSendBackupToEmailNow = async () => {
        const emails = autoConfig.recipient_emails?.trim();
        if (!emails) {
            setAlertMsg({ type: 'error', text: 'Please enter at least one recipient email in the configuration below.' });
            return;
        }

        setEmailingBackup(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'email-backup',
                    format: autoConfig.format || 'JSON',
                    dateRange: autoConfig.scope || 'all',
                    recipientEmails: emails,
                    autoBackupConfig: autoConfig
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Backup generated and emailed successfully!' });
                fetchBackupsAndStats();
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to email backup' });
            }
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Connection error while emailing backup' });
        } finally {
            setEmailingBackup(false);
        }
    };

    // ── Save New Order Email Notification Settings ───────────────────────────
    const handleSaveNotifConfig = async (e) => {
        if (e) e.preventDefault();
        setSavingNotifConfig(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save-order-notification-config',
                    orderNotificationConfig: notifConfig
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Order notification settings saved successfully!' });
                fetchBackupsAndStats();
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to save notification settings' });
            }
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Connection error while saving notification settings' });
        } finally {
            setSavingNotifConfig(false);
        }
    };

    // ── Test New Order Alert Email ───────────────────────────────────────────
    const handleTestNotificationEmail = async () => {
        const emails = notifConfig.recipient_emails?.trim();
        if (!emails) {
            setAlertMsg({ type: 'error', text: 'Please enter at least one recipient email to test.' });
            return;
        }

        setTestingNotif(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/orders/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test-order-notification-email',
                    recipientEmails: emails,
                    orderNotificationConfig: notifConfig
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMsg({ type: 'success', text: data.message || 'Test notification email sent successfully!' });
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to send test email' });
            }
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Connection error while sending test email' });
        } finally {
            setTestingNotif(false);
        }
    };

    // ── Manual Create Backup ─────────────────────────────────────────────────
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
                    notes,
                    recipientEmails: sendEmailCopy ? emailCopyAddress : undefined
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

    // ── Delete Backup ────────────────────────────────────────────────────────
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

    // ── Preview Archive ──────────────────────────────────────────────────────
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

    // ── Restore File Selection & Parsing ─────────────────────────────────────
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
                alert('Invalid JSON file. Please ensure you upload a valid Vaiyaaree JSON backup.');
                setRestoreFile(null);
                setRestorePreview(null);
            }
        };
        reader.readAsText(file);
    };

    // ── Execute Restore ──────────────────────────────────────────────────────
    const handleExecuteRestore = async () => {
        if (!restorePreview || !restorePreview.data) {
            alert('No valid backup file loaded.');
            return;
        }

        if (!confirm(`Warning: This will restore ${restorePreview.ordersCount} orders into your database. Existing matching records will be safely updated. Do you want to proceed?`)) {
            return;
        }

        setRestoring(true);
        setAlertMsg({ type: '', text: '' });

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
                setAlertMsg({ type: 'success', text: data.message || 'Database restored successfully!' });
                setShowRestoreModal(false);
                setRestoreFile(null);
                setRestorePreview(null);
                fetchBackupsAndStats();
            } else {
                setAlertMsg({ type: 'error', text: data.error || 'Failed to restore backup' });
            }
        } catch (err) {
            console.error('Restore error:', err);
            setAlertMsg({ type: 'error', text: 'Error executing restore operation' });
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: '#1e293b' }}>
            
            {/* ── TOP HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>
                        <Link href="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>Admin</Link>
                        <span>/</span>
                        <Link href="/admin/orders" style={{ color: 'inherit', textDecoration: 'none' }}>Orders</Link>
                        <span>/</span>
                        <span style={{ color: '#5d0821', fontWeight: 700 }}>Order Backup & Automation</span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Database size={28} color="#5d0821" />
                        Order Backup & Email Automation
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                        Configure scheduled automated backups, real-time new order email notifications, and download historical archives.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={fetchBackupsAndStats}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.65rem 1rem', background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                            cursor: 'pointer', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
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
                        Restore Archive
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.65rem 1.25rem', background: '#5d0821',
                            color: '#ffffff', border: 'none', borderRadius: '10px',
                            fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(93, 8, 33, 0.25)'
                        }}
                    >
                        <Database size={16} />
                        Create Manual Backup
                    </button>
                </div>
            </div>

            {/* ── ALERT NOTIFICATION ── */}
            {alertMsg.text && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem', borderRadius: '12px', marginBottom: '1.75rem',
                    background: alertMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${alertMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: alertMsg.type === 'success' ? '#15803d' : '#b91c1c',
                    fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
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

            {/* ── KPI METRICS CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Orders</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                            <Layers size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                        {stats.totalOrders.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        {stats.totalLineItems.toLocaleString()} total item lines recorded
                    </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Revenue Value</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                            <ShieldCheck size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d' }}>
                        ₹{stats.totalRevenue.toLocaleString()}.00
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Cumulative revenue captured
                    </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-Backup Status</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: autoConfig.enabled ? '#ecfdf5' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: autoConfig.enabled ? '#059669' : '#94a3b8' }}>
                            <Clock size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: autoConfig.enabled ? '#059669' : '#64748b' }}>
                        {autoConfig.enabled ? `Active (${autoConfig.frequency.toUpperCase()})` : 'Disabled'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        {autoConfig.recipient_emails ? `Sending to: ${autoConfig.recipient_emails.split(',')[0]}` : 'No email configured'}
                    </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Order Alerts</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: notifConfig.enabled ? '#fdf2f8' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: notifConfig.enabled ? '#db2777' : '#94a3b8' }}>
                            <Bell size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: notifConfig.enabled ? '#db2777' : '#64748b' }}>
                        {notifConfig.enabled ? 'Real-Time Active' : 'Muted'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        {notifConfig.recipient_emails ? `Alerts to ${notifConfig.recipient_emails.split(',').length} email(s)` : 'Default admin email'}
                    </div>
                </div>
            </div>

            {/* ── DUAL CONFIGURATION CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                
                {/* 1. AUTOMATIC BACKUP CONFIGURATION CARD */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#5d0821', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                                <Clock size={18} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                    Automatic Backup & Email Schedule
                                </h2>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                                    Automatically export database orders and email snapshots on a recurring schedule.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveAutoConfig} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                        {/* Enable Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Enable Automated Scheduled Backups</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>When enabled, system generates order dumps and emails them automatically.</div>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={autoConfig.enabled}
                                    onChange={(e) => setAutoConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: autoConfig.enabled ? '#5d0821' : '#cbd5e1',
                                    borderRadius: '34px', transition: '.3s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: autoConfig.enabled ? '25px' : '4px', bottom: '4px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.3s'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Frequency & Format Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Backup Frequency
                                </label>
                                <select
                                    value={autoConfig.frequency}
                                    onChange={(e) => setAutoConfig(prev => ({ ...prev, frequency: e.target.value }))}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
                                >
                                    <option value="daily">Daily (Every 24 Hours)</option>
                                    <option value="weekly">Weekly (Every Sunday)</option>
                                    <option value="monthly">Monthly (1st of each Month)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    File Format
                                </label>
                                <select
                                    value={autoConfig.format}
                                    onChange={(e) => setAutoConfig(prev => ({ ...prev, format: e.target.value }))}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
                                >
                                    <option value="JSON">JSON (Full Data Structure)</option>
                                    <option value="CSV">CSV Spreadsheet (Excel / Google Sheets)</option>
                                    <option value="SQL">SQL Dump (Database Script)</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Scope */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Data Scope (Orders to Include)
                            </label>
                            <select
                                value={autoConfig.scope}
                                onChange={(e) => setAutoConfig(prev => ({ ...prev, scope: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
                            >
                                <option value="all">All Orders (Full Database Archive)</option>
                                <option value="today">Last 24 Hours Only</option>
                                <option value="7days">Last 7 Days Orders</option>
                                <option value="30days">Last 30 Days Orders</option>
                                <option value="this_month">Current Month Orders</option>
                            </select>
                        </div>

                        {/* Recipient Emails */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Destination Recipient Email(s)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. admin@vaiyaaree.com, backups@vaiyaaree.com"
                                value={autoConfig.recipient_emails}
                                onChange={(e) => setAutoConfig(prev => ({ ...prev, recipient_emails: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                            />
                            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                Multiple emails can be added separated by commas.
                            </span>
                        </div>

                        {/* Last Run Info */}
                        {autoConfig.last_run && (
                            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={15} />
                                <span>Last sent on: <strong>{new Date(autoConfig.last_run).toLocaleString()}</strong> to {autoConfig.last_email_sent_to}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
                            <button
                                type="submit"
                                disabled={savingAutoConfig}
                                style={{
                                    flex: 1, padding: '0.75rem 1.25rem', background: '#5d0821', color: '#ffffff',
                                    border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                {savingAutoConfig ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Auto-Backup Settings
                            </button>

                            <button
                                type="button"
                                onClick={handleSendBackupToEmailNow}
                                disabled={emailingBackup}
                                title="Instantly generate and email current backup snapshot"
                                style={{
                                    padding: '0.75rem 1.2rem', background: '#f8fafc', color: '#0f172a',
                                    border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {emailingBackup ? <Loader2 size={16} className="animate-spin" color="#5d0821" /> : <Send size={16} color="#5d0821" />}
                                Send Backup to Email Now
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. REAL-TIME NEW ORDER NOTIFICATION CARD */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#be123c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                                <Bell size={18} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                    Instant New Order Email Alerts
                                </h2>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                                    Send order details, customer info, and PDF invoices immediately when an order is created.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveNotifConfig} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                        {/* Enable Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Enable Instant Order Alerts</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Deliver an immediate order summary email whenever a customer checks out.</div>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={notifConfig.enabled}
                                    onChange={(e) => setNotifConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: notifConfig.enabled ? '#be123c' : '#cbd5e1',
                                    borderRadius: '34px', transition: '.3s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: notifConfig.enabled ? '25px' : '4px', bottom: '4px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.3s'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Recipient Emails */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Notification Recipient Email(s)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. orders@vaiyaaree.com, storemanager@vaiyaaree.com"
                                value={notifConfig.recipient_emails}
                                onChange={(e) => setNotifConfig(prev => ({ ...prev, recipient_emails: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                            />
                            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                When left blank, alerts are sent to the default Admin email. Separate multiple emails with commas.
                            </span>
                        </div>

                        {/* Attach PDF Invoice Checkbox */}
                        <div style={{ background: '#fdf2f8', padding: '0.85rem 1.1rem', borderRadius: '10px', border: '1px solid #fce7f3' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#831843' }}>
                                <input
                                    type="checkbox"
                                    checked={notifConfig.send_pdf_invoice}
                                    onChange={(e) => setNotifConfig(prev => ({ ...prev, send_pdf_invoice: e.target.checked }))}
                                    style={{ width: '16px', height: '16px', accentColor: '#be123c' }}
                                />
                                Automatically Attach Official Tax Invoice (PDF) with Alert
                            </label>
                            <span style={{ fontSize: '0.74rem', color: '#9d174d', display: 'block', marginLeft: '26px', marginTop: '2px' }}>
                                Generates a PDF invoice branded with GST & HSN codes and attaches it directly to the alert.
                            </span>
                        </div>

                        {/* Live Feature Highlights */}
                        <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Every New Order Alert Contains:</div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.5' }}>
                                <li>Complete customer details (Name, Verified Phone, Shipping & Billing Address)</li>
                                <li>Itemized list with saree titles, variants, quantities, and prices</li>
                                <li>Order Subtotal, GST calculation, discounts applied, and payment mode</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
                            <button
                                type="submit"
                                disabled={savingNotifConfig}
                                style={{
                                    flex: 1, padding: '0.75rem 1.25rem', background: '#be123c', color: '#ffffff',
                                    border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                {savingNotifConfig ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Notification Settings
                            </button>

                            <button
                                type="button"
                                onClick={handleTestNotificationEmail}
                                disabled={testingNotif}
                                title="Send a verification test order alert email"
                                style={{
                                    padding: '0.75rem 1.2rem', background: '#f8fafc', color: '#0f172a',
                                    border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {testingNotif ? <Loader2 size={16} className="animate-spin" color="#be123c" /> : <Mail size={16} color="#be123c" />}
                                Test Alert Email
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── BACKUP ARCHIVES TABLE ── */}
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Available Order Backups</h2>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Download snapshots in SQL, JSON, or CSV spreadsheet formats, or email directly.</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0.75rem', background: '#f1f5f9', borderRadius: '20px', color: '#475569' }}>
                        {backups.length} Saved Snapshots
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#5d0821' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Loading backup records...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                        <Database size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>No Order Backups Yet</h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.88rem' }}>
                            Click &quot;Create Manual Backup&quot; above to create your first order archive snapshot.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                padding: '0.65rem 1.25rem', background: '#5d0821',
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
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>ID: {b.id}</div>
                                                {b.notes && (
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', fontStyle: 'italic' }}>
                                                        {b.notes}
                                                    </div>
                                                )}
                                            </td>

                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                    background: formatBadgeBg, color: formatBadgeColor,
                                                    fontWeight: 700, fontSize: '0.78rem'
                                                }}>
                                                    {formatIcon}
                                                    {b.format}
                                                </span>
                                            </td>

                                            <td style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>
                                                {b.date_range_label || 'All Orders'}
                                            </td>

                                            <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                                {Number(b.total_orders || 0).toLocaleString()}
                                            </td>

                                            <td style={{ padding: '1rem', fontWeight: 700, color: '#15803d' }}>
                                                ₹{Number(b.total_revenue || 0).toLocaleString()}.00
                                            </td>

                                            <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.82rem' }}>
                                                {b.file_size_bytes ? `${(b.file_size_bytes / 1024).toFixed(2)} KB` : 'N/A'}
                                            </td>

                                            <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.82rem' }}>
                                                {new Date(b.created_at).toLocaleString()}
                                            </td>

                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                    <a
                                                        href={`/api/admin/orders/backup?id=${b.id}&download=1`}
                                                        download={b.filename}
                                                        title="Download file"
                                                        style={{
                                                            padding: '0.45rem', borderRadius: '8px',
                                                            background: '#eff6ff', color: '#2563eb',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            textDecoration: 'none', border: '1px solid #bfdbfe'
                                                        }}
                                                    >
                                                        <Download size={15} />
                                                    </a>

                                                    <button
                                                        onClick={() => {
                                                            setEmailArchiveModal(b);
                                                            setArchiveRecipientEmail(autoConfig.recipient_emails || notifConfig.recipient_emails || '');
                                                        }}
                                                        title="Email this backup snapshot"
                                                        style={{
                                                            padding: '0.45rem', borderRadius: '8px',
                                                            background: '#fdf2f8', color: '#db2777',
                                                            border: '1px solid #fbcfe8', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Mail size={15} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleViewPreview(b)}
                                                        title="Preview content"
                                                        style={{
                                                            padding: '0.45rem', borderRadius: '8px',
                                                            background: '#f8fafc', color: '#475569',
                                                            border: '1px solid #cbd5e1', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Eye size={15} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteBackup(b.id)}
                                                        disabled={deletingId === b.id}
                                                        title="Delete backup archive"
                                                        style={{
                                                            padding: '0.45rem', borderRadius: '8px',
                                                            background: '#fef2f2', color: '#dc2626',
                                                            border: '1px solid #fecaca', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
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

            {/* ── CREATE BACKUP MODAL ── */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#5d0821', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                                    <Database size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Create Order Backup</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure export options and generate snapshot</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBackup} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Format Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    Export Format
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {[
                                        { id: 'JSON', label: 'JSON Data', desc: 'Best for Restore' },
                                        { id: 'CSV', label: 'CSV Excel', desc: 'Spreadsheet Sheet' },
                                        { id: 'SQL', label: 'SQL Script', desc: 'DB Raw Dump' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setFormat(f.id)}
                                            style={{
                                                padding: '0.85rem', borderRadius: '10px',
                                                border: `2px solid ${format === f.id ? '#5d0821' : '#e2e8f0'}`,
                                                background: format === f.id ? '#fdf2f8' : '#ffffff',
                                                color: format === f.id ? '#5d0821' : '#475569',
                                                fontWeight: 700, cursor: 'pointer', textAlign: 'center'
                                            }}
                                        >
                                            <div style={{ fontSize: '0.9rem' }}>{f.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>{f.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Date Range Filter
                                </label>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                >
                                    <option value="all">All Time (All Historical Orders)</option>
                                    <option value="today">Today Only</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="this_month">Current Calendar Month</option>
                                    <option value="custom">Custom Date Range...</option>
                                </select>
                            </div>

                            {dateRange === 'custom' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Filters Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Order Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="CONFIRMED">Confirmed</option>
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
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                    >
                                        <option value="ALL">All Payment</option>
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING">Pending (COD)</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Source</label>
                                    <select
                                        value={sourceFilter}
                                        onChange={(e) => setSourceFilter(e.target.value)}
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                    >
                                        <option value="ALL">All Sources</option>
                                        <option value="WEBSITE">Website Store</option>
                                        <option value="MANUAL">Manual / WhatsApp</option>
                                    </select>
                                </div>
                            </div>

                            {/* Also send email copy */}
                            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                                    <input
                                        type="checkbox"
                                        checked={sendEmailCopy}
                                        onChange={(e) => {
                                            setSendEmailCopy(e.target.checked);
                                            if (e.target.checked && !emailCopyAddress) {
                                                setEmailCopyAddress(autoConfig.recipient_emails || notifConfig.recipient_emails || '');
                                            }
                                        }}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    Also send a copy of this backup to email address(es)
                                </label>
                                {sendEmailCopy && (
                                    <input
                                        type="text"
                                        placeholder="Enter recipient email(s)"
                                        value={emailCopyAddress}
                                        onChange={(e) => setEmailCopyAddress(e.target.value)}
                                        style={{ width: '100%', marginTop: '8px', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                                    />
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    style={{
                                        padding: '0.65rem 1.5rem', background: '#5d0821', color: '#ffffff',
                                        border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    Generate & Download
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── RESTORE MODAL ── */}
            {showRestoreModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '580px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                                    <UploadCloud size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Restore Order Backup</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Import orders from a Vaiyaaree JSON backup file</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRestoreModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                                <UploadCloud size={40} style={{ color: '#0284c7', margin: '0 auto 0.75rem' }} />
                                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Select Vaiyaaree JSON Backup File</h4>
                                <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>Only official Vaiyaaree JSON backup archives are supported</p>
                                <label style={{
                                    display: 'inline-block', padding: '0.65rem 1.25rem', background: '#0284c7', color: '#ffffff',
                                    borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer'
                                }}>
                                    Choose File
                                    <input type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                                {restoreFile && (
                                    <div style={{ marginTop: '1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
                                        Selected: {restoreFile.name}
                                    </div>
                                )}
                            </div>

                            {restorePreview && (
                                <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.88rem', marginBottom: '6px' }}>
                                        ✅ Valid Backup Detected
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                                        <div><strong>Orders to restore:</strong> {restorePreview.ordersCount}</div>
                                        <div><strong>Generated on:</strong> {new Date(restorePreview.date).toLocaleString()}</div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => setShowRestoreModal(false)}
                                    style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteRestore}
                                    disabled={!restorePreview || restoring}
                                    style={{
                                        padding: '0.65rem 1.5rem', background: '#0284c7', color: '#ffffff',
                                        border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                        opacity: (!restorePreview || restoring) ? 0.6 : 1,
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {restoring ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    Execute Safe Restore
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EMAIL ARCHIVE MODAL ── */}
            {emailArchiveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '500px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Mail size={20} color="#5d0821" /> Email Backup Archive
                            </h3>
                            <button onClick={() => setEmailArchiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
                            Send <strong>{emailArchiveModal.filename}</strong> ({emailArchiveModal.total_orders} orders) as an email attachment.
                        </p>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Recipient Email Address(es)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. admin@vaiyaaree.com, backups@vaiyaaree.com"
                                value={archiveRecipientEmail}
                                onChange={(e) => setArchiveRecipientEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setEmailArchiveModal(null)}
                                style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!archiveRecipientEmail.trim()) {
                                        alert('Please enter at least one recipient email address.');
                                        return;
                                    }
                                    setSendingArchiveEmail(true);
                                    try {
                                        const res = await fetch('/api/admin/orders/backup', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                action: 'email-backup',
                                                format: emailArchiveModal.format,
                                                recipientEmails: archiveRecipientEmail,
                                                notes: `Archive forward: ${emailArchiveModal.id}`
                                            })
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.success) {
                                            setAlertMsg({ type: 'success', text: data.message || 'Backup archive emailed successfully!' });
                                            setEmailArchiveModal(null);
                                        } else {
                                            alert(data.error || 'Failed to send email');
                                        }
                                    } catch (e) {
                                        alert('Error sending email');
                                    } finally {
                                        setSendingArchiveEmail(false);
                                    }
                                }}
                                disabled={sendingArchiveEmail}
                                style={{
                                    padding: '0.65rem 1.5rem', background: '#5d0821', color: '#ffffff',
                                    border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {sendingArchiveEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PREVIEW MODAL ── */}
            {showPreviewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '800px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{previewTitle}</div>
                            <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#0f172a', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {previewContent}
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                style={{ padding: '0.65rem 1.25rem', background: '#5d0821', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
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
