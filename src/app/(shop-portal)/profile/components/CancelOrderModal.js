'use client';

import React from 'react';
import { XCircle } from 'lucide-react';

export default function CancelOrderModal({
    cancelModalOrder,
    setCancelModalOrder,
    cancelReason,
    setCancelReason,
    handleCancelOrderSubmit,
    cancellingOrder
}) {
    if (!cancelModalOrder) return null;

    const displayInv = cancelModalOrder.invoice_no
        ? (cancelModalOrder.invoice_no.startsWith('#') ? cancelModalOrder.invoice_no : `#${cancelModalOrder.invoice_no}`)
        : `#${String(cancelModalOrder.id).replace(/^[A-Z]+-/, 'INV-')}`;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%',
                padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <XCircle size={20} color="#dc2626" /> Cancel Order Request
                    </h3>
                    <button type="button" onClick={() => setCancelModalOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <XCircle size={20} />
                    </button>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        Invoice: {displayInv}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        Total Amount: ₹{Number(cancelModalOrder.total_amount || 0).toLocaleString('en-IN')}
                    </div>
                </div>

                <form onSubmit={handleCancelOrderSubmit}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: '#334155' }}>
                            SELECT CANCELLATION REASON *
                        </label>
                        <select
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                                border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600, fontSize: '0.88rem'
                            }}
                        >
                            <option value="Changed my mind">Changed my mind / Want to re-order</option>
                            <option value="Ordered by mistake">Ordered by mistake</option>
                            <option value="Delivery time too long">Delivery time too long</option>
                            <option value="Found better price elsewhere">Found better price elsewhere</option>
                            <option value="Incorrect shipping address">Incorrect shipping address</option>
                            <option value="Other">Other Reason</option>
                        </select>
                    </div>

                    {/* Razorpay Refund Notice for Paid Orders */}
                    {(cancelModalOrder.status === 'PAID' || cancelModalOrder.payment_method === 'Razorpay') ? (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                            <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                💳 Instant Razorpay Refund
                            </div>
                            A full refund of <strong>₹{Number(cancelModalOrder.total_amount || 0).toLocaleString('en-IN')}</strong> will be automatically credited back to your original payment method (UPI / Bank Account / Card) via Razorpay.
                        </div>
                    ) : (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
                            ℹ️ Cash on Delivery / Unpaid Order. No payment deduction was made.
                        </div>
                    )}

                    <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                        🔒 <strong>Dispatch Protection:</strong> Orders can only be cancelled while in pre-dispatch status. Once packed or handed over to our courier partners, cancellation is locked.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => setCancelModalOrder(null)}
                            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Keep Order
                        </button>
                        <button
                            type="submit"
                            disabled={cancellingOrder}
                            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
                        >
                            {cancellingOrder ? 'Cancelling...' : 'Confirm Cancel Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
