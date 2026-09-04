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
