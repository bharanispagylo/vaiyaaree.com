'use client';

import React from 'react';
import { User, Phone, Mail, MapPin, Copy, Check } from 'lucide-react';
import { formatDisplayPhoneNumber } from '../../utils/ordersHelpers';

export default function CustomerAddressCard({
    selectedOrder,
    setSelectedOrder,
    isEditingItems,
    copiedField,
    onCopyText
}) {
    // Address format helper
    const renderAddressBlock = (addrRaw, fallbackName, fallbackPhone, fallbackEmail) => {
        let addr = addrRaw;
        if (typeof addr === 'string' && addr.trim().startsWith('{')) {
            try { addr = JSON.parse(addr); } catch(e){}
        }
        if (typeof addr === 'object' && addr !== null) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                        {addr.name || fallbackName}
                    </div>
                    <div style={{ color: 'hsl(var(--text-muted))' }}>
                        {formatDisplayPhoneNumber(addr.mobile || addr.phone || fallbackPhone)}
                    </div>
                    {(addr.email || fallbackEmail) && (
                        <div style={{ color: 'hsl(var(--text-muted))', wordBreak: 'break-all' }}>
                            {addr.email || fallbackEmail}
                        </div>
                    )}
                    <div style={{ marginTop: '4px', lineHeight: 1.4, color: '#334155' }}>
                        {[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                    </div>
                </div>
            );
        }
        return <div style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: '#334155' }}>{String(addr || 'N/A')}</div>;
    };

    if (isEditingItems) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Edit Shipping Details */}
                <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                        Edit Shipping Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Full Name</label>
                            <input
                                placeholder="Full Name"
                                value={selectedOrder.shipping_name ?? (selectedOrder.customer_name || '')}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_name: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Phone</label>
                            <input
                                placeholder="Phone"
                                value={selectedOrder.shipping_phone ?? (selectedOrder.customer_phone || '')}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_phone: e.target.value, customer_phone: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Customer Email</label>
                            <input
                                placeholder="Customer Email"
                                value={selectedOrder.customer_email || ''}
                                onChange={e => setSelectedOrder({ ...selectedOrder, customer_email: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Pincode</label>
                            <input
                                placeholder="Pincode"
                                value={selectedOrder.shipping_pincode || ''}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_pincode: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Street Address</label>
                            <textarea
                                rows={2}
                                placeholder="Flat, House, Street"
                                value={selectedOrder.shipping_address_line || ''}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_address_line: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>City</label>
                            <input
                                placeholder="City"
                                value={selectedOrder.shipping_city || ''}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_city: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>State</label>
                            <select
                                value={selectedOrder.shipping_state || 'Tamil Nadu'}
                                onChange={e => setSelectedOrder({ ...selectedOrder, shipping_state: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            >
                                {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Edit Billing Details */}
                <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '16px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>
                            Edit Billing Details
                        </h4>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedOrder(prev => ({
                                    ...prev,
                                    billing_name: prev.shipping_name || prev.customer_name,
                                    billing_phone: prev.shipping_phone || prev.customer_phone,
                                    billing_address_line: prev.shipping_address_line,
                                    billing_city: prev.shipping_city,
                                    billing_pincode: prev.shipping_pincode,
                                    billing_state: prev.shipping_state
                                }));
                            }}
                            style={{ fontSize: '0.72rem', background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontWeight: 700 }}
                        >
                            Same as Shipping
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Billing Name</label>
                            <input
                                placeholder="Full Name"
                                value={selectedOrder.billing_name ?? (selectedOrder.customer_name || '')}
                                onChange={e => setSelectedOrder({ ...selectedOrder, billing_name: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Billing Phone</label>
                            <input
                                placeholder="Phone"
                                value={selectedOrder.billing_phone ?? (selectedOrder.customer_phone || '')}
                                onChange={e => setSelectedOrder({ ...selectedOrder, billing_phone: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Billing Street Address</label>
                            <textarea
                                rows={2}
                                placeholder="Flat, House, Street"
                                value={selectedOrder.billing_address_line || ''}
                                onChange={e => setSelectedOrder({ ...selectedOrder, billing_address_line: e.target.value })}
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const customerPhone = selectedOrder.customer_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null);
    const customerEmail = selectedOrder.customer_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null);

    return (
        <div className="card-sub" style={{ 
            padding: '1.5rem', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid hsl(var(--border-subtle))',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
            {/* Customer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h4 style={{ 
                    fontSize: '0.8rem', 
                    textTransform: 'uppercase', 
                    color: 'hsl(var(--text-muted))', 
                    margin: 0, 
                    fontWeight: 800, 
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <User size={16} /> Customer Overview
                </h4>
            </div>

            {/* Customer Contact Information */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'hsl(var(--text-main))' }}>
                    {selectedOrder.customer_name || 'Guest Customer'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.85rem', color: '#475569' }}>
                    <Phone size={14} color="#64748b" />
                    <span style={{ fontWeight: 600 }}>{formatDisplayPhoneNumber(customerPhone)}</span>
                    {customerPhone && (
                        <button
                            type="button"
                            onClick={() => onCopyText(customerPhone, 'cust_phone')}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                            title="Copy Phone"
                        >
                            {copiedField === 'cust_phone' ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                        </button>
                    )}
                </div>

                {customerEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.85rem', color: '#475569', wordBreak: 'break-all' }}>
                        <Mail size={14} color="#64748b" />
                        <span>{customerEmail}</span>
                    </div>
                )}
            </div>

            {/* Shipping & Delivery Address */}
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="hsl(var(--primary))" /> Shipping Address
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const shipRaw = selectedOrder.shipping_address || selectedOrder.delivery_address || '';
                            const str = typeof shipRaw === 'object' ? [shipRaw.name, shipRaw.phone, shipRaw.address, shipRaw.city, shipRaw.state, shipRaw.pincode].filter(Boolean).join(', ') : String(shipRaw);
                            onCopyText(str, 'ship_addr');
                        }}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                        {copiedField === 'ship_addr' ? <Check size={11} color="#15803d" /> : <Copy size={11} />}
                        {copiedField === 'ship_addr' ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {renderAddressBlock(
                        selectedOrder.shipping_address || selectedOrder.delivery_address,
                        selectedOrder.customer_name,
                        selectedOrder.customer_phone,
                        selectedOrder.shipping_email || selectedOrder.customer_email
                    )}
                </div>
            </div>

            {/* Billing Address */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                        Billing Address
                    </span>
                </div>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {renderAddressBlock(
                        selectedOrder.billing_address || selectedOrder.delivery_address,
                        selectedOrder.customer_name,
                        selectedOrder.customer_phone,
                        selectedOrder.billing_email || selectedOrder.customer_email
                    )}
                </div>
            </div>
        </div>
    );
}
