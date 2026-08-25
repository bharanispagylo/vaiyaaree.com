'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { useShop } from '@/context/ShopContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModalPortal from '@/components/ModalPortal';
import { 
    ArrowLeft, RefreshCcw, Clock, CheckCircle, XCircle, AlertCircle, 
    IndianRupee, Package, User, Phone, Calendar, Search, Filter,
    ChevronDown, ChevronUp, MessageSquare, Mail, ExternalLink, ChevronLeft, ChevronRight, Truck
} from 'lucide-react';

export default function RefundsPage() {
    const formatDisplayPhoneNumber = (phone) => {
        if (!phone) return '';
        let cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            const part1 = cleaned.substring(2, 7);
            const part2 = cleaned.substring(7);
            return `+91 ${part1} ${part2}`;
        } else if (cleaned.length === 10) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `+91 ${part1} ${part2}`;
        }
        return phone;
    };

    const router = useRouter();
    const { shopSettings } = useShop();
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [processAction, setProcessAction] = useState(null); // 'approve', 'reject', 'mark_received', 'process_refund', 'complete', 'fail'
    const [processNote, setProcessNote] = useState('');
    const [approvedAmountInput, setApprovedAmountInput] = useState('');
    const [notification, setNotification] = useState(null);
    const [refundsPage, setRefundsPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        total: 0,
        requested: 0,
        returnRequired: 0,
        received: 0,
        refunded: 0
    });
    const REFUNDS_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [refundsPage]);

    const fetchStatusCounts = async () => {
        try {
            const { data, error } = await mysqlClient
                .from('refund_requests')
                .select('refund_status, status');
            const list = data || [];
            if (list.length > 0) {
                setStatusCounts({
                    total: list.length,
                    requested: list.filter(r => ['REFUND_REQUESTED', 'UNDER_REVIEW', 'REQUESTED', 'PENDING'].includes((r.refund_status || r.status || '').toUpperCase())).length,
                    returnRequired: list.filter(r => ['RETURN_REQUIRED', 'APPROVED', 'CUSTOMER_SHIPPED'].includes((r.refund_status || r.status || '').toUpperCase())).length,
                    received: list.filter(r => ['RETURN_RECEIVED', 'REFUND_PROCESSING'].includes((r.refund_status || r.status || '').toUpperCase())).length,
                    refunded: list.filter(r => ['REFUNDED', 'COMPLETED'].includes((r.refund_status || r.status || '').toUpperCase())).length
                });
            } else {
                // Fallback to legacy refunds table
                const { data: oldData } = await mysqlClient.from('refunds').select('status');
                const oldList = oldData || [];
                setStatusCounts({
                    total: oldList.length,
                    requested: oldList.filter(r => (r.status || '').toUpperCase() === 'REQUESTED' || (r.status || '').toUpperCase() === 'PENDING').length,
                    returnRequired: oldList.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length,
                    received: 0,
                    refunded: oldList.filter(r => (r.status || '').toUpperCase() === 'COMPLETED').length
                });
            }
        } catch (err) {
            console.error('Error fetching status counts:', err);
        }
    };

    const fetchRefunds = async () => {
        setLoading(true);
        try {
            const from = (refundsPage - 1) * REFUNDS_PER_PAGE;
            const to = refundsPage * REFUNDS_PER_PAGE - 1;

            let query = mysqlClient
                .from('refund_requests')
                .select(`
                    *,
                    orders:order_id (
                        id, customer_name, customer_phone, customer_email, total_amount, status, created_at, invoice_no
                    ),
                    refund_shipments(*)
                `, { count: 'exact' });

            if (statusFilter !== 'ALL') {
                query = query.eq('refund_status', statusFilter);
            }

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                query = query.or(`refund_id.ilike.%${term}%,order_id.ilike.%${term}%,reason.ilike.%${term}%,customer_note.ilike.%${term}%`);
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (!error && data && data.length > 0) {
                setRefunds(data);
                setTotalCount(count || 0);
            } else {
                // Fallback to legacy refunds table
                let oldQuery = mysqlClient
                    .from('refunds')
                    .select(`
                        *,
                        orders:order_id (
                            id, customer_name, customer_phone, customer_email, total_amount, status, created_at, invoice_no
                        )
                    `, { count: 'exact' });
                
                if (statusFilter !== 'ALL') {
                    oldQuery = oldQuery.eq('status', statusFilter);
                }

                const { data: oldData, count: oldCount } = await oldQuery
                    .order('created_at', { ascending: false })
                    .range(from, to);

                setRefunds(oldData || []);
                setTotalCount(oldCount || 0);
            }

            fetchStatusCounts();
        } catch (err) {
            console.error('Error fetching refunds:', err);
            showNotification('Failed to load refunds', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
    }, [refundsPage, searchTerm, statusFilter]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const getStatusBadge = (status) => {
        const st = (status || 'REFUND_REQUESTED').toUpperCase();

        const colors = {
            REFUND_REQUESTED: { bg: '#fef3c7', text: '#92400e', label: 'Refund Requested' },
            REQUESTED: { bg: '#fef3c7', text: '#92400e', label: 'Requested' },
            UNDER_REVIEW: { bg: '#fef3c7', text: '#92400e', label: 'Under Review' },
            APPROVED: { bg: '#dbeafe', text: '#1e40af', label: 'Approved' },
            RETURN_REQUIRED: { bg: '#fff7ed', text: '#c2410c', label: 'Return Required' },
            CUSTOMER_SHIPPED: { bg: '#e0e7ff', text: '#3730a3', label: 'Customer Shipped' },
            RETURN_RECEIVED: { bg: '#f0fdf4', text: '#15803d', label: 'Return Received' },
            REFUND_PROCESSING: { bg: '#fef9c3', text: '#854d0e', label: 'Refund Processing' },
            REFUNDED: { bg: '#dcfce7', text: '#166534', label: 'Refunded' },
            COMPLETED: { bg: '#dcfce7', text: '#166534', label: 'Completed' },
            REJECTED: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
            CANCELLED: { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' },
            REFUND_FAILED: { bg: '#fee2e2', text: '#991b1b', label: 'Refund Failed' }
        };

        const color = colors[st] || { bg: '#f3f4f6', text: '#374151', label: st };

        return (
            <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                background: color.bg,
                color: color.text,
                display: 'inline-block',
                whiteSpace: 'nowrap'
            }}>
                {color.label}
            </span>
        );
    };

    const handleProcessClick = (refund, action) => {
        setSelectedRefund(refund);
        setProcessAction(action);
        setProcessNote('');
        setApprovedAmountInput(String(refund.approved_amount || refund.requested_amount || refund.amount || ''));
        setShowProcessModal(true);
    };

    const handleProcessConfirm = async () => {
        if (!selectedRefund || !processAction) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token') || 'admin';
            let endpoint = '';
            let payload = {};

            if (processAction === 'approve') {
                endpoint = '/api/refund-requests/approve';
                payload = {
                    refundRequestId: selectedRefund.id,
                    approvedAmount: parseFloat(approvedAmountInput) || selectedRefund.requested_amount,
                    adminNote: processNote,
                    returnRequired: true
                };
            } else if (processAction === 'reject') {
                endpoint = '/api/refund-requests/reject';
                payload = {
                    refundRequestId: selectedRefund.id,
                    adminNote: processNote
                };
            } else if (processAction === 'mark_received') {
                endpoint = '/api/refund-requests/update-status';
                payload = {
                    refundRequestId: selectedRefund.id,
                    status: 'RETURN_RECEIVED',
                    adminNote: processNote
                };
            } else if (processAction === 'process_refund') {
                endpoint = '/api/refund-requests/update-status';
                payload = {
                    refundRequestId: selectedRefund.id,
                    status: 'REFUND_PROCESSING',
                    adminNote: processNote
                };
            } else if (processAction === 'complete') {
                endpoint = '/api/refund-requests/update-status';
                payload = {
                    refundRequestId: selectedRefund.id,
                    status: 'REFUNDED',
                    adminNote: processNote
                };
            } else if (processAction === 'fail') {
                endpoint = '/api/refund-requests/update-status';
                payload = {
                    refundRequestId: selectedRefund.id,
                    status: 'REFUND_FAILED',
                    failureReason: processNote
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Action failed');
            }

            showNotification(`Refund status updated successfully!`, 'success');
            setShowProcessModal(false);
            setShowDetailModal(false);
            setProcessAction(null);
            setProcessNote('');
            fetchRefunds();
        } catch (err) {
            console.error('Error processing refund:', err);
            showNotification(`Failed to update refund: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalRefundPages = Math.ceil(totalCount / REFUNDS_PER_PAGE);

    return (
        <div style={{ width: '100%' }}>
            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '1rem 1.5rem', borderRadius: '12px',
                    background: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: notification.type === 'success' ? '#059669' : '#dc2626',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <RefreshCcw 
                            size={32} 
                            color="hsl(var(--warning))" 
                            style={{ cursor: 'pointer', animation: loading ? 'spin 1s linear infinite' : 'none' }} 
                            onClick={fetchRefunds}
                        />
                        Refund Management
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
                        Manage customer refund requests, return shipments & refund payouts
                    </p>
                </div>
                <button onClick={() => router.push('/admin')} className="btn btn-secondary">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Requests', value: statusCounts.total, icon: RefreshCcw, color: '#6b7280' },
                    { label: 'Requested / Review', value: statusCounts.requested, icon: Clock, color: '#d97706' },
                    { label: 'Return Required', value: statusCounts.returnRequired, icon: Truck, color: '#c2410c' },
                    { label: 'Received / Inspect', value: statusCounts.received, icon: CheckCircle, color: '#2563eb' },
                    { label: 'Refunded', value: statusCounts.refunded, icon: IndianRupee, color: '#059669' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        padding: '1.25rem', background: 'hsl(var(--bg-card))', borderRadius: '12px',
                        border: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', gap: '0.85rem'
                    }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: `${stat.color}15`, color: stat.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>{stat.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', gap: '1rem', marginBottom: '1.5rem',
                padding: '1rem', background: 'hsl(var(--bg-card))', borderRadius: '12px',
                border: '1px solid hsl(var(--border-subtle))'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input
                        type="text"
                        placeholder="Search by Refund ID, customer, reason, or Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        className="admin-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-input"
                    style={{ width: '200px' }}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="REFUND_REQUESTED">Refund Requested</option>
                    <option value="RETURN_REQUIRED">Return Required</option>
                    <option value="CUSTOMER_SHIPPED">Customer Shipped</option>
                    <option value="RETURN_RECEIVED">Return Received</option>
                    <option value="REFUND_PROCESSING">Refund Processing</option>
                    <option value="REFUNDED">Refunded</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="REFUND_FAILED">Refund Failed</option>
                </select>
            </div>

            {/* Refunds Table */}
            <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <RefreshCcw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                        <p>Loading refund requests...</p>
                    </div>
                ) : refunds.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Package size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p>No refund requests found</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', margin: 0 }}>
                        <thead>
                            <tr>
                                <th>Refund ID</th>
                                <th>Invoice No</th>
                                <th>Customer</th>
                                <th>Req. Amount</th>
                                <th>Appr. Amount</th>
                                <th>Reason</th>
                                <th>Refund Status</th>
                                <th>Date</th>
                                <th style={{ minWidth: '220px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {refunds.map((refund) => {
                                const refStatus = (refund.refund_status || refund.status || 'REFUND_REQUESTED').toUpperCase();
                                const reqAmt = refund.requested_amount || refund.amount || 0;
                                const apprAmt = refund.approved_amount !== null && refund.approved_amount !== undefined ? refund.approved_amount : reqAmt;
                                const refundCode = refund.refund_id || `RF-${String(refund.id).substring(0, 8)}`;
                                const displayInv = refund.orders?.invoice_no 
                                    ? (refund.orders.invoice_no.startsWith('#') ? refund.orders.invoice_no : `#${refund.orders.invoice_no}`)
                                    : `#${String(refund.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                                return (
                                    <tr key={refund.id} onClick={() => { setSelectedRefund(refund); setShowDetailModal(true); }} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                            {refundCode}
                                        </td>
                                        <td>
                                            <Link 
                                                href={`/admin/orders?id=${refund.order_id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: 'hsl(var(--primary))', fontWeight: 700, textDecoration: 'underline' }}
                                            >
                                                {displayInv}
                                            </Link>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600 }}>{refund.orders?.customer_name || 'N/A'}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {formatDisplayPhoneNumber(refund.orders?.customer_phone)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            ₹{Number(reqAmt).toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                            ₹{Number(apprAmt).toLocaleString('en-IN')}
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {refund.reason || 'No reason provided'}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(refStatus)}</td>
                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                            {new Date(refund.created_at || refund.requested_at).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedRefund(refund); setShowDetailModal(true); }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                                >
                                                    View
                                                </button>

                                                {(refStatus === 'REFUND_REQUESTED' || refStatus === 'UNDER_REVIEW' || refStatus === 'REQUESTED' || refStatus === 'PENDING') && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'approve'); }}
                                                            className="btn btn-primary"
                                                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#2563eb' }}
                                                        >
                                                            Approve Return
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'reject'); }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#dc2626' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {refStatus === 'CUSTOMER_SHIPPED' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'mark_received'); }}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#15803d' }}
                                                    >
                                                        Mark Received
                                                    </button>
                                                )}

                                                {refStatus === 'RETURN_RECEIVED' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'process_refund'); }}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#854d0e' }}
                                                    >
                                                        Inspect & Approve Payout
                                                    </button>
                                                )}

                                                {refStatus === 'REFUND_PROCESSING' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'complete'); }}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#059669' }}
                                                    >
                                                        Mark Refunded
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Table Pagination */}
                {totalRefundPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                        <button onClick={() => setRefundsPage(p => Math.max(1, p - 1))} disabled={refundsPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: refundsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {Array.from({ length: totalRefundPages }, (_, i) => i + 1).map(page => (
                                <button key={page} onClick={() => setRefundsPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: refundsPage === page ? 'hsl(var(--primary))' : '#ffffff', color: refundsPage === page ? 'white' : 'hsl(var(--text-main))', border: refundsPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer' }}>{page}</button>
                            ))}
                        </div>
                        <button onClick={() => setRefundsPage(p => Math.min(totalRefundPages, p + 1))} disabled={refundsPage === totalRefundPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: refundsPage === totalRefundPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedRefund && (
                <ModalPortal>
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        background: 'hsl(var(--bg-card))', borderRadius: '16px',
                        maxWidth: '750px', width: '100%', maxHeight: '90vh',
                        overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCcw size={24} color="hsl(var(--warning))" />
                                Refund Details — {selectedRefund.refund_id || `RF-${String(selectedRefund.id).substring(0, 8)}`}
                            </h2>
                            <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '1.5rem' }}>
                            {/* Order Info */}
                            <div style={{ 
                                padding: '1rem', background: 'hsl(var(--bg-app))', 
                                borderRadius: '12px', marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                    ORDER & CUSTOMER INFORMATION
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Invoice No</div>
                                        <div style={{ fontWeight: 600 }}>
                                            <Link 
                                                href={`/admin/orders?id=${selectedRefund.order_id}`}
                                                style={{ color: 'hsl(var(--primary))', fontWeight: 700, textDecoration: 'underline' }}
                                            >
                                                #{selectedRefund.orders?.invoice_no || selectedRefund.order_id}
                                            </Link>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Order Total</div>
                                        <div style={{ fontWeight: 600 }}>₹{selectedRefund.orders?.total_amount?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Customer</div>
                                        <div style={{ fontWeight: 600 }}>{selectedRefund.orders?.customer_name || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Phone</div>
                                        <div style={{ fontWeight: 600 }}>{formatDisplayPhoneNumber(selectedRefund.orders?.customer_phone)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Amounts & Status */}
                            <div style={{ 
                                padding: '1rem', background: 'hsl(var(--bg-app))', 
                                borderRadius: '12px', marginBottom: '1.5rem',
                                border: '1px solid hsl(var(--border-subtle))'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                    REFUND BREAKDOWN & STATUS
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Requested Amount</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                            ₹{Number(selectedRefund.requested_amount || selectedRefund.amount || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Approved Amount</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'hsl(var(--primary))' }}>
                                            ₹{Number(selectedRefund.approved_amount !== null && selectedRefund.approved_amount !== undefined ? selectedRefund.approved_amount : (selectedRefund.requested_amount || selectedRefund.amount || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Refund Status</div>
                                        <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(selectedRefund.refund_status || selectedRefund.status)}</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Reason for Refund</div>
                                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px' }}>
                                        {selectedRefund.reason || 'No reason provided'}
                                    </div>
                                </div>

                                {selectedRefund.customer_note && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Customer Notes</div>
                                        <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px' }}>
                                            {selectedRefund.customer_note}
                                        </div>
                                    </div>
                                )}

                                {selectedRefund.admin_note && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Admin Notes</div>
                                        <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af' }}>
                                            {selectedRefund.admin_note}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shipping Details */}
                            {selectedRefund.refund_shipments && (
                                <div style={{ padding: '1rem', background: '#e0e7ff', borderRadius: '12px', marginBottom: '1.5rem', color: '#3730a3' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Truck size={18} /> CUSTOMER COURIER SHIPMENT
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                                        <div><strong>Courier:</strong> {selectedRefund.refund_shipments.courier_company || 'N/A'}</div>
                                        <div><strong>Tracking ID:</strong> {selectedRefund.refund_shipments.tracking_number || 'N/A'}</div>
                                        <div><strong>Date:</strong> {selectedRefund.refund_shipments.shipping_date || 'N/A'}</div>
                                    </div>
                                    {selectedRefund.refund_shipments.receipt_url && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <a href={selectedRefund.refund_shipments.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3730a3', fontWeight: 800, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <ExternalLink size={14} /> View Uploaded Receipt Photo
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {['REFUND_REQUESTED', 'UNDER_REVIEW', 'REQUESTED', 'PENDING'].includes((selectedRefund.refund_status || selectedRefund.status || '').toUpperCase()) && (
                                    <>
                                        <button
                                            onClick={() => { handleProcessClick(selectedRefund, 'reject'); }}
                                            className="btn btn-secondary"
                                            style={{ color: '#dc2626' }}
                                        >
                                            <XCircle size={18} /> Reject Refund
                                        </button>
                                        <button
                                            onClick={() => { handleProcessClick(selectedRefund, 'approve'); }}
                                            className="btn btn-primary"
                                            style={{ background: '#2563eb' }}
                                        >
                                            <CheckCircle size={18} /> Approve Return
                                        </button>
                                    </>
                                )}

                                {(selectedRefund.refund_status || selectedRefund.status || '').toUpperCase() === 'CUSTOMER_SHIPPED' && (
                                    <button
                                        onClick={() => { handleProcessClick(selectedRefund, 'mark_received'); }}
                                        className="btn btn-primary"
                                        style={{ background: '#15803d' }}
                                    >
                                        <CheckCircle size={18} /> Mark Product Received
                                    </button>
                                )}

                                {(selectedRefund.refund_status || selectedRefund.status || '').toUpperCase() === 'RETURN_RECEIVED' && (
                                    <button
                                        onClick={() => { handleProcessClick(selectedRefund, 'process_refund'); }}
                                        className="btn btn-primary"
                                        style={{ background: '#854d0e' }}
                                    >
                                        <CheckCircle size={18} /> Inspect & Approve Payout
                                    </button>
                                )}

                                {(selectedRefund.refund_status || selectedRefund.status || '').toUpperCase() === 'REFUND_PROCESSING' && (
                                    <button
                                        onClick={() => { handleProcessClick(selectedRefund, 'complete'); }}
                                        className="btn btn-primary"
                                        style={{ background: '#059669' }}
                                    >
                                        <IndianRupee size={18} /> Mark Refund Completed
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* Process Modal */}
            {showProcessModal && (
                <ModalPortal>
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        background: 'hsl(var(--bg-card))', borderRadius: '16px',
                        maxWidth: '500px', width: '100%',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {processAction === 'approve' && <><CheckCircle size={24} color="#2563eb" /> Approve Refund Request</>}
                                {processAction === 'reject' && <><XCircle size={24} color="#dc2626" /> Reject Refund Request</>}
                                {processAction === 'mark_received' && <><CheckCircle size={24} color="#15803d" /> Confirm Product Received</>}
                                {processAction === 'process_refund' && <><IndianRupee size={24} color="#854d0e" /> Approve Payout for Refund</>}
                                {processAction === 'complete' && <><IndianRupee size={24} color="#059669" /> Complete Refund Payout</>}
                            </h3>
                            
                            {processAction === 'approve' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>APPROVED REFUND AMOUNT (₹)</label>
                                    <input 
                                        type="number"
                                        value={approvedAmountInput}
                                        onChange={(e) => setApprovedAmountInput(e.target.value)}
                                        className="admin-input"
                                        style={{ width: '100%', marginBottom: '0.75rem', fontWeight: 700 }}
                                    />
                                </div>
                            )}

                            <textarea
                                placeholder={processAction === 'reject' ? 'Reason for rejection (Required)...' : 'Admin notes or instructions for customer...'}
                                value={processNote}
                                onChange={(e) => setProcessNote(e.target.value)}
                                style={{ width: '100%', minHeight: '90px', marginBottom: '1rem' }}
                                className="admin-input"
                            />

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setShowProcessModal(false)} 
                                    className="btn btn-secondary"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleProcessConfirm}
                                    className="btn btn-primary"
                                    disabled={loading || (processAction === 'reject' && !processNote.trim())}
                                    style={{
                                        background: processAction === 'reject' ? '#dc2626' : 
                                                   processAction === 'complete' ? '#059669' : '#2563eb'
                                    }}
                                >
                                    {loading ? 'Updating...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}
