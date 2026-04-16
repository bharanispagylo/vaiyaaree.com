'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ModalPortal from '@/components/ModalPortal';
import { 
    ArrowLeft, RefreshCcw, Clock, CheckCircle, XCircle, AlertCircle, 
    Package, User, Phone, Calendar, Search, Filter,
    ChevronDown, ChevronUp, MessageSquare, Mail, ExternalLink, 
    RotateCcw, DollarSign, ShoppingCart, TrendingUp
} from 'lucide-react';

export default function AdminReturnsPage() {
    const [returns, setReturns] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [requestTypeFilter, setRequestTypeFilter] = useState('ALL'); // 'ALL', 'RETURN', 'EXCHANGE', 'REFUND'
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [processAction, setProcessAction] = useState(null);
    const [processNote, setProcessNote] = useState('');
    const [notification, setNotification] = useState(null);
    const [returnsPage, setReturnsPage] = useState(1);
    const [refundsPage, setRefundsPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Fetch both returns and refunds
    useEffect(() => {
        fetchReturnsAndRefunds();
        
        // Real-time subscriptions for both tables
        const returnsChannel = supabase
            .channel('returns_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'return_requests' 
            }, () => {
                fetchReturnsAndRefunds();
            })
            .subscribe();

        const refundsChannel = supabase
            .channel('refunds_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'refunds' 
            }, () => {
                fetchReturnsAndRefunds();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(returnsChannel);
            supabase.removeChannel(refundsChannel);
        };
    }, []);

    const fetchReturnsAndRefunds = async () => {
        setLoading(true);
        try {
            const [returnsData, refundsData] = await Promise.all([
                supabase
                    .from('return_requests')
                    .select(`
                        id, order_id, request_type, reason, status, admin_notes, created_at,
                        products (id, name, image_url),
                        customers (id, name, phone, email)
                    `)
                    .order('created_at', { ascending: false }),
                
                supabase
                    .from('refunds')
                    .select(`
                        *,
                        orders:order_id (
                            id, customer_name, customer_phone, customer_email, total_amount, status, created_at
                        )
                    `)
                    .order('created_at', { ascending: false })
            ]);

            setReturns(returnsData.data || []);
            setRefunds(refundsData.data || []);
        } catch (err) {
            console.error('Error fetching returns and refunds:', err);
            showNotification('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const getStatusBadge = (status, type = 'return') => {
        const returnLabels = {
            PENDING: 'Pending',
            APPROVED: 'Approved', 
            REJECTED: 'Rejected',
            COMPLETED: 'Completed'
        };
        
        const refundLabels = {
            REQUESTED: 'Requested',
            APPROVED: 'Approved',
            REJECTED: 'Rejected',
            COMPLETED: 'Completed'
        };

        const labels = type === 'refund' ? refundLabels : returnLabels;
        
        return (
            <span style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'hsl(var(--text-main))'
            }}>
                {labels[status] || status}
            </span>
        );
    };

    const handleProcessClick = (request, action, type) => {
        setSelectedRequest(request);
        setProcessAction(action);
        setProcessNote('');
        setShowProcessModal(true);
    };

    const handleProcessConfirm = async () => {
        if (!selectedRequest || !processAction) return;

        setLoading(true);
        try {
            const now = new Date().toISOString();
            const type = selectedRequest.order_id ? 'return' : 'refund';
            
            if (type === 'return') {
                // Handle return request processing
                let updates = {
                    status: processAction === 'approve' ? 'APPROVED' : 
                            processAction === 'reject' ? 'REJECTED' : 'COMPLETED',
                    admin_notes: processNote || `Processed by Admin on ${new Date().toLocaleString()}`
                };

                const { error: returnError } = await supabase
                    .from('return_requests')
                    .update(updates)
                    .eq('id', selectedRequest.id);

                if (returnError) throw returnError;

                // Add activity log
                await supabase.from('order_status_logs').insert({
                    order_id: selectedRequest.order_id,
                    status: updates.status,
                    notes: `Return ${updates.status}: ${processNote || 'Processed by Admin'}`,
                    created_at: now
                });

                // Send WhatsApp notification
                try {
                    await fetch('/api/returns/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            requestId: selectedRequest.id, 
                            status: updates.status, 
                            notes: processNote 
                        })
                    });
                } catch (err) {
                    console.error('WhatsApp notification error:', err);
                }

            } else if (type === 'refund') {
                // Handle refund request processing
                let updates = {
                    status: processAction === 'approve' ? 'APPROVED' : 
                            processAction === 'reject' ? 'REJECTED' : 'COMPLETED',
                    admin_notes: processNote || `Processed by Admin on ${new Date().toLocaleString()}`
                };

                const { error: refundError } = await supabase
                    .from('refunds')
                    .update(updates)
                    .eq('id', selectedRequest.id);

                if (refundError) throw refundError;

                // Order status update (only for COMPLETION)
                if (processAction === 'complete') {
                    await supabase.from('orders').update({ 
                        status: 'REFUNDED',
                        admin_notes: `Refund processed and completed on ${new Date().toLocaleString()}. Note: ${processNote}`
                    }).eq('id', selectedRequest.order_id);
                }

                // Add activity log
                await supabase.from('order_status_logs').insert({
                    order_id: selectedRequest.order_id,
                    status: updates.status,
                    notes: `Refund ${updates.status}: ${processNote || 'Processed by Admin'}`,
                    created_at: now
                });

                // Send WhatsApp notification
                try {
                    await fetch('/api/refunds/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            refundId: selectedRequest.id, 
                            status: updates.status, 
                            notes: processNote 
                        })
                    });
                } catch (err) {
                    console.error('WhatsApp notification error:', err);
                }
            }

            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} ${processAction}ed successfully`, 'success');
            setShowProcessModal(false);
            setProcessAction(null);
            setProcessNote('');
            fetchReturnsAndRefunds();
        } catch (err) {
            console.error(`Error processing ${type}:`, err.message || err);
            showNotification(`Failed to process ${type}: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter functions
    const filteredReturns = returns.filter(r => {
        const matchesSearch = 
            r.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.customers?.phone?.includes(searchTerm) ||
            r.order_id?.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesType = requestTypeFilter === 'ALL' || r.request_type === requestTypeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const filteredRefunds = refunds.filter(r => {
        const matchesSearch = 
            r.orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.orders?.customer_phone?.includes(searchTerm) ||
            r.order_id?.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesType = requestTypeFilter === 'ALL' || requestTypeFilter === 'REFUND';
        return matchesSearch && matchesStatus && matchesType;
    });

    // Pagination
    const totalReturnPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);
    const totalRefundPages = Math.ceil(filteredRefunds.length / ITEMS_PER_PAGE);
    const paginatedReturns = filteredReturns.slice((returnsPage - 1) * ITEMS_PER_PAGE, returnsPage * ITEMS_PER_PAGE);
    const paginatedRefunds = filteredRefunds.slice((refundsPage - 1) * ITEMS_PER_PAGE, refundsPage * ITEMS_PER_PAGE);

    // Reset to page 1 on search or filter
    useEffect(() => { setReturnsPage(1); setRefundsPage(1); }, [searchTerm, statusFilter, requestTypeFilter]);

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
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
                            onClick={fetchReturnsAndRefunds}
                        />
                        Returns & Refunds Management
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
                        Manage customer return requests, exchange requests, and refund requests
                    </p>
                </div>
                <button onClick={() => window.location.href = '/admin'} className="btn btn-secondary">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Returns', value: returns.length, icon: RotateCcw, color: '#6b7280' },
                    { label: 'Pending Returns', value: returns.filter(r => r.status === 'PENDING').length, icon: Clock, color: '#d97706' },
                    { label: 'Total Refunds', value: refunds.length, icon: DollarSign, color: '#059669' },
                    { label: 'Pending Refunds', value: refunds.filter(r => r.status === 'REQUESTED').length, icon: Clock, color: '#d97706' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        padding: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: '12px',
                        border: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '12px',
                            background: `${stat.color}15`, color: stat.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>{stat.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</div>
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
                        placeholder="Search by customer name, phone, or order ID..."
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
                    style={{ width: '150px' }}
                >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                </select>
                <select
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                    className="admin-input"
                    style={{ width: '150px' }}
                >
                    <option value="ALL">All Types</option>
                    <option value="RETURN">Returns</option>
                    <option value="EXCHANGE">Exchanges</option>
                    <option value="REFUND">Refunds</option>
                </select>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setRequestTypeFilter('ALL')}
                    className={requestTypeFilter === 'ALL' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    All ({returns.length + refunds.length})
                </button>
                <button
                    onClick={() => setRequestTypeFilter('RETURN')}
                    className={requestTypeFilter === 'RETURN' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    Returns ({returns.length})
                </button>
                <button
                    onClick={() => setRequestTypeFilter('EXCHANGE')}
                    className={requestTypeFilter === 'EXCHANGE' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    Exchanges ({returns.filter(r => r.request_type === 'EXCHANGE').length})
                </button>
                <button
                    onClick={() => setRequestTypeFilter('REFUND')}
                    className={requestTypeFilter === 'REFUND' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    Refunds ({refunds.length})
                </button>
            </div>

            {/* Returns Table */}
            {(requestTypeFilter === 'ALL' || requestTypeFilter === 'RETURN' || requestTypeFilter === 'EXCHANGE') && (
                <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflowX: 'auto', marginBottom: '2rem' }}>
                    <h2 style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', fontSize: '1.125rem', fontWeight: 600 }}>
                        Return Requests {requestTypeFilter !== 'ALL' && `(${requestTypeFilter})`}
                    </h2>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                            <RefreshCcw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                            <p>Loading...</p>
                        </div>
                    ) : filteredReturns.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>No return requests found</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Requested</th>
                                    <th style={{ minWidth: '220px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedReturns.map((request) => (
                                    <tr key={request.id}>
                                        <td>#{request.order_id}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600 }}>{request.customers?.name || 'N/A'}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {request.customers?.phone}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: request.request_type === 'RETURN' ? '#dc2626' : '#2563eb',
                                                color: 'white'
                                            }}>
                                                {request.request_type}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {request.reason || 'No reason provided'}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(request.status, 'return')}</td>
                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                            {new Date(request.created_at).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                                >
                                                    View
                                                </button>
                                                {request.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleProcessClick(request, 'approve', 'return')}
                                                            className="btn btn-primary"
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#2563eb' }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcessClick(request, 'reject', 'return')}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#dc2626' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {request.status === 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleProcessClick(request, 'complete', 'return')}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#059669' }}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalReturnPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                            <button onClick={() => setReturnsPage(p => Math.max(1, p - 1))} disabled={returnsPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: returnsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {(() => {
                                    const pages = [];
                                    const range = 1;
                                    pages.push(1);
                                    if (returnsPage > range + 2) pages.push('...');
                                    for (let i = Math.max(2, returnsPage - range); i <= Math.min(totalReturnPages - 1, returnsPage + range); i++) { pages.push(i); }
                                    if (returnsPage < totalReturnPages - range - 1) pages.push('...');
                                    if (totalReturnPages > 1) pages.push(totalReturnPages);
                                    return pages.map((page, i) => (
                                        page === '...' ? (
                                            <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                        ) : (
                                            <button key={page} onClick={() => setReturnsPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: returnsPage === page ? 'hsl(var(--primary))' : '#ffffff', color: returnsPage === page ? 'white' : 'hsl(var(--text-main))', border: returnsPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                        )
                                    ));
                                })()}
                            </div>
                            <button onClick={() => setReturnsPage(p => Math.min(totalReturnPages, p + 1))} disabled={returnsPage === totalReturnPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: returnsPage === totalReturnPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Refunds Table */}
            {(requestTypeFilter === 'ALL' || requestTypeFilter === 'REFUND') && (
                <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflowX: 'auto', marginBottom: '2rem' }}>
                    <h2 style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', fontSize: '1.125rem', fontWeight: 600 }}>
                        Refund Requests
                    </h2>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                            <RefreshCcw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                            <p>Loading...</p>
                        </div>
                    ) : filteredRefunds.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                            <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>No refund requests found</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Refund Amount</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Requested</th>
                                    <th style={{ minWidth: '220px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRefunds.map((refund) => (
                                    <tr key={refund.id}>
                                        <td>#{refund.order_id}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600 }}>{refund.orders?.customer_name || 'N/A'}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {refund.orders?.customer_phone}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>
                                            ₹{refund.amount?.toLocaleString()}
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {refund.reason || 'No reason provided'}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(refund.status, 'refund')}</td>
                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                            {new Date(refund.created_at).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => { setSelectedRequest(refund); setShowDetailModal(true); }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                                >
                                                    View
                                                </button>
                                                {refund.status === 'REQUESTED' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleProcessClick(refund, 'approve', 'refund')}
                                                            className="btn btn-primary"
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#2563eb' }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcessClick(refund, 'reject', 'refund')}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#dc2626' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {refund.status === 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleProcessClick(refund, 'complete', 'refund')}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#059669' }}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Refunds Pagination */}
                    {totalRefundPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                            <button onClick={() => setRefundsPage(p => Math.max(1, p - 1))} disabled={refundsPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: refundsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {(() => {
                                    const pages = [];
                                    const range = 1;
                                    pages.push(1);
                                    if (refundsPage > range + 2) pages.push('...');
                                    for (let i = Math.max(2, refundsPage - range); i <= Math.min(totalRefundPages - 1, refundsPage + range); i++) { pages.push(i); }
                                    if (refundsPage < totalRefundPages - range - 1) pages.push('...');
                                    if (totalRefundPages > 1) pages.push(totalRefundPages);
                                    return pages.map((page, i) => (
                                        page === '...' ? (
                                            <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                        ) : (
                                            <button key={page} onClick={() => setRefundsPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: refundsPage === page ? 'hsl(var(--primary))' : '#ffffff', color: refundsPage === page ? 'white' : 'hsl(var(--text-main))', border: refundsPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                        )
                                    ));
                                })()}
                            </div>
                            <button onClick={() => setRefundsPage(p => Math.min(totalRefundPages, p + 1))} disabled={refundsPage === totalRefundPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: refundsPage === totalRefundPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedRequest && (
                <ModalPortal>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem'
                    }}>
                        <div style={{
                            background: 'hsl(var(--bg-card))', borderRadius: '16px',
                            maxWidth: '700px', width: '100%', maxHeight: '90vh',
                            overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {selectedRequest.order_id ? (
                                        <>
                                            <RotateCcw size={24} color="hsl(var(--warning))" />
                                            {selectedRequest.amount ? 'Refund' : 'Return'} Details
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={24} color="hsl(var(--warning))" />
                                            Return Details
                                        </>
                                    )}
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
                                        ORDER INFORMATION
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Order ID</div>
                                            <div style={{ fontWeight: 600 }}>#{selectedRequest.order_id}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Customer</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {selectedRequest.customers?.name || 'N/A'}
                                            </div>
                                        </div>
                                        {selectedRequest.customers?.phone && (
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Phone</div>
                                                <div style={{ fontWeight: 600 }}>{selectedRequest.customers.phone}</div>
                                            </div>
                                        )}
                                        {selectedRequest.products && (
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Product</div>
                                                <div style={{ fontWeight: 600 }}>{selectedRequest.products.name}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Request/Refund Info */}
                                <div style={{ 
                                    padding: '1rem', background: '#fef3c7', 
                                    borderRadius: '12px', marginBottom: '1.5rem',
                                    border: selectedRequest.amount ? '1px solid #f59e0b' : '1px solid #e5e7eb'
                                }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: selectedRequest.amount ? '#d97706' : '#6b7280' }}>
                                        {selectedRequest.amount ? 'REFUND' : 'RETURN'} INFORMATION
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        {selectedRequest.amount && (
                                            <>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Refund Amount</div>
                                                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#d97706' }}>
                                                        ₹{selectedRequest.amount?.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Status</div>
                                                    <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(selectedRequest.status, selectedRequest.amount ? 'refund' : 'return')}</div>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: selectedRequest.amount ? '#b45309' : '#6b7280' }}>Type</div>
                                            <div style={{ fontWeight: 600 }}>{selectedRequest.request_type || (selectedRequest.amount ? 'REFUND' : 'RETURN')}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: selectedRequest.amount ? '#b45309' : '#6b7280' }}>Reason</div>
                                            <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                                                {selectedRequest.reason || 'No reason provided'}
                                            </div>
                                        </div>
                                        {selectedRequest.admin_notes && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: selectedRequest.amount ? '#b45309' : '#6b7280' }}>Admin Notes</div>
                                                <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                                                    {selectedRequest.admin_notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    {selectedRequest.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRequest, 'reject', selectedRequest.amount ? 'refund' : 'return'); }}
                                                className="btn btn-secondary"
                                                style={{ color: '#dc2626' }}
                                            >
                                                <XCircle size={18} /> Reject
                                            </button>
                                            <button
                                                onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRequest, 'approve', selectedRequest.amount ? 'refund' : 'return'); }}
                                                className="btn btn-primary"
                                                style={{ background: '#2563eb' }}
                                            >
                                                <CheckCircle size={18} /> Approve
                                            </button>
                                        </>
                                    )}
                                    {selectedRequest.status === 'APPROVED' && (
                                        <button
                                            onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRequest, 'complete', selectedRequest.amount ? 'refund' : 'return'); }}
                                            className="btn btn-primary"
                                            style={{ background: '#059669' }}
                                        >
                                            {selectedRequest.amount ? <><DollarSign size={18} /> Mark Complete</> : <><TrendingUp size={18} /> Mark Complete</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Process Modal */}
            {showProcessModal && selectedRequest && (
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
                                    {processAction === 'approve' && <><CheckCircle size={24} color="#2563eb" /> Approve {selectedRequest.amount ? 'Refund' : 'Return'}</>}
                                    {processAction === 'reject' && <><XCircle size={24} color="#dc2626" /> Reject {selectedRequest.amount ? 'Refund' : 'Return'}</>}
                                    {processAction === 'complete' && <>{selectedRequest.amount ? <><DollarSign size={24} color="#059669" /> Complete Refund</> : <><TrendingUp size={24} color="#059669" /> Complete Return</>}</>}
                                </h3>
                                <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
                                    {processAction === 'approve' && `Are you sure you want to approve this ${selectedRequest.amount ? 'refund' : 'return'} request? The customer will be notified.`}
                                    {processAction === 'reject' && `Are you sure you want to reject this ${selectedRequest.amount ? 'refund' : 'return'} request? Please provide a reason.`}
                                    {processAction === 'complete' && `Confirm that this ${selectedRequest.amount ? 'refund has been processed' : 'return has been processed'} and amount has been returned to the customer.`}
                                </p>
                                <textarea
                                    placeholder={processAction === 'reject' ? 'Reason for rejection...' : 'Additional notes (optional)...'}
                                    value={processNote}
                                    onChange={(e) => setProcessNote(e.target.value)}
                                    style={{ width: '100%', minHeight: '100px', marginBottom: '1rem' }}
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
                                        {loading ? 'Processing...' : 'Confirm'}
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
