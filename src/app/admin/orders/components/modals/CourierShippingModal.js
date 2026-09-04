'use client';

import React from 'react';
import { X, Send, Loader2 } from 'lucide-react';

export default function CourierShippingModal({
    show,
    selectedOrder,
    couriers = [],
    selectedCourierId,
    setSelectedCourierId,
    shippingForm,
    setShippingForm,
    courierModalError,
    setCourierModalError,
    savingCourier,
    isCourierSaved,
    onClose,
    onClearNotification,
    onSaveCourier,
    onSendInfoClick
}) {
    if (!show) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
            <div className="card animate-pop" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '2rem', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Select Courier Partner</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Choose Partner <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                        <select
                            value={selectedCourierId}
                            required
                            onChange={(e) => {
                                const cid = e.target.value;
                                setSelectedCourierId(cid);
                                setCourierModalError('');
                                if (onClearNotification) onClearNotification();
                                const courier = couriers.find(c => c.id === cid);
                                if (courier) {
                                    const awb = shippingForm.tracking_number || '';
                                    setShippingForm({
                                        ...shippingForm,
                                        courier_name: courier.name,
                                        courier_phone: courier.phone || '',
                                        courier_email: courier.email || '',
                                        tracking_url: courier.tracking_url_template ? courier.tracking_url_template.replace(/\{[^}]+\}/g, awb) : ''
                                    });
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: '#f8fafc',
                                border: (courierModalError && (!selectedCourierId || !shippingForm.courier_name?.trim())) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                borderRadius: '12px',
                                color: 'hsl(var(--text-main))',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">-- Select Courier --</option>
                            {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            <option value="CUSTOM">Custom Courier</option>
                        </select>
                        {courierModalError && (!selectedCourierId || !shippingForm.courier_name?.trim()) && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Please select a courier partner</span>
                        )}
                    </div>

                    {selectedCourierId === 'CUSTOM' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Courier Name <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. Local Express"
                                required
                                value={shippingForm.courier_name}
                                onChange={e => {
                                    setShippingForm({ ...shippingForm, courier_name: e.target.value });
                                    setCourierModalError('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#f8fafc',
                                    border: (courierModalError && !shippingForm.courier_name?.trim()) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                    borderRadius: '12px',
                                    color: 'hsl(var(--text-main))',
                                    fontSize: '0.9rem'
                                }}
                            />
                            {courierModalError && !shippingForm.courier_name?.trim() && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Courier name is required</span>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>AWB / Tracking ID <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Enter ID"
                            required
                            value={shippingForm.tracking_number}
                            onChange={e => {
                                const awb = e.target.value;
                                setCourierModalError('');
                                if (onClearNotification) onClearNotification();
                                const courier = couriers.find(c => c.id === selectedCourierId);
                                setShippingForm({
                                    ...shippingForm,
                                    tracking_number: awb,
                                    tracking_url: courier && courier.tracking_url_template ? courier.tracking_url_template.replace(/\{[^}]+\}/g, awb) : shippingForm.tracking_url
                                });
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: '#f8fafc',
                                border: (courierModalError && !shippingForm.tracking_number?.trim()) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                borderRadius: '12px',
                                color: 'hsl(var(--text-main))',
                                fontSize: '0.9rem'
                            }}
                        />
                        {courierModalError && !shippingForm.tracking_number?.trim() && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>AWB / Tracking ID is required</span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.8rem' }}>
                        {isCourierSaved ? 'Close' : 'Cancel'}
                    </button>
                    {!isCourierSaved ? (
                        <button
                            onClick={onSaveCourier}
                            disabled={savingCourier}
                            className="btn btn-primary"
                            style={{ padding: '0.8rem', background: 'hsl(var(--success))', border: 'none' }}
                        >
                            {savingCourier ? <Loader2 size={16} className="animate-spin" /> : 'Save Courier Info'}
                        </button>
                    ) : (
                        <button
                            onClick={onSendInfoClick}
                            className="btn btn-primary animate-pop"
                            style={{ padding: '0.8rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Send size={16} /> Send Info
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
