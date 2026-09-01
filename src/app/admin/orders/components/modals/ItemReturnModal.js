'use client';

import React from 'react';

export default function ItemReturnModal({
    returningItem,
    setReturningItem,
    returnQty,
    setReturnQty,
    onConfirmReturn
}) {
    if (!returningItem) return null;

    const maxReturnable = returningItem.quantity - (returningItem.returned_quantity || 0);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="card shadow-premium" style={{ maxWidth: '400px', width: '90%', padding: '2rem', background: '#fff', borderRadius: '24px' }}>
                <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Return Item</h3>
                <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>
                    How many units of <strong>{returningItem.product_name}</strong> are being returned?
                </p>
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Return Quantity</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setReturnQty(q => Math.max(1, q - 1))}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9fafb', fontSize: '1.25rem', cursor: 'pointer' }}
                        >-</button>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, flex: 1, textAlign: 'center' }}>{returnQty}</div>
                        <button
                            type="button"
                            onClick={() => setReturnQty(q => Math.min(maxReturnable, q + 1))}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9fafb', fontSize: '1.25rem', cursor: 'pointer' }}
                        >+</button>
                    </div>
                    <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>
                        Max returnable: {maxReturnable}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button type="button" onClick={() => setReturningItem(null)} className="btn btn-secondary" style={{ borderRadius: '12px' }}>Cancel</button>
                    <button type="button" onClick={onConfirmReturn} className="btn" style={{ background: '#ef4444', color: 'white', fontWeight: 700, borderRadius: '12px' }}>Confirm Return</button>
                </div>
            </div>
        </div>
    );
}
