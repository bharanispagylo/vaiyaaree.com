'use client';
import { useState, useEffect } from 'react';
import { Package, RefreshCw, Search, CheckCircle, XCircle, Clock, Link as LinkIcon, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ModalPortal from '@/components/ModalPortal';
export default function AdminReturnsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    useEffect(() => {
        fetchRequests();
    }, []);
    async function fetchRequests() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('return_requests')
                .select(`
                    id, order_id, request_type, reason, status, admin_notes, created_at,
                    products (id, name, image_url),
                    customers (id, name, phone, email)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Fetch Returns Error:', err);
        } finally {
            setLoading(false);
        }
    }
    async function updateStatus(id, newStatus) {
        setProcessing(true);
        try {
            const updates = { status: newStatus };
            if (notes) updates.admin_notes = notes;
            const { error } = await supabase
                .from('return_requests')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            // 1. Send WhatsApp Notification
            try {
                await fetch('/api/returns/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId: id, status: newStatus, notes: notes })
                });
            } catch (err) {
                console.error('WhatsApp notify error:', err);
            }
            // 2. If it's a RETURN and APPROVED, create an entry in the Refunds table
            const currentReq = requests.find(r => r.id === id);
            if (currentReq) {
                // Handle status sync with master orders table
                // Handle status sync with master orders table
                if (newStatus === 'COMPLETED') {
                    const masterStatus = currentReq.request_type === 'RETURN' ? 'RETURNED' : 'EXCHANGED';
                    await supabase.from('orders').update({ status: masterStatus }).eq('id', currentReq.order_id);
                }
                if (newStatus === 'APPROVED') {
                    const masterStatus = currentReq.request_type === 'RETURN' ? 'REFUND_REQUESTED' : 'EXCHANGED';
                    await supabase.from('orders').update({ status: masterStatus }).eq('id', currentReq.order_id);
                }
                if (currentReq.request_type === 'RETURN' && newStatus === 'APPROVED') {
                    // Check if order details exist to get original amount
                    const { data: orderData } = await supabase
                        .from('orders')
                        .select('total_amount, id')
                        .eq('id', currentReq.order_id)
                        .single();
                    if (orderData) {
                        await supabase.from('refunds').insert({
                            order_id: orderData.id,
                            amount: orderData.total_amount,
                            status: 'REQUESTED',
                            reason: `Approved Return Request: ${currentReq.reason}`,
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
            fetchRequests();
            setSelectedRequest(null);
            setNotes('');
        } catch (err) {
            console.error('Update Return Error:', err);
            alert('Failed to update status');
        } finally {
            setProcessing(false);
        }
    }
    const filteredRequests = requests.filter(r => {
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesSearch =
            r.order_id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.products?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.customers?.phone?.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}>
            <main>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Returns & Exchanges</h1>
                        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Manage customer return and replacement requests</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search by Order ID, Product, or Customer Phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: '#fff', fontWeight: 600, color: '#475569' }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 1rem' }} />
                        <p>Loading requests...</p>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th>ORDER / CUSTOMER</th>
                                    <th>PRODUCT</th>
                                    <th>TYPE</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>DATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRequests.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No requests found</td></tr>
                                ) : paginatedRequests.map(req => (
                                    <tr
                                        key={req.id}
                                        onClick={() => { setSelectedRequest(req); setNotes(req.admin_notes || ''); }}
                                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: '#000', marginBottom: '0.25rem' }}>#{req.order_id}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                {req.customers?.name || 'Guest'} ({req.customers?.phone || 'N/A'})
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '45px', height: '45px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                                    {req.products?.image_url ? (
                                                        <img src={req.products.image_url.split(',')[0]} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="#94a3b8" /></div>
                                                    )}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                                                    {req.products?.name || (req.product_id === 'ALL_ORDER' ? 'Entire Order' : 'Unknown Product')}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                                                background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a'
                                            }}>
                                                {req.request_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                                                background: req.status === 'PENDING' ? '#fffbeb' : req.status === 'APPROVED' ? '#f0fdf4' : req.status === 'REJECTED' ? '#fef2f2' : '#f8fafc',
                                                color: req.status === 'PENDING' ? '#b45309' : req.status === 'APPROVED' ? '#15803d' : req.status === 'REJECTED' ? '#b91c1c' : '#475569',
                                                border: `1px solid ${req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : req.status === 'REJECTED' ? '#fee2e2' : '#e2e8f0'}`
                                            }}>
                                                {req.status === 'PENDING' ? <Clock size={12} strokeWidth={2.5} /> : req.status === 'APPROVED' ? <CheckCircle size={12} strokeWidth={2.5} /> : req.status === 'REJECTED' ? <XCircle size={12} strokeWidth={2.5} /> : <Package size={12} strokeWidth={2.5} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                                            {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button key={i} onClick={() => setCurrentPage(i + 1)} style={{
                                            width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                            background: currentPage === i + 1 ? 'hsl(var(--primary))' : 'transparent',
                                            color: currentPage === i + 1 ? 'white' : '#64748b', fontWeight: 700
                                        }}>{i + 1}</button>
                                    ))}
                                </div>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Next</button>
                            </div>
                        )}
                    </div>
                )}
            </main>
            {/* Edit Modal */}
            {selectedRequest && (
                <ModalPortal>
                    <div className="modal-overlay">
                        <div className="modal-box" style={{ textAlign: 'left', maxWidth: '600px', padding: '0', overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '2rem 2.5rem', background: 'linear-gradient(to right, #f8fafc, #fff)', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 className="modal-title" style={{ marginBottom: '0.25rem' }}>Process {selectedRequest.request_type}</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Review and update the status of this request</p>
                                </div>
                                <button onClick={() => setSelectedRequest(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>&times;</button>
                            </div>
                            {/* Content */}
                            <div style={{ padding: '2.5rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--primary))' }}></div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer Reason</span>
                                    </div>
                                    <p style={{ color: '#334155', lineHeight: 1.6, margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>"{selectedRequest.reason}"</p>
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notes (Internal)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add internal notes about this return..."
                                        rows={4}
                                        style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', outline: 'none', background: '#fff', fontSize: '0.95rem', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                        onFocus={e => e.target.style.borderColor = '#000'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                {/* Actions */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                    <button
                                        onClick={() => updateStatus(selectedRequest.id, 'APPROVED')}
                                        disabled={processing || selectedRequest.status === 'APPROVED'}
                                        className="modal-btn"
                                        style={{ flex: 1, background: '#10b981', color: '#fff', opacity: processing || selectedRequest.status === 'APPROVED' ? 0.5 : 1, minWidth: '150px' }}
                                    >
                                        Approve Request
                                    </button>
                                    <button
                                        onClick={() => updateStatus(selectedRequest.id, 'REJECTED')}
                                        disabled={processing || selectedRequest.status === 'REJECTED'}
                                        className="modal-btn"
                                        style={{ flex: 1, background: '#ef4444', color: '#fff', opacity: processing || selectedRequest.status === 'REJECTED' ? 0.5 : 1, minWidth: '150px' }}
                                    >
                                        Reject Request
                                    </button>
                                    <button
                                        onClick={() => updateStatus(selectedRequest.id, 'COMPLETED')}
                                        disabled={processing || selectedRequest.status === 'COMPLETED'}
                                        className="modal-btn"
                                        style={{ flex: '1 1 100%', background: '#0f172a', color: '#fff', opacity: processing || selectedRequest.status === 'COMPLETED' ? 0.5 : 1 }}
                                    >
                                        Mark Completed
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
