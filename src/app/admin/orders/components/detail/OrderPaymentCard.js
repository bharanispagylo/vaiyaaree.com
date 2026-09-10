'use client';

import React from 'react';
import { CreditCard, CheckCircle2, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { toIST } from '../../utils/ordersHelpers';

export default function OrderPaymentCard({
    selectedOrder,
    isPaidOnline,
    razorpayPaymentId,
    razorpayOrderId,
    razorpayRefundId,
    copiedField,
    onCopyText
}) {
    if (!isPaidOnline && !razorpayPaymentId) return null;

    const isOrderPaid = ['PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes((selectedOrder.status || '').toUpperCase());

    return (
        <div className="card-sub" style={{ 
            padding: '1.25rem', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #bfdbfe',
            boxShadow: '0 4px 20px -2px rgba(59, 130, 246, 0.08)',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Top Accent Strip */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #0284c7, #2563eb, #4f46e5)'
            }} />

            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0284c7, #1e40af)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                    }}>
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <h4 style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 800, 
                            color: '#0f172a', 
                            margin: 0, 
                            letterSpacing: '0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            Razorpay Payment Details
                        </h4>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Online Payment Gateway Verification
                        </div>
                    </div>
                </div>

                {/* Status Pill */}
                <div>
                    {isOrderPaid ? (
                        <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <CheckCircle2 size={13} /> Captured & Paid
                        </span>
                    ) : selectedOrder.status === 'REFUNDED' ? (
                        <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#fdf4ff',
                            border: '1px solid #f0abfc',
                            color: '#a21caf',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            Refunded via Razorpay
                        </span>
                    ) : (
                        <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            {selectedOrder.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Details Box */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.85rem', 
                background: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem'
            }}>
                {/* Razorpay Payment ID */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Razorpay Payment ID
                        </span>
                        {razorpayPaymentId && (
                            <button
                                type="button"
                                onClick={() => onCopyText(razorpayPaymentId, 'payment_id')}
                                style={{
                                    background: copiedField === 'payment_id' ? '#dcfce7' : '#ffffff',
                                    border: `1px solid ${copiedField === 'payment_id' ? '#86efac' : '#cbd5e1'}`,
                                    color: copiedField === 'payment_id' ? '#15803d' : '#475569',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {copiedField === 'payment_id' ? (
                                    <>
                                        <Check size={12} /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} /> Copy
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    <div style={{ 
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 700, 
                        color: razorpayPaymentId ? '#0f172a' : '#94a3b8',
                        fontSize: '0.86rem',
                        letterSpacing: '0.02em',
                        wordBreak: 'break-all'
                    }}>
                        {razorpayPaymentId || 'Payment ID not recorded yet'}
                    </div>
                </div>

                {/* Razorpay Order ID */}
                {(razorpayOrderId || selectedOrder.id) && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Razorpay Order ID
                            </span>
                            {razorpayOrderId && (
                                <button
                                    type="button"
                                    onClick={() => onCopyText(razorpayOrderId, 'order_id')}
                                    style={{
                                        background: copiedField === 'order_id' ? '#dcfce7' : '#ffffff',
                                        border: `1px solid ${copiedField === 'order_id' ? '#86efac' : '#cbd5e1'}`,
                                        color: copiedField === 'order_id' ? '#15803d' : '#475569',
                                        borderRadius: '6px',
                                        padding: '2px 8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {copiedField === 'order_id' ? (
                                        <>
                                            <Check size={12} /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} /> Copy
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <div style={{ 
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: 600, 
                            color: razorpayOrderId ? '#334155' : '#94a3b8',
                            fontSize: '0.82rem',
                            wordBreak: 'break-all'
                        }}>
                            {razorpayOrderId || 'Auto-generated on checkout'}
                        </div>
                    </div>
                )}

                {/* Payment Method & Captured Amount */}
                <div style={{ 
                    borderTop: '1px solid #e2e8f0', 
                    paddingTop: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                }}>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Captured Amount
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                            ₹{Number(selectedOrder.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Payment Gateway
                        </span>
                        <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.82rem' }}>
                            Razorpay Standard
                        </span>
                    </div>
                </div>

                {/* Paid Timestamp & Signature Verification */}
                <div style={{ 
                    borderTop: '1px solid #e2e8f0', 
                    paddingTop: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                }}>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Payment Verified At
                        </span>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.78rem' }}>
                            {toIST(selectedOrder.paid_at || selectedOrder.updated_at || selectedOrder.created_at)}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Security Check
                        </span>
                        <span style={{ 
                            fontWeight: 700, 
                            color: '#059669', 
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <ShieldCheck size={13} /> HMAC Verified
                        </span>
                    </div>
                </div>

                {/* Refund info if applicable */}
                {razorpayRefundId && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Razorpay Refund ID
                            </span>
                            <button
                                type="button"
                                onClick={() => onCopyText(razorpayRefundId, 'refund_id')}
                                style={{
                                    background: copiedField === 'refund_id' ? '#dcfce7' : '#ffffff',
                                    border: `1px solid ${copiedField === 'refund_id' ? '#86efac' : '#cbd5e1'}`,
                                    color: copiedField === 'refund_id' ? '#15803d' : '#475569',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {copiedField === 'refund_id' ? <Check size={12} /> : <Copy size={12} />}
                                {copiedField === 'refund_id' ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div style={{ 
                            fontFamily: 'monospace',
                            fontWeight: 700, 
                            color: '#991b1b',
                            fontSize: '0.82rem'
                        }}>
                            {razorpayRefundId}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {razorpayPaymentId && (
                    <a
                        href={`https://dashboard.razorpay.com/app/payments/${razorpayPaymentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{
                            flex: 1,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.55rem 0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: '#eff6ff',
                            borderColor: '#93c5fd',
                            color: '#1d4ed8'
                        }}
                    >
                        <ExternalLink size={13} /> Open in Razorpay Dashboard
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => {
                        const summary = [
                            `Order ID: ${selectedOrder.id}`,
                            `Payment Gateway: Razorpay`,
                            `Payment ID: ${razorpayPaymentId || 'N/A'}`,
                            razorpayOrderId ? `Razorpay Order ID: ${razorpayOrderId}` : null,
                            `Amount: ₹${Number(selectedOrder.total_amount || 0).toLocaleString('en-IN')}`,
                            `Status: ${isOrderPaid ? 'PAID / CAPTURED' : selectedOrder.status}`,
                            `Paid At: ${toIST(selectedOrder.paid_at || selectedOrder.updated_at || selectedOrder.created_at)}`
                        ].filter(Boolean).join('\n');
                        onCopyText(summary, 'all_summary');
                    }}
                    className="btn btn-secondary"
                    style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '0.55rem 0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    {copiedField === 'all_summary' ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    {copiedField === 'all_summary' ? 'Summary Copied!' : 'Copy Summary'}
                </button>
            </div>
        </div>
    );
}
