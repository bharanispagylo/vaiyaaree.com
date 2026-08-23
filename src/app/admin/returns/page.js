'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ModalPortal from '@/components/ModalPortal';
import {
    ArrowLeft, RefreshCcw, Clock, CheckCircle, XCircle, AlertCircle,
    Package, User, Phone, Calendar, Search, ChevronDown, ChevronUp,
    MessageSquare, ExternalLink, RotateCcw, IndianRupee, TrendingUp,
    ChevronLeft, ChevronRight, Truck, Eye, X, Check, Camera, ClipboardCheck,
    ShieldAlert, AlertTriangle, Send, MapPin, Image as ImageIcon, List, FileText
} from 'lucide-react';

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────

const STATUS_CFG = {
    RETURN_REQUESTED:            { label: 'Requested', color: '#6366f1', bg: '#eef2ff' },
    RETURN_APPROVED:             { label: 'Approved — Ship Pending', color: '#059669', bg: '#d1fae5' },
    RETURN_REJECTED:             { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
    CUSTOMER_SHIPPED:            { label: 'Shipped by Customer', color: '#7c3aed', bg: '#ede9fe' },
    IN_TRANSIT:                  { label: 'In Transit', color: '#7c3aed', bg: '#ede9fe' },
    RECEIVED_BY_COMPANY:         { label: 'Received by Company', color: '#0891b2', bg: '#e0f2fe' },
    INSPECTION_PENDING:          { label: 'Inspection Pending', color: '#d97706', bg: '#fef3c7' },
    UNDER_INSPECTION:            { label: 'Under Inspection', color: '#d97706', bg: '#fef3c7' },
    INSPECTION_APPROVED:         { label: 'Inspection Passed', color: '#059669', bg: '#d1fae5' },
    INSPECTION_REJECTED:         { label: 'Inspection Failed', color: '#dc2626', bg: '#fee2e2' },
    REFUND_PENDING:              { label: 'Refund Pending', color: '#d97706', bg: '#fef3c7' },
    REFUND_PROCESSING:           { label: 'Refund Processing', color: '#2563eb', bg: '#dbeafe' },
    REFUND_COMPLETED:            { label: 'Refund Completed', color: '#059669', bg: '#d1fae5' },
    EXCHANGE_PENDING:            { label: 'Exchange Pending', color: '#d97706', bg: '#fef3c7' },
    EXCHANGE_PROCESSING:         { label: 'Exchange Processing', color: '#2563eb', bg: '#dbeafe' },
    EXCHANGE_SHIPPED:            { label: 'Exchange Shipped', color: '#7c3aed', bg: '#ede9fe' },
    EXCHANGE_DELIVERED:          { label: 'Exchange Delivered', color: '#059669', bg: '#d1fae5' },
    RETURN_TO_CUSTOMER:          { label: 'Returning to Customer', color: '#d97706', bg: '#fef3c7' },
    RETURN_TO_CUSTOMER_SHIPPED:  { label: 'Return Shipped', color: '#7c3aed', bg: '#ede9fe' },
    RETURN_TO_CUSTOMER_DELIVERED:{ label: 'Return Delivered', color: '#6b7280', bg: '#f3f4f6' },
    RETURN_CLOSED:               { label: 'Closed', color: '#6b7280', bg: '#f3f4f6' },
    COMPLETED:                   { label: 'Completed', color: '#059669', bg: '#d1fae5' },
    CANCELLED:                   { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
    PENDING:                     { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
    APPROVED:                    { label: 'Approved', color: '#059669', bg: '#d1fae5' },
    REJECTED:                    { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

function StatusBadge({ status }) {
    const c = STATUS_CFG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
    return (
        <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
            {c.label}
        </span>
    );
}

function formatPhone(phone) {
    if (!phone) return '';
    const d = String(phone).replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
    if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    return phone;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AdminReturnsPage() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({});
    const [notification, setNotification] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const ITEMS_PER_PAGE = 12;

    // Detail Modal state
    const [detailReturn, setDetailReturn] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Action panels state
    const [activeAction, setActiveAction] = useState(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionRejectionReason, setActionRejectionReason] = useState('');
    const [courierForm, setCourierForm] = useState({ courierName: '', awbNumber: '', trackingUrl: '' });
    const [inspectionForm, setInspectionForm] = useState({
        packagingCondition: 'GOOD', productCondition: 'GOOD',
        hasDamage: false, hasStain: false, hasUsage: false, hasTags: true, hasAccessories: true,
        notes: '', inspector: 'Admin',
    });
    const [refundForm, setRefundForm] = useState({ refundMethod: 'ORIGINAL', refundId: '', reimburseShipping: false });
    const [exchangeForm, setExchangeForm] = useState({ replacementProductId: '', replacementVariantId: '', exchangeNotes: '' });

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchStatusCounts = useCallback(async () => {
        const { data } = await supabase.from('return_requests').select('status');
        const counts = {};
        (data || []).forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
        counts.total = (data || []).length;
        setStatusCounts(counts);
    }, []);

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = page * ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('return_requests')
                .select('id, return_id, order_id, type, reason, status, notes, created_at, refund_amount, refund_method, refund_status, product_id, customer_id, products(*), customers(*), orders(*), return_shipping(*)', { count: 'exact' });

            if (statusFilter !== 'ALL') query = query.eq('status', statusFilter);
            if (typeFilter !== 'ALL') query = query.eq('type', typeFilter);

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                if (!isNaN(term)) {
                    query = query.eq('order_id', term);
                } else {
                    query = query.or(`return_id.ilike.%${term}%,reason.ilike.%${term}%`);
                }
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setReturns(data || []);
            setTotalCount(count || 0);
            fetchStatusCounts();
        } catch (err) {
            console.error('Fetch returns error:', err);
            showNotification('Failed to load returns', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, statusFilter, typeFilter]);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    useEffect(() => {
        const channel = supabase.channel('admin_returns_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, () => fetchReturns())
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchReturns]);

    useEffect(() => { setPage(1); }, [searchTerm, statusFilter, typeFilter]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // ── Load return detail ────────────────────────────────────────────────────
    async function openDetail(ret) {
        setDetailReturn(ret);
        setDetailLoading(true);
        setActiveAction(null);
        try {
            const res = await fetch(`/api/returns/${ret.id}`);
            if (res.ok) {
                const data = await res.json();
                setDetailReturn(data);
            }
        } catch (err) {
            console.error('Detail load error:', err);
        } finally {
            setDetailLoading(false);
        }
    }

    // ── Direct Row Action (Approve / Reject directly from table) ──────────────
    async function performDirectRowAction(returnId, action, rejectionReason = '') {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/returns/${returnId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    rejectionReason: rejectionReason || 'Request does not meet return conditions.',
                    actor: 'admin',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showNotification(data.error || 'Action failed', 'error');
                return;
            }
            showNotification(action === 'approve' ? 'Return Approved! Customer notified to ship.' : 'Return Request Rejected');
            fetchReturns();
            if (detailReturn?.id === returnId) {
                await openDetail({ id: returnId });
            }
        } catch (err) {
            showNotification('Network error', 'error');
        } finally {
            setActionLoading(false);
        }
    }

    // ── Admin action inside detail modal ──────────────────────────────────────
    async function performAction(action, extraBody = {}) {
        if (!detailReturn) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/returns/${detailReturn.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    notes: actionNotes || null,
                    rejectionReason: actionRejectionReason || null,
                    courierData: courierForm,
                    inspectionData: inspectionForm,
                    refundData: refundForm,
                    exchangeData: exchangeForm,
                    actor: 'admin',
                    ...extraBody,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showNotification(data.error || 'Action failed', 'error');
                return;
            }
            showNotification('Action completed successfully');
            setActiveAction(null);
            setActionNotes('');
            setActionRejectionReason('');
            await openDetail({ id: detailReturn.id });
            fetchReturns();
        } catch (err) {
            showNotification('Network error', 'error');
        } finally {
            setActionLoading(false);
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const STAT_CARDS = [
        { key: 'total', label: 'Total Returns', color: '#6b7280' },
        { key: 'RETURN_REQUESTED', label: 'Pending Requests', color: '#6366f1' },
        { key: 'RETURN_APPROVED', label: 'Approved Returns', color: '#059669' },
        { key: 'CUSTOMER_SHIPPED', label: 'Shipped Returns', color: '#7c3aed' },
        { key: 'RECEIVED_BY_COMPANY', label: 'Received', color: '#0891b2' },
        { key: 'UNDER_INSPECTION', label: 'Under Inspection', color: '#d97706' },
        { key: 'REFUND_PENDING', label: 'Refund Pending', color: '#d97706' },
        { key: 'COMPLETED', label: 'Completed Returns', color: '#059669' },
    ];

    // ─── Context-Sensitive Action Panel ───────────────────────────────────────
    function renderActionPanel(ret) {
        const status = ret?.status;
        if (!status) return null;

        const btnStyle = (color = '#4f46e5') => ({
            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
            background: color, color: '#fff', cursor: 'pointer', fontWeight: 700,
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
        });
        const outlineBtn = {
            padding: '0.6rem 1.1rem', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
        };

        const actionInput = (label, value, onChange, type = 'text', placeholder = '') => (
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', color: '#64748b' }}>{label}</label>
                <input type={type} value={value} onChange={onChange} placeholder={placeholder}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', boxSizing: 'border-box' }} />
            </div>
        );

        const panelStyle = {
            background: '#f8fafc', borderRadius: '12px', padding: '1.25rem',
            border: '1px solid #e2e8f0', marginTop: '1rem',
        };

        // ── RETURN_REQUESTED ────────────────────────────────────────────────
        if (['RETURN_REQUESTED', 'PENDING'].includes(status)) return (
            <div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button style={btnStyle('#059669')} onClick={() => setActiveAction('approve')}><Check size={16} /> Approve Return</button>
                    <button style={btnStyle('#dc2626')} onClick={() => setActiveAction('reject')}><XCircle size={16} /> Reject Return</button>
                </div>
                {activeAction === 'approve' && (
                    <div style={panelStyle}>
                        <h5 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Approve Return Request</h5>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                            Approving updates status to <strong>RETURN_APPROVED</strong> and notifies the customer to ship the saree to the company return address.
                        </p>
                        {actionInput('Admin Note for Customer (Optional)', actionNotes, e => setActionNotes(e.target.value), 'text', 'Notes or instructions...')}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={btnStyle('#059669')} disabled={actionLoading} onClick={() => performAction('approve')}>
                                {actionLoading ? 'Approving...' : 'Confirm Approval & Notify Customer'}
                            </button>
                            <button style={outlineBtn} onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                    </div>
                )}
                {activeAction === 'reject' && (
                    <div style={panelStyle}>
                        <h5 style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Reject Return Request</h5>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', color: '#dc2626' }}>REJECTION REASON *</label>
                            <textarea value={actionRejectionReason} onChange={e => setActionRejectionReason(e.target.value)}
                                rows={3} placeholder="Explain why the request is being rejected..."
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #fca5a5', boxSizing: 'border-box', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={btnStyle('#dc2626')} disabled={actionLoading || !actionRejectionReason} onClick={() => performAction('reject')}>
                                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                            <button style={outlineBtn} onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        );

        // ── RETURN_APPROVED ─────────────────────────────────────────────────
        if (status === 'RETURN_APPROVED' || status === 'APPROVED') return (
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#166534', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                    ✓ Return Approved — Waiting for Customer to Courier Product
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#15803d' }}>
                    Customer has been notified to send the package to company address. Once customer submits courier tracking info, status will update to <strong>CUSTOMER_SHIPPED</strong>.
                </p>
                <div style={{ marginTop: '0.75rem' }}>
                    <button style={btnStyle('#0891b2')} disabled={actionLoading} onClick={() => performAction('mark_received')}>
                        <CheckCircle size={14} /> Mark as Received (If package arrived)
                    </button>
                </div>
            </div>
        );

        // ── CUSTOMER_SHIPPED / IN_TRANSIT ──────────────────────────────────
        if (['CUSTOMER_SHIPPED', 'IN_TRANSIT'].includes(status)) return (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button style={btnStyle('#0891b2')} disabled={actionLoading} onClick={() => performAction('mark_received')}>
                    <CheckCircle size={14} /> {actionLoading ? 'Processing...' : 'Mark as Received'}
                </button>
            </div>
        );

        // ── RECEIVED_BY_COMPANY ─────────────────────────────────────────────
        if (status === 'RECEIVED_BY_COMPANY') return (
            <button style={btnStyle('#d97706')} disabled={actionLoading} onClick={() => performAction('start_inspection')}>
                <ClipboardCheck size={14} /> Start Inspection
            </button>
        );

        // ── INSPECTION_PENDING ──────────────────────────────────────────────
        if (status === 'INSPECTION_PENDING') return (
            <button style={btnStyle('#d97706')} disabled={actionLoading} onClick={() => performAction('under_inspection')}>
                <Eye size={14} /> Open Inspection Form
            </button>
        );

        // ── UNDER_INSPECTION ────────────────────────────────────────────────
        if (status === 'UNDER_INSPECTION') {
            const checkRow = (label, field) => (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={inspectionForm[field]}
                        onChange={e => setInspectionForm(f => ({ ...f, [field]: e.target.checked }))}
                        style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }} />
                    {label}
                </label>
            );
            const condSelect = (label, field) => (
                <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', color: '#64748b' }}>{label}</label>
                    <select value={inspectionForm[field]} onChange={e => setInspectionForm(f => ({ ...f, [field]: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #e2e8f0' }}>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="POOR">Poor</option>
                    </select>
                </div>
            );
            return (
                <div style={panelStyle}>
                    <h5 style={{ margin: '0 0 1rem', fontWeight: 700 }}>🔍 Product Inspection</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        {condSelect('Packaging Condition', 'packagingCondition')}
                        {condSelect('Product Condition', 'productCondition')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', gridColumn: '1/-1', textTransform: 'uppercase' }}>Condition Checks</div>
                        {checkRow('Has Damage', 'hasDamage')}
                        {checkRow('Has Stain', 'hasStain')}
                        {checkRow('Signs of Usage', 'hasUsage')}
                        {checkRow('Tags Intact', 'hasTags')}
                        {checkRow('Accessories Present', 'hasAccessories')}
                    </div>
                    {actionInput('Inspector Name', inspectionForm.inspector, e => setInspectionForm(f => ({ ...f, inspector: e.target.value })))}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', color: '#64748b' }}>INSPECTION NOTES</label>
                        <textarea value={inspectionForm.notes} onChange={e => setInspectionForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3} placeholder="Describe inspection findings..."
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', boxSizing: 'border-box', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button style={btnStyle('#059669')} disabled={actionLoading} onClick={() => performAction('inspection_approve')}>
                            <CheckCircle size={14} /> {actionLoading ? 'Saving...' : 'Approve Return'}
                        </button>
                        <button style={btnStyle('#dc2626')} disabled={actionLoading} onClick={() => setActiveAction('inspection_reject')}>
                            <XCircle size={14} /> Reject Return
                        </button>
                    </div>
                    {activeAction === 'inspection_reject' && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#dc2626', textTransform: 'uppercase' }}>REJECTION REASON *</label>
                                <textarea value={actionRejectionReason} onChange={e => setActionRejectionReason(e.target.value)}
                                    rows={2} placeholder="Why is inspection being rejected?"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #fca5a5', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>
                            <button style={btnStyle('#dc2626')} disabled={actionLoading || !actionRejectionReason} onClick={() => performAction('inspection_reject')}>
                                {actionLoading ? 'Saving...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        // ── INSPECTION_APPROVED ─────────────────────────────────────────────
        if (status === 'INSPECTION_APPROVED') return (
            <div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button style={btnStyle('#059669')} onClick={() => setActiveAction('refund')}><IndianRupee size={14} /> Process Refund</button>
                    <button style={btnStyle('#7c3aed')} onClick={() => setActiveAction('exchange')}><RotateCcw size={14} /> Process Exchange</button>
                </div>

                {activeAction === 'refund' && (
                    <div style={panelStyle}>
                        <h5 style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Process Refund</h5>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                            Refund amount is calculated server-side from actual order total.
                        </p>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', color: '#64748b' }}>REFUND METHOD</label>
                            <select value={refundForm.refundMethod} onChange={e => setRefundForm(f => ({ ...f, refundMethod: e.target.value }))}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #e2e8f0' }}>
                                <option value="ORIGINAL">Original Payment Method</option>
                                <option value="UPI">UPI Transfer</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="STORE_CREDIT">Store Credit</option>
                            </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            <input type="checkbox" checked={refundForm.reimburseShipping} onChange={e => setRefundForm(f => ({ ...f, reimburseShipping: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                            Reimburse Customer's Return Shipping Cost (if applicable)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={btnStyle('#059669')} disabled={actionLoading} onClick={() => performAction('process_refund')}>
                                {actionLoading ? 'Processing...' : 'Initiate Refund'}
                            </button>
                            <button style={outlineBtn} onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                    </div>
                )}

                {activeAction === 'exchange' && (
                    <div style={panelStyle}>
                        <h5 style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Process Exchange</h5>
                        {actionInput('Replacement Product ID', exchangeForm.replacementProductId, e => setExchangeForm(f => ({ ...f, replacementProductId: e.target.value })), 'text', 'Product ID from database')}
                        {actionInput('Exchange Notes', exchangeForm.exchangeNotes, e => setExchangeForm(f => ({ ...f, exchangeNotes: e.target.value })), 'text', 'Notes about exchange item')}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={btnStyle('#7c3aed')} disabled={actionLoading} onClick={() => performAction('process_exchange')}>
                                {actionLoading ? 'Processing...' : 'Start Exchange'}
                            </button>
                            <button style={outlineBtn} onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        );

        // ── REFUND_PROCESSING ───────────────────────────────────────────────
        if (status === 'REFUND_PROCESSING') return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {actionInput('Refund Reference / UTR ID', refundForm.refundId, e => setRefundForm(f => ({ ...f, refundId: e.target.value })), 'text', 'Bank Ref, UTR, or UPI ID')}
                <button style={btnStyle('#059669')} disabled={actionLoading || !refundForm.refundId} onClick={() => performAction('complete_refund')}>
                    <CheckCircle size={14} /> {actionLoading ? 'Completing...' : 'Mark Refund Completed'}
                </button>
            </div>
        );

        // ── EXCHANGE_PROCESSING ─────────────────────────────────────────────
        if (status === 'EXCHANGE_PROCESSING') return (
            <div style={panelStyle}>
                <h5 style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Ship Exchange Product</h5>
                {actionInput('Courier Company *', courierForm.courierName, e => setCourierForm(f => ({ ...f, courierName: e.target.value })))}
                {actionInput('AWB Number', courierForm.awbNumber, e => setCourierForm(f => ({ ...f, awbNumber: e.target.value })))}
                {actionInput('Tracking URL', courierForm.trackingUrl, e => setCourierForm(f => ({ ...f, trackingUrl: e.target.value })))}
                <button style={btnStyle('#7c3aed')} disabled={actionLoading || !courierForm.courierName} onClick={() => performAction('ship_exchange')}>
                    <Truck size={14} /> {actionLoading ? 'Shipping...' : 'Mark Exchange Shipped'}
                </button>
            </div>
        );

        // ── EXCHANGE_SHIPPED ────────────────────────────────────────────────
        if (status === 'EXCHANGE_SHIPPED') return (
            <button style={btnStyle('#059669')} disabled={actionLoading} onClick={() => performAction('exchange_delivered')}>
                <CheckCircle size={14} /> {actionLoading ? '...' : 'Mark Exchange Delivered'}
            </button>
        );

        // ── INSPECTION_REJECTED ─────────────────────────────────────────────
        if (status === 'INSPECTION_REJECTED') return (
            <div style={panelStyle}>
                <h5 style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Return Product to Customer</h5>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>The rejected product must be shipped back to customer.</p>
                {actionInput('Courier Company *', courierForm.courierName, e => setCourierForm(f => ({ ...f, courierName: e.target.value })))}
                {actionInput('AWB Number', courierForm.awbNumber, e => setCourierForm(f => ({ ...f, awbNumber: e.target.value })))}
                <button style={btnStyle('#dc2626')} disabled={actionLoading || !courierForm.courierName} onClick={() => performAction('return_to_customer')}>
                    <Truck size={14} /> {actionLoading ? '...' : 'Ship Back to Customer'}
                </button>
            </div>
        );

        // ── RETURN_TO_CUSTOMER ──────────────────────────────────────────────
        if (status === 'RETURN_TO_CUSTOMER') return (
            <button style={btnStyle('#dc2626')} disabled={actionLoading} onClick={() => performAction('mark_reverse_shipped')}>
                <Truck size={14} /> {actionLoading ? '...' : 'Mark Shipped to Customer'}
            </button>
        );

        // ── RETURN_TO_CUSTOMER_SHIPPED ──────────────────────────────────────
        if (status === 'RETURN_TO_CUSTOMER_SHIPPED') return (
            <button style={btnStyle('#6b7280')} disabled={actionLoading} onClick={() => performAction('mark_reverse_delivered')}>
                <CheckCircle size={14} /> {actionLoading ? '...' : 'Mark Delivered & Close Case'}
            </button>
        );

        return null;
    }

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div style={{ width: '100%' }}>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '0.85rem 1.25rem', borderRadius: '12px',
                    background: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: notification.type === 'success' ? '#059669' : '#dc2626',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600,
                }}>
                    {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <RefreshCcw size={32} color="hsl(var(--warning))"
                            style={{ cursor: 'pointer', animation: loading ? 'spin 1s linear infinite' : 'none' }}
                            onClick={fetchReturns} />
                        Return Requests
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.4rem' }}>Manage customer return and exchange requests</p>
                </div>
                <Link href="/admin" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <ArrowLeft size={18} /> Dashboard
                </Link>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                {STAT_CARDS.map(card => (
                    <div
                        key={card.key}
                        onClick={() => setStatusFilter(card.key === 'total' ? 'ALL' : card.key)}
                        style={{
                            padding: '1rem', background: 'hsl(var(--bg-card))', borderRadius: '12px',
                            border: statusFilter === (card.key === 'total' ? 'ALL' : card.key) ? `2px solid ${card.color}` : '1px solid hsl(var(--border-subtle))',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color }}>{statusCounts[card.key] || 0}</div>
                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginTop: '0.2rem' }}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem', background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input type="text" placeholder="Search by customer name, phone, or order ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%' }} className="admin-input" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-input" style={{ width: '180px' }}>
                    <option value="ALL">All Statuses</option>
                    {Object.entries(STATUS_CFG).filter(([k]) => !['PENDING', 'APPROVED', 'REJECTED'].includes(k)).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="admin-input" style={{ width: '140px' }}>
                    <option value="ALL">All Types</option>
                    <option value="RETURN">Returns</option>
                    <option value="EXCHANGE">Exchanges</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflowX: 'auto', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Return Requests ({totalCount})</h2>
                </div>
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <RefreshCcw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
                    </div>
                ) : returns.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <RotateCcw size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No return requests found</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', margin: 0 }}>
                        <thead>
                            <tr>
                                <th>RETURN ID / INVOICE</th>
                                <th>CUSTOMER</th>
                                <th>PRODUCT</th>
                                <th>TYPE</th>
                                <th>REASON</th>
                                <th>STATUS</th>
                                <th>REQUESTED</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.map(r => {
                                const customerName = r.customers?.name || r.orders?.customer_name || 'Customer';
                                const customerPhone = r.customers?.phone || r.orders?.customer_phone || '';
                                const invNo = r.orders?.invoice_no
                                    ? (r.orders.invoice_no.startsWith('#') ? r.orders.invoice_no : `#${r.orders.invoice_no}`)
                                    : `#${String(r.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                                const reqType = (r.type || r.request_type || 'RETURN').toUpperCase();
                                const isPendingRequest = ['RETURN_REQUESTED', 'PENDING'].includes(r.status);
                                const isApprovedRequest = ['RETURN_APPROVED', 'APPROVED'].includes(r.status);
                                const isShippedRequest = ['CUSTOMER_SHIPPED', 'IN_TRANSIT'].includes(r.status);

                                return (
                                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>{invNo}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.return_id || `#${String(r.id).slice(0, 8)}`}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{customerName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatPhone(customerPhone)}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                {r.products?.image_url ? (
                                                    <img
                                                        src={r.products.image_url}
                                                        alt=""
                                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(r.products.image_url); }}
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', flexShrink: 0 }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Package size={20} style={{ opacity: 0.3 }} />
                                                    </div>
                                                )}
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.products?.name || 'Product Saree'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                                                letterSpacing: '0.04em', display: 'inline-block',
                                                background: reqType === 'RETURN' ? '#fee2e2' : '#dbeafe',
                                                color: reqType === 'RETURN' ? '#991b1b' : '#1e40af',
                                                border: reqType === 'RETURN' ? '1px solid #fca5a5' : '1px solid #bfdbfe'
                                            }}>
                                                {reqType}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                            {r.reason}
                                        </td>
                                        <td><StatusBadge status={r.status} /></td>
                                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                {/* Quick Approve / Reject Buttons directly in Table Action column */}
                                                {isPendingRequest && (
                                                    <>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); performDirectRowAction(r.id, 'approve'); }}
                                                            disabled={actionLoading}
                                                            title="Approve Return Request"
                                                            style={{
                                                                padding: '0.35rem 0.6rem', borderRadius: '6px', border: 'none',
                                                                background: '#059669', color: '#fff', cursor: 'pointer',
                                                                fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem'
                                                            }}
                                                        >
                                                            <Check size={13} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                const reason = prompt('Enter rejection reason for customer:', 'Does not meet return conditions.');
                                                                if (reason !== null) performDirectRowAction(r.id, 'reject', reason);
                                                            }}
                                                            disabled={actionLoading}
                                                            title="Reject Return Request"
                                                            style={{
                                                                padding: '0.35rem 0.6rem', borderRadius: '6px', border: 'none',
                                                                background: '#dc2626', color: '#fff', cursor: 'pointer',
                                                                fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem'
                                                            }}
                                                        >
                                                            <X size={13} /> Reject
                                                        </button>
                                                    </>
                                                )}

                                                {isShippedRequest && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); performDirectRowAction(r.id, 'mark_received'); }}
                                                        disabled={actionLoading}
                                                        title="Mark Package as Received by Company"
                                                        style={{
                                                            padding: '0.35rem 0.65rem', borderRadius: '6px', border: 'none',
                                                            background: '#0891b2', color: '#fff', cursor: 'pointer',
                                                            fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem'
                                                        }}
                                                    >
                                                        <CheckCircle size={13} /> Received
                                                    </button>
                                                )}

                                                <button
                                                    onClick={e => { e.stopPropagation(); openDetail(r); }}
                                                    style={{
                                                        padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                        background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                                        color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.2rem'
                                                    }}
                                                >
                                                    <Eye size={13} /> View
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.9rem' }}>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ─── Detail Modal ───────────────────────────────────────────────── */}
            {detailReturn && (
                <ModalPortal>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1rem' }} onClick={() => setDetailReturn(null)}>
                        <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '16px', width: '100%', maxWidth: '800px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                                        {detailReturn.return_id || `Return #${String(detailReturn.id).slice(0, 8)}`}
                                        <span style={{ marginLeft: '0.75rem' }}><StatusBadge status={detailReturn.status} /></span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                        Requested on: {new Date(detailReturn.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <button onClick={() => setDetailReturn(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
                                {detailLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}><RefreshCcw size={24} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} /></div>
                                ) : (
                                    <>
                                        {/* 1. Return Information */}
                                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Return Information</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                <div><span style={{ color: '#64748b' }}>Return ID:</span> <strong>{detailReturn.return_id || `#${detailReturn.id}`}</strong></div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Invoice Number:</span>{' '}
                                                    <strong style={{ color: '#4f46e5' }}>
                                                        {detailReturn.orders?.invoice_no
                                                            ? (detailReturn.orders.invoice_no.startsWith('#') ? detailReturn.orders.invoice_no : `#${detailReturn.orders.invoice_no}`)
                                                            : `#INV-${detailReturn.order_id}`}
                                                    </strong>
                                                </div>
                                                <div><span style={{ color: '#64748b' }}>Requested Date:</span> <strong>{new Date(detailReturn.created_at).toLocaleDateString('en-IN')}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Return Type:</span> <strong>{detailReturn.type || 'RETURN'}</strong></div>
                                                <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Reason:</span> <strong>{detailReturn.reason}</strong></div>
                                                {detailReturn.description && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Customer Notes:</span> {detailReturn.description}</div>}
                                            </div>
                                        </div>

                                        {/* 2. Customer Information */}
                                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <User size={14} /> Customer Details
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                                                <div><span style={{ color: '#64748b' }}>Customer Name:</span> <strong style={{ color: '#1e293b' }}>{detailReturn.customers?.name || detailReturn.orders?.customer_name || 'Customer'}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Phone:</span> <strong>{formatPhone(detailReturn.customers?.phone || detailReturn.orders?.customer_phone)}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Email:</span> <strong>{detailReturn.customers?.email || detailReturn.orders?.customer_email || 'N/A'}</strong></div>
                                            </div>
                                        </div>

                                        {/* 3. Returned Product */}
                                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Package size={14} /> Returned Product Information
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                                {detailReturn.products?.image_url ? (
                                                    <img
                                                        src={detailReturn.products.image_url}
                                                        alt=""
                                                        onClick={() => setPreviewImage(detailReturn.products.image_url)}
                                                        style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '1.5.px solid #cbd5e1', cursor: 'pointer', flexShrink: 0 }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '90px', height: '90px', borderRadius: '10px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={32} style={{ opacity: 0.3 }} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{detailReturn.products?.name || 'Saree Product'}</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                                        <div><span style={{ color: '#64748b' }}>Order Price:</span> <strong>₹{detailReturn.products?.price || detailReturn.orders?.total_amount || 0}</strong></div>
                                                        <div><span style={{ color: '#64748b' }}>Order ID:</span> <strong>#{detailReturn.order_id}</strong></div>
                                                        <div><span style={{ color: '#64748b' }}>Order Date:</span> <strong>{new Date(detailReturn.orders?.created_at || detailReturn.created_at).toLocaleDateString('en-IN')}</strong></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Customer Uploaded Return Photos */}
                                        {detailReturn.images && detailReturn.images.length > 0 && (
                                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Camera size={14} /> Customer Uploaded Return Photos ({detailReturn.images.length})
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    {detailReturn.images.map(img => (
                                                        <div key={img.id} onClick={() => setPreviewImage(img.image_url)} style={{ cursor: 'pointer' }}>
                                                            <img src={img.image_url} alt="" style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #cbd5e1' }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 5. Customer Shipped Courier Info (from return_shipping table) */}
                                        {detailReturn.returnShipping && (
                                            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1.25rem', border: '1.5px solid #bbf7d0' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Truck size={16} /> Customer Shipping Information
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                                                    <div><span style={{ color: '#64748b' }}>Courier Company:</span> <strong>{detailReturn.returnShipping.courier_company_name}</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Tracking / AWB Number:</span> <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{detailReturn.returnShipping.tracking_number}</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Shipping Date:</span> <strong>{new Date(detailReturn.returnShipping.shipping_date).toLocaleDateString('en-IN')}</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Declared Cost:</span> <strong>{detailReturn.returnShipping.shipping_cost ? `₹${detailReturn.returnShipping.shipping_cost}` : 'Not specified'}</strong></div>
                                                </div>
                                                {detailReturn.returnShipping.receipt_url && (
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <a
                                                            href={detailReturn.returnShipping.receipt_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#059669',
                                                                color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                                                            }}
                                                        >
                                                            <FileText size={14} /> View Courier Receipt →
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 6. Inspection Results */}
                                        {detailReturn.inspection && (
                                            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <ClipboardCheck size={12} /> Quality Inspection Results
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <div><span style={{ color: '#94a3b8' }}>Packaging:</span> <strong>{detailReturn.inspection.packaging_condition}</strong></div>
                                                    <div><span style={{ color: '#94a3b8' }}>Product:</span> <strong>{detailReturn.inspection.product_condition}</strong></div>
                                                    <div><span style={{ color: '#94a3b8' }}>Damage:</span> <strong>{detailReturn.inspection.has_damage ? '⚠️ Yes' : '✅ No'}</strong></div>
                                                    <div><span style={{ color: '#94a3b8' }}>Stain:</span> <strong>{detailReturn.inspection.has_stain ? '⚠️ Yes' : '✅ No'}</strong></div>
                                                    <div><span style={{ color: '#94a3b8' }}>Usage:</span> <strong>{detailReturn.inspection.has_usage ? '⚠️ Yes' : '✅ No'}</strong></div>
                                                    <div><span style={{ color: '#94a3b8' }}>Tags:</span> <strong>{detailReturn.inspection.has_tags ? '✅ Intact' : '❌ Missing'}</strong></div>
                                                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#94a3b8' }}>Result:</span> <StatusBadge status={detailReturn.inspection.result === 'APPROVED' ? 'INSPECTION_APPROVED' : detailReturn.inspection.result === 'REJECTED' ? 'INSPECTION_REJECTED' : 'INSPECTION_PENDING'} /></div>
                                                    {detailReturn.inspection.rejection_reason && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#dc2626' }}>Rejection Reason:</span> {detailReturn.inspection.rejection_reason}</div>}
                                                    {detailReturn.inspection.inspection_notes && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#94a3b8' }}>Notes:</span> {detailReturn.inspection.inspection_notes}</div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* 7. Status Timeline */}
                                        {detailReturn.statusLogs && detailReturn.statusLogs.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <List size={12} /> Status Timeline
                                                </div>
                                                {detailReturn.statusLogs.map((log, i) => (
                                                    <div key={log.id} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < detailReturn.statusLogs.length - 1 ? '0.75rem' : 0, position: 'relative' }}>
                                                        {i < detailReturn.statusLogs.length - 1 && (
                                                            <div style={{ position: 'absolute', left: '11px', top: '22px', bottom: 0, width: '2px', background: '#e2e8f0' }} />
                                                        )}
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: i === detailReturn.statusLogs.length - 1 ? 'hsl(var(--primary))' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Check size={12} color="#fff" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                                {STATUS_CFG[log.new_status]?.label || log.new_status}
                                                                {log.actor && log.actor !== 'system' && <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '0.5rem' }}>by {log.actor}</span>}
                                                            </div>
                                                            {log.notes && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{log.notes}</div>}
                                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Admin Action Center */}
                                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Admin Action Center</div>
                                            {renderActionPanel(detailReturn)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ─── Image Preview Modal ────────────────────────────────────────── */}
            {previewImage && (
                <ModalPortal>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewImage(null)}>
                        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                            <img src={previewImage} alt="" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
                            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
