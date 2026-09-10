'use client';

import React from 'react';
import { 
    Truck, Send, Trash2, Loader2, AlertCircle, XCircle, 
    ShieldAlert, FileText, ExternalLink 
} from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/ordersHelpers';

export default function OrderActionsCard({
    selectedOrder,
    loading,
    isUpdatingStatus,
    onUpdateStatus,
    openCourierModal,
    onOpenSendInfo,
    onDeleteOrder,
    onResendEmail,
    onResendWhatsApp,
    statusConfirmModal,
    setStatusConfirmModal,
    showCancelModal,
    setShowCancelModal,
    cancelReason,
    setCancelReason,
    handleCancelOrder,
    notificationSelection,
    setNotificationSelection,
    notification
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Primary Order Actions Card */}
            <div className="card-sub" style={{ 
                padding: '1.5rem', 
                background: '#ffffff', 
                borderRadius: '16px', 
                border: '1px solid hsl(var(--border-subtle))',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>
                        Order Management Actions
                    </h4>
                    {isUpdatingStatus && (
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                            <Loader2 size={13} className="animate-spin" /> Updating...
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                    {/* Status Dropdown */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <select
                            value={selectedOrder.status}
                            disabled={loading || isUpdatingStatus}
                            onChange={(e) => {
                                const newStatus = e.target.value;
                                if (isUpdatingStatus) return;
                                setStatusConfirmModal(null);

                                if (newStatus === 'SHIPPED') {
                                    openCourierModal(selectedOrder, false);
                                } else if (newStatus === 'CANCELLED') {
                                    setShowCancelModal(true);
                                } else if (['PAID', 'PACKING', 'DELIVERED'].includes(newStatus)) {
                                    setStatusConfirmModal({
                                        status: newStatus,
                                        title: `Confirm ${newStatus}`,
                                        message: `Change order status to ${newStatus}? This will automatically trigger WhatsApp and Email notifications to the customer.`,
                                    });
                                } else {
                                    onUpdateStatus(selectedOrder.id, newStatus);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                paddingRight: isUpdatingStatus ? '2.5rem' : '0.75rem',
                                borderRadius: '10px',
                                background: isUpdatingStatus ? '#e2e8f0' : '#f8fafc',
                                border: isUpdatingStatus ? '1px solid hsl(var(--primary) / 0.5)' : '1px solid #cbd5e1',
                                color: isUpdatingStatus ? '#64748b' : 'hsl(var(--text-main))',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                fontWeight: 700,
                                fontSize: '0.88rem'
                            }}
                        >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {isUpdatingStatus && (
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'hsl(var(--primary))',
                                pointerEvents: 'none'
                            }}>
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Status Confirmation Dialog */}
                    {statusConfirmModal && (
                        <div className="animate-enter" style={{ marginTop: '0.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} /> {statusConfirmModal.title}
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                                {statusConfirmModal.message}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => setStatusConfirmModal(null)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={async () => {
                                        if (isUpdatingStatus) return;
                                        await onUpdateStatus(selectedOrder.id, statusConfirmModal.status);
                                        setStatusConfirmModal(null);
                                    }}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                >
                                    {isUpdatingStatus ? <Loader2 size={13} className="animate-spin" /> : 'Confirm Update'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Cancel Order Dialog */}
                    {showCancelModal && (
                        <div className="animate-enter" style={{ marginTop: '0.5rem', padding: '1rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <XCircle size={14} /> Cancel Order & Process Refund
                            </div>
                            <textarea
                                placeholder="Enter cancellation reason (customer will be notified)..."
                                value={cancelReason}
                                disabled={loading || isUpdatingStatus}
                                onChange={e => setCancelReason(e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '0.55rem', background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.82rem' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    disabled={loading || isUpdatingStatus}
                                    onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelOrder}
                                    disabled={!cancelReason.trim() || loading || isUpdatingStatus}
                                    className="btn btn-primary"
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '0.5rem',
                                        background: '#ef4444',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    {isUpdatingStatus ? <Loader2 size={13} className="animate-spin" /> : 'Confirm Cancel'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Courier Assignment Button */}
                    {['PLACED', 'PAID', 'PACKING', 'SHIPPED'].includes(selectedOrder.status) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button 
                                type="button" 
                                onClick={() => openCourierModal(selectedOrder, false)} 
                                className="btn btn-primary" 
                                style={{ width: '100%', background: '#0f172a', padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Truck size={16} /> {selectedOrder.courier_name ? 'Update Courier Tracking' : 'Assign Courier Partner'}
                            </button>
                            
                            {selectedOrder.courier_name && (
                                <button
                                    type="button"
                                    onClick={() => onOpenSendInfo(selectedOrder, false)}
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    {loading && notification?.type === 'info' ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Send Tracking Info to Customer</>}
                                </button>
                            )}

                            {selectedOrder.tracking_url && (
                                <a
                                    href={selectedOrder.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ width: '100%', background: '#f0f9ff', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', padding: '0.6rem 1rem' }}
                                >
                                    <ExternalLink size={14} /> Track Package Live
                                </a>
                            )}
                        </div>
                    )}

                    {!selectedOrder.courier_name && (
                        <button
                            type="button"
                            onClick={() => onOpenSendInfo(selectedOrder, false)}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.25rem', gap: '6px', background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                        >
                            <Send size={15} /> Send WhatsApp / Email Notification
                        </button>
                    )}

                    {/* Delete Order Action */}
                    <button
                        type="button"
                        onClick={() => onDeleteOrder([selectedOrder.id])}
                        className="btn"
                        style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '0.65rem 1rem',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}
                    >
                        <Trash2 size={15} /> Delete Order Record
                    </button>

                    {/* Notification Selection Modal for multi-contact orders */}
                    {notificationSelection && (
                        <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Send size={14} />
                                Select {notificationSelection.type === 'email' ? 'Email' : 'Phone'} Target
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                Multiple contacts found. Choose which target to dispatch:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => notificationSelection.type === 'email' ? onResendEmail(notificationSelection.billing) : onResendWhatsApp(notificationSelection.billing)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                >
                                    <strong>Billing:</strong> {notificationSelection.billing}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => notificationSelection.type === 'email' ? onResendEmail(notificationSelection.shipping) : onResendWhatsApp(notificationSelection.shipping)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                >
                                    <strong>Shipping:</strong> {notificationSelection.shipping}
                                </button>
                                <button type="button" onClick={() => setNotificationSelection(null)} className="btn" style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Notes */}
            {selectedOrder.admin_notes && (
                <div className="card-sub" style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                        <ShieldAlert size={14} /> Internal Admin Notes
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0, lineHeight: 1.4 }}>{selectedOrder.admin_notes}</p>
                </div>
            )}

            {/* Customer Notes */}
            {selectedOrder.customer_notes && (
                <div className="card-sub" style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '16px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                        <FileText size={14} /> Customer Instructions
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0, lineHeight: 1.4 }}>{selectedOrder.customer_notes}</p>
                </div>
            )}
        </div>
    );
}
