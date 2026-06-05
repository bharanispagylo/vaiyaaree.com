'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useShop } from '@/context/ShopContext';
import { useRouter } from 'next/navigation';
import ModalPortal from '@/components/ModalPortal';
import { 
    ArrowLeft, RefreshCcw, Clock, CheckCircle, XCircle, AlertCircle, 
    DollarSign, Package, User, Phone, Calendar, Search, Filter,
    ChevronDown, ChevronUp, MessageSquare, Mail, ExternalLink, ChevronLeft, ChevronRight
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
        } else if (cleaned.startsWith('91') && cleaned.length > 10) {
            return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
        } else if (cleaned.length > 5) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `${part1} ${part2}`;
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
    const [processAction, setProcessAction] = useState(null); // 'approve', 'reject', 'complete'
    const [processNote, setProcessNote] = useState('');
    const [notification, setNotification] = useState(null);
    const [refundsPage, setRefundsPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0
    });
    const REFUNDS_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [refundsPage]);

    const fetchStatusCounts = async () => {
        try {
            const { data, error } = await supabase
                .from('refunds')
                .select('status');
            if (error) throw error;
            const list = data || [];
            setStatusCounts({
                total: list.length,
                pending: list.filter(r => r.status === 'REQUESTED').length,
                approved: list.filter(r => r.status === 'APPROVED').length,
                completed: list.filter(r => r.status === 'COMPLETED').length
            });
        } catch (err) {
            console.error('Error fetching refund status counts:', err);
        }
    };

    const fetchRefunds = async () => {
        setLoading(true);
        try {
            const from = (refundsPage - 1) * REFUNDS_PER_PAGE;
            const to = refundsPage * REFUNDS_PER_PAGE - 1;

            let query = supabase
                .from('refunds')
                .select(`
                    *,
                    orders:order_id (
                        id, customer_name, customer_phone, customer_email, total_amount, status, created_at
                    )
                `, { count: 'exact' });

            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            }

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                if (!isNaN(term)) {
                    query = query.eq('order_id', parseInt(term));
                } else {
                    query = query.or(`reason.ilike.%${term}%,notes.ilike.%${term}%`);
                }
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setRefunds(data || []);
            setTotalCount(count || 0);

            fetchStatusCounts();
        } catch (err) {
            console.error('Error fetching refunds:', err);
            showNotification('Failed to load refunds', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch refunds on changes
    useEffect(() => {
        fetchRefunds();

        const channel = supabase
            .channel('refunds_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'refunds' 
            }, () => {
                fetchRefunds();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refundsPage, searchTerm, statusFilter]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const getStatusBadge = (status) => {
        const labels = {
            REQUESTED: 'Requested',
            APPROVED: 'Approved',
            REJECTED: 'Rejected',
            COMPLETED: 'Completed'
        };

        const colors = {
            REQUESTED: { bg: '#fef3c7', text: '#92400e' }, // Soft Amber (same as PENDING)
            APPROVED: { bg: '#dbeafe', text: '#1e40af' },  // Soft Blue
            REJECTED: { bg: '#fee2e2', text: '#991b1b' },  // Soft Red
            COMPLETED: { bg: '#dcfce7', text: '#166534' }  // Soft Green
        };

        const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };

        return (
            <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                background: color.bg,
                color: color.text,
                display: 'inline-block'
            }}>
                {labels[status] || status}
            </span>
        );
    };

    const handleProcessClick = (refund, action) => {
        setSelectedRefund(refund);
        setProcessAction(action);
        setProcessNote('');
        setShowProcessModal(true);
    };

    const handleProcessConfirm = async () => {
        if (!selectedRefund || !processAction) return;

        setLoading(true);
        try {
            const now = new Date().toISOString();
            let updates = {
                status: processAction === 'approve' ? 'APPROVED' : 
                        processAction === 'reject' ? 'REJECTED' : 'COMPLETED',
                notes: processNote,
                processed_at: now
            };

            // Order status update (only for COMPLETION)
            if (processAction === 'complete') {
                const { error: orderError } = await supabase.from('orders').update({ 
                    status: 'REFUNDED',
                    admin_notes: `Refund processed and completed on ${new Date().toLocaleString()}. Note: ${processNote}`
                }).eq('id', selectedRefund.order_id);
                if (orderError) throw orderError;
            }

            // Update main refund record
            const { error: refundError } = await supabase
                .from('refunds')
                .update(updates)
                .eq('id', selectedRefund.id);
            if (refundError) throw refundError;

            // Add activity log manually (Standard auditing)
            const { error: logError } = await supabase.from('order_status_logs').insert({
                order_id: selectedRefund.order_id,
                status: updates.status,
                notes: `Refund ${updates.status}: ${processNote || 'Processed by Admin'}`,
                created_at: now
            });
            if (logError) throw logError;

            // Send notification to customer via WhatsApp
            try {
                await fetch('/api/refunds/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        refundId: selectedRefund.id, 
                        status: updates.status, 
                        notes: processNote 
                    })
                });
            } catch (err) {
                console.error('Notification error:', err);
            }

            showNotification(`Refund ${processAction}ed successfully`, 'success');
            setShowProcessModal(false);
            setProcessAction(null);
            setProcessNote('');
            fetchRefunds();
        } catch (err) {
            console.error('Error processing refund:', err.message || err);
            if (typeof err === 'object') {
                console.log('Detailed error:', JSON.stringify(err, null, 2));
            }
            showNotification(`Failed to process refund: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };


    const getTimeline = (refund) => {
        const timeline = [];
        if (refund.created_at) {
            timeline.push({ time: refund.created_at, label: 'Request Submitted', icon: Clock, color: '#6b7280' });
        }
        if (refund.processed_at) {
            const label = refund.status === 'APPROVED' ? 'Request Approved' :
                         refund.status === 'REJECTED' ? 'Request Rejected' :
                         refund.status === 'COMPLETED' ? 'Refund Completed' : 'Processed';
            const color = refund.status === 'APPROVED' ? '#2563eb' :
                         refund.status === 'REJECTED' ? '#dc2626' :
                         refund.status === 'COMPLETED' ? '#059669' : '#6b7280';
            timeline.push({ time: refund.processed_at, label, icon: CheckCircle, color });
        }
        return timeline;
    };

    const filteredRefunds = refunds;
    const paginatedRefunds = refunds;
    const totalRefundPages = Math.ceil(totalCount / REFUNDS_PER_PAGE);

    // Reset to page 1 on search or filter
    useEffect(() => { setRefundsPage(1); }, [searchTerm, statusFilter]);

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
                        Manage customer refund requests and track refund status
                    </p>
                </div>
                <button onClick={() => router.push('/admin')} className="btn btn-secondary">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Requests', value: statusCounts.total, icon: RefreshCcw, color: '#6b7280' },
                    { label: 'Pending', value: statusCounts.pending, icon: Clock, color: '#d97706' },
                    { label: 'Approved', value: statusCounts.approved, icon: CheckCircle, color: '#2563eb' },
                    { label: 'Completed', value: statusCounts.completed, icon: DollarSign, color: '#059669' }
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
                    style={{ width: '180px' }}
                >
                    <option value="ALL">All Status</option>
                    <option value="REQUESTED">Requested</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            {/* Refunds Table */}
            <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <RefreshCcw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                        <p>Loading...</p>
                    </div>
                ) : filteredRefunds.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Package size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
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
                                <tr key={refund.id} onClick={() => { setSelectedRefund(refund); setShowDetailModal(true); }} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td>#{refund.order_id}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600 }}>{refund.orders?.customer_name || 'N/A'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                {formatDisplayPhoneNumber(refund.orders?.customer_phone)}
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
                                    <td>{getStatusBadge(refund.status)}</td>
                                    <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                        {new Date(refund.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedRefund(refund); setShowDetailModal(true); }}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                            >
                                                View
                                            </button>
                                            {refund.status === 'REQUESTED' && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'approve'); }}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#2563eb' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'reject'); }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#dc2626' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {refund.status === 'APPROVED' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleProcessClick(refund, 'complete'); }}
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

                {/* ── Table Pagination ── */}
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
                        maxWidth: '700px', width: '100%', maxHeight: '90vh',
                        overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCcw size={24} color="hsl(var(--warning))" />
                                Refund Details
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
                                        <div style={{ fontWeight: 600 }}>#{selectedRefund.order_id}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Original Amount</div>
                                        <div style={{ fontWeight: 600 }}>₹{selectedRefund.orders?.total_amount?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Customer</div>
                                        <div style={{ fontWeight: 600 }}>{selectedRefund.orders?.customer_name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Phone</div>
                                        <div style={{ fontWeight: 600 }}>{formatDisplayPhoneNumber(selectedRefund.orders?.customer_phone)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Info */}
                            <div style={{ 
                                padding: '1rem', background: 'hsl(var(--bg-app))', 
                                borderRadius: '12px', marginBottom: '1.5rem',
                                border: '1px solid hsl(var(--border-subtle))'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                    REFUND INFORMATION
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Refund Amount</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'hsl(var(--primary))' }}>
                                            ₹{selectedRefund.amount?.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Status</div>
                                        <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(selectedRefund.status)}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Reason</div>
                                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px' }}>
                                        {selectedRefund.reason || 'No reason provided'}
                                    </div>
                                </div>
                                {selectedRefund.notes && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Admin Notes</div>
                                        <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px' }}>
                                            {selectedRefund.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                    TIMELINE
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {getTimeline(selectedRefund).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: `${item.color}15`, color: item.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <item.icon size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {new Date(item.time).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                {selectedRefund.status === 'REQUESTED' && (
                                    <>
                                        <button
                                            onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRefund, 'reject'); }}
                                            className="btn btn-secondary"
                                            style={{ color: '#dc2626' }}
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRefund, 'approve'); }}
                                            className="btn btn-primary"
                                            style={{ background: '#2563eb' }}
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                    </>
                                )}
                                {selectedRefund.status === 'APPROVED' && (
                                    <button
                                        onClick={() => { setShowDetailModal(false); handleProcessClick(selectedRefund, 'complete'); }}
                                        className="btn btn-primary"
                                        style={{ background: '#059669' }}
                                    >
                                        <DollarSign size={18} /> Mark Complete
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
                                {processAction === 'approve' && <><CheckCircle size={24} color="#2563eb" /> Approve Refund</>}
                                {processAction === 'reject' && <><XCircle size={24} color="#dc2626" /> Reject Refund</>}
                                {processAction === 'complete' && <><DollarSign size={24} color="#059669" /> Complete Refund</>}
                            </h3>
                            
                            <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
                                {processAction === 'approve' && 'Are you sure you want to approve this refund request? The customer will be notified.'}
                                {processAction === 'reject' && 'Are you sure you want to reject this refund request? Please provide a reason.'}
                                {processAction === 'complete' && 'Confirm that the refund has been processed and amount has been returned to the customer.'}
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
