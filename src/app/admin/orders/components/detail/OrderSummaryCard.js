'use client';

import React from 'react';
import { Receipt } from 'lucide-react';

export default function OrderSummaryCard({ selectedOrder, itemsTotal = 0 }) {
    const rawDiscount = Number(
        selectedOrder.total_discount || 
        selectedOrder.discount_amount || 
        selectedOrder.coupon_discount || 
        selectedOrder.cart_discount || 
        0
    );
    const rawSubtotal = Number(selectedOrder.subtotal || 0);
    const subtotalVal = rawSubtotal > 0 
        ? rawSubtotal 
        : (itemsTotal > 0 
            ? itemsTotal 
            : Math.max(0, Number(selectedOrder.total_amount || 0) - Number(selectedOrder.tax_amount || 0) - Number(selectedOrder.shipping_cost || 0) + rawDiscount));
    
    // Tax type resolution: tax_type field → stored amounts → state heuristic
    const taxType = selectedOrder.tax_type || '';
    const rawCgst = Number(selectedOrder.cgst_amount || selectedOrder.cgst || 0);
    const rawSgst = Number(selectedOrder.sgst_amount || selectedOrder.sgst || 0);
    const rawIgst = Number(selectedOrder.igst_amount || selectedOrder.igst || 0);
    const rawTax = Number(selectedOrder.tax_amount || 0);

    let isIgst = false;
    if (taxType === 'IGST' || taxType === 'IGST_INTERNATIONAL') {
        isIgst = true;
    } else if (taxType === 'CGST_SGST') {
        isIgst = false;
    } else {
        if (rawIgst > 0) isIgst = true;
        else if (rawCgst > 0 || rawSgst > 0) isIgst = false;
        else {
            const deliveryState = (selectedOrder.delivery_state || selectedOrder.shipping_state || selectedOrder.billing_state || '').trim().toLowerCase();
            isIgst = Boolean(deliveryState && deliveryState !== 'tamil nadu');
        }
    }

    const igstVal = rawIgst > 0 ? rawIgst : rawTax;
    const cgstVal = rawCgst > 0 ? rawCgst : Math.round((rawTax / 2) * 100) / 100;
    const sgstVal = rawSgst > 0 ? rawSgst : Math.round((rawTax / 2) * 100) / 100;

    const shippingVal = Number(selectedOrder.shipping_cost || selectedOrder.shipping_fee || 0);
    const grandTotalVal = Number(selectedOrder.total_amount || 0);

    return (
        <div className="card-sub" style={{ 
            padding: '1.5rem', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid hsl(var(--border-subtle))',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
            <h4 style={{ 
                fontSize: '0.8rem', 
                textTransform: 'uppercase', 
                color: 'hsl(var(--text-muted))', 
                marginBottom: '1rem', 
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <Receipt size={16} /> Order Financial Summary
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'hsl(var(--text-main))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₹{subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>
                        Discount{selectedOrder.coupon_code ? ` (${selectedOrder.coupon_code})` : ''}:
                    </span>
                    <span style={{ color: rawDiscount > 0 ? '#dc2626' : 'inherit', fontWeight: rawDiscount > 0 ? 700 : 400 }}>
                        {rawDiscount > 0 ? `- ₹${rawDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                    </span>
                </div>

                {isIgst ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>IGST (5%):</span>
                        <span>₹{igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                ) : (rawTax > 0 || cgstVal > 0 || sgstVal > 0) ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                            <span>CGST (2.5%):</span>
                            <span>₹{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                            <span>SGST (2.5%):</span>
                            <span>₹{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Shipping Charges:</span>
                    <span style={{ fontWeight: 600 }}>{shippingVal > 0 ? `₹${shippingVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Free Shipping (₹0.00)'}</span>
                </div>

                <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.5rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Grand Total:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                        ₹{grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
}
