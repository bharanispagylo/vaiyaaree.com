'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useShop } from '@/context/ShopContext';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, RefreshCcw, Clock, CheckCircle, XCircle, AlertCircle, 
    DollarSign, Package, User, Phone, Calendar, Search, Filter,
    ChevronDown, ChevronUp, MessageSquare, Mail, ExternalLink
} from 'lucide-react';

export default function RefundsPage() {
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

    // Fetch refunds
    useEffect(() => {
        fetchRefunds();
    }, []);

    const fetchRefunds = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('refunds')
                .select(`
                    *,
                    orders:order_id (
                        id, customer_name, customer_phone, total_amount, status, created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRefunds(data || []);
        } catch (err) {
            console.error('Error fetching refunds:', err);
            showNotification('Failed to load refunds', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const getStatusBadge = (status) => {
        const styles = {
            REQUESTED: { bg: '#fef3c7', color: '#d97706', label: 'Requested' },
            APPROVED: { bg: '#dbeafe', color: '#2563eb', label: 'Approved' },
            REJECTED: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
            COMPLETED: { bg: '#d1fae5', color: '#059669', label: 'Completed' }
        };
        const style = styles[status] || styles.REQUESTED;
        return (
            <span style={{
                padding: '0.35rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem',
                fontWeight: 700, background: style.bg, color: style.color,
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                {status === 'REQUESTED' && <Clock size={12} />}
                {status === 'APPROVED' && <CheckCircle size={12} />}
                {status === 'REJECTED' && <XCircle size={12} />}
                {status === 'COMPLETED' && <CheckCircle size={12} />}
                {style.label}
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
                admin_notes: processNote,
                updated_at: now
            };

            if (processAction === 'approve') {
                updates.approved_at = now;
            } else if (processAction === 'complete') {
                updates.completed_at = now;
                // Update order status to REFUNDED
                await supabase.from('orders').update({ 
                    status: 'REFUNDED',
                    updated_at: now 
                }).eq('id', selectedRefund.order_id);
            }

            const { error } = await supabase
                .from('refunds')
                .update(updates)
                .eq('id', selectedRefund.id);

            // Add activity log manually
            await supabase.from('order_status_logs').insert({
                order_id: selectedRefund.order_id,
                status: updates.status,
                notes: `Refund ${updates.status}: ${processNote || 'Processed by Admin'}`,
                created_at: now
            });

            if (error) throw error;

            // Send notification to customer
            await sendRefundNotification(selectedRefund, updates.status);

            showNotification(`Refund ${processAction}ed successfully`, 'success');
            setShowProcessModal(false);
            setProcessAction(null);
            setProcessNote('');
            fetchRefunds();
        } catch (err) {
            console.error('Error processing refund:', err);
            showNotification('Failed to process refund', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sendRefundNotification = async (refund, status) => {
        try {
            // This would integrate with your WhatsApp/email notification system
            const order = refund.orders;
            if (!order) return;

            const message = status === 'APPROVED' 
                ? `Your refund request for Order #${order.id} has been APPROVED. Refund amount: ₹${refund.amount}. It will be processed within 5-7 business days.`
                : status === 'REJECTED'
                ? `Your refund request for Order #${order.id} has been REJECTED. Reason: ${refund.admin_notes || 'Please contact support for details.'}`
                : `Your refund for Order #${order.id} has been COMPLETED. Amount ₹${refund.amount} has been refunded to your original payment method.`;

            // Call notification API
            await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: order.customer_phone,
                    message: message,
                    type: 'refund_update'
                })
            });
        } catch (err) {
            console.error('Error sending notification:', err);
        }
    };

    const getTimeline = (refund) => {
        const timeline = [];
        if (refund.created_at) {
            timeline.push({ time: refund.created_at, label: 'Request Submitted', icon: Clock, color: '#6b7280' });
        }
        if (refund.approved_at) {
            timeline.push({ time: refund.approved_at, label: 'Request Approved', icon: CheckCircle, color: '#2563eb' });
        }
        if (refund.rejected_at) {
            timeline.push({ time: refund.rejected_at, label: 'Request Rejected', icon: XCircle, color: '#dc2626' });
        }
        if (refund.completed_at) {
            timeline.push({ time: refund.completed_at, label: 'Refund Completed', icon: CheckCircle, color: '#059669' });
        }
        return timeline;
    };

    const filteredRefunds = refunds.filter(r => {
        const matchesSearch = 
            r.orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.orders?.customer_phone?.includes(searchTerm) ||
            r.order_id?.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                        <RefreshCcw size={32} color="hsl(var(--warning))" />
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
                    { label: 'Total Requests', value: refunds.length, icon: RefreshCcw, color: '#6b7280' },
                    { label: 'Pending', value: refunds.filter(r => r.status === 'REQUESTED').length, icon: Clock, color: '#d97706' },
                    { label: 'Approved', value: refunds.filter(r => r.status === 'APPROVED').length, icon: CheckCircle, color: '#2563eb' },
                    { label: 'Completed', value: refunds.filter(r => r.status === 'COMPLETED').length, icon: DollarSign, color: '#059669' }
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
            <div style={{ background: 'hsl(var(--bg-card))', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', overflow: 'hidden' }}>
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
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRefunds.map((refund) => (
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
                                    <td style={{ fontWeight: 700, color: 'hsl(var(--warning))' }}>
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
                                                onClick={() => { setSelectedRefund(refund); setShowDetailModal(true); }}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                            >
                                                View
                                            </button>
                                            {refund.status === 'REQUESTED' && (
                                                <>
                                                    <button
                                                        onClick={() => handleProcessClick(refund, 'approve')}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#2563eb' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcessClick(refund, 'reject')}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#dc2626' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {refund.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleProcessClick(refund, 'complete')}
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
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedRefund && (
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
                                        <div style={{ fontWeight: 600 }}>{selectedRefund.orders?.customer_phone}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Info */}
                            <div style={{ 
                                padding: '1rem', background: '#fef3c7', 
                                borderRadius: '12px', marginBottom: '1.5rem',
                                border: '1px solid #f59e0b'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#d97706' }}>
                                    REFUND INFORMATION
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Refund Amount</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#d97706' }}>
                                            ₹{selectedRefund.amount?.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Status</div>
                                        <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(selectedRefund.status)}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Reason</div>
                                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                                        {selectedRefund.reason || 'No reason provided'}
                                    </div>
                                </div>
                                {selectedRefund.admin_notes && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Admin Notes</div>
                                        <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                                            {selectedRefund.admin_notes}
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
            )}

            {/* Process Modal */}
            {showProcessModal && (
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
            )}
        </div>
    );
}
