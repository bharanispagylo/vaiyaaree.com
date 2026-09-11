'use client';

import React from 'react';
import { 
    ExternalLink, Loader2, Download, CreditCard, ArrowLeft, Edit3, Check, X 
} from 'lucide-react';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import { formatOrderInvoice, toIST } from '../../utils/ordersHelpers';

export default function OrderDetailHeader({
    selectedOrder,
    orderItems,
    isEditingItems,
    setIsEditingItems,
    loading,
    isUpdatingStatus,
    onBack,
    onSaveEdits,
    onCancelEdit,
    onPrepareEditing,
    isPaidOnline,
    razorpayPaymentId
}) {
    const src = selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? 'WEBSITE' : selectedOrder.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
    const badgeConfig = {
        WEBSITE: { label: 'Website Store', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
        MANUAL: { label: 'Manual Order', bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8' },
        WHATSAPP: { label: 'WhatsApp Order', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
    };
    const config = badgeConfig[src] || badgeConfig.WHATSAPP;

    return (
        <div style={{
            padding: '1.5rem 2rem',
            background: '#ffffff',
            borderBottom: '1px solid hsl(var(--border-subtle))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'hsl(var(--text-main))' }}>
                        Order {formatOrderInvoice(selectedOrder)}
                    </h2>
                    <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        color: config.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {config.label}
                    </span>
                    {isPaidOnline && razorpayPaymentId && (
                        <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#eff6ff',
                            border: '1px solid #93c5fd',
                            color: '#1d4ed8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                        }}>
                            <CreditCard size={12} /> Razorpay: {razorpayPaymentId}
                        </span>
                    )}
                    {(() => {
                        const isCod = (selectedOrder.payment_method || '').toUpperCase() === 'COD' || (selectedOrder.payment_method || '').toUpperCase().includes('CASH ON DELIVERY');
                        const advRequired = Number(selectedOrder.cod_advance_required || 0);
                        const advPaid = Number(selectedOrder.advance_paid || 0);
                        if (isCod && (advRequired > 0 || advPaid > 0)) {
                            const adv = advPaid > 0 ? advPaid : advRequired;
                            const total = Number(selectedOrder.total_amount || 0);
                            const balance = Number(selectedOrder.balance_amount !== undefined && selectedOrder.balance_amount !== null ? selectedOrder.balance_amount : Math.max(0, total - adv));
                            const isAdvPaid = advPaid > 0 || ['PLACED', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes((selectedOrder.status || '').toUpperCase());
                            return (
                                <span style={{
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: isAdvPaid ? '#ecfdf5' : '#fffbeb',
                                    border: `1px solid ${isAdvPaid ? '#a7f3d0' : '#fde68a'}`,
                                    color: isAdvPaid ? '#047857' : '#b45309',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <CreditCard size={12} /> COD: ₹{adv.toLocaleString('en-IN')} Advance ({isAdvPaid ? 'Paid' : 'Pending'}) | ₹{balance.toLocaleString('en-IN')} Due on Delivery
                                </span>
                            );
                        }
                        return null;
                    })()}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span>Placed on <strong>{toIST(selectedOrder.created_at)}</strong></span>
                    {isUpdatingStatus && (
                        <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: 'hsl(var(--primary))',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <Loader2 size={12} className="animate-spin" /> Updating Status...
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                    type="button" 
                    onClick={onBack} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ArrowLeft size={15} /> Back to Orders
                </button>

                {!isEditingItems ? (
                    <button 
                        type="button" 
                        onClick={() => { onPrepareEditing(); setIsEditingItems(true); }} 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                    >
                        <Edit3 size={15} /> Edit Order
                    </button>
                ) : (
                    <>
                        <button 
                            type="button" 
                            onClick={onCancelEdit} 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                            <X size={15} /> Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={onSaveEdits} 
                            disabled={loading} 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={15} /> Save Changes</>}
                        </button>
                    </>
                )}

                <button 
                    type="button" 
                    onClick={async () => {
                        const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                        const blob = new Blob([buf], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    }} 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.55rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ExternalLink size={14} /> View Invoice
                </button>

                <button 
                    type="button" 
                    onClick={async () => {
                        const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                        const blob = new Blob([buf], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Invoice_${selectedOrder.id}.pdf`;
                        a.click();
                    }} 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.55rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <Download size={14} /> Download PDF
                </button>
            </div>
        </div>
    );
}
