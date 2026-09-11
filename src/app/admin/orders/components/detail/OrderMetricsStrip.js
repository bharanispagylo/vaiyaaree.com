'use client';

import React from 'react';
import { CreditCard, Package, Truck, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { getStatusReference } from '../../utils/ordersHelpers';

export default function OrderMetricsStrip({
    selectedOrder,
    orderItems = [],
    isPaidOnline,
    razorpayPaymentId
}) {
    const totalAmount = Number(selectedOrder.total_amount || 0);
    const activeItemCount = orderItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0) - Number(item.returned_quantity || 0)), 0);
    const isPaid = ['PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes((selectedOrder.status || '').toUpperCase());

    const isCodAdvance = (selectedOrder.payment_method || '').toUpperCase() === 'COD' && (Number(selectedOrder.cod_advance_required || 0) > 0 || Number(selectedOrder.advance_paid || 0) > 0);
    const advancePaidVal = Number(selectedOrder.advance_paid || 0);
    const balanceDueVal = Number(selectedOrder.balance_amount !== undefined ? selectedOrder.balance_amount : Math.max(0, totalAmount - advancePaidVal));

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1.25rem 2rem',
            background: '#f8fafc',
            borderBottom: '1px solid hsl(var(--border-subtle))'
        }}>
            {/* 1. Grand Total Card */}
            <div style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>₹</span>
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Value
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* 2. Payment Status Card */}
            <div style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: isCodAdvance ? (advancePaidVal > 0 ? '#ecfdf5' : '#fffbeb') : (isPaid ? '#eff6ff' : '#fef2f2'),
                    color: isCodAdvance ? (advancePaidVal > 0 ? '#059669' : '#d97706') : (isPaid ? '#1d4ed8' : '#dc2626'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <CreditCard size={20} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Payment Status
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: isCodAdvance ? (advancePaidVal > 0 ? '#15803d' : '#b45309') : (isPaid ? '#15803d' : '#b91c1c')
                        }}>
                            {isCodAdvance 
                                ? (advancePaidVal > 0 ? `COD Advance Paid (₹${advancePaidVal})` : 'Awaiting COD Advance')
                                : (isPaid ? (isPaidOnline ? 'Razorpay Paid' : 'Paid (Direct)') : 'Awaiting Payment')}
                        </span>
                    </div>
                    {razorpayPaymentId && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {razorpayPaymentId}
                        </div>
                    )}
                </div>
            </div>

            {/* 2b. COD Balance Due Card (when applicable) */}
            {isCodAdvance && (
                <div style={{
                    background: '#ffffff',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    border: '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#fff7ed',
                        color: '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Cash Due on Delivery
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
                            ₹{balanceDueVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Fulfillment Status Card */}
            <div style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    color: 'hsl(var(--primary))',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Truck size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Fulfillment Stage
                    </div>
                    <div style={{ marginTop: '2px' }}>
                        <span className={`badge ${getStatusReference(selectedOrder.status)}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                            {selectedOrder.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Items & Package Overview Card */}
            <div style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#fdf4ff',
                    color: '#9333ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <ShoppingBag size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Package Content
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {activeItemCount} {activeItemCount === 1 ? 'Item' : 'Items'}
                    </div>
                </div>
            </div>
        </div>
    );
}
