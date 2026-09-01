'use client';

import { useState, useEffect, useRef } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { ORDER_EMAIL_STATUSES } from '@/lib/orderEmailTemplates';
import styles from './email-simulator.module.css';
import {
    Mail, Send, Eye, Smartphone, Monitor, Code, Copy,
    CheckCircle2, AlertCircle, Loader2, RefreshCw, Paperclip,
    ExternalLink, Sparkles, ShoppingBag, Truck, CreditCard, RotateCcw
} from 'lucide-react';

export default function EmailSimulatorPage() {
    const [selectedStatus, setSelectedStatus] = useState('PLACED');
    const [selectedOrderId, setSelectedOrderId] = useState('DEMO');
    const [recentOrders, setRecentOrders] = useState([]);
    const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile' | 'code'
    const [customNotes, setCustomNotes] = useState('');
    const [attachPdf, setAttachPdf] = useState(true);

    // Live preview state
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewSubject, setPreviewSubject] = useState('');
    const [previewLoading, setPreviewLoading] = useState(true);

    // Test send state
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [copiedSubject, setCopiedSubject] = useState(false);
    const [copiedHtml, setCopiedHtml] = useState(false);

    // Fetch recent orders for real-order simulation
    useEffect(() => {
        async function loadStoreOrders() {
            try {
                const { data } = await mysqlClient
                    .from('orders')
                    .select('id, invoice_no, customer_name, total_amount, status, created_at')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (data) setRecentOrders(data);
            } catch (err) {
                console.error('Failed to load recent orders for simulator:', err);
            }
        }

        async function loadStoreEmail() {
            try {
                const { data } = await mysqlClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'shop_email')
                    .maybeSingle();

                if (data?.value) {
                    setRecipientEmail(data.value);
                } else {
                    setRecipientEmail('vaiyaaree@gmail.com');
                }
            } catch (e) {
                setRecipientEmail('vaiyaaree@gmail.com');
            }
        }

        loadStoreOrders();
        loadStoreEmail();
    }, []);

    // Generate Preview on status / orderId / customNotes change
    useEffect(() => {
        let isMounted = true;

        async function fetchPreview() {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/admin/emails/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: selectedStatus,
                        orderId: selectedOrderId,
                        customNotes
                    })
                });

                const data = await res.json();
                if (isMounted && data.success) {
                    setPreviewHtml(data.html);
                    setPreviewSubject(data.subject);
                }
            } catch (err) {
                console.error('Error loading email preview:', err);
            } finally {
                if (isMounted) setPreviewLoading(false);
            }
        }

        fetchPreview();

        return () => { isMounted = false; };
    }, [selectedStatus, selectedOrderId, customNotes]);

    const handleSendTestEmail = async (e) => {
        e.preventDefault();
        if (!recipientEmail || !recipientEmail.trim() || sendingTest) return;

        setSendingTest(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/admin/emails/send-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail: recipientEmail.trim(),
                    status: selectedStatus,
                    orderId: selectedOrderId,
                    customNotes,
                    attachPdf
                })
            });

            const data = await res.json();
            if (data.success) {
                setTestResult({
                    type: 'success',
                    message: data.message || `Test email sent successfully to ${recipientEmail}!`,
                    attachedPdf: data.attachedPdf
                });
            } else {
                setTestResult({
                    type: 'error',
                    message: data.error || 'Failed to dispatch test email.'
                });
            }
        } catch (err) {
            setTestResult({
                type: 'error',
                message: err.message || 'Network error while sending test email.'
            });
        } finally {
            setSendingTest(false);
        }
    };

    const handleCopySubject = () => {
        if (!previewSubject) return;
        navigator.clipboard.writeText(previewSubject);
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
    };

    const handleCopyHtml = () => {
        if (!previewHtml) return;
        navigator.clipboard.writeText(previewHtml);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.headerRow}>
                <div className={styles.titleArea}>
                    <h1>
                        <Mail color="#5d0821" size={28} />
                        Order Email Simulator & Templates
                    </h1>
                    <p>
                        Preview, test, and verify customer transactional emails across all 9 order lifecycle stages with auto-attached PDF invoices.
                    </p>
                </div>
            </div>

            {/* 9 Status Pills Navigation */}
            <div className={styles.statusScroll}>
                {ORDER_EMAIL_STATUSES.map(item => {
                    const isActive = selectedStatus === item.key;
                    return (
                        <button
                            key={item.key}
                            className={`${styles.statusTab} ${isActive ? styles.statusTabActive : ''}`}
                            onClick={() => setSelectedStatus(item.key)}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Grid: Controls vs Live Preview */}
            <div className={styles.mainGrid}>
                {/* Left Sidebar: Controls & Test Dispatch */}
                <div className={styles.controlCard}>
                    <h3 className={styles.sectionHeader}>
                        <Sparkles size={18} color="#5d0821" /> Simulation Settings
                    </h3>

                    {/* Order Data Source */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Order Data Source</label>
                        <select
                            className={styles.selectInput}
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                        >
                            <option value="DEMO">🌟 Demo Saree Order (Kanjivaram Silk + South Cotton)</option>
                            {recentOrders.map(o => (
                                <option key={o.id} value={o.id}>
                                    📦 #{o.invoice_no || o.id} — {o.customer_name || 'Customer'} (₹{Number(o.total_amount || 0).toLocaleString('en-IN')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Select */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Target Email Status</label>
                        <select
                            className={styles.selectInput}
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            {ORDER_EMAIL_STATUSES.map(s => (
                                <option key={s.key} value={s.key}>
                                    {s.icon} {s.key} — {s.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Admin Note */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Optional Admin Notice / Message</label>
                        <textarea
                            className={styles.textareaInput}
                            rows={3}
                            placeholder="e.g. Free matching silk mask included with your package!"
                            value={customNotes}
                            onChange={(e) => setCustomNotes(e.target.value)}
                        />
                    </div>

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />

                    {/* Send Real Test Email (WooCommerce style) */}
                    <h3 className={styles.sectionHeader}>
                        <Send size={18} color="#5d0821" /> Send Test Email
                    </h3>

                    <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Recipient Email Address</label>
                            <input
                                type="email"
                                required
                                className={styles.textInput}
                                placeholder="name@example.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                            />
                        </div>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={attachPdf}
                                onChange={(e) => setAttachPdf(e.target.checked)}
                            />
                            <span>
                                <Paperclip size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Attach Tax Invoice PDF in email
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={sendingTest || !recipientEmail}
                            className={styles.sendBtn}
                        >
                            {sendingTest ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> Dispatching Test Email...
                                </>
                            ) : (
                                <>
                                    <Send size={18} /> Send Simulation Test Email
                                </>
                            )}
                        </button>
                    </form>

                    {/* Feedback Alert */}
                    {testResult && (
                        <div className={`${styles.alertBox} ${testResult.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                            {testResult.type === 'success' ? (
                                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            ) : (
                                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            )}
                            <div>
                                <div>{testResult.message}</div>
                                {testResult.attachedPdf && (
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
                                        📄 Tax Invoice PDF was attached.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Preview Card */}
                <div className={styles.previewCard}>
                    {/* Toolbar */}
                    <div className={styles.previewToolbar}>
                        {/* Subject Preview */}
                        <div className={styles.subjectPill} title="Email Subject Line">
                            <span style={{ fontWeight: 800, color: '#5d0821', fontSize: '0.78rem', textTransform: 'uppercase' }}>Subject:</span>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {previewSubject || 'Loading subject...'}
                            </span>
                            <button
                                onClick={handleCopySubject}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}
                                title="Copy Subject"
                            >
                                {copiedSubject ? <CheckCircle2 size={15} color="#16a34a" /> : <Copy size={15} />}
                            </button>
                        </div>

                        {/* View Mode Switcher */}
                        <div className={styles.viewModeToggle}>
                            <button
                                className={`${styles.viewModeBtn} ${viewMode === 'desktop' ? styles.viewModeBtnActive : ''}`}
                                onClick={() => setViewMode('desktop')}
                            >
                                <Monitor size={15} /> Desktop
                            </button>
                            <button
                                className={`${styles.viewModeBtn} ${viewMode === 'mobile' ? styles.viewModeBtnActive : ''}`}
                                onClick={() => setViewMode('mobile')}
                            >
                                <Smartphone size={15} /> Mobile (375px)
                            </button>
                            <button
                                className={`${styles.viewModeBtn} ${viewMode === 'code' ? styles.viewModeBtnActive : ''}`}
                                onClick={() => setViewMode('code')}
                            >
                                <Code size={15} /> HTML Code
                            </button>
                        </div>
                    </div>

                    {/* Preview Content */}
                    <div className={styles.iframeWrapper}>
                        {previewLoading ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#5d0821' }} />
                                <div style={{ fontWeight: 700 }}>Rendering HTML Email Template...</div>
                            </div>
                        ) : viewMode === 'code' ? (
                            <div style={{ width: '100%', maxWidth: '850px', background: '#0f172a', borderRadius: '12px', padding: '1.5rem', color: '#e2e8f0', position: 'relative' }}>
                                <button
                                    onClick={handleCopyHtml}
                                    style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        background: '#334155',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    {copiedHtml ? <CheckCircle2 size={14} color="#4ade80" /> : <Copy size={14} />}
                                    {copiedHtml ? 'Copied HTML!' : 'Copy Code'}
                                </button>
                                <pre style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '700px', overflowY: 'auto' }}>
                                    {previewHtml}
                                </pre>
                            </div>
                        ) : (
                            <iframe
                                srcDoc={previewHtml}
                                title="Order Status Email Preview"
                                className={styles.previewFrame}
                                style={{
                                    width: viewMode === 'mobile' ? '375px' : '650px'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
