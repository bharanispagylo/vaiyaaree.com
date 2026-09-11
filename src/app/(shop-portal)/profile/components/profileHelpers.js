import React from 'react';
import { Globe, ShoppingBag, MessageCircle } from 'lucide-react';

export function formatPhoneDisplay(phone, countryCode) {
    if (!phone) return '';
    const clean = String(phone).trim();
    const digits = clean.replace(/\D/g, '');
    const code = countryCode ? (countryCode.startsWith('+') ? countryCode : `+${countryCode}`) : null;
    
    if (code) {
        return `${code} ${digits.startsWith(code.replace('+', '')) ? digits.slice(code.replace('+', '').length) : digits}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
        return `+91 ${digits.slice(2)}`;
    }
    if (digits.length === 10) {
        return `+91 ${digits}`;
    }
    if (clean.startsWith('+')) {
        return clean.replace(/^\+(\d{1,3})(\d+)/, '+$1 $2');
    }
    return digits ? `+91 ${digits}` : clean;
}

export function getOrderSourceBadge(order) {
    const src = (order?.source || '').toUpperCase();
    const idStr = String(order?.id || '').toUpperCase();
    
    if (src === 'WEBSITE' || src === 'WEB' || idStr.startsWith('WEB-')) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: '#3730a3', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Globe size={13} color="#4338ca" /> Website
            </span>
        );
    }
    if (src === 'MANUAL' || src === 'DIRECT' || idStr.startsWith('MAN-')) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: '#6b21a8', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <ShoppingBag size={13} color="#7e22ce" /> Manual
            </span>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: '#065f46', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <MessageCircle size={13} color="#059669" /> WhatsApp
        </span>
    );
}

export function getStatusIndex(status) {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'PLACED': case 'PENDING': case 'AWAITING_PAYMENT': return 0;
        case 'PAID': case 'CONFIRMED': case 'PROCESSING': return 1;
        case 'PACKING': case 'SHIPPED': case 'DISPATCHED': case 'IN_TRANSIT': case 'OUT_FOR_DELIVERY': return 2;
        case 'DELIVERED': case 'COMPLETED': return 3;
        default: return 0;
    }
}

export function getCodInfo(order) {
    if (!order) return { isCod: false, isCodWithAdvance: false, isCodPure: false, codAdvancePaid: 0, codBalanceDue: 0, total: 0 };
    const method = String(order.payment_method || '').toUpperCase();
    const isCod = method === 'COD' || method.includes('CASH ON DELIVERY');
    const advPaid = Number(order.advance_paid || order.cod_advance_required || 0);
    const total = Number(order.total_amount || order.total || 0);
    const balanceDue = Number(order.balance_amount !== undefined && order.balance_amount !== null ? order.balance_amount : Math.max(0, total - advPaid));
    const isCodWithAdvance = isCod && advPaid > 0;
    const isCodPure = isCod && advPaid === 0;

    return {
        isCod,
        isCodWithAdvance,
        isCodPure,
        codAdvancePaid: advPaid,
        codBalanceDue: balanceDue,
        total
    };
}

export function isCancelledStatus(status) {
    const s = String(status || '').toUpperCase();
    return s === 'CANCELLED' || s === 'CANCELED' || s === 'CANCEL_REQUESTED';
}

export function renderPaymentInfo(order, isCompact = false) {
    if (!order) return null;
    const isCancelled = isCancelledStatus(order.status);
    const { isCod, isCodWithAdvance, isCodPure, codAdvancePaid, codBalanceDue, total } = getCodInfo(order);
    const refundAmount = Number(order.refund_amount || 0);
    const hasRefundId = Boolean(order.razorpay_refund_id);
    const refundStatus = String(order.refund_status || '').toUpperCase();
    const isRefunded = refundStatus === 'REFUNDED' || hasRefundId;

    if (isCancelled) {
        if (isCodWithAdvance) {
            const advRefundVal = refundAmount > 0 ? refundAmount : codAdvancePaid;
            return (
                <div style={{ display: 'flex', flexDirection: isCompact ? 'row' : 'column', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isRefunded ? '#15803d' : '#b45309', background: isRefunded ? '#dcfce7' : '#fef3c7', border: `1px solid ${isRefunded ? '#bbf7d0' : '#fde68a'}`, padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                        💳 {isRefunded ? 'Adv Refunded' : 'Adv Refund Queued'}: ₹{advRefundVal.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                        COD Balance: Voided
                    </span>
                </div>
            );
        }

        if (isCodPure) {
            return (
                <div style={{ marginTop: '3px' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                        💵 COD Cancelled (No Payment Taken)
                    </span>
                </div>
            );
        }

        // Online / Razorpay / Prepaid cancelled
        const displayRefundVal = refundAmount > 0 ? refundAmount : total;
        return (
            <div style={{ marginTop: '3px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isRefunded ? '#15803d' : '#b45309', background: isRefunded ? '#dcfce7' : '#fef3c7', border: `1px solid ${isRefunded ? '#bbf7d0' : '#fde68a'}`, padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                    💳 {isRefunded ? 'Refunded' : 'Refund Pending'}: ₹{displayRefundVal.toLocaleString('en-IN')} (Razorpay)
                </span>
            </div>
        );
    }

    if (isCodWithAdvance) {
        return (
            <div style={{ display: 'flex', flexDirection: isCompact ? 'row' : 'column', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                    ✓ Adv: ₹{codAdvancePaid.toLocaleString('en-IN')} (Paid)
                </span>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                    💵 Due: ₹{codBalanceDue.toLocaleString('en-IN')} (Cash)
                </span>
            </div>
        );
    }

    if (isCodPure) {
        return (
            <div style={{ marginTop: '3px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                    💵 COD Due: ₹{total.toLocaleString('en-IN')}
                </span>
            </div>
        );
    }

    if (order.payment_status === 'PAID' || String(order.payment_method || '').toUpperCase() === 'RAZORPAY') {
        return (
            <div style={{ marginTop: '3px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block', width: 'fit-content' }}>
                    ✓ Paid Online (Razorpay)
                </span>
            </div>
        );
    }

    return null;
}

export function renderCodPaymentBadges(order, isCompact = false) {
    return renderPaymentInfo(order, isCompact);
}

