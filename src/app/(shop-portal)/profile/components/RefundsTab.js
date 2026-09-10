'use client';

import React, { useEffect } from 'react';
import { IndianRupee, Send, Trash2, Camera, Truck, Building, ShoppingBag, Calculator, CheckSquare, Square } from 'lucide-react';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';
import { calculateOrderItemsRefund } from '@/utils/refundCalculation';


export default function RefundsTab({
    eligibleRefundOrders = [],
    eligibleRefundProducts = [],
    refundForm,
    setRefundForm,
    handleSubmitRefund,
    handleDamagedImageUpload,
    submittingRefund,
    loadingRefunds,
    refunds = [],
    fetchRefunds
}) {
    // Determine currently selected order object
    const currentOrder = eligibleRefundOrders.find(
        o => String(o.id) === String(refundForm.selectedOrderId)
    );

    // Auto-select order if customer only has 1 eligible order and none is selected yet
    useEffect(() => {
        if (eligibleRefundOrders.length === 1 && !refundForm.selectedOrderId) {
            handleOrderChange(eligibleRefundOrders[0].id);
        }
    }, [eligibleRefundOrders, refundForm.selectedOrderId]);

    // Handle order switch
    const handleOrderChange = (orderId) => {
        if (!orderId) {
            setRefundForm(prev => ({
                ...prev,
                selectedOrderId: '',
                selectedItemIds: [],
                amount: '',
                calculationBreakdown: null
            }));
            return;
        }

        const selectedOrder = eligibleRefundOrders.find(o => String(o.id) === String(orderId));
        setRefundForm(prev => ({
            ...prev,
            selectedOrderId: orderId,
            selectedItemIds: [],
            amount: '',
            calculationBreakdown: null
        }));
    };

    // Toggle individual product selection
    const handleToggleItem = (itemId) => {
        if (!currentOrder) return;
        const currentSelected = Array.isArray(refundForm.selectedItemIds) ? [...refundForm.selectedItemIds] : [];
        const strId = String(itemId);
        const idx = currentSelected.indexOf(strId);
        let newSelected = [];
        if (idx >= 0) {
            newSelected = currentSelected.filter(id => id !== strId);
        } else {
            newSelected = [...currentSelected, strId];
        }

        const breakdown = calculateOrderItemsRefund(currentOrder, newSelected);
        setRefundForm(prev => ({
            ...prev,
            selectedItemIds: newSelected,
            amount: breakdown.eligibleAmount > 0 ? String(breakdown.eligibleAmount) : '',
            calculationBreakdown: breakdown
        }));
    };

    // Select all eligible products from current order
    const handleSelectAll = () => {
        if (!currentOrder || !currentOrder.eligibleItems) return;
        const allIds = currentOrder.eligibleItems.map(it => String(it.id));
        const breakdown = calculateOrderItemsRefund(currentOrder, allIds);
        setRefundForm(prev => ({
            ...prev,
            selectedItemIds: allIds,
            amount: breakdown.eligibleAmount > 0 ? String(breakdown.eligibleAmount) : '',
            calculationBreakdown: breakdown
        }));
    };

    // Clear all selections
    const handleDeselectAll = () => {
        setRefundForm(prev => ({
            ...prev,
            selectedItemIds: [],
            amount: '',
            calculationBreakdown: null
        }));
    };

    const selectedCount = refundForm.selectedItemIds?.length || 0;

    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><IndianRupee size={20} /> Refund Requests</h3>
                    <p className={styles.sectionSubtitle}>Request refund for products from your orders</p>
                </div>
            </div>

            {/* Refund Request Form */}
            <div className={styles.requestFormCard}>
                <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Create New Refund Request</h4>

                {eligibleRefundOrders.length === 0 ? (
                    <div style={{
                        padding: '1.5rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px dashed #cbd5e1',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '0.9rem'
                    }}>
                        <ShoppingBag size={32} style={{ opacity: 0.35, margin: '0 auto 0.5rem auto', display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>No Eligible Products for Refund</div>
                        All products from your orders are either already requested for refund/return or cannot be refunded.
                    </div>
                ) : (
                    <form onSubmit={handleSubmitRefund}>
                        {/* STEP 1: CHOOSE ORDER */}
                        <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                CHOOSE ORDER *
                            </label>
                            <select
                                value={refundForm.selectedOrderId || ''}
                                onChange={(e) => handleOrderChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--text-main) / 0.15)',
                                    background: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">-- Select Order for Refund --</option>
                                {eligibleRefundOrders.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {o.invoiceNo} • Placed {o.orderDate} • {o.eligibleItems.length} Eligible {o.eligibleItems.length === 1 ? 'Product' : 'Products'} (Order Total ₹{o.totalAmount.toLocaleString('en-IN')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* STEP 2: CHOOSE PRODUCTS FOR REFUND (MULTI-SELECT) */}
                        {currentOrder && (
                            <div className={styles.formGroupFull} style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <label style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        CHOOSE PRODUCTS FOR REFUND * ({selectedCount} OF {currentOrder.eligibleItems.length} SELECTED)
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: '6px',
                                                border: '1px solid hsl(var(--primary) / 0.3)',
                                                background: 'hsl(var(--primary) / 0.08)',
                                                color: 'hsl(var(--primary))',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAll}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0',
                                                background: '#f8fafc',
                                                color: '#64748b',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>

                                {/* Checkbox list of eligible products */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    {currentOrder.eligibleItems.map(item => {
                                        const isChecked = (refundForm.selectedItemIds || []).includes(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleToggleItem(item.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    padding: '0.85rem 1rem',
                                                    borderRadius: '12px',
                                                    border: isChecked ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
                                                    background: isChecked ? 'hsl(var(--primary) / 0.04)' : '#ffffff',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    boxShadow: isChecked ? '0 2px 8px hsl(var(--primary) / 0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                                                }}
                                            >
                                                <div style={{ color: isChecked ? 'hsl(var(--primary))' : '#000000', display: 'flex', alignItems: 'center' }}>
                                                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>

                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.productName}
                                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                                                        <ShoppingBag size={20} />
                                                    </div>
                                                )}

                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                                                        {item.productName}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                                                        <span>Qty: <strong>{item.quantity}</strong></span>
                                                        <span>Unit Price: <strong>₹{Number(item.price).toLocaleString('en-IN')}</strong></span>
                                                        {currentOrder.totalDiscount > 0 && (
                                                            <span style={{ color: '#059669', fontWeight: 600 }}>• Order Discount Eligible</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isChecked ? 'hsl(var(--primary))' : '#334155' }}>
                                                        ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                                                    </div>
                                                    {item.quantity > 1 && (
                                                        <div style={{ fontSize: '0.72rem', color: '#000000' }}>
                                                            (₹{Number(item.price).toLocaleString('en-IN')} × {item.quantity})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: DYNAMIC REFUND CALCULATION BREAKDOWN */}
                        {refundForm.calculationBreakdown && refundForm.calculationBreakdown.items.length > 0 && (
                            <div style={{
                                marginBottom: '1.5rem',
                                background: '#f8fafc',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '1.25rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <h5 style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calculator size={16} color="hsl(var(--primary))" /> Eligible Refund Calculation Breakdown
                                    </h5>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                        {refundForm.calculationBreakdown.items.length} {refundForm.calculationBreakdown.items.length === 1 ? 'Product' : 'Products'} Selected
                                    </span>
                                </div>

                                {/* Table with Itemized Breakdown */}
                                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                                                <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700 }}>Product</th>
                                                <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Price (₹)</th>
                                                {refundForm.calculationBreakdown.discount > 0 && (
                                                    <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right', color: '#059669' }}>Discount Adj.</th>
                                                )}
                                                <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Taxable</th>
                                                {refundForm.calculationBreakdown.isIGST ? (
                                                    <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>IGST</th>
                                                ) : (
                                                    <>
                                                        <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>SGST</th>
                                                        <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>CGST</th>
                                                    </>
                                                )}
                                                <th style={{ padding: '0.55rem 0.5rem', fontWeight: 700, textAlign: 'right', color: 'hsl(var(--primary))' }}>Eligible Refund</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {refundForm.calculationBreakdown.items.map(it => (
                                                <tr key={it.order_item_id || it.product_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#1e293b' }}>
                                                        {it.product_name}
                                                    </td>
                                                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#475569' }}>
                                                        {it.quantity}
                                                    </td>
                                                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#1e293b' }}>
                                                        ₹{it.gross_price.toLocaleString('en-IN')}
                                                    </td>
                                                    {refundForm.calculationBreakdown.discount > 0 && (
                                                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                                                            {it.discount_adjustment > 0 ? `-₹${it.discount_adjustment.toLocaleString('en-IN')}` : '₹0'}
                                                        </td>
                                                    )}
                                                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#475569' }}>
                                                        ₹{it.taxable_amount.toLocaleString('en-IN')}
                                                    </td>
                                                    {refundForm.calculationBreakdown.isIGST ? (
                                                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#475569' }}>
                                                            +₹{it.igst.toLocaleString('en-IN')}
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#475569' }}>
                                                                +₹{it.sgst.toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#475569' }}>
                                                                +₹{it.cgst.toLocaleString('en-IN')}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                                        ₹{it.eligible_amount.toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Calculation Summary Footer */}
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.85rem 1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    fontSize: '0.84rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                        <span>Total Gross Price:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{refundForm.calculationBreakdown.price.toLocaleString('en-IN')}</span>
                                    </div>
                                    {refundForm.calculationBreakdown.discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                                            <span>Order Discount Adjustment:</span>
                                            <span style={{ fontWeight: 600 }}>-₹{refundForm.calculationBreakdown.discount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                        <span>Total GST ({refundForm.calculationBreakdown.isIGST ? 'IGST' : 'CGST + SGST'}):</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                            +₹{(refundForm.calculationBreakdown.isIGST
                                                ? refundForm.calculationBreakdown.igst
                                                : (refundForm.calculationBreakdown.cgst + refundForm.calculationBreakdown.sgst)
                                            ).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px solid #e2e8f0',
                                        paddingTop: '0.5rem',
                                        marginTop: '0.25rem',
                                        fontWeight: 800,
                                        fontSize: '1.05rem',
                                        color: 'hsl(var(--primary))'
                                    }}>
                                        <span>Total Eligible Refund:</span>
                                        <span>₹{refundForm.calculationBreakdown.eligibleAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: REASON & ELIGIBLE REFUND AMOUNT */}
                        <div className={styles.formGrid} style={{ marginBottom: '1.25rem' }}>
                            <div className={styles.formGroup}>
                                <label>REASON *</label>
                                <select
                                    value={refundForm.reason}
                                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                >
                                    <option value="Defective Product">Defective / Damaged Item</option>
                                    <option value="Wrong Product Received">Wrong Product Received</option>
                                    <option value="Order Cancelled">Order Cancelled</option>
                                    <option value="Billing / Payment Error">Billing / Payment Error</option>
                                    <option value="Other">Other Reason</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>ELIGIBLE REFUND AMOUNT (₹)</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={refundForm.amount ? `₹${Number(refundForm.amount).toLocaleString('en-IN')}` : (currentOrder ? 'Select products to calculate refund' : 'Select order & products first')}
                                    disabled
                                    style={{ background: 'hsl(var(--text-main) / 0.05)', cursor: 'not-allowed', color: 'hsl(var(--primary))', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        {refundForm.reason === 'Other' && (
                            <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                                <label>SPECIFY REASON *</label>
                                <textarea
                                    rows={3}
                                    placeholder="Please specify details regarding your refund request..."
                                    value={refundForm.otherReason}
                                    onChange={(e) => setRefundForm({ ...refundForm, otherReason: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {/* STEP 5: DAMAGED PRODUCT IMAGE UPLOAD FIELD */}
                        <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                                UPLOAD DAMAGED PRODUCT IMAGE (RECOMMENDED)
                            </label>
                            {refundForm.image_url ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                    <img src={refundForm.image_url} alt="Damaged product preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Image Attached Successfully</div>
                                        <a href={refundForm.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'hsl(var(--primary))', fontWeight: 700, textDecoration: 'underline' }}>
                                            Preview Full Photo
                                        </a>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRefundForm(prev => ({ ...prev, image_url: '' }))}
                                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Trash2 size={15} /> Remove
                                    </button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                        onChange={handleDamagedImageUpload}
                                        disabled={refundForm.uploadingImage}
                                        style={{ display: 'none' }}
                                        id="damaged_product_image_input"
                                    />
                                    <label
                                        htmlFor="damaged_product_image_input"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                                            padding: '1rem', borderRadius: '12px', border: '2px dashed #cbd5e1',
                                            background: '#f8fafc', cursor: refundForm.uploadingImage ? 'not-allowed' : 'pointer',
                                            fontWeight: 700, fontSize: '0.88rem', color: '#475569', transition: 'all 0.2s'
                                        }}
                                    >
                                        <Camera size={20} color="hsl(var(--primary))" />
                                        {refundForm.uploadingImage ? 'Uploading Photo...' : 'Click to Upload Photo of Damaged Product (JPG, PNG, WEBP)'}
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* STEP 6: SUBMIT BUTTON */}
                        <button
                            type="submit"
                            className={styles.formSubmitBtn}
                            disabled={submittingRefund || refundForm.uploadingImage || selectedCount === 0}
                            style={{
                                opacity: selectedCount === 0 ? 0.6 : 1,
                                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Send size={16} />
                            {submittingRefund
                                ? 'Submitting...'
                                : selectedCount > 0
                                    ? `Submit Refund Request (${selectedCount} ${selectedCount === 1 ? 'Product' : 'Products'})`
                                    : 'Select Products to Submit Refund'}
                        </button>
                    </form>
                )}
            </div>

            {/* Submitted Refund Requests History */}
            <h4 style={{ margin: '1.5rem 0 1rem 0', fontWeight: 800 }}>Submitted Refund Requests History</h4>
            {loadingRefunds ? (
                <div className={styles.loadingState}>Loading refund requests...</div>
            ) : refunds.length === 0 ? (
                <div className={styles.emptyState}>
                    <IndianRupee size={40} style={{ opacity: 0.2 }} />
                    <p>No refund requests submitted yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {refunds.map(r => {
                        const displayOrderInv = r.orders?.invoice_no
                            ? (r.orders.invoice_no.startsWith('#') ? r.orders.invoice_no : `#${r.orders.invoice_no}`)
                            : `#${String(r.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                        const refundIdDisplay = r.refund_id || `RF-${String(r.id).substring(0, 8)}`;
                        const refStatus = (r.refund_status || r.status || 'REFUND_REQUESTED').toUpperCase();
                        const amountDisplay = r.approved_amount || r.requested_amount || r.amount || 0;

                        let badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Refund Requested' };
                        if (refStatus === 'UNDER_REVIEW') badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Under Review' };
                        else if (refStatus === 'APPROVED') badgeColor = { bg: '#dbeafe', text: '#1e40af', label: 'Approved' };
                        else if (refStatus === 'RETURN_REQUIRED') badgeColor = { bg: '#fff7ed', text: '#c2410c', label: 'Return Required' };
                        else if (refStatus === 'CUSTOMER_SHIPPED') badgeColor = { bg: '#e0e7ff', text: '#3730a3', label: 'Customer Shipped' };
                        else if (refStatus === 'RETURN_RECEIVED') badgeColor = { bg: '#f0fdf4', text: '#15803d', label: 'Return Received' };
                        else if (refStatus === 'REFUND_PROCESSING') badgeColor = { bg: '#fef9c3', text: '#854d0e', label: 'Refund Processing' };
                        else if (refStatus === 'REFUNDED') badgeColor = { bg: '#dcfce7', text: '#166534', label: 'Refunded' };
                        else if (refStatus === 'REJECTED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' };
                        else if (refStatus === 'CANCELLED') badgeColor = { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' };
                        else if (refStatus === 'REFUND_FAILED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Refund Failed' };

                        const shipment = Array.isArray(r.refund_shipments) ? r.refund_shipments[0] : (r.refund_shipments || null);

                        // Parse items_detail for multi-item breakdown if available
                        let itemsDetail = [];
                        if (r.items_detail) {
                            try {
                                itemsDetail = typeof r.items_detail === 'string' ? JSON.parse(r.items_detail) : r.items_detail;
                            } catch (e) {
                                itemsDetail = [];
                            }
                        }

                        return (
                            <div key={r.id} style={{
                                background: '#ffffff', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}>
                                {/* Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>
                                            {refundIdDisplay}
                                        </span>
                                        <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                                            Invoice: {displayOrderInv}
                                        </h4>
                                        <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                                            Requested on {formatOrderDate(r.created_at || r.requested_at, { includeTime: false })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '20px',
                                            background: badgeColor.bg, color: badgeColor.text
                                        }}>
                                            {badgeColor.label}
                                        </span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                            ₹{Number(amountDisplay).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Multi-Item Products Breakdown in History */}
                                {Array.isArray(itemsDetail) && itemsDetail.length > 0 ? (
                                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.85rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                            Products Included in Refund ({itemsDetail.length}):
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                            {itemsDetail.map((it, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.product_name || 'Product'}</span>
                                                        <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '6px' }}>× {it.quantity || 1}</span>
                                                        {it.discount_adjustment > 0 && (
                                                            <span style={{ color: '#059669', fontSize: '0.72rem', marginLeft: '6px' }}>(-₹{it.discount_adjustment} disc.)</span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>
                                                        ₹{Number(it.eligible_amount || (it.unit_price * (it.quantity || 1))).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Details */}
                                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.85rem' }}>
                                    <strong>Reason:</strong> {r.reason || 'N/A'}
                                    {r.image_url && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <img src={r.image_url} alt="Damaged Product" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px' }} />
                                            <div>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Uploaded Damaged Product Photo</div>
                                                <a href={r.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: 700 }}>
                                                    View Full Photo
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {r.customer_note && (
                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                            Note: {r.customer_note}
                                        </div>
                                    )}
                                    {r.admin_note && (
                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#1e40af', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                            Admin Note: {r.admin_note}
                                        </div>
                                    )}
                                </div>

                                {/* Section for RETURN_REQUIRED (Customer needs to ship saree) */}
                                {(refStatus === 'RETURN_REQUIRED' || refStatus === 'APPROVED') && (
                                    <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#c2410c', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Truck size={16} /> Return Address & Shipping Required
                                        </h5>
                                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#9a3412' }}>
                                            Please ship your product to our return address below and submit courier details:
                                        </p>
                                        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.84rem', color: '#1e293b', marginBottom: '1rem', fontWeight: 600 }}>
                                            <Building size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: '#c2410c' }} />
                                            <strong>VAIYAAREE Returns Dept.</strong><br />
                                            16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015
                                        </div>

                                        {/* Shipping Submission Form */}
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.target);
                                            let receiptUrl = '';
                                            const file = fd.get('receipt_file');
                                            if (file && file.name && file.size > 0) {
                                                const upFd = new FormData();
                                                upFd.append('file', file);
                                                try {
                                                    const upRes = await fetch('/api/refund-requests/upload-receipt', { method: 'POST', body: upFd });
                                                    const upData = await upRes.json();
                                                    if (upData.success && upData.fileUrl) receiptUrl = upData.fileUrl;
                                                } catch (err) {
                                                    console.error('[RECEIPT-UPLOAD-ERROR]', err);
                                                }
                                            }

                                            const payload = {
                                                refundRequestId: r.id,
                                                courierName: fd.get('courier_name'),
                                                trackingNumber: fd.get('tracking_number'),
                                                shippingDate: fd.get('shipping_date'),
                                                notes: fd.get('notes'),
                                                receiptUrl
                                            };

                                            try {
                                                const res = await fetch('/api/refund-requests/submit-shipping', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    alert('Courier details submitted successfully!');
                                                    fetchRefunds();
                                                } else {
                                                    alert('Failed to submit courier details: ' + (data.error || 'Unknown error'));
                                                }
                                            } catch (err) {
                                                alert('Error submitting courier details: ' + err.message);
                                            }
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Courier Company *</label>
                                                    <input type="text" name="courier_name" required placeholder="e.g. DTDC, BlueDart" style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Tracking / AWB No *</label>
                                                    <input type="text" name="tracking_number" required placeholder="Tracking Number" style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Shipping Date</label>
                                                    <input type="date" name="shipping_date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Upload Receipt (Optional)</label>
                                                    <input type="file" name="receipt_file" accept="image/*,.pdf" style={{ fontSize: '0.8rem', width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Notes</label>
                                                    <input type="text" name="notes" placeholder="Optional notes..." style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                            </div>

                                            <button type="submit" style={{ background: '#c2410c', color: '#fff', border: 'none', padding: '0.45rem 1.25rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                Submit Courier Details
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Section for CUSTOMER_SHIPPED */}
                                {shipment && (
                                    <div style={{ background: '#e0e7ff', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <strong>Courier:</strong> {shipment.courier_company || 'N/A'} • <strong>Tracking:</strong> {shipment.tracking_number || 'N/A'}
                                            {shipment.shipping_date && <span> • <strong>Date:</strong> {shipment.shipping_date}</span>}
                                        </div>
                                        {shipment.receipt_url && (
                                            <a href={shipment.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3730a3', fontWeight: 700, textDecoration: 'underline' }}>
                                                View Receipt
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Section for REFUNDED */}
                                {refStatus === 'REFUNDED' && (
                                    <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                                        ✅ Refund Completed! ₹{Number(amountDisplay).toLocaleString('en-IN')} has been returned to your original payment method.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
